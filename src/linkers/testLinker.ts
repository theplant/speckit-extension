import * as fs from 'fs';
import * as path from 'path';
import { IntegrationTest } from '../types';

export class TestLinker {
  private readonly specAnnotationPattern = /@spec:\s*([\w-]+)\/US(\d+)-AS(\d+)/g;
  private readonly testDescribePattern = /test\.describe\(['"`]([^'"`]+)['"`]/g;
  private readonly testPattern = /test\(['"`]([^'"`]+)['"`]/g;

  async findTestsForStory(
    workspaceRoot: string,
    testsDir: string,
    featureName: string,
    storyNumber: number
  ): Promise<IntegrationTest[]> {
    const tests: IntegrationTest[] = [];
    const testsPath = path.join(workspaceRoot, testsDir);

    if (!fs.existsSync(testsPath)) {
      return tests;
    }

    const testFiles = this.findTestFiles(testsPath);
    
    for (const testFile of testFiles) {
      const fileName = path.basename(testFile);
      
      if (this.matchesUserStory(fileName, storyNumber)) {
        const content = fs.readFileSync(testFile, 'utf-8');
        const fileTests = this.parseTestFile(testFile, content, featureName, storyNumber);
        tests.push(...fileTests);
      }
    }

    return tests;
  }

  async findTestsForScenario(
    workspaceRoot: string,
    testsDir: string,
    featureName: string,
    storyNumber: number,
    scenarioNumber: number
  ): Promise<IntegrationTest[]> {
    const storyTests = await this.findTestsForStory(workspaceRoot, testsDir, featureName, storyNumber);
    
    return storyTests.filter(test => {
      if (test.specAnnotation) {
        const match = test.specAnnotation.match(/US(\d+)-AS(\d+)/);
        if (match && parseInt(match[2]) === scenarioNumber) {
          return true;
        }
      }
      
      if (test.testName) {
        const asPattern = new RegExp(`US${storyNumber}-AS${scenarioNumber}|AS${scenarioNumber}`, 'i');
        return asPattern.test(test.testName);
      }
      
      return false;
    });
  }

  async scanTestAnnotations(
    workspaceRoot: string,
    testsDir: string
  ): Promise<Map<string, IntegrationTest[]>> {
    const annotationMap = new Map<string, IntegrationTest[]>();
    const testsPath = path.join(workspaceRoot, testsDir);

    if (!fs.existsSync(testsPath)) {
      return annotationMap;
    }

    const testFiles = this.findTestFiles(testsPath);

    for (const testFile of testFiles) {
      const content = fs.readFileSync(testFile, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let match;
        
        while ((match = this.specAnnotationPattern.exec(line)) !== null) {
          const specId = `${match[1]}/US${match[2]}-AS${match[3]}`;
          const test: IntegrationTest = {
            filePath: testFile,
            fileName: path.basename(testFile),
            line: i + 1,
            specAnnotation: specId
          };

          if (!annotationMap.has(specId)) {
            annotationMap.set(specId, []);
          }
          annotationMap.get(specId)!.push(test);
        }
      }
    }

    return annotationMap;
  }

  findTestFileForStory(workspaceRoot: string, testsDir: string, storyNumber: number): string | undefined {
    const testsPath = path.join(workspaceRoot, testsDir);

    if (!fs.existsSync(testsPath)) {
      return undefined;
    }

    const testFiles = this.findTestFiles(testsPath);
    
    // Sort files to prioritize ones that match user story patterns better
    const sortedFiles = testFiles.sort((a, b) => {
      const fileNameA = path.basename(a);
      const fileNameB = path.basename(b);
      
      // Prioritize files that start with "us{storyNumber}" or "us{storyNumber}-"
      const patternA = new RegExp(`^us${storyNumber}(-|$)`, 'i');
      const patternB = new RegExp(`^us${storyNumber}(-|$)`, 'i');
      
      const matchA = patternA.test(fileNameA);
      const matchB = patternB.test(fileNameB);
      
      if (matchA && !matchB) return -1;
      if (!matchA && matchB) return 1;
      
      // If both match or neither match, sort alphabetically
      return fileNameA.localeCompare(fileNameB);
    });
    
    for (const testFile of sortedFiles) {
      const fileName = path.basename(testFile);
      if (this.matchesUserStory(fileName, storyNumber)) {
        return testFile;
      }
    }

    return undefined;
  }

  private findTestFiles(dir: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findTestFiles(fullPath));
      } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private matchesUserStory(fileName: string, storyNumber: number): boolean {
    const patterns = [
      new RegExp(`us${storyNumber}(-|$)`, 'i'),  // us1- or us1 at start
      new RegExp(`us${storyNumber}[^0-9]`, 'i'), // us1 followed by non-digit
      new RegExp(`user-story-${storyNumber}[^0-9]`, 'i'),
      new RegExp(`story${storyNumber}[^0-9]`, 'i')
    ];

    return patterns.some(pattern => pattern.test(fileName));
  }

  private parseTestFile(
    filePath: string,
    content: string,
    featureName: string,
    storyNumber: number
  ): IntegrationTest[] {
    const tests: IntegrationTest[] = [];
    const lines = content.split('\n');
    
    // Track if we're inside a template string (backtick)
    let insideTemplateString = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Count backticks to track template string state
      // This is a simple heuristic - count unescaped backticks
      const backticks = (line.match(/(?<!\\)`/g) || []).length;
      if (backticks % 2 === 1) {
        insideTemplateString = !insideTemplateString;
      }
      
      // Skip if we're inside a template string
      if (insideTemplateString) {
        continue;
      }
      
      // Match test() calls at the start of a line (with optional whitespace)
      const testMatch = line.match(/^\s*test\(['"`]([^'"`]+)['"`]/);
      if (testMatch) {
        const testName = testMatch[1];
        
        let specAnnotation: string | undefined;
        
        // Look at previous lines for @spec annotation (up to 3 lines back, stop at empty line or another test)
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prevLine = lines[j].trim();
          
          // Stop if we hit an empty line or another test/function
          if (prevLine === '' || prevLine.includes('test(') || prevLine.includes('});')) {
            break;
          }
          
          // Check for @spec annotation
          const annotationMatch = prevLine.match(/@spec:\s*([\w-]+\/US\d+-AS\d+)/);
          if (annotationMatch) {
            specAnnotation = annotationMatch[1];
          }
        }

        tests.push({
          filePath,
          fileName: path.basename(filePath),
          testName,
          line: i + 1,
          specAnnotation
        });
      }
    }

    if (tests.length === 0) {
      tests.push({
        filePath,
        fileName: path.basename(filePath)
      });
    }

    return tests;
  }
}
