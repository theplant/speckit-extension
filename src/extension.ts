import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SpecTreeProvider } from './providers/specTreeProvider';
import { EditorController } from './controllers/editorController';
import { StateManager } from './state/stateManager';
import { TestLinker } from './linkers/testLinker';
import { SpecTreeItem, UserStory, AcceptanceScenario, IntegrationTest, FeatureSpec } from './types';
import { generateMaturityJsonInstructions, generateFeatureTemplate, generateUserStoryTemplate, generateScenarioTemplate } from './templates';

let treeProvider: SpecTreeProvider;
let editorController: EditorController;
let stateManager: StateManager;
let testLinker: TestLinker;

export function activate(context: vscode.ExtensionContext) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showWarningMessage('SpecKit: No workspace folder open');
    return;
  }

  editorController = new EditorController();
  stateManager = new StateManager(context);
  testLinker = new TestLinker();
  treeProvider = new SpecTreeProvider(workspaceRoot);

  const treeView = vscode.window.createTreeView('speckit.specsView', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('speckit.refreshSpecs', () => {
      treeProvider.refresh();
      vscode.window.showInformationMessage('SpecKit: Specs refreshed');
    }),

    vscode.commands.registerCommand('speckit.openSpec', async (item: SpecTreeItem) => {
      if (!item) return;
      
      await stateManager.setLastOpenedSpec(item.filePath);
      await stateManager.setLastSelectedItem(`${item.type}:${item.filePath}:${item.line}`);
      
      await editorController.openSpecAtLine(item.filePath, item.line);
    }),

    vscode.commands.registerCommand('speckit.openWithTests', async (item: SpecTreeItem | any) => {
      if (!item || item.type !== 'userStory') return;
      
      const story = item.data as UserStory;
      const config = vscode.workspace.getConfiguration('speckit');
      const autoOpen = config.get<boolean>('autoOpenSplitView', true);
      
      await stateManager.setLastOpenedSpec(item.filePath);
      await stateManager.setLastSelectedItem(`${item.type}:${item.filePath}:${item.line}`);

      // Get test file from maturity.json via linked tests in scenarios
      let testFile: string | undefined;
      let testLine: number | undefined;
      
      // Find first scenario with linked tests
      for (const scenario of story.acceptanceScenarios) {
        if (scenario.linkedTests && scenario.linkedTests.length > 0) {
          testFile = scenario.linkedTests[0].filePath;
          testLine = scenario.linkedTests[0].line;
          break;
        }
      }
      
      if (testFile && autoOpen) {
        await editorController.openSplitView(item.filePath, testFile, story.startLine, testLine);
      } else {
        // Close secondary editor if no test file exists
        await editorController.closeSecondaryEditor();
        await editorController.openSpecAtLine(item.filePath, story.startLine);
      }
    }),

    vscode.commands.registerCommand('speckit.createSpec', async () => {
      const specName = await vscode.window.showInputBox({
        prompt: 'Enter the feature name (e.g., "user-authentication")',
        placeHolder: 'feature-name',
        validateInput: (value) => {
          if (!value) return 'Feature name is required';
          if (!/^[a-z0-9-]+$/.test(value)) return 'Use lowercase letters, numbers, and hyphens only';
          return null;
        }
      });

      if (!specName) return;

      const specs = treeProvider.getSpecs();
      const nextNumber = specs.length > 0 
        ? Math.max(...specs.map(s => s.number)) + 1 
        : 1;
      
      const dirName = `${nextNumber.toString().padStart(3, '0')}-${specName}`;
      const specDir = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'specs', dirName);
      const specFile = vscode.Uri.joinPath(specDir, 'spec.md');

      const template = `# Feature Specification: ${specName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

**Feature Branch**: \`${dirName}\`  
**Created**: ${new Date().toISOString().split('T')[0]}  
**Status**: Draft  
**Input**: [Describe the feature here]

## Assumptions

- [List assumptions here]

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Title] (Priority: P1)

[Description of the user story]

**Why this priority**: [Explanation]

**Independent Test**: [How to test independently]

**Acceptance Scenarios**:

1. **Given** [context], **When** [action], **Then** [result]

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: [Requirement description]

### Key Entities

- **Entity**: [Description]

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Measurable outcome]
`;

      try {
        await vscode.workspace.fs.createDirectory(specDir);
        await vscode.workspace.fs.writeFile(specFile, Buffer.from(template, 'utf-8'));
        
        await treeProvider.refresh();
        
        const doc = await vscode.workspace.openTextDocument(specFile);
        await vscode.window.showTextDocument(doc);
        
        vscode.window.showInformationMessage(`Created new spec: ${dirName}`);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to create spec: ${error}`);
      }
    }),

    vscode.commands.registerCommand('speckit.goToScenario', async (item: SpecTreeItem) => {
      if (!item || item.type !== 'scenario') return;
      
      const scenario = item.data as AcceptanceScenario;
      const config = vscode.workspace.getConfiguration('speckit');
      const autoOpen = config.get<boolean>('autoOpenSplitView', true);
      
      // Use linked tests from maturity.json (already populated in scenario.linkedTests)
      if (scenario.linkedTests && scenario.linkedTests.length > 0 && autoOpen) {
        // Open split view with spec scrolled to scenario and test scrolled to test line
        const test = scenario.linkedTests[0];
        await editorController.openSplitView(item.filePath, test.filePath, scenario.line, test.line);
      } else {
        // Close secondary editor when no test available
        await editorController.closeSecondaryEditor();
        await editorController.openSpecAtLine(item.filePath, scenario.line);
      }
    }),

    vscode.commands.registerCommand('speckit.goToTest', async (item: SpecTreeItem) => {
      if (!item || item.type !== 'test') return;
      
      const test = item.data as IntegrationTest;
      const specFilePath = (item as any).specFilePath;
      const scenarioLine = (item as any).scenarioLine;
      
      // US2-AS6: Open split view with spec on left (scrolled to AS) and test on right
      if (specFilePath && scenarioLine) {
        await editorController.openSplitView(specFilePath, test.filePath, scenarioLine, test.line);
      } else {
        await editorController.openFileAtLine(test.filePath, test.line);
      }
    }),

    vscode.commands.registerCommand('speckit.copyForTest', async (item: SpecTreeItem) => {
      if (!item) return;

      const metadataManager = treeProvider.getMetadataManager();
      const maturityManager = treeProvider.getMaturityManager();
      
      // Get test directory from spec.md metadata (optional, for context)
      const testDirectory = metadataManager.getTestDirectory(item.filePath) || 'test';

      let context = '';
      let testFilePath: string | undefined;
      let testLine: number | undefined;
      
      // Extract feature name for context
      const featureName = item.filePath.split('/specs/')[1]?.split('/')[0]?.replace(/^\d+-/, '') || 'feature';
      const specDir = path.dirname(item.filePath);
      const maturityFilePath = path.join(specDir, 'maturity.json');
      const today = new Date().toISOString().split('T')[0];
      
      // Check if maturity.json exists
      const hasMaturityJson = maturityManager.hasMaturityFile(item.filePath);
      
      // Get spec to access all user stories for maturity.json initialization
      const spec = treeProvider.findSpecByPath(item.filePath);
      const userStories = spec?.userStories || [];
      
      if (item.type === 'feature') {
        const featureSpec = item.data as FeatureSpec;
        context = generateFeatureTemplate({
          spec: featureSpec,
          specFilePath: item.filePath,
          testDirectory,
          featureName,
          hasMaturityJson
        });
      } else if (item.type === 'userStory') {
        const story = item.data as UserStory;
        const storyEndLine = story.endLine || (story.startLine + 20);
        context = generateUserStoryTemplate({
          story,
          storyEndLine,
          specFilePath: item.filePath,
          testDirectory,
          featureName,
          maturityFilePath,
          today,
          hasMaturityJson
        });
      } else if (item.type === 'scenario') {
        const scenario = item.data as AcceptanceScenario;
        const story = scenario.userStory;
        
        // Check for existing test
        let existingTestFilePath: string | undefined;
        let existingTestLine: number | undefined;
        if (scenario.linkedTests.length > 0) {
          const test = scenario.linkedTests[0];
          existingTestFilePath = test.filePath;
          existingTestLine = test.line;
          testFilePath = test.filePath;
          testLine = test.line;
        }
        
        context = generateScenarioTemplate({
          scenario,
          story,
          specFilePath: item.filePath,
          testDirectory,
          featureName,
          maturityFilePath,
          today,
          hasMaturityJson,
          existingTestFilePath,
          existingTestLine
        });
      }

      // Open spec file
      await editorController.openSpecAtLine(item.filePath, item.line);
      
      // If we have a test file, open it in split view
      if (testFilePath) {
        await editorController.openSplitView(item.filePath, testFilePath, item.line, testLine);
      }

      // Copy context to clipboard
      await vscode.env.clipboard.writeText(context);
      
      vscode.window.showInformationMessage('Context copied to clipboard. Paste into Cascade to update integration test.');
    }),

    treeView,

    // Expand all command - expands all children of a feature or user story
    vscode.commands.registerCommand('speckit.expandAll', async (item: SpecTreeItem) => {
      if (!item) return;
      
      // Recursively expand all children
      const expandRecursively = async (treeItem: SpecTreeItem) => {
        await treeView.reveal(treeItem, { expand: true });
        const children = await treeProvider.getChildren(treeItem);
        for (const child of children) {
          await expandRecursively(child);
        }
      };
      
      await expandRecursively(item);
    }),

    // Run a single test from the tree view (supports test, scenario, and userStory)
    vscode.commands.registerCommand('speckit.runTest', async (item: SpecTreeItem) => {
      if (!item) return;
      
      const maturityManager = treeProvider.getMaturityManager();
      // For test nodes, item.filePath is the test file path, not the spec.md path
      // Use specFilePath (stored on test nodes) to get the correct testConfig
      const specPath = (item as any).specFilePath || item.filePath;
      
      // Check if maturity.json exists - if not, copy AI instructions to initialize it
      if (!maturityManager.hasMaturityFile(specPath)) {
        // Find the spec to get all user stories
        const spec = treeProvider.findSpecByPath(specPath);
        const userStories = spec?.userStories || [];
        const maturityFilePath = path.join(path.dirname(specPath), 'maturity.json');
        
        // Use the same template as copyForTest for consistency
        const context = generateMaturityJsonInstructions({
          maturityFilePath,
          userStories
        });
        
        await vscode.env.clipboard.writeText(context);
        vscode.window.showInformationMessage('No maturity.json found. AI instructions copied to clipboard - paste into Cascade to initialize.');
        return;
      }
      
      const testConfig = maturityManager.getTestConfig(specPath);
      
      let command: string;
      let displayName: string;
      
      if (item.type === 'test') {
        const test = item.data as IntegrationTest;
        if (!test.filePath) {
          vscode.window.showErrorMessage('No test file path available');
          return;
        }
        
        const relativePath = path.relative(workspaceRoot, test.filePath);
        const testDir = path.dirname(relativePath);
        const escapedTestName = (test.testName || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (testConfig?.runSingleTestCommand) {
          command = testConfig.runSingleTestCommand
            .replace('{testName}', escapedTestName)
            .replace('{filePath}', relativePath)
            .replace('{testDir}', testDir);
        } else {
          command = `pnpm test`;
        }
        displayName = test.testName || relativePath;
        
      } else if (item.type === 'scenario') {
        const scenario = item.data as AcceptanceScenario;
        if (!scenario.linkedTests || scenario.linkedTests.length === 0) {
          vscode.window.showInformationMessage(`No tests linked to ${scenario.id}`);
          return;
        }
        
        if (testConfig?.runScenarioCommand) {
          command = testConfig.runScenarioCommand
            .replace('{scenarioId}', scenario.id);
        } else {
          command = `pnpm test`;
        }
        displayName = scenario.id;
        
      } else if (item.type === 'userStory') {
        const story = item.data as UserStory;
        const hasTests = story.acceptanceScenarios.some(s => s.linkedTests && s.linkedTests.length > 0);
        
        if (!hasTests) {
          vscode.window.showInformationMessage(`No tests linked to US${story.number}`);
          return;
        }
        
        if (testConfig?.runUserStoryCommand) {
          command = testConfig.runUserStoryCommand
            .replace('{userStoryPattern}', `US${story.number}-`);
        } else {
          command = `pnpm test`;
        }
        displayName = `US${story.number}`;
        
      } else {
        return;
      }
      
      // Create and run a VS Code Task to capture exit code
      const taskDefinition: vscode.TaskDefinition = {
        type: 'speckit-test'
      };
      
      const shellExecution = new vscode.ShellExecution(command, {
        cwd: workspaceRoot
      });
      
      const task = new vscode.Task(
        taskDefinition,
        vscode.TaskScope.Workspace,
        `SpecKit: ${displayName}`,
        'speckit',
        shellExecution,
        [] // No problem matchers
      );
      task.presentationOptions = {
        reveal: vscode.TaskRevealKind.Always,
        panel: vscode.TaskPanelKind.New,
        focus: true
      };

      // Store context for the task completion handler
      const taskContext = {
        specPath,
        itemType: item.type,
        testName: item.type === 'test' ? (item.data as IntegrationTest).testName : undefined,
        scenarioId: item.type === 'scenario' ? (item.data as AcceptanceScenario).id : undefined,
        userStoryNumber: item.type === 'userStory' ? (item.data as UserStory).number : undefined
      };

      // Execute the task
      const execution = await vscode.tasks.executeTask(task);
      
      // Listen for task completion to update maturity.json
      const disposable = vscode.tasks.onDidEndTaskProcess(async (e) => {
        if (e.execution === execution) {
          const exitCode = e.exitCode;
          const passed = exitCode === 0;
          
          // Update maturity.json based on test result
          if (taskContext.itemType === 'test' && taskContext.testName) {
            maturityManager.updateTestResult(taskContext.specPath, taskContext.testName, passed);
          } else if (taskContext.itemType === 'scenario' && taskContext.scenarioId) {
            maturityManager.updateScenarioResult(taskContext.specPath, taskContext.scenarioId, passed);
          } else if (taskContext.itemType === 'userStory' && taskContext.userStoryNumber) {
            maturityManager.updateUserStoryResult(taskContext.specPath, taskContext.userStoryNumber, passed);
          }
          
          // Refresh tree view to show updated maturity
          treeProvider.refresh();
          
          // Show result message
          if (passed) {
            vscode.window.showInformationMessage(`✅ Test passed: ${displayName}`);
          } else {
            vscode.window.showWarningMessage(`❌ Test failed: ${displayName}`);
          }
          
          // Clean up the listener
          disposable.dispose();
        }
      });
      
      // Add disposable to context for cleanup
      context.subscriptions.push(disposable);
      
      vscode.window.showInformationMessage(`Running test: ${displayName}`);
    })
  );

  const specWatcher = vscode.workspace.createFileSystemWatcher('**/specs/**/spec.md');
  specWatcher.onDidChange(() => treeProvider.refresh());
  specWatcher.onDidCreate(() => treeProvider.refresh());
  specWatcher.onDidDelete(() => treeProvider.refresh());
  context.subscriptions.push(specWatcher);

  // Watch maturity.json files for changes to update tree view icons
  const maturityWatcher = vscode.workspace.createFileSystemWatcher('**/specs/**/maturity.json');
  maturityWatcher.onDidChange(() => {
    treeProvider.getMaturityManager().clearCache();
    treeProvider.refresh();
  });
  maturityWatcher.onDidCreate(() => {
    treeProvider.getMaturityManager().clearCache();
    treeProvider.refresh();
  });
  maturityWatcher.onDidDelete(() => {
    treeProvider.getMaturityManager().clearCache();
    treeProvider.refresh();
  });
  context.subscriptions.push(maturityWatcher);

  const testWatcher = vscode.workspace.createFileSystemWatcher('**/tests/**/*.spec.ts');
  testWatcher.onDidChange(() => treeProvider.refresh());
  testWatcher.onDidCreate(() => treeProvider.refresh());
  testWatcher.onDidDelete(() => treeProvider.refresh());
  context.subscriptions.push(testWatcher);

  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('speckit')) {
      treeProvider.refresh();
    }
  });

  console.log('SpecKit extension activated');
}

export function deactivate() {
  console.log('SpecKit extension deactivated');
}
