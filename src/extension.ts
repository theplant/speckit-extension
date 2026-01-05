import * as vscode from 'vscode';
import * as path from 'path';
import { SpecTreeProvider } from './providers/specTreeProvider';
import { EditorController } from './controllers/editorController';
import { StateManager } from './state/stateManager';
import { TestLinker } from './linkers/testLinker';
import { SpecTreeItem, UserStory, AcceptanceScenario, IntegrationTest, FeatureSpec } from './types';

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
      const testsDir = config.get<string>('testsDirectory', 'tests/e2e');
      const autoOpen = config.get<boolean>('autoOpenSplitView', true);
      
      await stateManager.setLastOpenedSpec(item.filePath);
      await stateManager.setLastSelectedItem(`${item.type}:${item.filePath}:${item.line}`);

      const testFile = testLinker.findTestFileForStory(workspaceRoot, testsDir, story.number);
      
      if (testFile && autoOpen) {
        await editorController.openSplitView(item.filePath, testFile, story.startLine);
      } else {
        await editorController.openSpecAtLine(item.filePath, story.startLine);
        if (testFile && !autoOpen) {
           // If tests exist but autoOpen is off, we don't show a message unless they specifically clicked "Open with Tests" from a menu (though here it's the default click)
        } else if (!testFile && autoOpen) {
           vscode.window.showInformationMessage(`No test file found for User Story ${story.number}`);
        }
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
      await editorController.openSpecAtLine(item.filePath, scenario.line);
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
      const workspaceRoot = treeProvider.getWorkspaceRoot();
      
      // Check if test directory is configured for this spec
      let testDirectory = metadataManager.getTestDirectory(item.filePath);
      
      if (!testDirectory) {
        // First time - prompt user to select test directory
        const selectedFolder = await vscode.window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: 'Select Test Directory',
          title: 'Select the directory where integration tests are located',
          defaultUri: vscode.Uri.file(workspaceRoot)
        });
        
        if (!selectedFolder || selectedFolder.length === 0) {
          vscode.window.showWarningMessage('No test directory selected. Please select a test directory to continue.');
          return;
        }
        
        // Convert to relative path from workspace root
        const absolutePath = selectedFolder[0].fsPath;
        testDirectory = path.relative(workspaceRoot, absolutePath);
        
        // Save to spec.md metadata
        metadataManager.setTestDirectory(item.filePath, testDirectory);
        
        // Refresh tree to pick up new test directory
        await treeProvider.refresh();
        
        vscode.window.showInformationMessage(`Test directory set to: ${testDirectory}`);
      }

      let context = '';
      let testFilePath: string | undefined;
      let testLine: number | undefined;
      
      // Extract feature name for context
      const featureName = item.filePath.split('/specs/')[1]?.split('/')[0]?.replace(/^\d+-/, '') || 'feature';
      const specDir = path.dirname(item.filePath);
      const maturityFilePath = path.join(specDir, 'maturity.md');
      const today = new Date().toISOString().split('T')[0];
      
      if (item.type === 'feature') {
        const spec = item.data as FeatureSpec;
        context = `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.

## Task: Update integration tests for feature "${spec.displayName}"

- Spec file: ${item.filePath}
- Test directory: ${testDirectory}
- Feature: ${featureName}
`;
      } else if (item.type === 'userStory') {
        const story = item.data as UserStory;
        const storyEndLine = story.endLine || (story.startLine + 20);
        const scenariosList = story.acceptanceScenarios
          .map(s => `- **${s.id}** at line ${s.line}`)
          .join('\n');

        context = `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.

## Task: Update integration tests for User Story ${story.number}

**Title**: ${story.title}
**Priority**: ${story.priority}

### Context
- Spec file: ${item.filePath}:${story.startLine}-${storyEndLine}
- Test directory: ${testDirectory}
- Feature: ${featureName}
- User Story: US${story.number}

### Acceptance Scenarios (read from spec file):
${scenariosList}

---

## After Implementation: Evaluate Test Maturity

Once you have created/updated tests for this user story, **evaluate maturity** for each acceptance scenario.

### Instructions
1. Read the user story and acceptance scenarios from: \`${item.filePath}:${story.startLine}-${storyEndLine}\`
2. For each acceptance scenario, compare the test implementation against Given/When/Then
3. Update \`${maturityFilePath}\` with maturity levels:

| Level | Value | Criteria |
|-------|-------|----------|
| Red | \`none\` | No test exists |
| Yellow | \`partial\` | Test exists but incomplete coverage |
| Green | \`complete\` | Test fully covers Given/When/Then and passes |

### Test File Naming Rules (IMPORTANT for linking)
The SpecKit extension links tests to user stories and acceptance scenarios by matching filenames and test names:
- **Filename** must contain \`us${story.number}\` (case-insensitive) to link to User Story ${story.number}
- **Test name** must contain the scenario ID (e.g., \`US${story.number}-AS1\`) for linking to that specific scenario
- Example patterns: \`us${story.number}-${featureName}.spec.ts\`, \`us${story.number}_${featureName}_test.go\`

### Mark Test Pass Status in Test Files
After running tests, add a comment **directly before each test function** to record pass/fail:

\`\`\`typescript
// @passed: ${today}
test('US${story.number}-AS1: Given condition, When action, Then result', async () => {
  // test implementation
});
\`\`\`

The SpecKit extension reads these comments to show ✓/✗ icons in the tree view.
`;
      } else if (item.type === 'scenario') {
        const scenario = item.data as AcceptanceScenario;
        const story = scenario.userStory;
        const storyContext = story ? `- User Story: US${story.number} - ${story.title}\n` : '';
        
        let existingTestSection = '';
        if (scenario.linkedTests.length > 0) {
          const test = scenario.linkedTests[0];
          testFilePath = test.filePath;
          testLine = test.line;
          existingTestSection = `
### Existing Test
- File: ${testFilePath}${testLine ? ':' + testLine : ''}
`;
        } else if (story) {
          existingTestSection = `
### Test Creation Required
No test exists for this scenario. Please:
1. Check existing tests in \`${testDirectory}/\` to understand project conventions
2. Create a test file with filename that includes: US${story.number}, ${featureName}
3. Test name/function should reference: ${scenario.id}
`;
        }

        const namingRulesSection = story ? `
### Test File Naming Rules (IMPORTANT for linking)
The SpecKit extension links tests to acceptance scenarios by matching filenames and test names:
- **Filename** must contain \`us${story.number}\` (case-insensitive) to link to User Story ${story.number}
- **Test name** must contain \`${scenario.id}\` for the extension to show it under this scenario
- Example patterns: \`us${story.number}-${featureName}.spec.ts\`, \`us${story.number}_${featureName}_test.go\`
` : '';

        const maturityExampleSection = story ? `## US${story.number}
- **Overall**: [calculated from scenarios]
- **${scenario.id}**: [none|partial|complete]` : '';

        context = `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.

## Task: Create/update integration test for ${scenario.id}

### Acceptance Scenario
- **Given** ${scenario.given}
- **When** ${scenario.when}
- **Then** ${scenario.then}

### Context
- Spec file: ${item.filePath}:${scenario.line}
- Test directory: ${testDirectory}
- Feature: ${featureName}
${storyContext}- Scenario ID: ${scenario.id}
${existingTestSection}${namingRulesSection}
### Verification Requirements
The test must verify:
- **Given**: ${scenario.given}
- **When**: ${scenario.when}
- **Then**: ${scenario.then}

---

## After Implementation: Evaluate Test Maturity

Once you have created/updated the test, **carefully evaluate** the test maturity level:

### Step 1: Re-read the Acceptance Scenario
- **Given**: ${scenario.given}
- **When**: ${scenario.when}
- **Then**: ${scenario.then}

### Step 2: Compare with Test Implementation
Ask yourself:
- Does the test properly set up the **Given** condition?
- Does the test correctly perform the **When** action?
- Does the test verify the **Then** result with appropriate assertions?

### Step 3: Determine Maturity Level
| Level | Value | Criteria |
|-------|-------|----------|
| Red | \`none\` | No test exists for this scenario |
| Yellow | \`partial\` | Test exists but doesn't fully cover Given/When/Then |
| Green | \`complete\` | Test fully covers the acceptance scenario and passes |

### Step 4: Run Tests and Record Results
After implementing the test, **run it** and record the pass/fail status:

1. Run the test to verify it passes
2. Add a \`@passed\` or \`@failed\` comment **directly before the test function**
3. Update maturity.md with the maturity level

### Step 5: Mark Test Pass Status in Test File
Add a comment before the test function to record pass/fail status:

\`\`\`typescript
// @passed: ${today}
test('${scenario.id}: Given ${scenario.given.substring(0, 30)}...', async () => {
  // test implementation
});
\`\`\`

Or if the test failed:
\`\`\`typescript
// @failed: ${today}
test('${scenario.id}: ...', async () => {
  // test implementation
});
\`\`\`

### Step 6: Update maturity.md
Update \`${maturityFilePath}\` with the maturity level (test pass status is tracked in test file comments):

\`\`\`markdown
---
lastUpdated: ${today}
---
# Test Maturity Levels

${maturityExampleSection}
\`\`\`

**Note**: The SpecKit extension will display:
- Pass/fail icons (✓/✗) for tests based on \`@passed\`/\`@failed\` comments in test files
- Maturity icons for scenarios based on maturity.md
`;
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
    })
  );

  const specWatcher = vscode.workspace.createFileSystemWatcher('**/specs/**/spec.md');
  specWatcher.onDidChange(() => treeProvider.refresh());
  specWatcher.onDidCreate(() => treeProvider.refresh());
  specWatcher.onDidDelete(() => treeProvider.refresh());
  context.subscriptions.push(specWatcher);

  // Watch maturity.md files for changes to update tree view icons
  const maturityWatcher = vscode.workspace.createFileSystemWatcher('**/specs/**/maturity.md');
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
