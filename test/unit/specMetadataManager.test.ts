import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SpecMetadataManager } from '../../src/helpers/specMetadataManager';

suite('SpecMetadataManager Test Suite', () => {
  let manager: SpecMetadataManager;
  let tempDir: string;

  setup(() => {
    manager = new SpecMetadataManager();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-metadata-test-'));
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeSpec(content: string): string {
    const specPath = path.join(tempDir, 'spec.md');
    fs.writeFileSync(specPath, content, 'utf-8');
    return specPath;
  }

  test('readMetadata returns empty metadata when the file does not exist', () => {
    const missing = path.join(tempDir, 'does-not-exist.md');

    assert.deepStrictEqual(manager.readMetadata(missing), {});
  });

  test('readMetadata returns empty metadata when there is no frontmatter', () => {
    const specPath = writeSpec('# Spec\n\nSome prose.\n');

    assert.deepStrictEqual(manager.readMetadata(specPath), {});
  });

  test('readMetadata parses testDirectory out of the frontmatter', () => {
    const specPath = writeSpec('---\ntestDirectory: test/suite\n---\n\n# Spec\n');

    assert.strictEqual(manager.readMetadata(specPath).testDirectory, 'test/suite');
  });

  test('getTestDirectory is undefined when the key is absent', () => {
    const specPath = writeSpec('---\nsomethingElse: value\n---\n\n# Spec\n');

    assert.strictEqual(manager.getTestDirectory(specPath), undefined);
  });

  test('setTestDirectory adds frontmatter to a spec that has none, keeping the body', () => {
    const specPath = writeSpec('# Spec\n\nSome prose.\n');

    manager.setTestDirectory(specPath, 'tests/e2e');

    const content = fs.readFileSync(specPath, 'utf-8');
    assert.ok(content.startsWith('---\ntestDirectory: tests/e2e\n---\n'));
    assert.ok(content.includes('# Spec'));
    assert.ok(content.includes('Some prose.'));
    assert.strictEqual(manager.getTestDirectory(specPath), 'tests/e2e');
  });

  test('setTestDirectory replaces an existing value rather than appending one', () => {
    const specPath = writeSpec('---\ntestDirectory: old/path\n---\n\n# Spec\n');

    manager.setTestDirectory(specPath, 'new/path');

    const content = fs.readFileSync(specPath, 'utf-8');
    assert.strictEqual(manager.getTestDirectory(specPath), 'new/path');
    assert.ok(!content.includes('old/path'));
    assert.strictEqual(content.match(/^---$/gm)?.length, 2, 'should still have exactly one frontmatter block');
  });

  test('writeMetadata throws when the spec file does not exist', () => {
    const missing = path.join(tempDir, 'does-not-exist.md');

    assert.throws(() => manager.writeMetadata(missing, { testDirectory: 'test' }), /Spec file not found/);
  });

  // Documents current behaviour, not an endorsement of it: writing empty
  // metadata strips the whole frontmatter block, so any unrelated keys a spec
  // carries are lost. Worth pinning so a future change to updateYamlFrontmatter
  // has to be deliberate about it.
  test('writeMetadata with empty metadata drops the entire frontmatter block', () => {
    const specPath = writeSpec('---\ntestDirectory: test/suite\nauthor: someone\n---\n\n# Spec\n');

    manager.writeMetadata(specPath, {});

    const content = fs.readFileSync(specPath, 'utf-8');
    assert.ok(!content.includes('testDirectory'));
    assert.ok(!content.includes('author'), 'unrelated frontmatter keys do not survive');
    assert.ok(content.trimStart().startsWith('# Spec'), 'the body itself is kept');
  });
});
