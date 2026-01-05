# Extension API Contract: SpecKit Windsurf Plugin

**Date**: 2024-12-30  
**Feature**: 002-windsurf-plugin

## Overview

This document defines the VS Code Extension API contracts for the SpecKit plugin. Since this is a VS Code extension (not a web API), contracts are defined as TypeScript interfaces and VS Code contribution points.

## Package.json Contribution Points

### View Container

```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "speckit-explorer",
          "title": "SpecKit",
          "icon": "media/speckit-icon.svg"
        }
      ]
    }
  }
}
```

### Views

```json
{
  "contributes": {
    "views": {
      "speckit-explorer": [
        {
          "id": "speckit.specsView",
          "name": "Specs",
          "contextualTitle": "SpecKit Specs"
        }
      ]
    }
  }
}
```

### Commands

```json
{
  "contributes": {
    "commands": [
      {
        "command": "speckit.refreshSpecs",
        "title": "Refresh Specs",
        "icon": "$(refresh)",
        "category": "SpecKit"
      },
      {
        "command": "speckit.openSpec",
        "title": "Open Spec",
        "category": "SpecKit"
      },
      {
        "command": "speckit.openWithTests",
        "title": "Open with Tests (Split View)",
        "category": "SpecKit"
      },
      {
        "command": "speckit.createSpec",
        "title": "Create New Spec",
        "icon": "$(add)",
        "category": "SpecKit"
      },
      {
        "command": "speckit.goToScenario",
        "title": "Go to Acceptance Scenario",
        "category": "SpecKit"
      },
      {
        "command": "speckit.goToTest",
        "title": "Go to Integration Test",
        "category": "SpecKit"
      }
    ]
  }
}
```

### Menus

```json
{
  "contributes": {
    "menus": {
      "view/title": [
        {
          "command": "speckit.refreshSpecs",
          "when": "view == speckit.specsView",
          "group": "navigation"
        },
        {
          "command": "speckit.createSpec",
          "when": "view == speckit.specsView",
          "group": "navigation"
        }
      ],
      "view/item/context": [
        {
          "command": "speckit.openWithTests",
          "when": "view == speckit.specsView && viewItem == userStory",
          "group": "inline"
        }
      ]
    }
  }
}
```

### Activation Events

```json
{
  "activationEvents": [
    "workspaceContains:**/specs/*/spec.md"
  ]
}
```

## TypeScript Interfaces

### TreeDataProvider Contract

```typescript
import * as vscode from 'vscode';

/**
 * Provides data for the SpecKit tree view in the sidebar.
 */
export interface ISpecTreeDataProvider extends vscode.TreeDataProvider<SpecTreeItem> {
  /**
   * Refresh the entire tree view.
   */
  refresh(): void;
  
  /**
   * Refresh a specific tree item and its children.
   */
  refreshItem(item: SpecTreeItem): void;
  
  /**
   * Get the tree item for a given element.
   */
  getTreeItem(element: SpecTreeItem): vscode.TreeItem;
  
  /**
   * Get children of a tree item, or root items if no element provided.
   */
  getChildren(element?: SpecTreeItem): Thenable<SpecTreeItem[]>;
  
  /**
   * Get parent of a tree item for reveal operations.
   */
  getParent(element: SpecTreeItem): SpecTreeItem | undefined;
}
```

### Spec Parser Contract

```typescript
/**
 * Parses spec.md files and extracts structured data.
 */
export interface ISpecParser {
  /**
   * Parse a spec.md file and return structured data.
   * @param filePath Absolute path to spec.md file
   * @returns Parsed feature spec or null if parsing fails
   */
  parseSpecFile(filePath: string): Promise<FeatureSpec | null>;
  
  /**
   * Parse all spec.md files in the workspace.
   * @returns Array of parsed feature specs
   */
  parseAllSpecs(): Promise<FeatureSpec[]>;
  
  /**
   * Find line number for a specific user story.
   * @param filePath Path to spec.md
   * @param storyNumber User story number
   * @returns Line number (1-indexed) or undefined
   */
  findUserStoryLine(filePath: string, storyNumber: number): Promise<number | undefined>;
  
  /**
   * Find line number for a specific acceptance scenario.
   * @param filePath Path to spec.md
   * @param storyNumber User story number
   * @param scenarioNumber Acceptance scenario number
   * @returns Line number (1-indexed) or undefined
   */
  findScenarioLine(
    filePath: string, 
    storyNumber: number, 
    scenarioNumber: number
  ): Promise<number | undefined>;
}
```

### Test Linker Contract

```typescript
/**
 * Links acceptance scenarios to integration test files.
 */
export interface ITestLinker {
  /**
   * Find integration tests linked to a user story.
   * @param featureName Feature directory name (e.g., "001-feature")
   * @param storyNumber User story number
   * @returns Array of linked test files
   */
  findTestsForStory(
    featureName: string, 
    storyNumber: number
  ): Promise<IntegrationTest[]>;
  
  /**
   * Find integration tests linked to a specific acceptance scenario.
   * @param featureName Feature directory name
   * @param storyNumber User story number
   * @param scenarioNumber Acceptance scenario number
   * @returns Array of linked test files
   */
  findTestsForScenario(
    featureName: string,
    storyNumber: number,
    scenarioNumber: number
  ): Promise<IntegrationTest[]>;
  
  /**
   * Scan test files for spec annotations.
   * @returns Map of spec IDs to test locations
   */
  scanTestAnnotations(): Promise<Map<string, IntegrationTest[]>>;
}
```

### Editor Controller Contract

```typescript
/**
 * Controls editor operations for spec and test files.
 */
export interface IEditorController {
  /**
   * Open a spec file and scroll to a specific line.
   * @param filePath Path to spec.md
   * @param line Line number to scroll to (1-indexed)
   * @param column Editor column (default: One)
   */
  openSpecAtLine(
    filePath: string, 
    line: number, 
    column?: vscode.ViewColumn
  ): Promise<vscode.TextEditor>;
  
  /**
   * Open spec and test files in split view.
   * @param specPath Path to spec.md
   * @param testPath Path to test file
   * @param specLine Line in spec to scroll to
   * @param testLine Line in test to scroll to
   */
  openSplitView(
    specPath: string,
    testPath: string,
    specLine?: number,
    testLine?: number
  ): Promise<void>;
  
  /**
   * Scroll an existing editor to a specific line.
   * @param editor Text editor instance
   * @param line Line number (1-indexed)
   */
  scrollToLine(editor: vscode.TextEditor, line: number): void;
}
```

### State Manager Contract

```typescript
/**
 * Manages persistent UI state in workspace storage.
 */
export interface IStateManager {
  /**
   * Get expanded node IDs.
   */
  getExpandedNodes(): string[];
  
  /**
   * Set expanded node IDs.
   */
  setExpandedNodes(nodeIds: string[]): Promise<void>;
  
  /**
   * Get last opened spec path.
   */
  getLastOpenedSpec(): string | undefined;
  
  /**
   * Set last opened spec path.
   */
  setLastOpenedSpec(path: string): Promise<void>;
  
  /**
   * Get split view preference.
   */
  getSplitViewEnabled(): boolean;
  
  /**
   * Set split view preference.
   */
  setSplitViewEnabled(enabled: boolean): Promise<void>;
}
```

## Event Contracts

### Tree View Events

```typescript
/**
 * Fired when the tree data changes.
 */
onDidChangeTreeData: vscode.Event<SpecTreeItem | undefined | null | void>;
```

### File Watcher Events

```typescript
/**
 * Watch for spec file changes.
 */
const specWatcher = vscode.workspace.createFileSystemWatcher(
  '**/specs/**/spec.md'
);

specWatcher.onDidChange(uri => { /* re-parse file */ });
specWatcher.onDidCreate(uri => { /* add to tree */ });
specWatcher.onDidDelete(uri => { /* remove from tree */ });
```

## Error Handling

```typescript
/**
 * Error types for spec operations.
 */
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
```

## Configuration Schema

```json
{
  "contributes": {
    "configuration": {
      "title": "SpecKit",
      "properties": {
        "speckit.specsDirectory": {
          "type": "string",
          "default": "specs",
          "description": "Directory containing spec files"
        },
        "speckit.testsDirectory": {
          "type": "string",
          "default": "tests/e2e",
          "description": "Directory containing integration tests"
        },
        "speckit.autoOpenSplitView": {
          "type": "boolean",
          "default": true,
          "description": "Automatically open tests in split view when clicking user story with linked tests"
        }
      }
    }
  }
}
```
