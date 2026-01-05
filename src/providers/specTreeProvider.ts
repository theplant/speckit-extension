import * as vscode from 'vscode';
import * as path from 'path';
import { SpecParser } from '../parsers/specParser';
import { SpecMetadataManager } from '../helpers/specMetadataManager';
import { MaturityManager, MATURITY_COLORS, MATURITY_TOOLTIPS, MaturityLevel } from '../helpers/maturityManager';
import { TestLinker } from '../linkers/testLinker';
import { FeatureSpec, UserStory, AcceptanceScenario, IntegrationTest, SpecTreeItem } from '../types';

export class SpecTreeProvider implements vscode.TreeDataProvider<SpecTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private specs: FeatureSpec[] = [];
  private parser = new SpecParser();
  private metadataManager = new SpecMetadataManager();
  private maturityManager = new MaturityManager();
  private testLinker = new TestLinker();
  private workspaceRoot: string;
  private specsDir: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    
    const config = vscode.workspace.getConfiguration('speckit');
    this.specsDir = config.get<string>('specsDirectory', 'specs');
    
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.specs = await this.parser.parseAllSpecs(this.workspaceRoot, this.specsDir);
    
    for (const spec of this.specs) {
      // Read test directory from spec.md metadata (user-configured)
      const testDirectory = this.metadataManager.getTestDirectory(spec.specFilePath);
      
      // Only link tests if test directory is configured
      if (testDirectory) {
        for (const story of spec.userStories) {
          const tests = await this.testLinker.findTestsForStory(
            this.workspaceRoot,
            testDirectory,
            spec.name,
            story.number
          );
          
          for (const scenario of story.acceptanceScenarios) {
            scenario.userStory = story;
            
            scenario.linkedTests = tests.filter(t => {
              if (t.specAnnotation) {
                return t.specAnnotation.includes(`US${story.number}-AS${scenario.number}`);
              }
              if (t.testName) {
                const exactMatch = new RegExp(`US${story.number}-AS${scenario.number}\\b`);
                return exactMatch.test(t.testName);
              }
              return false;
            });
          }
        }
      } else {
        // No test directory configured - just set parent references
        for (const story of spec.userStories) {
          for (const scenario of story.acceptanceScenarios) {
            scenario.userStory = story;
            scenario.linkedTests = [];
          }
        }
      }
    }
    
    this._onDidChangeTreeData.fire();
  }

  getMetadataManager(): SpecMetadataManager {
    return this.metadataManager;
  }

  getMaturityManager(): MaturityManager {
    return this.maturityManager;
  }

  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  getTreeItem(element: SpecTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecTreeItem): Promise<SpecTreeItem[]> {
    if (!element) {
      return this.specs.map(spec => new SpecTreeItem(
        `${spec.number.toString().padStart(3, '0')} - ${spec.displayName}`,
        'feature',
        spec.specFilePath,
        1,
        vscode.TreeItemCollapsibleState.Collapsed,
        spec
      ));
    }

    if (element.type === 'feature') {
      const spec = element.data as FeatureSpec;
      return spec.userStories.map(story => {
        const hasTests = story.acceptanceScenarios.some(s => s.linkedTests.length > 0);
        
        // Check if all tests in all scenarios have passed
        const allTestsPassed = story.acceptanceScenarios.every(s => 
          s.linkedTests.length > 0 && s.linkedTests.every(t => t.passStatus === 'pass')
        );
        
        // If tests exist but not all passed, show yellow regardless of maturity level
        let maturityLevel = this.maturityManager.getUserStoryMaturity(spec.specFilePath, story.number);
        if (hasTests && !allTestsPassed) {
          maturityLevel = 'partial'; // Yellow - tests exist but not all passed
        }
        
        const maturityColor = MATURITY_COLORS[maturityLevel];
        const item = new SpecTreeItem(
          `US${story.number}: ${story.title}`,
          'userStory',
          spec.specFilePath,
          story.startLine,
          vscode.TreeItemCollapsibleState.Collapsed,
          story
        );
        // Use 'book' icon with maturity color for user stories
        item.iconPath = new vscode.ThemeIcon('book', new vscode.ThemeColor(maturityColor));
        item.description = story.priority;
        const passStatus = allTestsPassed ? '✓ All tests passed' : (hasTests ? '⚠ Some tests not passed' : 'No tests');
        item.tooltip = `${MATURITY_TOOLTIPS[maturityLevel]}\n${passStatus}\n\n${story.priority} - ${story.title}\n${story.description || ''}`;
        if (hasTests) {
          item.resourceUri = vscode.Uri.parse(`speckit:hasTests`);
        }
        return item;
      });
    }

    if (element.type === 'userStory') {
      const story = element.data as UserStory;
      return story.acceptanceScenarios.map(scenario => {
        const hasTests = scenario.linkedTests.length > 0;
        
        // Check if all tests for this scenario have passed
        const allTestsPassed = hasTests && scenario.linkedTests.every(t => t.passStatus === 'pass');
        
        // If tests exist but not all passed, show yellow regardless of maturity level
        let maturityLevel = this.maturityManager.getScenarioMaturity(element.filePath, story.number, scenario.id);
        if (hasTests && !allTestsPassed) {
          maturityLevel = 'partial'; // Yellow - tests exist but not all passed
        }
        
        const maturityColor = MATURITY_COLORS[maturityLevel];
        const item = new SpecTreeItem(
          `${scenario.id}: Given ${this.truncate(scenario.given, 40)}...`,
          'scenario',
          element.filePath,
          scenario.line,
          hasTests ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
          scenario
        );
        // Use 'checklist' icon with maturity color for acceptance scenarios
        item.iconPath = new vscode.ThemeIcon('checklist', new vscode.ThemeColor(maturityColor));
        const passStatus = allTestsPassed ? '✓ All tests passed' : (hasTests ? '⚠ Tests not passed' : 'No tests');
        item.tooltip = `${MATURITY_TOOLTIPS[maturityLevel]}\n${passStatus}\n\nGiven ${scenario.given}\nWhen ${scenario.when}\nThen ${scenario.then}`;
        return item;
      });
    }

    if (element.type === 'scenario') {
      const scenario = element.data as AcceptanceScenario;
      return scenario.linkedTests.map(test => {
        // Store parent scenario reference in test for split view navigation
        test.acceptanceScenario = scenario;
        
        const item = new SpecTreeItem(
          test.testName || test.fileName,
          'test',
          test.filePath,
          test.line,
          vscode.TreeItemCollapsibleState.None,
          test
        );
        
        // Use pass/fail icon based on @passed/@failed comment in test file
        if (test.passStatus === 'pass') {
          item.iconPath = new vscode.ThemeIcon('pass', new vscode.ThemeColor('charts.green'));
          item.tooltip = `✓ PASSED on ${test.passDate}\nTest: ${test.fileName}${test.testName ? `\n${test.testName}` : ''}`;
        } else if (test.passStatus === 'fail') {
          item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
          item.tooltip = `✗ FAILED on ${test.passDate}\nTest: ${test.fileName}${test.testName ? `\n${test.testName}` : ''}`;
        } else {
          item.iconPath = new vscode.ThemeIcon('beaker');
          item.tooltip = `Test: ${test.fileName}${test.testName ? `\n${test.testName}` : ''}\n(Add // @passed: YYYY-MM-DD before test to mark as passed)`;
        }
        
        // Store spec file path for split view
        (item as any).specFilePath = element.filePath;
        (item as any).scenarioLine = scenario.line;
        return item;
      });
    }

    return [];
  }

  getParent(element: SpecTreeItem): SpecTreeItem | undefined {
    return undefined;
  }

  getSpecs(): FeatureSpec[] {
    return this.specs;
  }

  findSpecByPath(filePath: string): FeatureSpec | undefined {
    return this.specs.find(s => s.specFilePath === filePath);
  }

  findStoryByNumber(specPath: string, storyNumber: number): UserStory | undefined {
    const spec = this.findSpecByPath(specPath);
    return spec?.userStories.find(s => s.number === storyNumber);
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }
}
