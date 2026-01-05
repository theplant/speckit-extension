import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { SpecParser } from '../../src/parsers/specParser';

suite('SpecParser Test Suite', () => {
  let parser: SpecParser;
  let tempDir: string;

  setup(() => {
    parser = new SpecParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-test-'));
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('US1-AS1: Should parse feature spec with user stories', async () => {
    const specDir = path.join(tempDir, '001-test-feature');
    fs.mkdirSync(specDir, { recursive: true });
    
    const specContent = `# Feature Specification: Test Feature

**Feature Branch**: \`001-test-feature\`
**Created**: 2024-12-30
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Specs in Sidebar (Priority: P1)

A developer can view specs in the sidebar.

**Why this priority**: Core functionality.

**Independent Test**: Open sidebar and verify specs appear.

**Acceptance Scenarios**:

1. **Given** a workspace with specs, **When** opening sidebar, **Then** specs appear in tree view
2. **Given** a spec in tree, **When** expanding it, **Then** user stories are shown

---

### User Story 2 - Edit Specs (Priority: P2)

A developer can edit specs directly.

**Acceptance Scenarios**:

1. **Given** a spec file, **When** double-clicking, **Then** it opens in editor
`;

    fs.writeFileSync(path.join(specDir, 'spec.md'), specContent);

    const result = await parser.parseSpecFile(path.join(specDir, 'spec.md'));

    assert.ok(result, 'Should parse spec file');
    assert.strictEqual(result.name, '001-test-feature');
    assert.strictEqual(result.displayName, 'Test Feature');
    assert.strictEqual(result.number, 1);
    assert.strictEqual(result.userStories.length, 2);

    const story1 = result.userStories[0];
    assert.strictEqual(story1.number, 1);
    assert.strictEqual(story1.title, 'View Specs in Sidebar');
    assert.strictEqual(story1.priority, 'P1');
    assert.strictEqual(story1.acceptanceScenarios.length, 2);

    const scenario1 = story1.acceptanceScenarios[0];
    assert.strictEqual(scenario1.id, 'US1-AS1');
    assert.strictEqual(scenario1.given, 'a workspace with specs');
    assert.strictEqual(scenario1.when, 'opening sidebar');
    assert.strictEqual(scenario1.then, 'specs appear in tree view');

    const story2 = result.userStories[1];
    assert.strictEqual(story2.number, 2);
    assert.strictEqual(story2.priority, 'P2');
  });

  test('US1-AS2: Should parse all specs in directory', async () => {
    const specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(path.join(specsDir, '001-feature-one'), { recursive: true });
    fs.mkdirSync(path.join(specsDir, '002-feature-two'), { recursive: true });

    const specTemplate = (name: string, num: number) => `# Feature Specification: ${name}

**Feature Branch**: \`00${num}-${name.toLowerCase().replace(' ', '-')}\`

## User Scenarios & Testing

### User Story 1 - Test Story (Priority: P1)

Description.

**Acceptance Scenarios**:

1. **Given** context, **When** action, **Then** result
`;

    fs.writeFileSync(
      path.join(specsDir, '001-feature-one', 'spec.md'),
      specTemplate('Feature One', 1)
    );
    fs.writeFileSync(
      path.join(specsDir, '002-feature-two', 'spec.md'),
      specTemplate('Feature Two', 2)
    );

    const results = await parser.parseAllSpecs(tempDir, 'specs');

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].number, 1);
    assert.strictEqual(results[1].number, 2);
  });

  test('US1-AS3: Should find user story line number', () => {
    const specDir = path.join(tempDir, '001-test');
    fs.mkdirSync(specDir, { recursive: true });
    
    const specContent = `# Feature

## User Scenarios

### User Story 1 - First (Priority: P1)

Description.

### User Story 2 - Second (Priority: P2)

Description.
`;

    const specPath = path.join(specDir, 'spec.md');
    fs.writeFileSync(specPath, specContent);

    const line1 = parser.findUserStoryLine(specPath, 1);
    const line2 = parser.findUserStoryLine(specPath, 2);

    assert.strictEqual(line1, 5);
    assert.strictEqual(line2, 9);
  });

  test('US1-AS4: Should handle empty specs directory', async () => {
    const specsDir = path.join(tempDir, 'empty-specs');
    fs.mkdirSync(specsDir, { recursive: true });

    const results = await parser.parseAllSpecs(tempDir, 'empty-specs');

    assert.strictEqual(results.length, 0);
  });

  test('US1-AS5: Should handle malformed spec files gracefully', async () => {
    const specDir = path.join(tempDir, '001-malformed');
    fs.mkdirSync(specDir, { recursive: true });
    
    const malformedContent = `# Some Random Content

This is not a valid spec file format.

No user stories here.
`;

    fs.writeFileSync(path.join(specDir, 'spec.md'), malformedContent);

    const result = await parser.parseSpecFile(path.join(specDir, 'spec.md'));

    assert.ok(result, 'Should still return a result');
    assert.strictEqual(result.userStories.length, 0);
  });
});
