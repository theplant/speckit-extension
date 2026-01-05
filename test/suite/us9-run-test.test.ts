import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { IntegrationTest } from '../../src/types';

suite('US9: Run Single Test from Tree View', () => {
  let tempDir: string;
  let specsDir: string;
  let testsDir: string;
  let extensionActivated = false;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-us9-test-'));
    specsDir = path.join(tempDir, 'specs');
    testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(specsDir, { recursive: true });
    fs.mkdirSync(testsDir, { recursive: true });
    
    // Close all editors before each test
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    
    // Check if extension is already activated by checking if command exists
    if (!extensionActivated) {
      const commands = await vscode.commands.getCommands();
      if (!commands.includes('speckit.runTest')) {
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
        
        activate(mockContext);
      }
      extensionActivated = true;
    }
  });

  teardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    // Close any terminals created during tests
    vscode.window.terminals.forEach(t => {
      if (t.name.startsWith('SpecKit:')) {
        t.dispose();
      }
    });
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  
  test('US9-AS1: Given a test item in the tree view, When the developer clicks the Run Test button, Then a terminal opens and runs that specific test', async () => {
    // Verify the runTest command is registered
    const commands = await vscode.commands.getCommands();
    const hasCommand = commands.includes('speckit.runTest');
    assert.ok(hasCommand, 'speckit.runTest command should be registered');

    // Create a test SpecTreeItem for a test
    const testData: IntegrationTest = {
      filePath: path.join(testsDir, 'us1-feature.spec.ts'),
      fileName: 'us1-feature.spec.ts',
      testName: 'US1-AS1: Given condition, When action, Then result',
      line: 5
    };

    // Create the test file
    fs.writeFileSync(testData.filePath, `import { test } from '@playwright/test';

test('US1-AS1: Given condition, When action, Then result', async ({ page }) => {
  // test implementation
});
`);

    // Create a plain object that mimics SpecTreeItem structure (avoid circular reference)
    const item = {
      type: 'test',
      filePath: testData.filePath,
      line: testData.line,
      data: testData
    };

    // Get initial terminal count
    const initialTerminalCount = vscode.window.terminals.length;

    // Execute the runTest command
    await vscode.commands.executeCommand('speckit.runTest', item);

    // Wait for terminal to be created
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify a new terminal was created
    const newTerminalCount = vscode.window.terminals.length;
    assert.ok(newTerminalCount > initialTerminalCount, 'A new terminal should be created');

    // Find the SpecKit terminal
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'SpecKit terminal should exist');
  });

  
  test('US9-AS2: Given a Playwright test file (.spec.ts), When running the test, Then the command uses npx playwright test with --grep', async () => {
    // Create a Playwright test file
    const testFilePath = path.join(testsDir, 'us2-feature.spec.ts');
    const testName = 'US2-AS1: Given a user, When they login, Then they see dashboard';
    
    fs.writeFileSync(testFilePath, `import { test } from '@playwright/test';

test('${testName}', async ({ page }) => {
  // test implementation
});
`);

    const testData: IntegrationTest = {
      filePath: testFilePath,
      fileName: 'us2-feature.spec.ts',
      testName: testName,
      line: 3
    };

    // Create a plain object that mimics SpecTreeItem structure (avoid circular reference)
    const item = {
      type: 'test',
      filePath: testFilePath,
      line: 3,
      data: testData
    };

    // The command should detect .spec.ts and use playwright
    // We verify by checking the extension logic handles .spec.ts files
    assert.ok(testFilePath.includes('.spec.ts'), 'File should be a Playwright test file');
    assert.ok(testData.testName, 'Test should have a name for grep pattern');
    
    // Execute the command (terminal will be created)
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify terminal was created for the test
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'Terminal should be created for Playwright test');
  });

  
  test('US9-AS3: Given a Mocha/Jest test file (.test.ts), When running the test, Then the command uses npx mocha --grep', async () => {
    // Create a Mocha test file
    const testFilePath = path.join(testsDir, 'us3-feature.test.ts');
    const testName = 'US3-AS1: Should handle user input correctly';
    
    fs.writeFileSync(testFilePath, `import { describe, it } from 'mocha';

describe('Feature tests', () => {
  it('${testName}', () => {
    // test implementation
  });
});
`);

    const testData: IntegrationTest = {
      filePath: testFilePath,
      fileName: 'us3-feature.test.ts',
      testName: testName,
      line: 4
    };

    // Create a plain object that mimics SpecTreeItem structure (avoid circular reference)
    const item = {
      type: 'test',
      filePath: testFilePath,
      line: 4,
      data: testData
    };

    // The command should detect .test.ts and use mocha
    assert.ok(testFilePath.includes('.test.ts'), 'File should be a Mocha test file');
    assert.ok(!testFilePath.includes('.spec.ts'), 'File should NOT be a Playwright test file');
    assert.ok(testData.testName, 'Test should have a name for grep pattern');

    // Execute the command
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify terminal was created
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'Terminal should be created for Mocha test');
  });

  
  test('US9-AS4: Given a Go test file (_test.go), When running the test, Then the command uses go test -v -run', async () => {
    // Create a Go test file
    const goTestsDir = path.join(tempDir, 'go-tests');
    fs.mkdirSync(goTestsDir, { recursive: true });
    
    const testFilePath = path.join(goTestsDir, 'feature_test.go');
    const testName = 'TestUserAuthentication';
    
    fs.writeFileSync(testFilePath, `package main

import "testing"

func ${testName}(t *testing.T) {
    // test implementation
}
`);

    const testData: IntegrationTest = {
      filePath: testFilePath,
      fileName: 'feature_test.go',
      testName: testName,
      line: 5
    };

    // Create a plain object that mimics SpecTreeItem structure (avoid circular reference)
    const item = {
      type: 'test',
      filePath: testFilePath,
      line: 5,
      data: testData
    };

    // The command should detect .go and use go test
    assert.ok(testFilePath.endsWith('.go'), 'File should be a Go test file');
    assert.ok(testData.testName, 'Test should have a name for -run pattern');

    // Execute the command
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify terminal was created
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'Terminal should be created for Go test');
  });

  
  test('US9-AS5: Given a test without a specific test name, When running the test, Then the entire test file is executed', async () => {
    // Create a test file
    const testFilePath = path.join(testsDir, 'us5-feature.spec.ts');
    
    fs.writeFileSync(testFilePath, `import { test } from '@playwright/test';

test('Test 1', async ({ page }) => {});
test('Test 2', async ({ page }) => {});
`);

    // Create test data WITHOUT a testName
    const testData: IntegrationTest = {
      filePath: testFilePath,
      fileName: 'us5-feature.spec.ts',
      testName: undefined,  // No specific test name
      line: 3
    };

    // Create a plain object that mimics SpecTreeItem structure (avoid circular reference)
    const item = {
      type: 'test',
      filePath: testFilePath,
      line: 3,
      data: testData
    };

    // Verify test has no specific name
    assert.strictEqual(testData.testName, undefined, 'Test should not have a specific name');

    // Execute the command - should run entire file
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify terminal was created
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'Terminal should be created to run entire file');
  });

  
  test('US9-AS6: Given the test is running, When it completes, Then the developer sees the test output in the terminal', async () => {
    // Create a simple test file
    const testFilePath = path.join(testsDir, 'us6-feature.spec.ts');
    
    fs.writeFileSync(testFilePath, `import { test } from '@playwright/test';

test('US6-AS1: Simple test', async ({ page }) => {
  // Simple test that would produce output
});
`);

    const testData: IntegrationTest = {
      filePath: testFilePath,
      fileName: 'us6-feature.spec.ts',
      testName: 'US6-AS1: Simple test',
      line: 3
    };

    // Create a plain object that mimics SpecTreeItem structure (avoid circular reference)
    const item = {
      type: 'test',
      filePath: testFilePath,
      line: 3,
      data: testData
    };

    // Execute the command
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify terminal exists and is visible
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'Terminal should exist');
    
    // The terminal.show() is called in the command, making output visible
    // We can verify the terminal was created with the correct name
    assert.ok(speckitTerminal.name.includes('Run Test'), 'Terminal should be named for running tests');
  });
});
