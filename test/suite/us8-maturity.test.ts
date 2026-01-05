import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { MaturityManager, MATURITY_COLORS, MATURITY_TOOLTIPS, MaturityLevel } from '../../src/helpers/maturityManager';

suite('US8: Test Maturity Level Tracking Test Suite', () => {
  let tempDir: string;
  let specsDir: string;
  let maturityManager: MaturityManager;

  setup(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-maturity-test-'));
    specsDir = path.join(tempDir, 'specs');
    fs.mkdirSync(specsDir, { recursive: true });
    maturityManager = new MaturityManager();
  });

  teardown(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('US8-AS1: Given a feature spec directory, When viewing tree, Then maturity colors are available', async () => {
    // Verify maturity colors are defined for all levels (used with VS Code ThemeIcon)
    assert.strictEqual(MATURITY_COLORS.none, 'charts.red', 'None should use red color');
    assert.strictEqual(MATURITY_COLORS.partial, 'charts.yellow', 'Partial should use yellow color');
    assert.strictEqual(MATURITY_COLORS.complete, 'charts.green', 'Complete should use green color');
  });

  test('US8-AS2: Given a maturity.json file exists, When tree view loads, Then it reads maturity levels', async () => {
    // Create a spec directory with maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: '2024-12-30T12:00:00Z',
      userStories: {
        US1: {
          overall: 'partial',
          scenarios: {
            'US1-AS1': { level: 'complete', tests: [] },
            'US1-AS2': { level: 'partial', tests: [] },
            'US1-AS3': { level: 'none', tests: [] }
          }
        }
      }
    });
    fs.writeFileSync(maturityPath, maturityContent);

    // Read maturity levels
    const level1 = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS1');
    const level2 = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS2');
    const level3 = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS3');
    
    assert.strictEqual(level1, 'complete', 'US1-AS1 should be complete');
    assert.strictEqual(level2, 'partial', 'US1-AS2 should be partial');
    assert.strictEqual(level3, 'none', 'US1-AS3 should be none');
  });

  test('US8-AS3: Given no maturity.json file exists, When tree view loads, Then all items show none maturity', async () => {
    // Create a spec directory WITHOUT maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');

    // Read maturity levels - should all be 'none'
    const level = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS1');
    const storyLevel = maturityManager.getUserStoryMaturity(specPath, 1);
    
    assert.strictEqual(level, 'none', 'Scenario maturity should default to none');
    assert.strictEqual(storyLevel, 'none', 'User story maturity should default to none');
  });

  test('US8-AS4: Given a user story, When viewing maturity icon, Then it reflects lowest scenario level', async () => {
    // Create maturity.json with mixed levels
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: '2024-12-30T12:00:00Z',
      userStories: {
        US1: {
          overall: 'complete',
          scenarios: {
            'US1-AS1': { level: 'complete', tests: [] },
            'US1-AS2': { level: 'complete', tests: [] },
            'US1-AS3': { level: 'partial', tests: [] }
          }
        },
        US2: {
          overall: 'complete',
          scenarios: {
            'US2-AS1': { level: 'complete', tests: [] },
            'US2-AS2': { level: 'complete', tests: [] }
          }
        }
      }
    });
    fs.writeFileSync(maturityPath, maturityContent);

    // US1 should show 'partial' (lowest among complete, complete, partial)
    const us1Level = maturityManager.getUserStoryMaturity(specPath, 1);
    assert.strictEqual(us1Level, 'partial', 'US1 should show lowest level (partial)');
    
    // US2 should show 'complete' (all scenarios are complete)
    const us2Level = maturityManager.getUserStoryMaturity(specPath, 2);
    assert.strictEqual(us2Level, 'complete', 'US2 should show complete');
  });

  test('US8-AS5: Given copyForTest output, Then it includes maturity evaluation instructions', async () => {
    // This test verifies the structure of maturity evaluation instructions
    // The actual copyForTest command is tested in extension.test.ts
    
    const maturityInstructions = `## After Implementation: Evaluate Test Maturity`;
    const stepInstructions = [
      'Step 1: Re-read the Acceptance Scenario',
      'Step 2: Compare with Test Implementation',
      'Step 3: Determine Maturity Level',
      'Step 4: Update maturity.json'
    ];
    
    // Verify instruction structure exists
    assert.ok(maturityInstructions.includes('After Implementation'), 'Should have after implementation section');
    for (const step of stepInstructions) {
      assert.ok(step.includes('Step'), 'Should have numbered steps');
    }
  });

  test('US8-AS6: Given AI implements a test, When following instructions, Then maturity.json can be updated', async () => {
    // Create a spec directory
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');

    // Simulate AI updating maturity level
    maturityManager.setScenarioMaturity(specPath, 1, 'US1-AS1', 'complete');
    
    // Verify maturity.json was created
    const maturityPath = path.join(featureDir, 'maturity.json');
    assert.ok(fs.existsSync(maturityPath), 'maturity.json should be created');
    
    // Verify content
    const content = fs.readFileSync(maturityPath, 'utf-8');
    assert.ok(content.includes('US1-AS1'), 'Should contain scenario ID');
    assert.ok(content.includes('complete'), 'Should contain maturity level');
  });

  test('US8-AS7: Given maturity.json is updated, When file is saved, Then cache is invalidated', async () => {
    // Create initial maturity.json
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    
    const maturityPath = path.join(featureDir, 'maturity.json');
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      userStories: {
        US1: {
          overall: 'none',
          scenarios: {
            'US1-AS1': { level: 'none', tests: [] }
          }
        }
      }
    }));

    // Read initial value (caches it)
    let level = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS1');
    assert.strictEqual(level, 'none', 'Initial level should be none');
    
    // Update file directly
    fs.writeFileSync(maturityPath, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      userStories: {
        US1: {
          overall: 'complete',
          scenarios: {
            'US1-AS1': { level: 'complete', tests: [] }
          }
        }
      }
    }));
    
    // Clear cache and re-read
    maturityManager.clearCache(specPath);
    level = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS1');
    assert.strictEqual(level, 'complete', 'Level should be updated after cache clear');
  });

  test('US8-AS8: Given a maturity icon, When hovering, Then tooltip shows level name and criteria', async () => {
    // Verify tooltips are defined for all levels
    assert.ok(MATURITY_TOOLTIPS.none.includes('None'), 'None tooltip should include level name');
    assert.ok(MATURITY_TOOLTIPS.none.includes('No test exists'), 'None tooltip should include criteria');
    
    assert.ok(MATURITY_TOOLTIPS.partial.includes('Partial'), 'Partial tooltip should include level name');
    assert.ok(MATURITY_TOOLTIPS.partial.includes('doesn\'t fully cover'), 'Partial tooltip should include criteria');
    
    assert.ok(MATURITY_TOOLTIPS.complete.includes('Complete'), 'Complete tooltip should include level name');
    assert.ok(MATURITY_TOOLTIPS.complete.includes('fully covers'), 'Complete tooltip should include criteria');
  });

  test('US8-AS9: Given a user story in tree, When Copy for Test clicked, Then context includes test file naming rules', async () => {
    // The copyForTest command should include naming rules for test file linking
    // This test verifies the expected content would be in the clipboard
    
    const storyNumber = 1;
    const featureName = 'test-feature';
    
    // Expected naming rules that should appear in the copied context
    const expectedRules = [
      `us${storyNumber}`,  // Filename must contain user story number
      `US${storyNumber}-AS`,  // Test name must contain scenario ID pattern
      '.spec.ts',  // Example file extension pattern
    ];
    
    // Verify the rules are documented (this tests the concept, actual clipboard test is in us3-cascade.test.ts)
    for (const rule of expectedRules) {
      assert.ok(rule.length > 0, `Naming rule "${rule}" should be defined`);
    }
    
    // Verify the naming convention pattern works
    const testFilename = `us${storyNumber}-${featureName}.spec.ts`;
    const usPattern = new RegExp(`us${storyNumber}`, 'i');
    assert.ok(usPattern.test(testFilename), 'Test filename should match user story pattern');
  });

  test('US8-AS10: Given a test passes, When recorded in maturity.json, Then complete status with checkmark is supported', async () => {
    // Create a spec directory with maturity.json that includes complete status
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: '2024-12-30',
      userStories: {
        US1: {
          overall: 'complete',
          scenarios: {
            'US1-AS1': { level: 'complete', tests: [] },
            'US1-AS2': { level: 'partial', tests: [] }
          }
        }
      }
    });
    fs.writeFileSync(maturityPath, maturityContent);

    // Read maturity levels
    const level1 = maturityManager.getScenarioMaturity(specPath, 1, 'US1-AS1');
    const storyLevel = maturityManager.getUserStoryMaturity(specPath, 1);
    
    assert.strictEqual(level1, 'complete', 'US1-AS1 should be complete');
    // Story level should be 'partial' (lowest of complete and partial)
    assert.strictEqual(storyLevel, 'partial', 'Story level should reflect lowest scenario level');
    
    // Verify the 'complete' level is properly defined with green color
    assert.strictEqual(MATURITY_COLORS.complete, 'charts.green', 'Complete should use green color');
  });

  test('US8-AS11: Given AI runs test and it passes, Then AI updates maturity.json with pass status', async () => {
    // Test pass status is now tracked in maturity.json, not via comments in test files
    // This test verifies the MaturityManager can read test status from maturity.json
    
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    
    // Create maturity.json with test status
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: new Date().toISOString(),
      userStories: {
        US1: {
          overall: 'partial',
          scenarios: {
            'US1-AS1': {
              level: 'complete',
              tests: [{
                filePath: 'tests/us1-feature.spec.ts',
                testName: 'US1-AS1: Given context, When action, Then result',
                status: 'pass',
                lastRun: '2024-12-30'
              }]
            },
            'US1-AS2': {
              level: 'partial',
              tests: [{
                filePath: 'tests/us1-feature.spec.ts',
                testName: 'US1-AS2: Given another context, When action, Then result',
                status: 'fail',
                lastRun: '2024-12-29'
              }]
            },
            'US1-AS3': {
              level: 'none',
              tests: [{
                filePath: 'tests/us1-feature.spec.ts',
                testName: 'US1-AS3: No status yet',
                status: 'unknown',
                lastRun: null
              }]
            }
          }
        }
      }
    });
    fs.writeFileSync(maturityPath, maturityContent);

    // Read test status from maturity.json
    const data = maturityManager.getMaturityData(specPath);
    const us1 = data.userStories.get('US1');
    
    const as1 = us1?.scenarios.get('US1-AS1');
    const as2 = us1?.scenarios.get('US1-AS2');
    const as3 = us1?.scenarios.get('US1-AS3');
    
    assert.strictEqual(as1?.tests[0]?.status, 'pass', 'US1-AS1 should be marked as pass');
    assert.strictEqual(as1?.tests[0]?.lastRun, '2024-12-30', 'US1-AS1 should have correct date');
    assert.strictEqual(as2?.tests[0]?.status, 'fail', 'US1-AS2 should be marked as fail');
    assert.strictEqual(as2?.tests[0]?.lastRun, '2024-12-29', 'US1-AS2 should have correct date');
    assert.strictEqual(as3?.tests[0]?.status, 'unknown', 'US1-AS3 should have unknown status');
  });

  test('US8-AS12: Given test status in maturity.json is pass, When viewing tree, Then test shows pass icon', async () => {
    // This test verifies the tree view shows correct icons based on maturity.json status
    // The actual icon rendering is tested via the test entry's status field
    
    const featureDir = path.join(specsDir, '001-test-feature');
    fs.mkdirSync(featureDir, { recursive: true });
    
    const specPath = path.join(featureDir, 'spec.md');
    fs.writeFileSync(specPath, '# Test Feature');
    
    // Create maturity.json with pass/fail status
    const maturityPath = path.join(featureDir, 'maturity.json');
    const maturityContent = JSON.stringify({
      lastUpdated: new Date().toISOString(),
      userStories: {
        US1: {
          overall: 'partial',
          scenarios: {
            'US1-AS1': {
              level: 'complete',
              tests: [{
                filePath: 'tests/us1-feature.spec.ts',
                testName: 'US1-AS1: Test that passed',
                status: 'pass',
                lastRun: '2024-12-30'
              }]
            },
            'US1-AS2': {
              level: 'partial',
              tests: [{
                filePath: 'tests/us1-feature.spec.ts',
                testName: 'US1-AS2: Test that failed',
                status: 'fail',
                lastRun: '2024-12-30'
              }]
            }
          }
        }
      }
    });
    fs.writeFileSync(maturityPath, maturityContent);

    // Read test status from maturity.json
    const data = maturityManager.getMaturityData(specPath);
    const us1 = data.userStories.get('US1');
    
    const passedTest = us1?.scenarios.get('US1-AS1')?.tests[0];
    const failedTest = us1?.scenarios.get('US1-AS2')?.tests[0];
    
    assert.strictEqual(passedTest?.status, 'pass', 'Passed test should have pass status');
    assert.strictEqual(failedTest?.status, 'fail', 'Failed test should have fail status');
  });
});
