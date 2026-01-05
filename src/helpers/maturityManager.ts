import * as fs from 'fs';
import * as path from 'path';

export type MaturityLevel = 'none' | 'partial' | 'complete';
export type TestStatus = 'pass' | 'fail' | 'unknown';

// JSON-serializable test entry
export interface TestEntry {
  filePath: string;      // Relative path to test file
  testName: string;      // Full test name for stable identification
  status: TestStatus;    // pass, fail, or unknown
  lastRun?: string;      // ISO date of last run
}

// JSON-serializable scenario data
export interface ScenarioDataJson {
  level: MaturityLevel;
  tests: TestEntry[];
}

// JSON-serializable user story data
export interface UserStoryDataJson {
  overall: MaturityLevel;
  scenarios: Record<string, ScenarioDataJson>;
}

// JSON-serializable maturity data (for file storage)
export interface MaturityDataJson {
  lastUpdated: string;
  userStories: Record<string, UserStoryDataJson>;
}

// Internal data structures using Maps for efficient lookup
export interface ScenarioData {
  level: MaturityLevel;
  tests: TestEntry[];
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
    return path.join(dir, 'maturity.json');
  }

  // Also check for legacy maturity.md file
  getLegacyMaturityFilePath(specFilePath: string): string {
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

  getTestsForScenario(specFilePath: string, userStoryNumber: number, scenarioId: string): TestEntry[] {
    const data = this.getMaturityData(specFilePath);
    const storyKey = `US${userStoryNumber}`;
    const story = data.userStories.get(storyKey);
    
    if (!story) {
      return [];
    }
    
    const scenarioData = story.scenarios.get(scenarioId);
    return scenarioData?.tests || [];
  }

  getTestStatus(specFilePath: string, userStoryNumber: number, scenarioId: string, testName: string): TestStatus {
    const tests = this.getTestsForScenario(specFilePath, userStoryNumber, scenarioId);
    const test = tests.find(t => t.testName === testName);
    return test?.status || 'unknown';
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
      tests: existingScenario?.tests || []
    });
    
    // Update overall based on lowest scenario level
    story.overall = this.calculateOverallLevel(story.scenarios);
    
    this.writeMaturityFile(specFilePath, data);
  }

  addTest(specFilePath: string, userStoryNumber: number, scenarioId: string, test: TestEntry): void {
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
        tests: []
      });
    }
    
    const scenarioData = story.scenarios.get(scenarioId)!;
    
    // Check if test already exists (by testName)
    const existingIndex = scenarioData.tests.findIndex(t => t.testName === test.testName);
    if (existingIndex >= 0) {
      // Update existing test
      scenarioData.tests[existingIndex] = test;
    } else {
      // Add new test
      scenarioData.tests.push(test);
    }
    
    this.writeMaturityFile(specFilePath, data);
  }

  setTestStatus(specFilePath: string, userStoryNumber: number, scenarioId: string, testName: string, status: TestStatus): void {
    const tests = this.getTestsForScenario(specFilePath, userStoryNumber, scenarioId);
    const test = tests.find(t => t.testName === testName);
    
    if (test) {
      test.status = status;
      test.lastRun = new Date().toISOString().split('T')[0];
      this.writeMaturityFile(specFilePath, this.getMaturityData(specFilePath));
    }
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

    // Try JSON file first
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json: MaturityDataJson = JSON.parse(content);
        return this.jsonToMaturityData(json);
      } catch {
        // Fall through to try legacy format
      }
    }

    // Try legacy maturity.md file
    const legacyPath = this.getLegacyMaturityFilePath(filePath.replace('maturity.json', 'spec.md'));
    if (fs.existsSync(legacyPath)) {
      return this.parseLegacyMaturityFile(legacyPath);
    }

    return data;
  }

  private jsonToMaturityData(json: MaturityDataJson): MaturityData {
    const data: MaturityData = {
      lastUpdated: json.lastUpdated,
      userStories: new Map()
    };

    for (const [storyKey, storyData] of Object.entries(json.userStories)) {
      const scenarios = new Map<string, ScenarioData>();
      
      for (const [scenarioId, scenarioData] of Object.entries(storyData.scenarios)) {
        scenarios.set(scenarioId, {
          level: scenarioData.level,
          tests: scenarioData.tests || []
        });
      }
      
      data.userStories.set(storyKey, {
        overall: storyData.overall,
        scenarios
      });
    }

    return data;
  }

  private maturityDataToJson(data: MaturityData): MaturityDataJson {
    const json: MaturityDataJson = {
      lastUpdated: new Date().toISOString(),
      userStories: {}
    };

    // Sort user stories by number
    const sortedStories = Array.from(data.userStories.entries()).sort((a, b) => {
      const numA = parseInt(a[0].replace('US', ''));
      const numB = parseInt(b[0].replace('US', ''));
      return numA - numB;
    });

    for (const [storyKey, story] of sortedStories) {
      const scenarios: Record<string, ScenarioDataJson> = {};
      
      // Sort scenarios by ID
      const sortedScenarios = Array.from(story.scenarios.entries()).sort((a, b) => {
        return a[0].localeCompare(b[0]);
      });
      
      for (const [scenarioId, scenarioData] of sortedScenarios) {
        scenarios[scenarioId] = {
          level: scenarioData.level,
          tests: scenarioData.tests
        };
      }
      
      json.userStories[storyKey] = {
        overall: story.overall,
        scenarios
      };
    }

    return json;
  }

  private parseLegacyMaturityFile(filePath: string): MaturityData {
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
        
        // Parse maturity entry: - **US1-AS1**: complete
        // Or simple format: - **Overall**: partial
        const entryMatch = line.match(/^-\s+\*\*([^*]+)\*\*:\s*(\w+)/);
        if (entryMatch && currentStory) {
          const [, key, value] = entryMatch;
          const level = this.parseLevel(value);
          const story = data.userStories.get(currentStory)!;
          
          if (key.toLowerCase() === 'overall') {
            story.overall = level;
          } else {
            story.scenarios.set(key, { level, tests: [] });
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

  private writeMaturityFile(specFilePath: string, data: MaturityData): void {
    const maturityPath = this.getMaturityFilePath(specFilePath);
    const json = this.maturityDataToJson(data);
    
    fs.writeFileSync(maturityPath, JSON.stringify(json, null, 2), 'utf-8');
    
    // Update cache
    this.cache.set(maturityPath, data);
  }

  // Scan test files and generate/update maturity.json
  async scanAndUpdateMaturity(
    specFilePath: string,
    workspaceRoot: string,
    testsDir: string,
    testLinker: { findTestsForStory: (root: string, dir: string, feature: string, story: number) => Promise<any[]> }
  ): Promise<void> {
    const data = this.getMaturityData(specFilePath);
    
    // Get feature name from spec path
    const featureName = path.dirname(specFilePath).split('/specs/')[1]?.split('/')[0]?.replace(/^\d+-/, '') || 'feature';
    
    // Scan each user story
    for (const [storyKey, story] of data.userStories) {
      const storyNumber = parseInt(storyKey.replace('US', ''));
      const tests = await testLinker.findTestsForStory(workspaceRoot, testsDir, featureName, storyNumber);
      
      // Group tests by scenario
      for (const test of tests) {
        if (!test.testName) continue;
        
        // Extract scenario ID from test name (e.g., "US1-AS1: Given...")
        const scenarioMatch = test.testName.match(/US\d+-AS\d+/i);
        if (!scenarioMatch) continue;
        
        const scenarioId = scenarioMatch[0].toUpperCase();
        
        // Ensure scenario exists
        if (!story.scenarios.has(scenarioId)) {
          story.scenarios.set(scenarioId, { level: 'none', tests: [] });
        }
        
        const scenarioData = story.scenarios.get(scenarioId)!;
        
        // Add or update test entry
        const testEntry: TestEntry = {
          filePath: path.relative(workspaceRoot, test.filePath),
          testName: test.testName,
          status: test.passStatus || 'unknown',
          lastRun: test.passDate
        };
        
        const existingIndex = scenarioData.tests.findIndex(t => t.testName === test.testName);
        if (existingIndex >= 0) {
          scenarioData.tests[existingIndex] = testEntry;
        } else {
          scenarioData.tests.push(testEntry);
        }
        
        // Update maturity level based on tests
        if (scenarioData.tests.length > 0) {
          const allPassing = scenarioData.tests.every(t => t.status === 'pass');
          const anyTest = scenarioData.tests.length > 0;
          scenarioData.level = allPassing ? 'complete' : anyTest ? 'partial' : 'none';
        }
      }
      
      // Recalculate overall
      story.overall = this.calculateOverallLevel(story.scenarios);
    }
    
    this.writeMaturityFile(specFilePath, data);
  }
}
