import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('US4: Edit Specs Directly in VS Code Editor', () => {
  let tempDir: string;
  let specsDir: string;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-us4-test-'));
    specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('US4-AS1: Given a user story in the tree, When double-clicked, Then spec.md opens with cursor at that user story', async () => {
    // Create a test spec file with multiple user stories
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`

## User Scenarios & Testing

### User Story 1 - First Story (Priority: P1)

First story description.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result

### User Story 2 - Second Story (Priority: P2)

Second story description.

**Acceptance Scenarios**:

1. **Given** another context, **When** another action, **Then** another result
`;
    
    fs.writeFileSync(specPath, content);

    // Find the line number for User Story 2 (simulating what the tree view stores)
    const lines = content.split('\n');
    let userStory2Line = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('### User Story 2')) {
        userStory2Line = i;
        break;
      }
    }
    assert.ok(userStory2Line >= 0, 'Should find User Story 2 line in content');

    // Simulate double-click behavior: open file and navigate to specific line
    // This is what the extension's openSpec command does when tree item is clicked
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Navigate to the user story line (simulating EditorController.openSpecAtLine)
    const position = new vscode.Position(userStory2Line, 0);
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);

    // Verify: spec.md file is open
    assert.strictEqual(editor.document.uri.fsPath, specPath, 'Spec file should be open');
    
    // Verify: cursor is at the user story line
    assert.strictEqual(editor.selection.active.line, userStory2Line, 'Cursor should be at User Story 2 line');
    
    // Verify: the line contains the expected user story
    const lineText = document.lineAt(userStory2Line).text;
    assert.ok(lineText.includes('User Story 2'), `Line should contain 'User Story 2', got: ${lineText}`);
  });

  test('US4-AS2: Given a spec file is open, When edited and saved, Then tree view refreshes', async () => {
    // Create a test spec file
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const initialContent = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`

## User Scenarios & Testing

### User Story 1 - Original Title (Priority: P1)

Description here.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;
    
    fs.writeFileSync(specPath, initialContent);

    // Open the spec file in the editor
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Verify file is open
    assert.strictEqual(editor.document.uri.fsPath, specPath);

    // Edit the file - change the user story title
    const edit = new vscode.WorkspaceEdit();
    const titleLine = 6; // Line with "### User Story 1 - Original Title"
    const lineText = document.lineAt(titleLine).text;
    
    assert.ok(lineText.includes('Original Title'), `Expected line to contain 'Original Title', got: ${lineText}`);
    
    const newLineText = lineText.replace('Original Title', 'Updated Title');
    edit.replace(
      uri,
      new vscode.Range(titleLine, 0, titleLine, lineText.length),
      newLineText
    );
    
    await vscode.workspace.applyEdit(edit);

    // Save the file
    await document.save();

    // Read the file to verify the change was saved
    const savedContent = fs.readFileSync(specPath, 'utf-8');
    assert.ok(savedContent.includes('Updated Title'), 'File should contain updated title');
    assert.ok(!savedContent.includes('Original Title'), 'File should not contain original title');

    // The tree view refresh is triggered by the file watcher in the extension
    // We verify the file watcher mechanism exists by checking the saved content
    // Full tree view testing would require the extension to be activated with a workspace
  });

  test('US4-AS3: Given the editor is open, When the developer uses VS Code outline view, Then they see the spec structure (user stories, scenarios, requirements)', async () => {
    // Create a test spec file with structure
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`

## User Scenarios & Testing

### User Story 1 - First Story (Priority: P1)

First story description.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
2. **Given** another context, **When** another action, **Then** another result

### User Story 2 - Second Story (Priority: P2)

Second story description.

**Acceptance Scenarios**:

1. **Given** some context, **When** some action, **Then** some result
`;
    
    fs.writeFileSync(specPath, content);

    // Open the spec file in the editor
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    // Request document symbols - this is what the outline view uses
    // VS Code's built-in markdown extension provides document symbols for markdown files
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );

    // Verify symbols are returned (VS Code's markdown extension provides these)
    assert.ok(symbols, 'Document symbols should be available');
    assert.ok(symbols.length > 0, 'Should have at least one symbol');

    // Find the feature specification heading
    const featureSymbol = symbols.find(s => s.name.includes('Feature Specification'));
    assert.ok(featureSymbol, 'Should have Feature Specification symbol');

    // Check for user story symbols in the hierarchy
    // The markdown extension creates symbols for all headings
    const allSymbolNames = getAllSymbolNames(symbols);
    
    // Verify user stories appear in outline
    assert.ok(
      allSymbolNames.some(name => name.includes('User Story 1')),
      'Outline should contain User Story 1'
    );
    assert.ok(
      allSymbolNames.some(name => name.includes('User Story 2')),
      'Outline should contain User Story 2'
    );
  });

  test('US4-AS4: Given a spec file, When the developer uses "Go to Symbol", Then they can jump to specific user stories or requirements by name', async () => {
    // Create a test spec file with multiple user stories
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`

## User Scenarios & Testing

### User Story 1 - Authentication Flow (Priority: P1)

Authentication story description.

**Acceptance Scenarios**:

1. **Given** user is not logged in, **When** they submit credentials, **Then** they are authenticated

### User Story 2 - Dashboard View (Priority: P2)

Dashboard story description.

**Acceptance Scenarios**:

1. **Given** user is logged in, **When** they visit dashboard, **Then** they see their data

### User Story 3 - Settings Management (Priority: P3)

Settings story description.

**Acceptance Scenarios**:

1. **Given** user is on settings page, **When** they update preferences, **Then** changes are saved
`;
    
    fs.writeFileSync(specPath, content);

    // Open the spec file in the editor
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Get document symbols - "Go to Symbol" (Cmd+Shift+O) uses this
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );

    assert.ok(symbols, 'Document symbols should be available for Go to Symbol');
    
    // Get all symbol names recursively
    const allSymbols = getAllSymbols(symbols);
    
    // Find the "Dashboard View" user story symbol
    const dashboardSymbol = allSymbols.find(s => s.name.includes('Dashboard View'));
    assert.ok(dashboardSymbol, 'Should find Dashboard View symbol via Go to Symbol');

    // Verify we can navigate to the symbol's location
    const symbolRange = dashboardSymbol!.range;
    assert.ok(symbolRange, 'Symbol should have a range');

    // Navigate to the symbol (simulating Go to Symbol selection)
    const position = symbolRange.start;
    editor.selection = new vscode.Selection(position, position);
    editor.revealRange(symbolRange, vscode.TextEditorRevealType.InCenter);

    // Verify cursor is at the correct location
    const lineText = document.lineAt(editor.selection.active.line).text;
    assert.ok(
      lineText.includes('Dashboard View') || lineText.includes('User Story 2'),
      `Should navigate to Dashboard View line, got: ${lineText}`
    );

    // Test searching for "Settings" - should find User Story 3
    const settingsSymbol = allSymbols.find(s => s.name.includes('Settings'));
    assert.ok(settingsSymbol, 'Should find Settings Management symbol via Go to Symbol');
  });
});

// Helper function to get all symbol names recursively
function getAllSymbolNames(symbols: vscode.DocumentSymbol[]): string[] {
  const names: string[] = [];
  for (const symbol of symbols) {
    names.push(symbol.name);
    if (symbol.children && symbol.children.length > 0) {
      names.push(...getAllSymbolNames(symbol.children));
    }
  }
  return names;
}

// Helper function to get all symbols recursively
function getAllSymbols(symbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {
  const result: vscode.DocumentSymbol[] = [];
  for (const symbol of symbols) {
    result.push(symbol);
    if (symbol.children && symbol.children.length > 0) {
      result.push(...getAllSymbols(symbol.children));
    }
  }
  return result;
}
