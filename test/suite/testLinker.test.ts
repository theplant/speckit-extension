import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { TestLinker } from '../../src/linkers/testLinker';

suite('TestLinker Test Suite', () => {
  let linker: TestLinker;
  let tempDir: string;

  setup(() => {
    linker = new TestLinker();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-test-'));
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('US2-AS1: Should find test file for user story by naming convention', async () => {
    const testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(testsDir, { recursive: true });

    const testContent = `import { test, expect } from '@playwright/test';

test.describe('US1: View Specs', () => {
  test('US1-AS1: Given workspace, When opening sidebar, Then specs appear', async ({ page }) => {
    // test implementation
  });
});
`;

    fs.writeFileSync(path.join(testsDir, 'us1-specs.spec.ts'), testContent);

    const testFile = linker.findTestFileForStory(tempDir, 'tests/e2e', 1);

    assert.ok(testFile, 'Should find test file');
    assert.ok(testFile.includes('us1-specs.spec.ts'));
  });

  test('US2-AS2: Should find tests for specific user story', async () => {
    const testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(testsDir, { recursive: true });

    const testContent = `import { test } from '@playwright/test';

test('US1-AS1: First scenario', async ({ page }) => {});
test('US1-AS2: Second scenario', async ({ page }) => {});
test('US1-AS3: Third scenario', async ({ page }) => {});
`;

    fs.writeFileSync(path.join(testsDir, 'us1-feature.spec.ts'), testContent);

    const tests = await linker.findTestsForStory(tempDir, 'tests/e2e', '001-feature', 1);

    assert.strictEqual(tests.length, 3);
    assert.ok(tests.some((t: any) => t.testName?.includes('US1-AS1')));
    assert.ok(tests.some((t: any) => t.testName?.includes('AS2')));
  });

  test('US2-AS3: Should find tests for specific acceptance scenario', async () => {
    const testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(testsDir, { recursive: true });

    const testContent = `import { test } from '@playwright/test';

test('US1-AS1: First scenario', async ({ page }) => {});
test('US1-AS2: Second scenario', async ({ page }) => {});
`;

    fs.writeFileSync(path.join(testsDir, 'us1-feature.spec.ts'), testContent);

    const tests = await linker.findTestsForScenario(tempDir, 'tests/e2e', '001-feature', 1, 2);

    assert.ok(tests.length > 0);
    assert.ok(tests.some((t: any) => t.testName?.includes('AS2')));
  });

  test('US2-AS4: Should scan test annotations', async () => {
    const testsDir = path.join(tempDir, 'tests', 'e2e');
    fs.mkdirSync(testsDir, { recursive: true });

    const testContent = `import { test } from '@playwright/test';

// @spec: 001-feature/US1-AS1
test('First test', async ({ page }) => {});

// @spec: 001-feature/US1-AS2
test('Second test', async ({ page }) => {});

// @spec: 002-other/US2-AS1
test('Other test', async ({ page }) => {});
`;

    fs.writeFileSync(path.join(testsDir, 'annotated.spec.ts'), testContent);

    const annotations = await linker.scanTestAnnotations(tempDir, 'tests/e2e');

    assert.ok(annotations.has('001-feature/US1-AS1'));
    assert.ok(annotations.has('001-feature/US1-AS2'));
    assert.ok(annotations.has('002-other/US2-AS1'));
  });

  test('US2-AS5: Should handle missing tests directory', async () => {
    const tests = await linker.findTestsForStory(tempDir, 'nonexistent', '001-feature', 1);

    assert.strictEqual(tests.length, 0);
  });

  test('US2-AS6: Should find nested test files', async () => {
    const testsDir = path.join(tempDir, 'tests', 'e2e', 'features');
    fs.mkdirSync(testsDir, { recursive: true });

    const testContent = `test('US1-AS1: Nested test', async ({ page }) => {});`;
    fs.writeFileSync(path.join(testsDir, 'us1-nested.spec.ts'), testContent);

    const testFile = linker.findTestFileForStory(tempDir, 'tests/e2e', 1);

    assert.ok(testFile, 'Should find nested test file');
  });
});
