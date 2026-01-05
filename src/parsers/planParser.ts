import * as fs from 'fs';
import * as path from 'path';

export interface TestDirectoryConfig {
  directories: string[];
  filePatterns: string[];
  projectType: string;
}

export class PlanParser {
  private readonly testDirPatterns = [
    /test\//i,
    /tests\//i,
    /__tests__\//i,
    /spec\//i,
    /specs\//i,
    /e2e\//i,
    /integration\//i,
    /unit\//i,
  ];

  private readonly testFilePatterns = [
    /\.spec\.ts$/,
    /\.test\.ts$/,
    /\.spec\.js$/,
    /\.test\.js$/,
    /_test\.go$/,
    /test_.*\.py$/,
    /_spec\.rb$/,
  ];

  /**
   * Discover test directories from plan.md in the feature's spec directory
   */
  async discoverTestDirectories(
    workspaceRoot: string,
    specFilePath: string
  ): Promise<TestDirectoryConfig> {
    const specDir = path.dirname(specFilePath);
    const planPath = path.join(specDir, 'plan.md');

    if (fs.existsSync(planPath)) {
      const config = this.parseTestDirectoriesFromPlan(planPath, workspaceRoot);
      if (config.directories.length > 0) {
        return config;
      }
    }

    // Fall back to common test directory patterns in workspace
    return this.discoverFromWorkspace(workspaceRoot);
  }

  /**
   * Parse plan.md to find test directories from code blocks
   */
  private parseTestDirectoriesFromPlan(
    planPath: string,
    workspaceRoot: string
  ): TestDirectoryConfig {
    const content = fs.readFileSync(planPath, 'utf-8');
    const directories: string[] = [];
    const filePatterns: string[] = [];
    let projectType = 'unknown';

    // Extract code blocks (```text or ``` without language)
    const codeBlockRegex = /```(?:text)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const block = match[1];
      const lines = block.split('\n');

      for (const line of lines) {
        // Look for directory structures with test-related paths
        const trimmed = line.trim();
        
        // Skip empty lines and tree characters
        if (!trimmed || /^[├└│─\s]+$/.test(trimmed)) continue;

        // Extract path from tree structure (e.g., "├── test/suite/")
        const pathMatch = trimmed.match(/(?:[├└│─\s]*)?([a-zA-Z0-9_\-./]+)/);
        if (!pathMatch) continue;

        const pathPart = pathMatch[1];

        // Check if this looks like a test directory
        for (const pattern of this.testDirPatterns) {
          if (pattern.test(pathPart)) {
            // Extract the full relative path
            const testDir = this.extractTestDirectory(pathPart, block);
            if (testDir && !directories.includes(testDir)) {
              directories.push(testDir);
            }
          }
        }

        // Check for test file patterns to infer project type
        for (const pattern of this.testFilePatterns) {
          if (pattern.test(pathPart)) {
            if (pathPart.endsWith('.spec.ts') || pathPart.endsWith('.test.ts')) {
              projectType = 'typescript';
              filePatterns.push('*.spec.ts', '*.test.ts');
            } else if (pathPart.endsWith('_test.go')) {
              projectType = 'go';
              filePatterns.push('*_test.go');
            } else if (pathPart.includes('test_') && pathPart.endsWith('.py')) {
              projectType = 'python';
              filePatterns.push('test_*.py', '*_test.py');
            } else if (pathPart.endsWith('_spec.rb')) {
              projectType = 'ruby';
              filePatterns.push('*_spec.rb');
            }
          }
        }
      }
    }

    // Also check for explicit test directory mentions in the plan
    const testingMatch = content.match(/\*\*Testing\*\*:\s*([^\n]+)/i);
    if (testingMatch) {
      const testingInfo = testingMatch[1];
      // Extract directory from patterns like "VS Code Extension Test framework (`speckit-extension/test/`)"
      const dirMatch = testingInfo.match(/`([^`]+(?:test|tests|spec|specs)[^`]*)`/i);
      if (dirMatch) {
        const dir = dirMatch[1].replace(/\/$/, '');
        if (!directories.includes(dir)) {
          directories.push(dir);
        }
      }
    }

    // Set default file patterns if none found
    if (filePatterns.length === 0) {
      filePatterns.push('*.spec.ts', '*.test.ts');
    }

    return { directories, filePatterns, projectType };
  }

  /**
   * Extract the test directory path from a code block
   */
  private extractTestDirectory(pathPart: string, block: string): string | null {
    // Find the root directory from the block (first line with a path)
    const lines = block.split('\n');
    let rootDir = '';

    for (const line of lines) {
      const match = line.match(/^([a-zA-Z0-9_\-]+\/)/);
      if (match) {
        rootDir = match[1].replace(/\/$/, '');
        break;
      }
    }

    // Build the full path
    if (pathPart.includes('/')) {
      // Already has directory structure (e.g., "test/suite/")
      const parts = pathPart.split('/').filter(p => p); // Remove empty parts
      const testIndex = parts.findIndex(p => 
        /^(test|tests|__tests__|spec|specs|e2e|integration|unit)$/i.test(p)
      );
      if (testIndex >= 0) {
        // Include rootDir if the pathPart doesn't already start with it
        const testPath = parts.slice(0, testIndex + 1).join('/');
        if (rootDir && !pathPart.startsWith(rootDir)) {
          return `${rootDir}/${testPath}`;
        }
        return testPath;
      }
    }

    // Just the test directory name
    if (/^(test|tests|__tests__|spec|specs|e2e|integration|unit)$/i.test(pathPart)) {
      return rootDir ? `${rootDir}/${pathPart}` : pathPart;
    }

    return null;
  }

  /**
   * Fall back to discovering test directories from workspace structure
   */
  private discoverFromWorkspace(workspaceRoot: string): TestDirectoryConfig {
    const directories: string[] = [];
    const filePatterns: string[] = ['*.spec.ts', '*.test.ts'];
    let projectType = 'unknown';

    // Common test directory locations to check
    const commonDirs = [
      'tests/e2e',
      'tests',
      'test',
      '__tests__',
      'spec',
      'specs',
    ];

    for (const dir of commonDirs) {
      const fullPath = path.join(workspaceRoot, dir);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        directories.push(dir);
        
        // Detect project type from files in directory
        const files = this.listFilesRecursive(fullPath, 2);
        for (const file of files) {
          if (file.endsWith('.spec.ts') || file.endsWith('.test.ts')) {
            projectType = 'typescript';
            break;
          } else if (file.endsWith('_test.go')) {
            projectType = 'go';
            filePatterns.length = 0;
            filePatterns.push('*_test.go');
            break;
          } else if (file.includes('test_') && file.endsWith('.py')) {
            projectType = 'python';
            filePatterns.length = 0;
            filePatterns.push('test_*.py', '*_test.py');
            break;
          }
        }
        
        break; // Use first found directory
      }
    }

    // Default to tests/e2e if nothing found
    if (directories.length === 0) {
      directories.push('tests/e2e');
    }

    return { directories, filePatterns, projectType };
  }

  /**
   * List files recursively up to a certain depth
   */
  private listFilesRecursive(dir: string, maxDepth: number, currentDepth = 0): string[] {
    if (currentDepth >= maxDepth || !fs.existsSync(dir)) {
      return [];
    }

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        files.push(...this.listFilesRecursive(
          path.join(dir, entry.name),
          maxDepth,
          currentDepth + 1
        ));
      } else {
        files.push(entry.name);
      }
    }

    return files;
  }
}
