import * as fs from 'fs';
import * as path from 'path';

export type MaturityLevel = 'none' | 'partial' | 'complete';
export type TestStatus = 'pass' | 'fail' | 'unknown';

export interface TestPassStatus {
  testId: string;  // Format: filename:line (e.g., "us1-feature.spec.ts:15")
  status: TestStatus;
}

export interface ScenarioData {
  level: MaturityLevel;
  tests: Map<string, TestStatus>;  // testId -> status
}

export interface MaturityData {
  lastUpdated?: string;
  userStories: Map<string, {
    overall: MaturityLevel;
    scenarios: Map<string, ScenarioData>;
  }>;
}

// Theme colors for maturity levels (used with VS Code ThemeIcon)
export const MATURITY_COLORS: Record<MaturityLevel, string> = {
  none: 'charts.red',
  partial: 'charts.yellow', 
  complete: 'charts.green'
};

export const MATURITY_TOOLTIPS: Record<MaturityLevel, string> = {
  none: 'None - No test exists for this scenario',
  partial: 'Partial - Test exists but doesn\'t fully cover Given/When/Then',
  complete: 'Complete - Test fully covers the acceptance scenario and passes'
};

// Icons for display in prompts/documentation (not in tree view)
export const MATURITY_ICONS: Record<MaturityLevel, string> = {
  none: '🔴',
  partial: '🟡',
  complete: '🟢'
};

export class MaturityManager {
  private cache: Map<string, MaturityData> = new Map();

  getMaturityFilePath(specFilePath: string): string {
    const dir = path.dirname(specFilePath);
    return path.join(dir, 'maturity.md');
  }

  getMaturityData(specFilePath: string): MaturityData {
    const maturityPath = this.getMaturityFilePath(specFilePath);
    
    if (this.cache.has(maturityPath)) {
      return this.cache.get(maturityPath)!;
    }

    const data = this.parseMaturityFile(maturityPath);
    this.cache.set(maturityPath, data);
    return data;
  }

  clearCache(specFilePath?: string): void {
    if (specFilePath) {
      const maturityPath = this.getMaturityFilePath(specFilePath);
      this.cache.delete(maturityPath);
    } else {
      this.cache.clear();
    }
  }

  getScenarioMaturity(specFilePath: string, userStoryNumber: number, scenarioId: string): MaturityLevel {
    const data = this.getMaturityData(specFilePath);
    const storyKey = `US${userStoryNumber}`;
    const story = data.userStories.get(storyKey);
    
    if (!story) {
      return 'none';
    }
    
    const scenarioData = story.scenarios.get(scenarioId);
    return scenarioData?.level || 'none';
  }

  getTestStatus(specFilePath: string, userStoryNumber: number, scenarioId: string, testId: string): TestStatus {
    const data = this.getMaturityData(specFilePath);
    const storyKey = `US${userStoryNumber}`;
    const story = data.userStories.get(storyKey);
    
    if (!story) {
      return 'unknown';
    }
    
    const scenarioData = story.scenarios.get(scenarioId);
    if (!scenarioData) {
      return 'unknown';
    }
    
    return scenarioData.tests.get(testId) || 'unknown';
  }

  // Generate a test ID from file path and test name (minimal unique identifier)
  // Format: "filename#testname" or just "testname" if unique enough
  generateTestId(testFilePath: string, testName?: string): string {
    const fileName = path.basename(testFilePath);
    if (testName) {
      // Use a minimal unique identifier: filename#testname
      // This is more stable than line numbers which change frequently
      return `${fileName}#${testName}`;
    }
    return fileName;
  }

  getUserStoryMaturity(specFilePath: string, userStoryNumber: number): MaturityLevel {
    const data = this.getMaturityData(specFilePath);
    const storyKey = `US${userStoryNumber}`;
    const story = data.userStories.get(storyKey);
    
    if (!story) {
      return 'none';
    }

    // Return the lowest maturity level among all scenarios
    const levels: MaturityLevel[] = ['none', 'partial', 'complete'];
    let lowestIndex = levels.length - 1;
    
    for (const scenarioData of story.scenarios.values()) {
      const index = levels.indexOf(scenarioData.level);
      if (index < lowestIndex) {
        lowestIndex = index;
      }
    }
    
    // Also consider the overall if set
    if (story.overall) {
      const overallIndex = levels.indexOf(story.overall);
      if (overallIndex < lowestIndex) {
        lowestIndex = overallIndex;
      }
    }
    
    return levels[lowestIndex];
  }

  setScenarioMaturity(specFilePath: string, userStoryNumber: number, scenarioId: string, level: MaturityLevel): void {
    const data = this.getMaturityData(specFilePath);
    const storyKey = `US${userStoryNumber}`;
    
    if (!data.userStories.has(storyKey)) {
      data.userStories.set(storyKey, {
        overall: 'none',
        scenarios: new Map()
      });
    }
    
    const story = data.userStories.get(storyKey)!;
    const existingScenario = story.scenarios.get(scenarioId);
    story.scenarios.set(scenarioId, {
      level,
      tests: existingScenario?.tests || new Map()
    });
    
    // Update overall based on lowest scenario level
    story.overall = this.calculateOverallLevel(story.scenarios);
    
    this.writeMaturityFile(specFilePath, data);
  }

  setTestStatus(specFilePath: string, userStoryNumber: number, scenarioId: string, testId: string, status: TestStatus): void {
    const data = this.getMaturityData(specFilePath);
    const storyKey = `US${userStoryNumber}`;
    
    if (!data.userStories.has(storyKey)) {
      data.userStories.set(storyKey, {
        overall: 'none',
        scenarios: new Map()
      });
    }
    
    const story = data.userStories.get(storyKey)!;
    if (!story.scenarios.has(scenarioId)) {
      story.scenarios.set(scenarioId, {
        level: 'none',
        tests: new Map()
      });
    }
    
    const scenarioData = story.scenarios.get(scenarioId)!;
    scenarioData.tests.set(testId, status);
    
    this.writeMaturityFile(specFilePath, data);
  }

  private calculateOverallLevel(scenarios: Map<string, ScenarioData>): MaturityLevel {
    const levels: MaturityLevel[] = ['none', 'partial', 'complete'];
    let lowestIndex = levels.length - 1;
    
    for (const scenarioData of scenarios.values()) {
      const index = levels.indexOf(scenarioData.level);
      if (index < lowestIndex) {
        lowestIndex = index;
      }
    }
    
    return levels[lowestIndex];
  }

  private parseMaturityFile(filePath: string): MaturityData {
    const data: MaturityData = {
      userStories: new Map()
    };

    if (!fs.existsSync(filePath)) {
      return data;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      let currentStory: string | null = null;
      
      for (const line of lines) {
        // Parse YAML frontmatter for lastUpdated
        if (line.startsWith('lastUpdated:')) {
          data.lastUpdated = line.replace('lastUpdated:', '').trim();
          continue;
        }
        
        // Parse user story header: ## US1 - Title or ## US1
        const storyMatch = line.match(/^##\s+(US\d+)/);
        if (storyMatch) {
          currentStory = storyMatch[1];
          if (!data.userStories.has(currentStory)) {
            data.userStories.set(currentStory, {
              overall: 'none',
              scenarios: new Map()
            });
          }
          continue;
        }
        
        // Parse maturity entry: - **US1-AS1**: complete or - **US1-AS1**: complete | tests: [file:3: ✓]
        // Or simple format: - **Overall**: partial
        const entryMatch = line.match(/^-\s+\*\*([^*]+)\*\*:\s*(\w+)(?:\s*\|\s*tests:\s*\[([^\]]*)\])?/);
        if (entryMatch && currentStory) {
          const [, key, value, testsStr] = entryMatch;
          const level = this.parseLevel(value);
          const story = data.userStories.get(currentStory)!;
          
          if (key.toLowerCase() === 'overall') {
            story.overall = level;
          } else {
            // Parse test statuses if present
            const tests = new Map<string, TestStatus>();
            if (testsStr) {
              // Parse format: "file#testname: ✓, file#testname2: ✗"
              // Also supports legacy format: "file:3: ✓"
              const testParts = testsStr.split(',').map(s => s.trim());
              for (const part of testParts) {
                // New format: filename#testname: status (status is at the very end after last colon)
                // The test name can contain colons, so we match from the end
                const newFormatMatch = part.match(/^(.+#.+):\s*([✓✗?]|pass|fail|unknown)$/);
                if (newFormatMatch) {
                  const [, testId, statusStr] = newFormatMatch;
                  tests.set(testId, this.parseTestStatus(statusStr));
                  continue;
                }
                // Legacy format: filename:line: status
                const legacyMatch = part.match(/^([^:]+:\d+):\s*([✓✗?]|pass|fail|unknown)$/);
                if (legacyMatch) {
                  const [, testId, statusStr] = legacyMatch;
                  tests.set(testId, this.parseTestStatus(statusStr));
                }
              }
            }
            story.scenarios.set(key, { level, tests });
          }
        }
      }
    } catch {
      // Return empty data on parse error
    }

    return data;
  }

  private parseLevel(value: string): MaturityLevel {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'partial' || normalized === 'complete') {
      return normalized;
    }
    return 'none';
  }

  private parseTestStatus(value: string): TestStatus {
    const normalized = value.trim();
    if (normalized === '✓' || normalized === 'pass') {
      return 'pass';
    }
    if (normalized === '✗' || normalized === 'fail') {
      return 'fail';
    }
    return 'unknown';
  }

  private writeMaturityFile(specFilePath: string, data: MaturityData): void {
    const maturityPath = this.getMaturityFilePath(specFilePath);
    
    let content = `---
lastUpdated: ${new Date().toISOString()}
---
# Test Maturity Levels

`;

    // Sort user stories by number
    const sortedStories = Array.from(data.userStories.entries()).sort((a, b) => {
      const numA = parseInt(a[0].replace('US', ''));
      const numB = parseInt(b[0].replace('US', ''));
      return numA - numB;
    });

    for (const [storyKey, story] of sortedStories) {
      content += `## ${storyKey}\n`;
      content += `- **Overall**: ${story.overall}\n`;
      
      // Sort scenarios by ID
      const sortedScenarios = Array.from(story.scenarios.entries()).sort((a, b) => {
        return a[0].localeCompare(b[0]);
      });
      
      for (const [scenarioId, scenarioData] of sortedScenarios) {
        // Format: - **US1-AS1**: complete | tests: [file:3: ✓, file:7: ✗]
        let line = `- **${scenarioId}**: ${scenarioData.level}`;
        
        if (scenarioData.tests.size > 0) {
          const testEntries = Array.from(scenarioData.tests.entries())
            .map(([testId, status]) => {
              const statusIcon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '?';
              return `${testId}: ${statusIcon}`;
            })
            .join(', ');
          line += ` | tests: [${testEntries}]`;
        }
        
        content += line + '\n';
      }
      
      content += '\n';
    }

    fs.writeFileSync(maturityPath, content, 'utf-8');
    
    // Update cache
    this.cache.set(maturityPath, data);
  }
}
