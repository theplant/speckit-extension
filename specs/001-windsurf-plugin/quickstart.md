# Quickstart: SpecKit Windsurf Plugin

**Date**: 2024-12-30  
**Feature**: 002-windsurf-plugin

## Prerequisites

- **Windsurf** (or VS Code) installed
- **Node.js** 18+ and **pnpm** installed
- A workspace with a `specs/` directory containing spec.md files

## Project Setup

### 1. Create Extension Scaffold

```bash
# Install VS Code Extension Generator
pnpm add -g yo generator-code

# Generate extension scaffold
yo code

# Select options:
# - New Extension (TypeScript)
# - Name: speckit
# - Identifier: speckit
# - Description: SpecKit - Spec management for Windsurf
# - Enable strict TypeScript: Yes
# - Bundle with esbuild: Yes
```

### 2. Project Structure

```
speckit/
├── src/
│   ├── extension.ts           # Extension entry point
│   ├── providers/
│   │   └── specTreeProvider.ts  # Tree view data provider
│   ├── parsers/
│   │   └── specParser.ts        # Spec.md file parser
│   ├── linkers/
│   │   └── testLinker.ts        # Test file linker
│   ├── controllers/
│   │   └── editorController.ts  # Editor operations
│   ├── state/
│   │   └── stateManager.ts      # UI state persistence
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── media/
│   └── speckit-icon.svg         # Activity bar icon
├── package.json
├── tsconfig.json
└── esbuild.js
```

### 3. Install Dependencies

```bash
cd speckit
pnpm install

# Development dependencies
pnpm add -D @types/vscode @vscode/test-electron esbuild typescript
```

### 4. Configure package.json

```json
{
  "name": "speckit",
  "displayName": "SpecKit",
  "description": "Spec management for Windsurf with Cascade AI integration",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "activationEvents": [
    "workspaceContains:**/specs/*/spec.md"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "speckit-explorer",
        "title": "SpecKit",
        "icon": "media/speckit-icon.svg"
      }]
    },
    "views": {
      "speckit-explorer": [{
        "id": "speckit.specsView",
        "name": "Specs"
      }]
    },
    "commands": [
      {
        "command": "speckit.refreshSpecs",
        "title": "Refresh Specs",
        "icon": "$(refresh)"
      },
      {
        "command": "speckit.openSpec",
        "title": "Open Spec"
      },
      {
        "command": "speckit.openWithTests",
        "title": "Open with Tests"
      }
    ],
    "menus": {
      "view/title": [{
        "command": "speckit.refreshSpecs",
        "when": "view == speckit.specsView",
        "group": "navigation"
      }]
    }
  },
  "scripts": {
    "compile": "esbuild src/extension.ts --bundle --outfile=dist/extension.js --external:vscode --format=cjs --platform=node",
    "watch": "pnpm compile --watch",
    "package": "vsce package",
    "test": "node ./out/test/runTest.js"
  }
}
```

## Implementation Steps

### Step 1: Define Types (`src/types/index.ts`)

```typescript
import * as vscode from 'vscode';

export interface FeatureSpec {
  path: string;
  name: string;
  displayName: string;
  number: number;
  specFilePath: string;
  userStories: UserStory[];
}

export interface UserStory {
  number: number;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  startLine: number;
  acceptanceScenarios: AcceptanceScenario[];
}

export interface AcceptanceScenario {
  number: number;
  id: string;
  given: string;
  when: string;
  then: string;
  line: number;
  linkedTests: IntegrationTest[];
}

export interface IntegrationTest {
  filePath: string;
  fileName: string;
  testName?: string;
  line?: number;
}

export type SpecTreeItemType = 'feature' | 'userStory' | 'scenario' | 'test';

export class SpecTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: SpecTreeItemType,
    public readonly filePath: string,
    public readonly line?: number,
    public readonly collapsibleState?: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
  }
}
```

### Step 2: Implement Spec Parser (`src/parsers/specParser.ts`)

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { FeatureSpec, UserStory, AcceptanceScenario } from '../types';

export class SpecParser {
  private readonly userStoryPattern = /^### User Story (\d+) - (.+?) \(Priority: (P\d)\)/;
  private readonly scenarioPattern = /^(\d+)\. \*\*Given\*\* (.+?), \*\*When\*\* (.+?), \*\*Then\*\* (.+)/;

  async parseSpecFile(filePath: string): Promise<FeatureSpec | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const dirName = path.basename(path.dirname(filePath));
      
      const featureSpec: FeatureSpec = {
        path: path.dirname(filePath),
        name: dirName,
        displayName: this.formatDisplayName(dirName),
        number: this.extractNumber(dirName),
        specFilePath: filePath,
        userStories: []
      };

      let currentStory: UserStory | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Check for user story header
        const storyMatch = line.match(this.userStoryPattern);
        if (storyMatch) {
          if (currentStory) {
            featureSpec.userStories.push(currentStory);
          }
          currentStory = {
            number: parseInt(storyMatch[1]),
            title: storyMatch[2],
            priority: storyMatch[3] as 'P1' | 'P2' | 'P3',
            startLine: lineNum,
            acceptanceScenarios: []
          };
          continue;
        }

        // Check for acceptance scenario
        if (currentStory) {
          const scenarioMatch = line.match(this.scenarioPattern);
          if (scenarioMatch) {
            currentStory.acceptanceScenarios.push({
              number: parseInt(scenarioMatch[1]),
              id: `US${currentStory.number}-AS${scenarioMatch[1]}`,
              given: scenarioMatch[2],
              when: scenarioMatch[3],
              then: scenarioMatch[4],
              line: lineNum,
              linkedTests: []
            });
          }
        }
      }

      if (currentStory) {
        featureSpec.userStories.push(currentStory);
      }

      return featureSpec;
    } catch (error) {
      console.error(`Failed to parse spec file: ${filePath}`, error);
      return null;
    }
  }

  private formatDisplayName(dirName: string): string {
    // "001-feature-name" -> "Feature Name"
    return dirName
      .replace(/^\d+-/, '')
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractNumber(dirName: string): number {
    const match = dirName.match(/^(\d+)-/);
    return match ? parseInt(match[1]) : 0;
  }
}
```

### Step 3: Implement Tree Provider (`src/providers/specTreeProvider.ts`)

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { SpecParser } from '../parsers/specParser';
import { FeatureSpec, SpecTreeItem } from '../types';

export class SpecTreeProvider implements vscode.TreeDataProvider<SpecTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<SpecTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private specs: FeatureSpec[] = [];
  private parser = new SpecParser();

  constructor(private workspaceRoot: string) {
    this.refresh();
  }

  async refresh(): Promise<void> {
    this.specs = await this.loadAllSpecs();
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: SpecTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SpecTreeItem): Promise<SpecTreeItem[]> {
    if (!element) {
      // Root level: show feature specs
      return this.specs.map(spec => new SpecTreeItem(
        spec.displayName,
        'feature',
        spec.specFilePath,
        undefined,
        vscode.TreeItemCollapsibleState.Collapsed
      ));
    }

    // Find the spec for this element
    const spec = this.specs.find(s => s.specFilePath === element.filePath);
    if (!spec) return [];

    if (element.type === 'feature') {
      // Show user stories
      return spec.userStories.map(story => {
        const item = new SpecTreeItem(
          `${story.priority} US${story.number}: ${story.title}`,
          'userStory',
          spec.specFilePath,
          story.startLine,
          vscode.TreeItemCollapsibleState.Collapsed
        );
        item.description = story.priority;
        return item;
      });
    }

    // More levels for scenarios and tests...
    return [];
  }

  private async loadAllSpecs(): Promise<FeatureSpec[]> {
    const specsDir = path.join(this.workspaceRoot, 'specs');
    const specs: FeatureSpec[] = [];
    
    // Implementation: scan specs directory for spec.md files
    // ...
    
    return specs;
  }
}
```

### Step 4: Extension Entry Point (`src/extension.ts`)

```typescript
import * as vscode from 'vscode';
import { SpecTreeProvider } from './providers/specTreeProvider';

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return;
  }

  // Create tree provider
  const treeProvider = new SpecTreeProvider(workspaceRoot);
  
  // Register tree view
  vscode.window.registerTreeDataProvider('speckit.specsView', treeProvider);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('speckit.refreshSpecs', () => {
      treeProvider.refresh();
    }),
    
    vscode.commands.registerCommand('speckit.openSpec', async (item: SpecTreeItem) => {
      const doc = await vscode.workspace.openTextDocument(item.filePath);
      const editor = await vscode.window.showTextDocument(doc);
      
      if (item.line) {
        const position = new vscode.Position(item.line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    })
  );

  // Watch for spec file changes
  const watcher = vscode.workspace.createFileSystemWatcher('**/specs/**/spec.md');
  watcher.onDidChange(() => treeProvider.refresh());
  watcher.onDidCreate(() => treeProvider.refresh());
  watcher.onDidDelete(() => treeProvider.refresh());
  context.subscriptions.push(watcher);
}

export function deactivate() {}
```

## Running the Extension

### Development Mode

```bash
# Compile
pnpm compile

# Press F5 in VS Code/Windsurf to launch Extension Development Host
```

### Testing

1. Open a workspace with a `specs/` directory
2. Click the SpecKit icon in the activity bar
3. Expand feature specs to see user stories
4. Click a user story to open the spec.md file

## Cascade Integration

The plugin works with Cascade through:

1. **File Access**: Cascade can read/edit spec.md files opened by the plugin
2. **Workflows**: Define spec workflows in `.windsurf/workflows/`
3. **Rules**: Define spec-aware rules in `.windsurf/rules/`

No custom AI integration code needed - Cascade handles everything.

## Next Steps

1. Implement test file linking
2. Add split view for spec + tests
3. Add outline view integration
4. Package and publish extension
