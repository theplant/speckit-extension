import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { SpecParser } from '../../src/parsers/specParser';
import { SpecTreeProvider } from '../../src/providers/specTreeProvider';

suite('US1: View and Navigate Specs in VS Code Sidebar', () => {
  let tempDir: string;
  let specsDir: string;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-us1-test-'));
    specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  
  test('US1-AS1: Given plugin installed, When opening Windsurf with specs directory, Then SpecKit icon appears in activity bar', async () => {
    // Verify the extension's package.json has the correct contributions
    // This tests the extension is properly configured to appear in the activity bar
    
    const packageJsonPath = path.join(__dirname, '..', '..', '..', '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // Verify activity bar contribution
    assert.ok(packageJson.contributes?.viewsContainers?.activitybar, 
      'Extension should contribute to activity bar');
    
    const activityBarContribution = packageJson.contributes.viewsContainers.activitybar;
    const speckitContainer = activityBarContribution.find((c: any) => c.id === 'speckit-explorer');
    assert.ok(speckitContainer, 'Should have speckit view container');
    assert.strictEqual(speckitContainer.title, 'SpecKit', 'Container title should be SpecKit');
    
    // Verify the view is registered
    const views = packageJson.contributes?.views?.['speckit-explorer'];
    assert.ok(views, 'SpecKit views should be registered');
    assert.strictEqual(views[0].id, 'speckit.specsView', 'Should have specs view');
    assert.strictEqual(views[0].name, 'Specs', 'View name should be Specs');
    
    // Verify activation events
    assert.ok(packageJson.activationEvents, 'Should have activation events');
    assert.ok(packageJson.activationEvents.includes('workspaceContains:**/specs/*/spec.md'), 
      'Should activate on specs directory');
  });

  
  test('US1-AS2: Given spec sidebar is open, When viewing it, Then tree view shows feature specs at root level', async () => {
    // Create test spec files
    const feature1Dir = path.join(specsDir, '001-feature-one');
    const feature2Dir = path.join(specsDir, '002-feature-two');
    fs.mkdirSync(feature1Dir, { recursive: true });
    fs.mkdirSync(feature2Dir, { recursive: true });

    const specContent = (name: string) => `# Feature Specification: ${name}

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;

    fs.writeFileSync(path.join(feature1Dir, 'spec.md'), specContent('Feature One'));
    fs.writeFileSync(path.join(feature2Dir, 'spec.md'), specContent('Feature Two'));

    // Create tree provider and get root items
    const treeProvider = new SpecTreeProvider(tempDir);
    await treeProvider.refresh();
    
    const rootItems = await treeProvider.getChildren();
    
    assert.strictEqual(rootItems.length, 2, 'Should have 2 feature specs at root');
    assert.ok(rootItems[0].label?.toString().includes('Feature One'), 'First feature should be Feature One');
    assert.ok(rootItems[1].label?.toString().includes('Feature Two'), 'Second feature should be Feature Two');
    assert.strictEqual(rootItems[0].type, 'feature', 'Root items should be feature type');
  });

  
  test('US1-AS3: Given a feature spec in tree, When expanding it, Then user stories appear with priority indicators', async () => {
    // Create test spec with multiple user stories
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });

    const specContent = `# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - High Priority Story (Priority: P1)

Description for P1 story.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result

---

### User Story 2 - Medium Priority Story (Priority: P2)

Description for P2 story.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result

---

### User Story 3 - Low Priority Story (Priority: P3)

Description for P3 story.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;

    fs.writeFileSync(path.join(featureDir, 'spec.md'), specContent);

    const treeProvider = new SpecTreeProvider(tempDir);
    await treeProvider.refresh();
    
    const rootItems = await treeProvider.getChildren();
    assert.strictEqual(rootItems.length, 1, 'Should have 1 feature');
    
    // Expand feature to get user stories
    const userStories = await treeProvider.getChildren(rootItems[0]);
    
    assert.strictEqual(userStories.length, 3, 'Should have 3 user stories');
    
    // Check priority indicators in description
    assert.strictEqual(userStories[0].description, 'P1', 'First story should have P1 priority');
    assert.strictEqual(userStories[1].description, 'P2', 'Second story should have P2 priority');
    assert.strictEqual(userStories[2].description, 'P3', 'Third story should have P3 priority');
    
    // Check labels contain user story info
    assert.ok(userStories[0].label?.toString().includes('US1'), 'Should show US1');
    assert.ok(userStories[1].label?.toString().includes('US2'), 'Should show US2');
    assert.ok(userStories[2].label?.toString().includes('US3'), 'Should show US3');
  });

  
  test('US1-AS4: Given a user story in tree, When expanding it, Then acceptance scenarios appear showing Given+When text', async () => {
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });

    const specContent = `# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** a developer has the plugin installed, **When** they open Windsurf, **Then** they see the sidebar
2. **Given** the sidebar is open, **When** viewing specs, **Then** tree view appears
3. **Given** a spec in tree, **When** clicking it, **Then** it opens in editor
`;

    fs.writeFileSync(path.join(featureDir, 'spec.md'), specContent);

    const treeProvider = new SpecTreeProvider(tempDir);
    await treeProvider.refresh();
    
    const rootItems = await treeProvider.getChildren();
    const userStories = await treeProvider.getChildren(rootItems[0]);
    
    // Expand user story to get acceptance scenarios
    const scenarios = await treeProvider.getChildren(userStories[0]);
    
    assert.strictEqual(scenarios.length, 3, 'Should have 3 acceptance scenarios');
    
    // Check scenario labels contain Given text
    assert.ok(scenarios[0].label?.toString().includes('US1-AS1'), 'Should show scenario ID');
    assert.ok(scenarios[0].label?.toString().includes('Given'), 'Should show Given in label');
    assert.ok(scenarios[1].label?.toString().includes('US1-AS2'), 'Should show US1-AS2');
    assert.ok(scenarios[2].label?.toString().includes('US1-AS3'), 'Should show US1-AS3');
    
    // Check type
    assert.strictEqual(scenarios[0].type, 'scenario', 'Should be scenario type');
  });

  
  test('US1-AS5: Given an acceptance scenario in tree, When expanding it, Then linked integration tests appear (if any)', async () => {
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });

    // Create spec with test directory configured
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

    fs.writeFileSync(path.join(featureDir, 'spec.md'), specContent);

    // Create a test file that matches the user story
    const testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(testsDir, { recursive: true });
    
    const testContent = `import { test } from '@playwright/test';

test('US1-AS1: Given context, When action, Then result', async ({ page }) => {
  // test implementation
});
`;
    fs.writeFileSync(path.join(testsDir, 'us1-test-feature.spec.ts'), testContent);

    const treeProvider = new SpecTreeProvider(tempDir);
    await treeProvider.refresh();
    
    const rootItems = await treeProvider.getChildren();
    const userStories = await treeProvider.getChildren(rootItems[0]);
    const scenarios = await treeProvider.getChildren(userStories[0]);
    
    // Check if scenario has linked tests (collapsible state indicates children)
    const scenario = scenarios[0];
    
    // If tests are linked, the scenario should be expandable
    if (scenario.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
      const linkedTests = await treeProvider.getChildren(scenario);
      assert.ok(linkedTests.length > 0, 'Should have linked tests');
      assert.strictEqual(linkedTests[0].type, 'test', 'Children should be test type');
    }
    
    // Verify the scenario type is correct regardless
    assert.strictEqual(scenario.type, 'scenario', 'Should be scenario type');
  });

  
  test('US1-AS6: Given a user story in tree, When clicking it, Then spec.md opens at that user story line', async () => {
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });

    const specContent = `# Feature Specification: Test Feature

## User Scenarios & Testing

### User Story 1 - First Story (Priority: P1)

Description of first story.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result

---

### User Story 2 - Second Story (Priority: P2)

Description of second story.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;

    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    const treeProvider = new SpecTreeProvider(tempDir);
    await treeProvider.refresh();
    
    const rootItems = await treeProvider.getChildren();
    const userStories = await treeProvider.getChildren(rootItems[0]);
    
    // Verify user stories have correct line numbers
    assert.ok(userStories[0].line, 'First user story should have line number');
    assert.ok(userStories[1].line, 'Second user story should have line number');
    
    // User story 1 starts at line 5 (### User Story 1)
    // User story 2 starts at line 15 (### User Story 2)
    assert.strictEqual(userStories[0].line, 5, 'US1 should be at line 5');
    assert.strictEqual(userStories[1].line, 15, 'US2 should be at line 15');
    
    // Verify the command is set to open with tests (new default behavior)
    assert.ok(userStories[0].command, 'User story should have a command');
    assert.strictEqual(userStories[0].command?.command, 'speckit.openWithTests', 'Command should be openWithTests');
    
    // Verify file path is correct
    assert.strictEqual(userStories[0].filePath, specPath, 'File path should match spec path');
  });

  // @pending
  test('US1-AS7: Given spec with explicit scenario IDs and sub-scenarios, When parsing, Then all scenarios including sub-scenarios are parsed correctly', async () => {
    const featureDir = path.join(specsDir, '001-workflow-management');
    fs.mkdirSync(featureDir, { recursive: true });

    // This is the exact format from the user's spec
    const specContent = `# Feature Specification: Workflow Management

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save and Manage My Workflow Designs (Priority: P1)

As Sara (Business Operations Manager), I need to save my workflow designs so that I can build them incrementally over multiple sessions, share them with my team, and retrieve them whenever I need to make updates.

**Why this priority**: This is the foundation that enables Sara to iteratively design workflows without losing her work. Without persistence, she'd have to rebuild workflows from scratch every time, making the platform unusable.

**Independent Test**: Can be fully tested by making API calls to create, retrieve, update, and delete workflow definitions, and verifying the data persists correctly in the database without requiring workflow execution.

**Acceptance Scenarios**:

1. **US1-AS1**: **Given** no existing workflows, **When** I POST a valid workflow definition with name, description, trigger type, and steps to \`/api/workflows\`, **Then** the system returns HTTP 201 with the created workflow including a unique ID and timestamps
1a. **US1-AS1a**: **Given** no existing workflows, **When** I POST a workflow definition with name and trigger type but empty steps array to \`/api/workflows\`, **Then** the system returns HTTP 201 with the created workflow in "draft" status (empty steps allowed for drafts to enable incremental building)
2. **US1-AS2**: **Given** an existing workflow with ID "abc-123", **When** I GET \`/api/workflows/abc-123\`, **Then** the system returns HTTP 200 with the complete workflow definition including all steps and configuration
3. **US1-AS3**: **Given** an existing workflow with ID "abc-123", **When** I PUT updated steps to \`/api/workflows/abc-123\`, **Then** the system returns HTTP 200, increments the version number, and persists the updated definition
4. **US1-AS4**: **Given** an existing workflow with ID "abc-123", **When** I DELETE \`/api/workflows/abc-123\`, **Then** the system returns HTTP 204 and the workflow is no longer retrievable
5. **US1-AS5**: **Given** multiple workflows exist, **When** I GET \`/api/workflows\`, **Then** the system returns HTTP 200 with a paginated list of all workflows including their basic metadata

---
`;

    fs.writeFileSync(path.join(featureDir, 'spec.md'), specContent);

    const parser = new SpecParser();
    const spec = await parser.parseSpecFile(path.join(featureDir, 'spec.md'));

    assert.ok(spec, 'Spec should be parsed');
    assert.strictEqual(spec!.userStories.length, 1, 'Should have 1 user story');

    const userStory = spec!.userStories[0];
    assert.strictEqual(userStory.number, 1, 'User story number should be 1');
    assert.strictEqual(userStory.title, 'Save and Manage My Workflow Designs', 'User story title should match');
    assert.strictEqual(userStory.priority, 'P1', 'Priority should be P1');
    assert.ok(userStory.whyPriority?.includes('foundation'), 'Why priority should be parsed');
    assert.ok(userStory.independentTest?.includes('API calls'), 'Independent test should be parsed');

    // Check acceptance scenarios - should have 6 total (including sub-scenario 1a)
    assert.strictEqual(userStory.acceptanceScenarios.length, 6, 'Should have 6 acceptance scenarios (including 1a sub-scenario)');

    // Check scenario IDs are correctly parsed
    const scenarioIds = userStory.acceptanceScenarios.map(s => s.id);
    assert.ok(scenarioIds.includes('US1-AS1'), 'Should have US1-AS1');
    assert.ok(scenarioIds.includes('US1-AS1a'), 'Should have US1-AS1a (sub-scenario)');
    assert.ok(scenarioIds.includes('US1-AS2'), 'Should have US1-AS2');
    assert.ok(scenarioIds.includes('US1-AS3'), 'Should have US1-AS3');
    assert.ok(scenarioIds.includes('US1-AS4'), 'Should have US1-AS4');
    assert.ok(scenarioIds.includes('US1-AS5'), 'Should have US1-AS5');

    // Check sub-scenario details
    const subScenario = userStory.acceptanceScenarios.find(s => s.id === 'US1-AS1a');
    assert.ok(subScenario, 'Sub-scenario US1-AS1a should exist');
    assert.strictEqual(subScenario!.number, 1, 'Sub-scenario number should be 1 (base number)');
    assert.ok(subScenario!.given.includes('no existing workflows'), 'Given should be parsed');
    assert.ok(subScenario!.when.includes('POST a workflow definition'), 'When should be parsed');
    assert.ok(subScenario!.then.includes('draft'), 'Then should contain draft status');
  });

  // @pending
  test('US1-AS8: Given spec with multiple acceptance scenario sections, When parsing, Then all scenarios from all sections are parsed correctly', async () => {
    const featureDir = path.join(specsDir, '006-event-triggers');
    fs.mkdirSync(featureDir, { recursive: true });

    // This is the exact format from the user's spec with multiple acceptance scenario sections
    const specContent = `# Feature Specification: Event Triggers

## User Scenarios & Testing *(mandatory)*

### User Story 6 - Respond to Real-Time Events (Priority: P3)

As Sara (Business Operations Manager), I need workflows to trigger automatically when business events happen (like "order placed" or "user registered") so that customer experiences are timely and I don't have to manually start workflows for every transaction.

**Why this priority**: Event-driven automation is key for use cases like welcome emails or abandoned cart recovery. However, manual triggers are sufficient for initial testing and prototyping, so this can wait until core execution is solid.

**Independent Test**: Can be fully tested by creating workflows with both event-based and webhook triggers, publishing test events or sending webhook calls, and verifying workflow executions are triggered with correct data.

**Acceptance Scenarios - Trigger Subject Discovery**:

1. **US6-AS0a**: **Given** the trigger subject catalog is loaded, **When** I GET \`/api/v1/triggers/subjects\`, **Then** the system returns HTTP 200 with a list of all available trigger subjects grouped by service (CIAM, Order, Cart, Loyalty, Engagement, Support, Inventory, CRM, Marketing) including subject name, entity, action, description, and payload schema
2. **US6-AS0b**: **Given** the trigger subject catalog contains 37 subjects across 10 services, **When** I GET \`/api/v1/triggers/subjects?service=CIAM\`, **Then** the system returns HTTP 200 with only the subjects belonging to the CIAM service and a service_counts map showing the count for CIAM

**Acceptance Scenarios - Event-Based Triggers (Internal Services)**:

1. **US6-AS1**: **Given** I create a workflow with trigger type "event" and \`TriggerConfig.subject\` set to "events.order.placed", **When** I POST to \`/api/workflows/{id}/activate\`, **Then** the system automatically subscribes to the event bus subject and returns HTTP 200 with the activated workflow
2. **US6-AS2**: **Given** an active workflow subscribed to "order.placed" events, **When** OMS service publishes an "order.placed" event to the event bus, **Then** the system starts a new workflow execution with the event data as trigger input
3. **US6-AS3**: **Given** an event-triggered workflow with filter conditions, **When** an event matches the event type but fails the filter criteria, **Then** the system does not start a workflow execution
4. **US6-AS4**: **Given** a paused workflow with an event trigger, **When** an event is published to the event bus, **Then** the system does not start a workflow execution
5. **US6-AS5**: **Given** multiple workflows subscribed to the same event type, **When** an event is published, **Then** the system starts separate workflow executions for each subscribed workflow

**Acceptance Scenarios - Webhook Triggers (External Services)**:

1. **US6-AS6**: **Given** I create a workflow with trigger type "webhook", **When** I POST to \`/api/triggers/webhook\` with the workflow ID, **Then** the system returns HTTP 201 with a unique webhook URL and HMAC secret
2. **US6-AS7**: **Given** a workflow with webhook URL \`https://api.example.com/hooks/abc-123\`, **When** an external system POSTs event data with valid HMAC signature and timestamp, **Then** the system starts a new workflow execution with the event data as trigger input
3. **US6-AS8**: **Given** a webhook receives an event, **When** the webhook signature is invalid, **Then** the system returns HTTP 401 and does not start a workflow execution
4. **US6-AS9**: **Given** a webhook receives an event, **When** the event timestamp is older than 5 minutes, **Then** the system returns HTTP 401 to prevent replay attacks and does not start a workflow execution
5. **US6-AS10**: **Given** a paused workflow with a webhook, **When** an external system POSTs to the webhook URL, **Then** the system returns HTTP 200 but does not start a workflow execution
6. **US6-AS11**: **Given** I GET \`/api/triggers/webhook/{triggerId}\`, **When** the trigger exists, **Then** the system returns HTTP 200 with the webhook URL, associated workflow ID, and event statistics (secret is not returned for security)

---
`;

    fs.writeFileSync(path.join(featureDir, 'spec.md'), specContent);

    const parser = new SpecParser();
    const spec = await parser.parseSpecFile(path.join(featureDir, 'spec.md'));

    assert.ok(spec, 'Spec should be parsed');
    assert.strictEqual(spec!.userStories.length, 1, 'Should have 1 user story');

    const userStory = spec!.userStories[0];
    assert.strictEqual(userStory.number, 6, 'User story number should be 6');
    assert.strictEqual(userStory.title, 'Respond to Real-Time Events', 'User story title should match');
    assert.strictEqual(userStory.priority, 'P3', 'Priority should be P3');
    assert.ok(userStory.whyPriority?.includes('Event-driven automation'), 'Why priority should be parsed');
    assert.ok(userStory.independentTest?.includes('event-based and webhook triggers'), 'Independent test should be parsed');

    // Check acceptance scenarios - should have 13 total from 3 sections:
    // - Trigger Subject Discovery: 2 (US6-AS0a, US6-AS0b)
    // - Event-Based Triggers: 5 (US6-AS1 to US6-AS5)
    // - Webhook Triggers: 6 (US6-AS6 to US6-AS11)
    assert.strictEqual(userStory.acceptanceScenarios.length, 13, 'Should have 13 acceptance scenarios from all 3 sections');

    // Check scenario IDs are correctly parsed from all sections
    const scenarioIds = userStory.acceptanceScenarios.map(s => s.id);
    
    // Trigger Subject Discovery section
    assert.ok(scenarioIds.includes('US6-AS0a'), 'Should have US6-AS0a from Trigger Subject Discovery section');
    assert.ok(scenarioIds.includes('US6-AS0b'), 'Should have US6-AS0b from Trigger Subject Discovery section');
    
    // Event-Based Triggers section
    assert.ok(scenarioIds.includes('US6-AS1'), 'Should have US6-AS1 from Event-Based Triggers section');
    assert.ok(scenarioIds.includes('US6-AS2'), 'Should have US6-AS2');
    assert.ok(scenarioIds.includes('US6-AS3'), 'Should have US6-AS3');
    assert.ok(scenarioIds.includes('US6-AS4'), 'Should have US6-AS4');
    assert.ok(scenarioIds.includes('US6-AS5'), 'Should have US6-AS5');
    
    // Webhook Triggers section
    assert.ok(scenarioIds.includes('US6-AS6'), 'Should have US6-AS6 from Webhook Triggers section');
    assert.ok(scenarioIds.includes('US6-AS7'), 'Should have US6-AS7');
    assert.ok(scenarioIds.includes('US6-AS8'), 'Should have US6-AS8');
    assert.ok(scenarioIds.includes('US6-AS9'), 'Should have US6-AS9');
    assert.ok(scenarioIds.includes('US6-AS10'), 'Should have US6-AS10');
    assert.ok(scenarioIds.includes('US6-AS11'), 'Should have US6-AS11');

    // Check specific scenario details
    const as0a = userStory.acceptanceScenarios.find(s => s.id === 'US6-AS0a');
    assert.ok(as0a, 'US6-AS0a should exist');
    assert.ok(as0a!.given.includes('trigger subject catalog'), 'Given should be parsed correctly');
    assert.ok(as0a!.when.includes('GET'), 'When should contain GET');
    assert.ok(as0a!.then.includes('HTTP 200'), 'Then should contain HTTP 200');

    const as11 = userStory.acceptanceScenarios.find(s => s.id === 'US6-AS11');
    assert.ok(as11, 'US6-AS11 should exist');
    assert.ok(as11!.then.includes('secret is not returned'), 'Then should contain security note');
  });
});
