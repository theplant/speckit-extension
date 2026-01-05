import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { activate } from '../../src/extension';
import { EditorController } from '../../src/controllers/editorController';
import { StateManager } from '../../src/state/stateManager';
import { TestLinker } from '../../src/linkers/testLinker';

suite('US2: Split View with Spec and Integration Tests', () => {
  let tempDir: string;
  let specsDir: string;
  let testsDir: string;
  let editorController: EditorController;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-us2-test-'));
    specsDir = path.join(tempDir, 'specs');
    testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });
    editorController = new EditorController();
    
    // Close all editors before each test
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  // @passed: 2026-01-02
  test('US2-AS1: Given a user story with linked tests, When clicking it, Then spec opens left and test opens right (split view)', async () => {
    // Get the actual workspace root that VS Code sees
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace root found');
    }
    
    // Create test directories in the actual workspace
    const specsDir = path.join(workspaceRoot, 'specs');
    const testsDir = path.join(workspaceRoot, 'tests', 'e2e');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });
    
    // Create spec file
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specContent = `---
testDirectory: tests/e2e
---
# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    // Create test file
    const testContent = `import { test } from '@playwright/test';

test('US1-AS1: Given context, When action, Then result', async ({ page }) => {
  // test implementation
});
`;
    const testPath = path.join(testsDir, 'us1-test-feature.spec.ts');
    fs.writeFileSync(testPath, testContent);

    // Create and activate the extension
    const { activate } = require('../../src/extension');
    const mockContext = {
      subscriptions: [],
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve()
      },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve()
      },
      extensionPath: '',
      storagePath: '',
      globalStoragePath: '',
      logPath: '',
      extensionUri: vscode.Uri.file(''),
      logUri: vscode.Uri.file(''),
      globalStorageUri: vscode.Uri.file(''),
      storageUri: vscode.Uri.file(''),
      environmentVariableCollection: {
        persistent: true,
        get: () => undefined,
        set: () => {},
        delete: () => {},
        clear: () => {}
      },
      secrets: {
        get: () => undefined,
        store: () => Promise.resolve(),
        delete: () => Promise.resolve()
      },
      extensionMode: 1,
      asAbsolutePath: (relativePath: string) => path.join('', relativePath)
    } as any;
    
    // Activate the extension
    activate(mockContext);
    
    // Create a SpecTreeItem for the user story
    const { SpecTreeItem } = require('../../src/types');
    const story = {
      number: 1,
      title: 'Test Story',
      priority: 'P1',
      startLine: 12,
      acceptanceScenarios: [
        { id: 'US1-AS1', line: 12 }
      ]
    };
    
    const item = new SpecTreeItem(
      'US1: Test Story',
      'userStory',
      specPath,
      12,
      vscode.TreeItemCollapsibleState.Collapsed,
      story
    );
    
    // Verify the command is registered
    const commands = await vscode.commands.getCommands();
    const hasCommand = commands.includes('speckit.openWithTests');
    assert.ok(hasCommand, 'speckit.openWithTests command should be registered');
    
    // Verify the SpecTreeItem has the correct command
    assert.strictEqual(item.command?.command, 'speckit.openWithTests', 
      'User story should have openWithTests command');
    
    // Verify the test file can be found by TestLinker
    const { TestLinker } = require('../../src/linkers/testLinker');
    const testLinker = new TestLinker();
    const foundTestFile = testLinker.findTestFileForStory(workspaceRoot, 'tests/e2e', 1);
    assert.ok(foundTestFile, 'Test file should be found for user story');
    assert.strictEqual(foundTestFile.toLowerCase(), testPath.toLowerCase(), 
      'Found test file path should match expected path');
    
    // Execute the command
    await vscode.commands.executeCommand('speckit.openWithTests', item);

    // Wait for editors to open
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify both editors are open
    const visibleEditors = vscode.window.visibleTextEditors;
    assert.ok(visibleEditors.length >= 2, `Should have at least 2 visible editors, found ${visibleEditors.length}`);

    // Find spec and test editors
    // Use case-insensitive comparison for paths on macOS
    const specEditor = visibleEditors.find(e => e.document.uri.fsPath.toLowerCase() === specPath.toLowerCase());
    const testEditor = visibleEditors.find(e => e.document.uri.fsPath.toLowerCase() === testPath.toLowerCase());

    assert.ok(specEditor, `Spec editor should be open at ${specPath}`);
    assert.ok(testEditor, `Test editor should be open at ${testPath}`);

    // Verify they are in different view columns (split view)
    assert.notStrictEqual(specEditor?.viewColumn, testEditor?.viewColumn, 
      'Editors should be in different view columns');
    
    // Cleanup test files
    fs.rmSync(path.join(workspaceRoot, 'specs'), { recursive: true, force: true });
    fs.rmSync(path.join(workspaceRoot, 'tests'), { recursive: true, force: true });
  });

  // @passed: 2025-12-30
  test('US2-AS2: Given split view is open, When clicking acceptance scenario, Then both editors scroll to corresponding locations', async () => {
    // Create spec file with multiple scenarios
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specContent = `---
testDirectory: tests/e2e
---
# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** first condition, **When** first action, **Then** first result
2. **Given** second condition, **When** second action, **Then** second result
3. **Given** third condition, **When** third action, **Then** third result
`;
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    // Create test file with multiple tests
    const testContent = `import { test } from '@playwright/test';

test('US1-AS1: Given first condition, When first action, Then first result', async ({ page }) => {
  // test 1
});

test('US1-AS2: Given second condition, When second action, Then second result', async ({ page }) => {
  // test 2
});

test('US1-AS3: Given third condition, When third action, Then third result', async ({ page }) => {
  // test 3
});
`;
    const testPath = path.join(testsDir, 'us1-test-feature.spec.ts');
    fs.writeFileSync(testPath, testContent);

    // Open split view at scenario 2 (line 16 in spec, line 7 in test)
    await editorController.openSplitView(specPath, testPath, 16, 7);

    await new Promise(resolve => setTimeout(resolve, 100));

    const visibleEditors = vscode.window.visibleTextEditors;
    const specEditor = visibleEditors.find(e => e.document.uri.fsPath === specPath);
    const testEditor = visibleEditors.find(e => e.document.uri.fsPath === testPath);

    assert.ok(specEditor, 'Spec editor should be open');
    assert.ok(testEditor, 'Test editor should be open');

    // Verify cursor positions are set (scrollToLine sets selection)
    // Note: Line numbers are 0-indexed in VS Code API
    assert.strictEqual(specEditor?.selection.active.line, 15, 'Spec should be scrolled to line 16 (0-indexed: 15)');
    assert.strictEqual(testEditor?.selection.active.line, 6, 'Test should be scrolled to line 7 (0-indexed: 6)');
  });

  // @passed: 2025-12-30
  test('US2-AS3: Given a user story without linked tests, When clicking it, Then only spec.md opens (no split view)', async () => {
    // Create spec file without test directory configured
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specContent = `# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    // Open only the spec (no test file)
    await editorController.openSpecAtLine(specPath, 5);

    await new Promise(resolve => setTimeout(resolve, 100));

    const visibleEditors = vscode.window.visibleTextEditors;
    
    // Should only have one editor open
    assert.strictEqual(visibleEditors.length, 1, 'Should have exactly 1 editor open');
    assert.strictEqual(visibleEditors[0].document.uri.fsPath, specPath, 'Only spec should be open');
  });

  // @passed: 2025-12-30
  test('US2-AS4: Given split view is open, When editing either file, Then changes can be saved', async () => {
    // Create spec and test files
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature\n\nOriginal content');

    const testPath = path.join(testsDir, 'us1-test.spec.ts');
    fs.writeFileSync(testPath, '// Original test content');

    // Open split view
    await editorController.openSplitView(specPath, testPath);

    await new Promise(resolve => setTimeout(resolve, 100));

    const visibleEditors = vscode.window.visibleTextEditors;
    const specEditor = visibleEditors.find(e => e.document.uri.fsPath === specPath);
    const testEditor = visibleEditors.find(e => e.document.uri.fsPath === testPath);

    assert.ok(specEditor, 'Spec editor should be open');
    assert.ok(testEditor, 'Test editor should be open');

    // Edit spec file
    await specEditor!.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(2, 0), '\nNew spec content\n');
    });

    // Edit test file
    await testEditor!.edit(editBuilder => {
      editBuilder.insert(new vscode.Position(0, 0), '// New test content\n');
    });

    // Verify documents are dirty (have unsaved changes)
    assert.ok(specEditor!.document.isDirty, 'Spec should have unsaved changes');
    assert.ok(testEditor!.document.isDirty, 'Test should have unsaved changes');

    // Save both files
    await specEditor!.document.save();
    await testEditor!.document.save();

    // Verify files are saved
    assert.ok(!specEditor!.document.isDirty, 'Spec should be saved');
    assert.ok(!testEditor!.document.isDirty, 'Test should be saved');

    // Verify content was actually saved
    const savedSpecContent = fs.readFileSync(specPath, 'utf-8');
    const savedTestContent = fs.readFileSync(testPath, 'utf-8');

    assert.ok(savedSpecContent.includes('New spec content'), 'Spec file should contain new content');
    assert.ok(savedTestContent.includes('New test content'), 'Test file should contain new content');
  });

  // @passed: 2025-12-30
  test('US2-AS5: Given test editor is open, When viewing it, Then full content with syntax highlighting is shown', async () => {
    // Create test file with TypeScript content
    const testContent = `import { test, expect } from '@playwright/test';

test.describe('US1: Test Feature', () => {
  test('US1-AS1: Given context, When action, Then result', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
`;
    const testPath = path.join(testsDir, 'us1-test.spec.ts');
    fs.writeFileSync(testPath, testContent);

    // Open test file
    const testUri = vscode.Uri.file(testPath);
    const testDoc = await vscode.workspace.openTextDocument(testUri);
    const testEditor = await vscode.window.showTextDocument(testDoc);

    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify full content is available
    const editorContent = testEditor.document.getText();
    assert.strictEqual(editorContent, testContent, 'Editor should show full test content');

    // Verify language is TypeScript (for syntax highlighting)
    assert.strictEqual(testEditor.document.languageId, 'typescript', 'Language should be TypeScript');
  });

  // @passed: 2025-12-30
  test('US2-AS6: Given an integration test in tree, When clicking it, Then spec opens at parent scenario and test opens at test line', async () => {
    // Create spec file
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specContent = `---
testDirectory: tests/e2e
---
# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** first condition, **When** first action, **Then** first result
2. **Given** second condition, **When** second action, **Then** second result
`;
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    // Create test file
    const testContent = `import { test } from '@playwright/test';

test('US1-AS1: First test', async ({ page }) => {
  // test 1 at line 3
});

test('US1-AS2: Second test', async ({ page }) => {
  // test 2 at line 7
});
`;
    const testPath = path.join(testsDir, 'us1-test-feature.spec.ts');
    fs.writeFileSync(testPath, testContent);

    // Simulate clicking on the second test (US1-AS2)
    // This should open spec at scenario line (16) and test at test line (7)
    const scenarioLine = 16; // Line of AS2 in spec
    const testLine = 7; // Line of US1-AS2 test

    await editorController.openSplitView(specPath, testPath, scenarioLine, testLine);

    await new Promise(resolve => setTimeout(resolve, 100));

    const visibleEditors = vscode.window.visibleTextEditors;
    const specEditor = visibleEditors.find(e => e.document.uri.fsPath === specPath);
    const testEditor = visibleEditors.find(e => e.document.uri.fsPath === testPath);

    assert.ok(specEditor, 'Spec editor should be open');
    assert.ok(testEditor, 'Test editor should be open');

    // Verify both are scrolled to correct lines
    assert.strictEqual(specEditor?.selection.active.line, scenarioLine - 1, 
      'Spec should be scrolled to parent acceptance scenario');
    assert.strictEqual(testEditor?.selection.active.line, testLine - 1, 
      'Test should be scrolled to the clicked test');
  });
});
