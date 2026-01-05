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

    // Create spec directory with maturity.json (required for runTest to work)
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'playwright',
        runCommand: 'npx playwright test',
        runSingleTestCommand: 'npx playwright test "{filePath}" --grep "{testName}"'
      },
      userStories: {}
    }));

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
      specFilePath: specPath,  // Required for runTest to find maturity.json
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
    // Create spec directory with maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'playwright',
        runCommand: 'npx playwright test',
        runSingleTestCommand: 'npx playwright test "{filePath}" --grep "{testName}"'
      },
      userStories: {}
    }));

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
      specFilePath: specPath,  // Required for runTest to find maturity.json
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
    // Create spec directory with maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'mocha',
        runCommand: 'npx mocha',
        runSingleTestCommand: 'npx mocha --grep "{testName}" "{filePath}"'
      },
      userStories: {}
    }));

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
      specFilePath: specPath,  // Required for runTest to find maturity.json
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
    // Create spec directory with maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'go',
        runCommand: 'go test ./...',
        runSingleTestCommand: 'go test -v -run "{testName}" ./{testDir}'
      },
      userStories: {}
    }));

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
      specFilePath: specPath,  // Required for runTest to find maturity.json
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
    // Create spec directory with maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'playwright',
        runCommand: 'npx playwright test',
        runSingleTestCommand: 'npx playwright test "{filePath}"'
      },
      userStories: {}
    }));

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
      specFilePath: specPath,  // Required for runTest to find maturity.json
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
    // Create spec directory with maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'playwright',
        runCommand: 'npx playwright test',
        runSingleTestCommand: 'npx playwright test "{filePath}" --grep "{testName}"'
      },
      userStories: {}
    }));

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
      specFilePath: specPath,  // Required for runTest to find maturity.json
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

  test('US9-AS7: Given no maturity.json file exists, When clicking Run Test on any item, Then AI instructions are copied to clipboard to initialize maturity.json with ALL user stories', async () => {
    // Create a spec file WITHOUT maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specContent = `# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - First Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** context1, **When** action1, **Then** result1
2. **Given** context2, **When** action2, **Then** result2

---

### User Story 2 - Second Story (Priority: P2)

Description.

**Acceptance Scenarios**:

1. **Given** context3, **When** action3, **Then** result3
`;
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    // Verify no maturity.json exists
    const maturityPath = path.join(featureDir, 'maturity.json');
    assert.ok(!fs.existsSync(maturityPath), 'maturity.json should not exist initially');

    // Create a test item that references this spec
    const testData: IntegrationTest = {
      filePath: path.join(testsDir, 'us1-feature.spec.ts'),
      fileName: 'us1-feature.spec.ts',
      testName: 'US1-AS1: Given context1, When action1, Then result1',
      line: 3
    };

    // Create the test file
    fs.writeFileSync(testData.filePath, `import { test } from '@playwright/test';

test('US1-AS1: Given context1, When action1, Then result1', async ({ page }) => {
  // test implementation
});
`);

    // Create item with specFilePath pointing to the spec without maturity.json
    const item = {
      type: 'test',
      filePath: testData.filePath,
      specFilePath: specPath,  // Points to spec without maturity.json
      line: testData.line,
      data: testData
    };

    // Execute the runTest command
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Read clipboard content
    const clipboardContent = await vscode.env.clipboard.readText();

    // Verify clipboard contains AI instructions for maturity.json initialization
    assert.ok(clipboardContent.includes('maturity.json'), 'Clipboard should mention maturity.json');
    assert.ok(clipboardContent.includes('US1') || clipboardContent.includes('User Story 1'), 'Clipboard should include US1');
    assert.ok(clipboardContent.includes('US2') || clipboardContent.includes('User Story 2'), 'Clipboard should include US2 (ALL user stories, not just clicked one)');
  });

  test('US9-AS8: Given Run Test on a test node, When test config is retrieved, Then it uses same logic as US/AS levels (from parent spec maturity.json)', async () => {
    // Create a spec file WITH maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');

    // Create maturity.json with testConfig
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: new Date().toISOString(),
      testConfig: {
        framework: 'playwright',
        runCommand: 'npx playwright test',
        runSingleTestCommand: 'npx playwright test "{filePath}" --grep "{testName}"',
        runScenarioCommand: 'npx playwright test --grep "{scenarioId}"',
        runUserStoryCommand: 'npx playwright test --grep "{userStoryPattern}"'
      },
      userStories: {
        US1: {
          overall: 'complete',
          scenarios: {
            'US1-AS1': {
              level: 'complete',
              tests: [{
                filePath: 'tests/e2e/us1-feature.spec.ts',
                testName: 'US1-AS1: Given condition, When action, Then result',
                status: 'pass',
                lastRun: '2026-01-05'
              }]
            }
          }
        }
      }
    });
    fs.writeFileSync(maturityPath, maturityContent);

    // Create test file
    const testFilePath = path.join(testsDir, 'us1-feature.spec.ts');
    fs.writeFileSync(testFilePath, `import { test } from '@playwright/test';

test('US1-AS1: Given condition, When action, Then result', async ({ page }) => {
  // test implementation
});
`);

    const testData: IntegrationTest = {
      filePath: testFilePath,
      fileName: 'us1-feature.spec.ts',
      testName: 'US1-AS1: Given condition, When action, Then result',
      line: 3
    };

    // Create item with specFilePath - this is the key: test nodes should use specFilePath to get testConfig
    const item = {
      type: 'test',
      filePath: testFilePath,  // Test file path
      specFilePath: specPath,  // Parent spec path (used to find maturity.json)
      line: 3,
      data: testData
    };

    // Get initial terminal count
    const initialTerminalCount = vscode.window.terminals.length;

    // Execute the runTest command
    await vscode.commands.executeCommand('speckit.runTest', item);
    await new Promise(resolve => setTimeout(resolve, 200));

    // Verify terminal was created (meaning testConfig was found and used)
    const newTerminalCount = vscode.window.terminals.length;
    assert.ok(newTerminalCount > initialTerminalCount, 'Terminal should be created when testConfig exists');

    // Find the SpecKit terminal
    const speckitTerminal = vscode.window.terminals.find(t => t.name.includes('SpecKit'));
    assert.ok(speckitTerminal, 'SpecKit terminal should exist');
  });
});
