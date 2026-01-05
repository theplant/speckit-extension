import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { AcceptanceScenario, UserStory } from '../types';

export class TestGenerator {
  private workspaceRoot: string;
  private testsDir: string;

  constructor(workspaceRoot: string, testsDir: string = 'tests/e2e') {
    this.workspaceRoot = workspaceRoot;
    this.testsDir = testsDir;
  }

  getTestFilePath(storyNumber: number, featureName: string): string {
    const fileName = `us${storyNumber}-${this.slugify(featureName)}.spec.ts`;
    return path.join(this.workspaceRoot, this.testsDir, fileName);
  }

  async ensureTestFileExists(
    storyNumber: number,
    storyTitle: string,
    featureName: string
  ): Promise<string> {
    const testFilePath = this.getTestFilePath(storyNumber, featureName);
    
    if (!fs.existsSync(testFilePath)) {
      await this.createTestFile(testFilePath, storyNumber, storyTitle);
    }
    
    return testFilePath;
  }

  async createTestFile(
    filePath: string,
    storyNumber: number,
    storyTitle: string
  ): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const template = `import { test, expect } from '@playwright/test';

test.describe('US${storyNumber}: ${storyTitle}', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  // Add test cases here
});
`;

    fs.writeFileSync(filePath, template, 'utf-8');
  }

  async ensureTestPlaceholderExists(
    testFilePath: string,
    storyNumber: number,
    scenario: AcceptanceScenario
  ): Promise<{ created: boolean; line: number }> {
    const content = fs.readFileSync(testFilePath, 'utf-8');
    const testId = `US${storyNumber}-AS${scenario.number}`;
    
    // Check if test already exists
    if (content.includes(testId)) {
      // Find the line number
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(testId)) {
          return { created: false, line: i + 1 };
        }
      }
      return { created: false, line: 1 };
    }

    // Find the position to insert (before the last closing brace of describe block)
    const lines = content.split('\n');
    let insertIndex = lines.length - 1;
    
    // Find the last }); which closes the describe block
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === '});') {
        insertIndex = i;
        break;
      }
    }

    // Create the test placeholder
    const testPlaceholder = `
  test('${testId}: Given ${this.truncate(scenario.given, 50)}, When ${this.truncate(scenario.when, 30)}, Then ${this.truncate(scenario.then, 30)}', async ({ page }) => {
    // TODO: Implement test for acceptance scenario
    // Given: ${scenario.given}
    // When: ${scenario.when}
    // Then: ${scenario.then}
    test.skip();
  });
`;

    // Insert the placeholder
    lines.splice(insertIndex, 0, testPlaceholder);
    fs.writeFileSync(testFilePath, lines.join('\n'), 'utf-8');

    return { created: true, line: insertIndex + 2 }; // +2 for the test line after empty line
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 30);
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
