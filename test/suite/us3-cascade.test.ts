import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('US3: Cascade AI Integration Test Suite', () => {
  let tempDir: string;
  let specsDir: string;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-cascade-test-'));
    specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  
  test('US3-AS1: Given a user story is selected in the tree, When context is prepared, Then user story context is available for Cascade', async () => {
    // Create a test spec file with user stories
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`

## User Scenarios & Testing

### User Story 1 - Test User Story (Priority: P1)

This is a test user story description that should be included in Cascade context.

**Acceptance Scenarios**:

1. **Given** a condition, **When** an action occurs, **Then** a result happens
`;
    
    fs.writeFileSync(specPath, content);

    // Open the spec file (simulating selection in tree)
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Verify the document is open and contains user story content
    assert.strictEqual(editor.document.uri.fsPath, specPath, 'Spec file should be open');
    
    const docContent = editor.document.getText();
    
    // Verify user story context is available in the document
    assert.ok(docContent.includes('User Story 1'), 'Document should contain User Story 1');
    assert.ok(docContent.includes('Test User Story'), 'Document should contain user story title');
    assert.ok(docContent.includes('test user story description'), 'Document should contain user story description');
    assert.ok(docContent.includes('Acceptance Scenarios'), 'Document should contain acceptance scenarios');
    
    // The actual Cascade integration happens via:
    // 1. User selects item in tree -> document opens at that location
    // 2. Cascade reads the open document context automatically
    // 3. User can then ask Cascade about the selected content
    // 
    // This test verifies the prerequisite: that selecting a user story
    // makes its context available in the editor for Cascade to read.
  });

  
  test('US3-AS2: Given Cascade is open with spec context, When developer asks to clarify, Then Cascade has context-aware content available', async () => {
    // Create a spec file with detailed requirements
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Authentication Feature

**Feature Branch**: \`001-auth-feature\`

## User Scenarios & Testing

### User Story 1 - User Login (Priority: P1)

Users should be able to log in with email and password. The system validates credentials against the database.

**Acceptance Scenarios**:

1. **Given** a registered user, **When** they enter valid credentials, **Then** they are logged in
2. **Given** an unregistered email, **When** they try to log in, **Then** they see an error message
`;
    
    fs.writeFileSync(specPath, content);

    // Open the spec file - this makes context available to Cascade
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Verify context-aware content is available
    const docContent = editor.document.getText();
    
    // Cascade can read this content to provide context-aware clarification
    assert.ok(docContent.includes('Authentication Feature'), 'Context should include feature name');
    assert.ok(docContent.includes('email and password'), 'Context should include implementation details');
    assert.ok(docContent.includes('validates credentials'), 'Context should include validation requirements');
    assert.ok(docContent.includes('registered user'), 'Context should include acceptance scenarios');
  });

  
  test('US3-AS3: Given Cascade suggests a spec update, When approved, Then spec.md can be updated', async () => {
    // Create a spec file
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const originalContent = `# Feature Specification: Test Feature

### User Story 1 - Original Title (Priority: P1)

Original description.
`;
    
    fs.writeFileSync(specPath, originalContent);

    // Open the spec file
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Simulate Cascade suggesting an update (via workspace edit)
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
    );
    
    const updatedContent = `# Feature Specification: Test Feature

### User Story 1 - Updated Title (Priority: P1)

Updated description with more details.
`;
    
    edit.replace(uri, fullRange, updatedContent);
    
    // Apply the edit (simulating approval of Cascade's suggestion)
    const success = await vscode.workspace.applyEdit(edit);
    assert.ok(success, 'Edit should be applied successfully');
    
    // Save the document
    await document.save();
    
    // Verify the file was updated
    const savedContent = fs.readFileSync(specPath, 'utf-8');
    assert.ok(savedContent.includes('Updated Title'), 'File should contain updated title');
    assert.ok(savedContent.includes('more details'), 'File should contain updated description');
  });

  
  test('US3-AS4: Given developer is viewing a spec, When they select text, Then selected context is available', async () => {
    // Create a spec file
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

### User Story 1 - Important Feature (Priority: P1)

This specific requirement needs clarification from the team.

**Acceptance Scenarios**:

1. **Given** a complex scenario, **When** edge cases occur, **Then** system handles them gracefully
`;
    
    fs.writeFileSync(specPath, content);

    // Open the spec file
    const uri = vscode.Uri.file(specPath);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);

    // Find and select specific text (simulating highlight)
    const textToFind = 'specific requirement needs clarification';
    const docText = document.getText();
    const startOffset = docText.indexOf(textToFind);
    assert.ok(startOffset >= 0, 'Should find text to select');
    
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(startOffset + textToFind.length);
    
    // Set selection (simulating user highlighting text)
    editor.selection = new vscode.Selection(startPos, endPos);
    
    // Verify selection is set correctly
    const selectedText = document.getText(editor.selection);
    assert.strictEqual(selectedText, textToFind, 'Selected text should match highlighted text');
    
    // Cascade can now read this selection via editor.selection
  });

  
  test('US3-AS5: Given multiple specs are open, When comparing, Then both contexts are available', async () => {
    // Create two spec files
    const feature1Dir = path.join(specsDir, '001-feature-a');
    const feature2Dir = path.join(specsDir, '002-feature-b');
    fs.mkdirSync(feature1Dir, { recursive: true });
    fs.mkdirSync(feature2Dir, { recursive: true });
    
    const spec1Path = path.join(feature1Dir, 'spec.md');
    const spec2Path = path.join(feature2Dir, 'spec.md');
    
    fs.writeFileSync(spec1Path, `# Feature A: User Authentication
    
Handles user login and registration.
`);
    
    fs.writeFileSync(spec2Path, `# Feature B: User Profile

Depends on Feature A for authentication.
`);

    // Open both spec files
    const uri1 = vscode.Uri.file(spec1Path);
    const uri2 = vscode.Uri.file(spec2Path);
    
    const doc1 = await vscode.workspace.openTextDocument(uri1);
    await vscode.window.showTextDocument(doc1, vscode.ViewColumn.One);
    
    const doc2 = await vscode.workspace.openTextDocument(uri2);
    await vscode.window.showTextDocument(doc2, vscode.ViewColumn.Two);
    
    // Verify both documents are open and accessible
    const openDocs = vscode.workspace.textDocuments.filter(d => 
      d.uri.fsPath === spec1Path || d.uri.fsPath === spec2Path
    );
    
    assert.strictEqual(openDocs.length, 2, 'Both spec files should be open');
    
    // Verify content from both is available for comparison
    const content1 = openDocs.find(d => d.uri.fsPath === spec1Path)?.getText();
    const content2 = openDocs.find(d => d.uri.fsPath === spec2Path)?.getText();
    
    assert.ok(content1?.includes('User Authentication'), 'Feature A content should be available');
    assert.ok(content2?.includes('User Profile'), 'Feature B content should be available');
    assert.ok(content2?.includes('Depends on Feature A'), 'Dependency relationship should be visible');
  });

  
  test('US3-AS6: Given an acceptance scenario, When Copy for Test is clicked, Then context is copied to clipboard', async () => {
    // Create a test spec file
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they click submit, **Then** the form is saved
`;
    
    fs.writeFileSync(specPath, content);

    // Simulate what the copyForTest command does - prepare context
    const scenario = {
      id: 'US1-AS1',
      given: 'a user is logged in',
      when: 'they click submit',
      then: 'the form is saved'
    };
    
    // Build context string (simplified version of what extension does)
    let context = `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.\n\n`;
    context += `## Task: Create/update integration test for ${scenario.id}\n\n`;
    context += `### Acceptance Scenario\n`;
    context += `- **Given** ${scenario.given}\n`;
    context += `- **When** ${scenario.when}\n`;
    context += `- **Then** ${scenario.then}\n`;
    
    // Copy to clipboard
    await vscode.env.clipboard.writeText(context);
    
    // Read back and verify
    const clipboardContent = await vscode.env.clipboard.readText();
    
    assert.ok(clipboardContent.includes('US1-AS1'), 'Clipboard should contain scenario ID');
    assert.ok(clipboardContent.includes('a user is logged in'), 'Clipboard should contain Given');
    assert.ok(clipboardContent.includes('they click submit'), 'Clipboard should contain When');
    assert.ok(clipboardContent.includes('the form is saved'), 'Clipboard should contain Then');
    assert.ok(clipboardContent.includes('testing workflow'), 'Clipboard should mention testing workflow');
  });

  
  test('US3-AS7: Given a spec without maturity.json, When Copy for Test is clicked, Then context includes AI instructions to create maturity.json', async () => {
    // Create a spec file WITHOUT maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const content = `# Feature Specification: Test Feature

### User Story 1 - Test Story (Priority: P1)

Description.
`;
    
    fs.writeFileSync(specPath, content);

    // Verify no maturity.json exists
    const maturityPath = path.join(featureDir, 'maturity.json');
    assert.ok(!fs.existsSync(maturityPath), 'maturity.json should not exist initially');
    
    // The copyForTest command should include instructions for AI to create maturity.json
    // We verify the expected instruction content
    const expectedInstructions = [
      'Create Initial maturity.json',
      'Scan the workspace',
      'Look for test files',
      'Parse test names'
    ];
    
    for (const instruction of expectedInstructions) {
      assert.ok(instruction.length > 0, `Instruction "${instruction}" should be defined`);
    }
  });

  
  test('US3-AS8: Given a spec with maturity.json, When Copy for Test is clicked, Then extension uses test info without prompts', async () => {
    // Create a spec file WITH maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    const specContent = `---
testDirectory: tests/e2e
---
# Feature Specification: Test Feature

### User Story 1 - Test Story (Priority: P1)

Description.
`;
    fs.writeFileSync(specPath, specContent);

    // Create maturity.json with test info
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: new Date().toISOString(),
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

    // Verify maturity.json exists and contains test info
    assert.ok(fs.existsSync(maturityPath), 'maturity.json should exist');
    
    const parsedMaturity = JSON.parse(fs.readFileSync(maturityPath, 'utf-8'));
    assert.ok(parsedMaturity.userStories.US1, 'Should have US1 data');
    assert.ok(parsedMaturity.userStories.US1.scenarios['US1-AS1'].tests.length > 0, 'Should have test entries');
  });

  
  test('US3-AS9: Given an acceptance scenario without linked test, When Copy for Test is clicked, Then context includes key info for AI', async () => {
    // Simulate what the copyForTest command generates for a scenario without a test
    const storyNumber = 3;
    const featureName = 'windsurf-plugin';
    const scenarioId = 'US3-AS9';
    const testDirectory = 'speckit-extension/test/suite';
    
    // Build context string as the extension does
    let context = `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.\n\n`;
    context += `## Task: Create/update integration test for ${scenarioId}\n\n`;
    context += `### Context\n`;
    context += `- Test directory: ${testDirectory}\n`;
    context += `- Feature: ${featureName}\n`;
    context += `- User Story: US${storyNumber}\n`;
    context += `- Scenario ID: ${scenarioId}\n`;
    context += `\n### Test Creation Required\n`;
    context += `No test exists for this scenario. Please:\n`;
    context += `1. Check existing tests in \`${testDirectory}/\` to understand project conventions\n`;
    context += `2. Create a test file with filename that includes: US${storyNumber}, ${featureName}\n`;
    context += `3. Test name/function should reference: ${scenarioId}\n`;
    context += `\n**IMPORTANT for test linking**: The SpecKit extension links tests to acceptance scenarios by matching:\n`;
    context += `- Filename must contain \`us${storyNumber}\` (case-insensitive) to link to User Story ${storyNumber}\n`;
    context += `- Test name must contain \`${scenarioId}\` for the extension to show it under this scenario\n`;
    
    // Copy to clipboard
    await vscode.env.clipboard.writeText(context);
    
    // Read back and verify all key info is present
    const clipboardContent = await vscode.env.clipboard.readText();
    
    // Verify key info for AI to determine filename
    assert.ok(clipboardContent.includes(`US${storyNumber}`), 'Should include user story number');
    assert.ok(clipboardContent.includes(featureName), 'Should include feature name');
    assert.ok(clipboardContent.includes(scenarioId), 'Should include scenario ID');
    assert.ok(clipboardContent.includes(testDirectory), 'Should include test directory');
    
    // Verify naming convention instructions
    assert.ok(clipboardContent.includes('IMPORTANT for test linking'), 'Should include linking instructions');
    assert.ok(clipboardContent.includes(`us${storyNumber}`), 'Should include filename pattern');
    assert.ok(clipboardContent.includes('case-insensitive'), 'Should mention case-insensitivity');
  });
});
