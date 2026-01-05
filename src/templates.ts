import { UserStory, AcceptanceScenario, FeatureSpec } from './types';

export interface MaturityJsonTemplateParams {
  maturityFilePath: string;
  userStories: UserStory[];
}

export interface UserStoryTemplateParams {
  story: UserStory;
  storyEndLine: number;
  specFilePath: string;
  testDirectory: string;
  featureName: string;
  maturityFilePath: string;
  today: string;
  hasMaturityJson: boolean;
}

export interface ScenarioTemplateParams {
  scenario: AcceptanceScenario;
  story?: UserStory;
  specFilePath: string;
  testDirectory: string;
  featureName: string;
  maturityFilePath: string;
  today: string;
  hasMaturityJson: boolean;
  existingTestFilePath?: string;
  existingTestLine?: number;
}

export interface FeatureTemplateParams {
  spec: FeatureSpec;
  specFilePath: string;
  testDirectory: string;
  featureName: string;
  hasMaturityJson: boolean;
}

/**
 * Test config examples table - used in multiple templates
 */
export const TEST_CONFIG_EXAMPLES_TABLE = `| Framework | testConfig Example |
|-----------|-------------------|
| Playwright | \`{"framework": "playwright", "runCommand": "npx playwright test", "runSingleTestCommand": "npx playwright test \\"{filePath}\\" --grep \\"{testName}\\"", "runScenarioCommand": "npx playwright test --grep \\"{scenarioId}\\"", "runUserStoryCommand": "npx playwright test --grep \\"{userStoryPattern}\\""}\` |
| VS Code Extension | \`{"framework": "vscode-extension", "runCommand": "pnpm test", "runSingleTestCommand": "SPECKIT_TEST_GREP=\\"{testName}\\" pnpm test", "runScenarioCommand": "SPECKIT_TEST_GREP=\\"{scenarioId}\\" pnpm test", "runUserStoryCommand": "SPECKIT_TEST_GREP=\\"{userStoryPattern}\\" pnpm test"}\` |
| Mocha | \`{"framework": "mocha", "runCommand": "npx mocha", "runSingleTestCommand": "npx mocha --grep \\"{testName}\\" \\"{filePath}\\"", "runScenarioCommand": "npx mocha --grep \\"{scenarioId}\\"", "runUserStoryCommand": "npx mocha --grep \\"{userStoryPattern}\\""}\` |
| Jest | \`{"framework": "jest", "runCommand": "npx jest", "runSingleTestCommand": "npx jest \\"{filePath}\\" -t \\"{testName}\\"", "runScenarioCommand": "npx jest -t \\"{scenarioId}\\"", "runUserStoryCommand": "npx jest -t \\"{userStoryPattern}\\""}\` |
| Go | \`{"framework": "go", "runCommand": "go test ./...", "runSingleTestCommand": "go test -v -run \\"{testName}\\" ./{testDir}", "runScenarioCommand": "go test -v -run \\"{scenarioId}\\" ./...", "runUserStoryCommand": "go test -v -run \\"{userStoryPattern}\\" ./..."}\` |`;

/**
 * Generate the maturity.json initialization instructions
 * This is the SINGLE source of truth for maturity.json creation instructions
 */
export function generateMaturityJsonInstructions(params: MaturityJsonTemplateParams): string {
  const { maturityFilePath, userStories } = params;
  const timestamp = new Date().toISOString();

  let userStoriesJson = '';
  if (userStories.length > 0) {
    userStoriesJson = userStories.map((story, idx) => {
      const scenarios = story.acceptanceScenarios.map((scenario, sIdx) => 
        `        "${scenario.id}": {
          "level": "none",
          "tests": []
        }${sIdx < story.acceptanceScenarios.length - 1 ? ',' : ''}`
      ).join('\n');
      
      return `    "US${story.number}": {
      "overall": "none",
      "scenarios": {
${scenarios}
      }
    }${idx < userStories.length - 1 ? ',' : ''}`;
    }).join('\n');
  } else {
    userStoriesJson = `    "US1": {
      "overall": "none",
      "scenarios": {
        "US1-AS1": {
          "level": "none",
          "tests": []
        }
      }
    }`;
  }

  let taskList = '';
  if (userStories.length > 0) {
    taskList = userStories.map(story => {
      const scenarioTasks = story.acceptanceScenarios
        .map(scenario => `  - [ ] ${scenario.id}: Find/create test, run it, update maturity level`)
        .join('\n');
      return `- [ ] **US${story.number}**: ${story.title}\n${scenarioTasks}`;
    }).join('\n');
  } else {
    taskList = `- [ ] Scan spec.md to identify all user stories and acceptance scenarios
- [ ] For each scenario, find or create corresponding test
- [ ] Run tests and update maturity.json with results`;
  }

  return `## IMPORTANT: Create Initial maturity.json

The \`maturity.json\` file does not exist for this spec. Before implementing tests, please:

1. **Analyze the project** to detect the test framework:
   - Check \`package.json\` for: \`@playwright/test\`, \`@vscode/test-electron\`, \`mocha\`, \`jest\`
   - Check for Go test files (\`*_test.go\`)

2. **Scan the workspace** for existing test files matching patterns: \`us*.spec.ts\`, \`us*.test.ts\`, \`*_test.go\`

3. **Parse test names** to find scenario IDs like \`US1-AS1\`, \`US2-AS3\`, etc.

4. **Create \`${maturityFilePath}\`** with the following structure:

\`\`\`json
{
  "lastUpdated": "${timestamp}",
  "testConfig": {
    "framework": "<detected-framework>",
    "runCommand": "<command to run all tests>",
    "runSingleTestCommand": "<command with {testName}, {filePath}, {testDir} placeholders>",
    "runScenarioCommand": "<command with {scenarioId} placeholder>",
    "runUserStoryCommand": "<command with {userStoryPattern} placeholder>"
  },
  "userStories": {
${userStoriesJson}
  }
}
\`\`\`

**Test Config Examples by Framework**:

${TEST_CONFIG_EXAMPLES_TABLE}

For each test found, add an entry to the appropriate scenario's \`tests\` array:
\`\`\`json
{
  "filePath": "test/suite/us1-feature.test.ts",
  "testName": "US1-AS1: Given condition, When action, Then result",
  "status": "unknown",
  "lastRun": null
}
\`\`\`

After scanning, update the \`level\` for each scenario:
- \`"none"\` - No tests found
- \`"partial"\` - Tests exist but may not fully cover Given/When/Then
- \`"complete"\` - Tests fully cover the scenario and pass

## Task List for AI

After creating the initial maturity.json, run and match tests for ALL user stories:

${taskList}
`;
}

/**
 * Generate template for feature-level copy for test
 */
export function generateFeatureTemplate(params: FeatureTemplateParams): string {
  const { spec, specFilePath, testDirectory, featureName, hasMaturityJson } = params;
  const maturityFilePath = specFilePath.replace('/spec.md', '/maturity.json');
  
  const maturityInstructions = !hasMaturityJson 
    ? generateMaturityJsonInstructions({ maturityFilePath, userStories: spec.userStories })
    : '';

  return `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.
${maturityInstructions}
## Task: Update integration tests for feature "${spec.displayName}"

- Spec file: ${specFilePath}
- Test directory: ${testDirectory}
- Feature: ${featureName}
`;
}

/**
 * Generate template for user story-level copy for test
 */
export function generateUserStoryTemplate(params: UserStoryTemplateParams): string {
  const { story, storyEndLine, specFilePath, testDirectory, featureName, maturityFilePath, today, hasMaturityJson } = params;
  
  const maturityInstructions = !hasMaturityJson 
    ? generateMaturityJsonInstructions({ maturityFilePath, userStories: [story] })
    : '';

  const scenariosList = story.acceptanceScenarios
    .map(s => `- **${s.id}** at line ${s.line}`)
    .join('\n');

  return `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.
${maturityInstructions}
## Task: Update integration tests for User Story ${story.number}

**Title**: ${story.title}
**Priority**: ${story.priority}

### Context
- Spec file: ${specFilePath}:${story.startLine}-${storyEndLine}
- Test directory: ${testDirectory}
- Feature: ${featureName}
- User Story: US${story.number}

### Acceptance Scenarios (read from spec file):
${scenariosList}

---

## After Implementation: Evaluate Test Maturity

Once you have created/updated tests for this user story, **evaluate maturity** for each acceptance scenario.

### Instructions
1. Read the user story and acceptance scenarios from: \`${specFilePath}:${story.startLine}-${storyEndLine}\`
2. For each acceptance scenario, compare the test implementation against Given/When/Then
3. Update \`${maturityFilePath}\` with maturity levels:

| Level | Value | Criteria |
|-------|-------|----------|
| Red | \`none\` | No test exists |
| Yellow | \`partial\` | Test exists but incomplete coverage |
| Green | \`complete\` | Test fully covers Given/When/Then and passes |

### Test File Naming Rules (IMPORTANT for linking)
The SpecKit extension links tests to user stories and acceptance scenarios by matching filenames and test names:
- **Filename** must contain \`us${story.number}\` (case-insensitive) to link to User Story ${story.number}
- **Test name** must contain the scenario ID (e.g., \`US${story.number}-AS1\`) for linking to that specific scenario
- Example patterns: \`us${story.number}-${featureName}.spec.ts\`, \`us${story.number}_${featureName}_test.go\`

### Update maturity.json After Running Tests
After running tests, update \`${maturityFilePath}\` with the test status:

\`\`\`json
{
  "US${story.number}-AS1": {
    "level": "complete",
    "tests": [{
      "filePath": "${testDirectory}/us${story.number}-${featureName}.spec.ts",
      "testName": "US${story.number}-AS1: Given condition, When action, Then result",
      "status": "pass",
      "lastRun": "${today}"
    }]
  }
}
\`\`\`

The SpecKit extension reads maturity.json to show ✓/✗ icons in the tree view.
`;
}

/**
 * Generate template for scenario-level copy for test
 */
export function generateScenarioTemplate(params: ScenarioTemplateParams): string {
  const { scenario, story, specFilePath, testDirectory, featureName, maturityFilePath, today, hasMaturityJson, existingTestFilePath, existingTestLine } = params;
  
  const storyContext = story ? `- User Story: US${story.number} - ${story.title}\n` : '';
  const storyNumber = story?.number || 1;
  
  const maturityInstructions = !hasMaturityJson && story
    ? generateMaturityJsonInstructions({ maturityFilePath, userStories: [story] })
    : '';

  let existingTestSection = '';
  if (existingTestFilePath) {
    existingTestSection = `
### Existing Test
- File: ${existingTestFilePath}${existingTestLine ? ':' + existingTestLine : ''}
`;
  } else if (story) {
    existingTestSection = `
### Test Creation Required
No test exists for this scenario. Please:
1. Check existing tests in \`${testDirectory}/\` to understand project conventions
2. Create a test file with filename that includes: US${story.number}, ${featureName}
3. Test name/function should reference: ${scenario.id}
`;
  }

  const namingRulesSection = story ? `
### Test File Naming Rules (IMPORTANT for linking)
The SpecKit extension links tests to acceptance scenarios by matching filenames and test names:
- **Filename** must contain \`us${story.number}\` (case-insensitive) to link to User Story ${story.number}
- **Test name** must contain \`${scenario.id}\` for the extension to show it under this scenario
- Example patterns: \`us${story.number}-${featureName}.spec.ts\`, \`us${story.number}_${featureName}_test.go\`
` : '';

  return `Find an appropriate testing workflow in .windsurf/workflows/ and use it to create/update integration tests.
${maturityInstructions}
## Task: Create/update integration test for ${scenario.id}

### Acceptance Scenario
- **Given** ${scenario.given}
- **When** ${scenario.when}
- **Then** ${scenario.then}

### Context
- Spec file: ${specFilePath}:${scenario.line}
- Test directory: ${testDirectory}
- Feature: ${featureName}
${storyContext}- Scenario ID: ${scenario.id}
${existingTestSection}${namingRulesSection}
### Verification Requirements
The test must verify:
- **Given**: ${scenario.given}
- **When**: ${scenario.when}
- **Then**: ${scenario.then}

---

## After Implementation: Evaluate Test Maturity

Once you have created/updated the test, **carefully evaluate** the test maturity level:

### Step 1: Re-read the Acceptance Scenario
- **Given**: ${scenario.given}
- **When**: ${scenario.when}
- **Then**: ${scenario.then}

### Step 2: Compare with Test Implementation
Ask yourself:
- Does the test properly set up the **Given** condition?
- Does the test correctly perform the **When** action?
- Does the test verify the **Then** result with appropriate assertions?

### Step 3: Determine Maturity Level
| Level | Value | Criteria |
|-------|-------|----------|
| Red | \`none\` | No test exists for this scenario |
| Yellow | \`partial\` | Test exists but doesn't fully cover Given/When/Then |
| Green | \`complete\` | Test fully covers the acceptance scenario and passes |

### Step 4: Run Tests and Update maturity.json
After implementing the test, **run it** and update maturity.json with the results:

1. Run the test to verify it passes
2. Update \`${maturityFilePath}\` with the test status

\`\`\`json
{
  "lastUpdated": "${today}",
  "userStories": {
    "US${storyNumber}": {
      "overall": "[calculated from scenarios]",
      "scenarios": {
        "${scenario.id}": {
          "level": "[none|partial|complete]",
          "tests": [
            {
              "filePath": "${testDirectory}/us${storyNumber}-${featureName}.spec.ts",
              "testName": "${scenario.id}: Given ${scenario.given.substring(0, 30)}...",
              "status": "pass",
              "lastRun": "${today}"
            }
          ]
        }
      }
    }
  }
}
\`\`\`

**Note**: The SpecKit extension reads maturity.json to display:
- Pass/fail icons (✓/✗) for tests based on the \`status\` field
- Maturity icons for scenarios based on the \`level\` field
`;
}
