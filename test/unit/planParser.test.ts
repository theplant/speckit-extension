import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PlanParser } from '../../src/parsers/planParser';

suite('PlanParser Test Suite', () => {
  let parser: PlanParser;
  let workspaceRoot: string;
  let specDir: string;

  setup(() => {
    parser = new PlanParser();
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-plan-test-'));
    specDir = path.join(workspaceRoot, 'specs', 'feature-1');
    fs.mkdirSync(specDir, { recursive: true });
    fs.writeFileSync(path.join(specDir, 'spec.md'), '# Feature 1\n', 'utf-8');
  });

  teardown(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  const specPath = () => path.join(specDir, 'spec.md');

  function writePlan(content: string): void {
    fs.writeFileSync(path.join(specDir, 'plan.md'), content, 'utf-8');
  }

  test('reads a test directory out of a plan.md code block', async () => {
    writePlan(['# Plan', '', '```text', 'test/suite/', '  extension.test.ts', '```', ''].join('\n'));

    const config = await parser.discoverTestDirectories(workspaceRoot, specPath());

    assert.deepStrictEqual(config.directories, ['test']);
  });

  test('infers a typescript project from test file names in the block', async () => {
    writePlan(['```text', 'test/suite/', '  extension.test.ts', '```', ''].join('\n'));

    const config = await parser.discoverTestDirectories(workspaceRoot, specPath());

    assert.strictEqual(config.projectType, 'typescript');
    assert.ok(config.filePatterns.includes('*.test.ts'));
  });

  test('picks up a directory named in a **Testing** line', async () => {
    writePlan('# Plan\n\n**Testing**: VS Code Extension Test framework (`speckit-extension/test/`)\n');

    const config = await parser.discoverTestDirectories(workspaceRoot, specPath());

    assert.ok(
      config.directories.includes('speckit-extension/test'),
      `expected the Testing line directory, got ${JSON.stringify(config.directories)}`,
    );
  });

  test('falls back to scanning the workspace when there is no plan.md', async () => {
    fs.mkdirSync(path.join(workspaceRoot, 'tests'), { recursive: true });

    const config = await parser.discoverTestDirectories(workspaceRoot, specPath());

    assert.deepStrictEqual(config.directories, ['tests']);
  });

  test('falls back to the workspace when plan.md names no test directory', async () => {
    writePlan(['# Plan', '', '```text', 'src/', '  index.ts', '```', ''].join('\n'));
    fs.mkdirSync(path.join(workspaceRoot, 'test'), { recursive: true });

    const config = await parser.discoverTestDirectories(workspaceRoot, specPath());

    assert.deepStrictEqual(config.directories, ['test']);
  });

  // Documents current behaviour rather than endorsing it: 'specs' is one of the
  // directories the workspace fallback scans for, and a SpecKit workspace always
  // has one — it is where the specs themselves live. So the fallback reports the
  // spec source directory as a test directory, and the documented 'tests/e2e'
  // default below is only reachable when no specs/ directory exists at all.
  test('the workspace fallback treats the specs/ directory as a test directory', async () => {
    const config = await parser.discoverTestDirectories(workspaceRoot, specPath());

    assert.deepStrictEqual(config.directories, ['specs']);
    assert.strictEqual(config.projectType, 'unknown');
  });

  test('defaults to tests/e2e when the workspace offers no candidate directory', async () => {
    const bareRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-plan-bare-'));
    const bareSpec = path.join(bareRoot, 'spec.md');
    fs.writeFileSync(bareSpec, '# Feature\n', 'utf-8');

    try {
      const config = await parser.discoverTestDirectories(bareRoot, bareSpec);

      assert.deepStrictEqual(config.directories, ['tests/e2e']);
      assert.strictEqual(config.projectType, 'unknown');
    } finally {
      fs.rmSync(bareRoot, { recursive: true, force: true });
    }
  });
});
