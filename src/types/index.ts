import * as vscode from 'vscode';

export interface FeatureSpec {
  path: string;
  name: string;
  displayName: string;
  number: number;
  specFilePath: string;
  planFilePath?: string;
  userStories: UserStory[];
  lastModified: number;
}

export interface UserStory {
  number: number;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  startLine: number;
  endLine: number;
  description: string;
  whyPriority?: string;
  independentTest?: string;
  acceptanceScenarios: AcceptanceScenario[];
  featureSpec?: FeatureSpec;
}

export interface AcceptanceScenario {
  number: number;
  id: string;
  given: string;
  when: string;
  then: string;
  line: number;
  linkedTests: IntegrationTest[];
  userStory?: UserStory;
}

export interface IntegrationTest {
  filePath: string;
  fileName: string;
  testName?: string;
  line?: number;
  specAnnotation?: string;
  acceptanceScenario?: AcceptanceScenario;
  passStatus?: 'pass' | 'fail';  // Read from @passed/@failed comment in test file
  passDate?: string;  // Date when test was marked as passed/failed (YYYY-MM-DD)
}

export type SpecTreeItemType = 'feature' | 'userStory' | 'scenario' | 'test';

export class SpecTreeItem extends vscode.TreeItem {
  public children?: SpecTreeItem[];

  constructor(
    public readonly label: string,
    public readonly type: SpecTreeItemType,
    public readonly filePath: string,
    public readonly line?: number,
    collapsibleState?: vscode.TreeItemCollapsibleState,
    public readonly data?: FeatureSpec | UserStory | AcceptanceScenario | IntegrationTest
  ) {
    super(label, collapsibleState);
    
    // Generate unique ID for tree item (required for reveal() to work)
    this.id = `${type}:${filePath}:${line || 0}:${label}`;
    
    this.contextValue = type;
    
    if (type === 'feature') {
      this.iconPath = new vscode.ThemeIcon('file-code');
    } else if (type === 'userStory') {
      // Icon set by setMaturityIcon() - default to book
      this.iconPath = new vscode.ThemeIcon('book');
    } else if (type === 'scenario') {
      // Icon set by setMaturityIcon() - default to checklist
      this.iconPath = new vscode.ThemeIcon('checklist');
    } else if (type === 'test') {
      this.iconPath = new vscode.ThemeIcon('beaker');
    }

    if (line !== undefined) {
      // Use different commands based on item type
      if (type === 'test') {
        this.command = {
          command: 'speckit.goToTest',
          title: 'Open Test with Spec',
          arguments: [this]
        };
      } else if (type === 'userStory') {
        this.command = {
          command: 'speckit.openWithTests',
          title: 'Open with Tests',
          arguments: [this]
        };
      } else if (type === 'scenario') {
        this.command = {
          command: 'speckit.goToScenario',
          title: 'Open Scenario with Test',
          arguments: [this]
        };
      } else {
        this.command = {
          command: 'speckit.openSpec',
          title: 'Open Spec',
          arguments: [this]
        };
      }
    }
  }
}

export interface SpecKitUIState {
  expandedNodes: string[];
  lastOpenedSpec?: string;
  lastSelectedItem?: string;
  splitViewEnabled: boolean;
}

export enum SpecKitErrorCode {
  PARSE_ERROR = 'PARSE_ERROR',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  INVALID_FORMAT = 'INVALID_FORMAT',
  TEST_LINK_FAILED = 'TEST_LINK_FAILED'
}

export class SpecKitError extends Error {
  constructor(
    public code: SpecKitErrorCode,
    message: string,
    public filePath?: string,
    public line?: number
  ) {
    super(message);
    this.name = 'SpecKitError';
  }
}
