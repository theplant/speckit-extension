# Feature Specification: Windsurf Plugin for SpecKit

**Feature Branch**: `002-windsurf-plugin`  
**Created**: 2024-12-30  
**Status**: Draft  
**Input**: User description: "Convert this project into a Windsurf (VS Code) plugin, so that I can integrate Cascade as the AI chat feature in this project."

## Assumptions

- The plugin uses the existing SpecKit `specs/` directory structure in the workspace
- Each feature branch has its own `spec.md` file in `specs/[feature-name]/`
- The current open workspace IS the project (no separate project concept)
- All storage is file-based using Git for version control and collaboration
- No remote sync needed - developers use Git push/pull for collaboration
- Cascade AI is the built-in AI chat feature in Windsurf

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Navigate Specs in VS Code Sidebar (Priority: P1)

A developer opens Windsurf with the plugin installed and sees a dedicated sidebar panel showing all specs from the workspace's `specs/` directory. They can browse the hierarchical tree of feature specs, user stories, and acceptance scenarios without leaving their IDE.

**Why this priority**: This is the foundational capability - developers need to view and navigate specs within their IDE before any other features can be useful. It delivers immediate value by bringing spec visibility into the development workflow.

**Independent Test**: Can be fully tested by installing the plugin, opening a workspace with a `specs/` directory, and verifying that specs appear in the sidebar tree view. Delivers value as a standalone spec browser.

**Acceptance Scenarios**:

1. **Given** a developer has the plugin installed, **When** they open Windsurf with a workspace containing a `specs/` directory, **Then** they see a "SpecKit" icon in the activity bar that opens the spec sidebar
2. **Given** the spec sidebar is open, **When** the developer views it, **Then** they see a tree view with feature specs (from `specs/[feature-name]/spec.md`) at the root level
3. **Given** a feature spec in the tree, **When** the developer expands it, **Then** they see user stories as children with priority indicators (P1, P2, P3)
4. **Given** a user story in the tree, **When** the developer expands it, **Then** they see acceptance scenarios as children showing "Given + When" text
5. **Given** an acceptance scenario in the tree, **When** the developer expands it, **Then** they see linked integration tests as children (if any exist)
6. **Given** a user story in the tree, **When** the developer clicks on it, **Then** the spec.md file opens in the center editor panel scrolled to that user story

---

### User Story 2 - Split View with Spec and Integration Tests (Priority: P1)

When a developer clicks on a user story, the spec.md opens in the center editor panel. If the user story has linked integration tests, the test file automatically opens in a split view on the right side using Windsurf's native text editor.

**Why this priority**: The split view layout is essential for the developer workflow - seeing specs and tests side-by-side enables efficient development and verification.

**Independent Test**: Can be tested by clicking a user story with linked tests and verifying the split layout appears with spec on left and tests on right.

**Acceptance Scenarios**:

1. **Given** a user story with linked integration tests, **When** the developer clicks on it in the tree, **Then** the spec.md opens in the left editor and the test file opens in the right editor (split view)
2. **Given** the split view is open, **When** the developer clicks on an acceptance scenario, **Then** the spec editor scrolls to that scenario and the test editor scrolls to the corresponding test
3. **Given** a user story without linked tests, **When** the developer clicks on it, **Then** only the spec.md opens and any open secondary test editor is closed
4. **Given** the split view is open, **When** the developer edits either file, **Then** changes are saved using Windsurf's native editor capabilities
5. **Given** the test editor is open, **When** the developer views it, **Then** they see the full test file content with syntax highlighting
6. **Given** an integration test in the tree (under an acceptance scenario), **When** the developer clicks on it, **Then** the spec.md opens in the left editor scrolled to the parent acceptance scenario, and the test file opens in the right editor scrolled to the test
7. **Given** an acceptance scenario without linked tests, **When** the developer clicks on it, **Then** only the spec.md opens scrolled to that scenario and any open secondary test editor is closed

---

### User Story 3 - Use Cascade AI for Spec Clarification and Refinement (Priority: P1)

A developer uses the "Copy for Test" feature to copy the context of a user story or acceptance scenario to the clipboard. They then paste this context into Windsurf's Cascade AI chat to ask questions, clarify requirements, or refine the specification. Cascade uses the provided context to suggest updates or generate tests.

**Why this priority**: Integrating with Cascade is the core value proposition of this plugin - it leverages Windsurf's built-in AI capabilities by providing it with precisely targeted spec context.

**Independent Test**: Can be tested by selecting a user story, clicking "Copy for Test", pasting into Cascade, and verifying the AI responds correctly to the provided context.

**Acceptance Scenarios**:

1. **Given** a user story or scenario is selected in the tree, **When** the developer clicks "Copy for Test", **Then** a detailed context block is copied to the clipboard including spec content, test directory, and instructions for AI
2. **Given** context has been copied, **When** the developer pastes it into Cascade, **Then** Cascade understands the specific user story or scenario and can provide context-aware assistance
3. **Given** Cascade suggests a spec update, **When** the developer approves it, **Then** the spec.md file is updated with the suggested changes (via Cascade's file editing capabilities)
4. **Given** a spec without a `maturity.json` file, **When** the developer clicks "Copy for Test", **Then** the copied context includes instructions for AI to scan existing test files in the workspace and create an initial `maturity.json` that maps tests to acceptance scenarios
5. **Given** a spec with a `maturity.json` file, **When** the developer clicks "Copy for Test", **Then** the extension uses the test information from `maturity.json` without any prompts
6. **Given** an acceptance scenario in the tree, **When** the developer clicks "Copy for Test", **Then** the copied context includes scenario details (Given/When/Then) and evaluation instructions for AI
7. **Given** the AI has implemented/updated a test, **When** following the copied instructions, **Then** the AI evaluates the test against the acceptance scenario and updates `maturity.json` with the test mapping
8. **Given** a user story or scenario, **When** the developer clicks "Copy for Test", **Then** the copied context includes test file naming rules so AI creates files that match the linking convention (e.g., `usN-feature.spec.ts`)
9. **Given** the "Copy for Test" action is performed, **When** it completes, **Then** a notification confirms that context was copied to the clipboard

---

### User Story 4 - Edit Specs Directly in VS Code Editor (Priority: P1)

A developer opens a spec.md file in the Windsurf editor and edits it using familiar markdown editing capabilities. Changes are saved to the spec files and reflected in the tree view.

**Why this priority**: Direct editing in the IDE is essential for developer productivity. Markdown-based specs leverage Windsurf's native editing capabilities.

**Independent Test**: Can be tested by opening a spec file, making edits, saving, and verifying the tree view updates accordingly.

**Acceptance Scenarios**:

1. **Given** a user story in the tree, **When** the developer double-clicks it, **Then** the spec.md file opens in the editor with cursor at that user story
2. **Given** a spec file is open in the editor, **When** the developer edits and saves, **Then** the tree view refreshes to reflect the changes
3. **Given** the editor is open, **When** the developer uses VS Code's outline view, **Then** they see the spec structure (user stories, scenarios, requirements)
4. **Given** a spec file, **When** the developer uses "Go to Symbol", **Then** they can jump to specific user stories or requirements by name

---

### User Story 5 - Generate Integration Tests via Cascade (Priority: P2)

A developer selects a user story with acceptance scenarios and asks Cascade to generate integration tests. Cascade generates test code based on the acceptance scenarios and the project's technology plan, creating test files in the appropriate location.

**Why this priority**: Test generation is a key automation feature, but requires the viewing and AI integration to be in place first.

**Independent Test**: Can be tested by selecting a user story, asking Cascade to generate tests, and verifying test files are created with appropriate test cases.

**Acceptance Scenarios**:

1. **Given** a user story with acceptance scenarios, **When** the developer asks Cascade to generate tests, **Then** Cascade creates integration test files based on the scenarios
2. **Given** a technology plan exists in the spec directory, **When** tests are generated, **Then** they follow the patterns and frameworks specified in the plan
3. **Given** generated tests, **When** viewing the user story in the tree, **Then** the tests appear as children under their respective acceptance scenarios
4. **Given** a generated test file, **When** the developer opens it, **Then** they can run the tests using VS Code's test runner integration

---

### User Story 6 - Create and Import Specs from Natural Language (Priority: P2)

A developer creates a new spec by describing a feature in natural language to Cascade. Cascade generates the structured spec (user stories, acceptance scenarios, functional requirements) and creates the appropriate spec.md file in the specs directory.

**Why this priority**: Spec generation from natural language is valuable but requires the core viewing and editing capabilities first.

**Independent Test**: Can be tested by describing a feature to Cascade and verifying a complete spec structure is generated.

**Acceptance Scenarios**:

1. **Given** a workspace is open, **When** the developer asks Cascade to create a new spec from a description, **Then** Cascade generates a spec.md file in `specs/[feature-name]/` with user stories and requirements
2. **Given** an existing spec file, **When** the developer asks Cascade to add more user stories, **Then** Cascade appends new stories to the existing file
3. **Given** a text block with user stories, **When** the developer asks Cascade to import it, **Then** Cascade parses and creates structured spec entries
4. **Given** imported specs overlap with existing ones, **When** importing, **Then** Cascade merges changes while preserving existing structure

---

### User Story 7 - Build Implementation from Specs (Priority: P3)

A developer selects a user story and asks Cascade to build the implementation. Cascade generates code that satisfies the integration tests, following the technology plan. The developer can guide Cascade through the build process with additional prompts.

**Why this priority**: Code generation is the ultimate goal but requires all other pieces (specs, tests, plans) to be in place.

**Independent Test**: Can be tested by having a complete user story with tests and plan, asking Cascade to build, and verifying working code is generated.

**Acceptance Scenarios**:

1. **Given** a user story with integration tests and a technology plan, **When** the developer asks Cascade to build, **Then** Cascade generates implementation code
2. **Given** code generation in progress, **When** the developer provides guidance, **Then** Cascade incorporates the feedback
3. **Given** generated code, **When** integration tests are run, **Then** the tests pass
4. **Given** a build session, **When** completed, **Then** the conversation history is preserved in Cascade

---

### User Story 9 - Run Single Test from Tree View (Priority: P1)

A developer can run a single integration test directly from the tree view by clicking a "Run Test" button on a test item. The test runs in a terminal with the appropriate test framework command, allowing quick verification of individual tests without leaving the IDE.

**Why this priority**: Running individual tests is essential for efficient test-driven development. Developers need to quickly verify specific tests without running the entire test suite.

**Independent Test**: Can be tested by clicking the Run Test button on a test item and verifying the test executes in a terminal.

**Acceptance Scenarios**:

1. **Given** a test item in the tree view, **When** the developer clicks the "Run Test" button (play icon), **Then** a terminal opens and runs that specific test
2. **Given** a Playwright test file (.spec.ts), **When** running the test, **Then** the command uses `npx playwright test` with `--grep` for the specific test name
3. **Given** a Mocha/Jest test file (.test.ts), **When** running the test, **Then** the command uses `npx mocha --grep` for the specific test name
4. **Given** a Go test file (_test.go), **When** running the test, **Then** the command uses `go test -v -run` for the specific test name
5. **Given** a test without a specific test name, **When** running the test, **Then** the entire test file is executed
6. **Given** the test is running, **When** it completes, **Then** the developer sees the test output in the terminal
7. **Given** no `maturity.json` file exists for the spec, **When** the developer clicks "Run Test" on any item (test, scenario, or user story), **Then** AI instructions are copied to clipboard to initialize `maturity.json` with ALL user stories from the spec (not just the clicked item), including a task list for AI to run and match tests to all scenarios
8. **Given** the Run Test button is clicked on a test node, **When** the test config is retrieved, **Then** it uses the same logic as user story and scenario levels (retrieves config from the parent spec's maturity.json)
9. **Given** a test runs and completes successfully (exit code 0), **When** the terminal closes or test finishes, **Then** maturity.json is automatically updated with `status: "pass"` and `lastRun` timestamp for that test
10. **Given** a test runs and fails (non-zero exit code), **When** the terminal closes or test finishes, **Then** maturity.json is automatically updated with `status: "fail"` and `lastRun` timestamp for that test
11. **Given** a user story's Run Test is clicked, **When** all scenario tests pass, **Then** the user story's `overall` maturity level is recalculated based on all scenario results
12. **Given** a scenario's Run Test is clicked, **When** the test passes, **Then** the scenario's maturity `level` is updated to "complete" if it was previously "none" or "partial"

---

### User Story 8 - Test Maturity Level Tracking (Priority: P1)

A developer can see the test maturity level for each user story and acceptance scenario in the tree view, indicated by visual icons. The maturity levels are stored in a `maturity.json` file alongside `spec.md`. The extension automatically scans test files to discover tests and their pass/fail status, storing test names (not line numbers) for stable linking.

**Why this priority**: Test maturity tracking provides immediate visual feedback on spec coverage quality, helping developers identify gaps and track progress.

**Independent Test**: Can be tested by creating a maturity.json file with maturity levels, opening the tree view, and verifying icons appear next to user stories and acceptance scenarios.

**Acceptance Scenarios**:

1. **Given** a feature spec directory, **When** the developer views the tree, **Then** user stories and acceptance scenarios show maturity level icons with colors (🔴 None, 🟡 Partial, 🟢 Complete)
2. **Given** a `maturity.json` file exists in the spec directory, **When** the tree view loads, **Then** it reads maturity levels from the file and displays appropriate icons based on the `overall` status and scenario levels
3. **Given** no `maturity.json` file exists, **When** the tree view loads, **Then** all items show 🔴 (None) maturity level by default
4. **Given** a user story in the tree, **When** viewing its maturity icon, **Then** the icon reflects the lowest maturity level among its acceptance scenarios
5. **Given** a test entry in `maturity.json` has `status: "pass"`, **When** viewing the test in the tree, **Then** the test item shows a green checkmark icon
6. **Given** a test entry in `maturity.json` has `status: "fail"`, **When** viewing the test in the tree, **Then** the test item shows a red error icon
7. **Given** a test entry in `maturity.json` has `status: "unknown"` or no status, **When** viewed in the tree, **Then** it shows a default beaker icon
8. **Given** a maturity icon in the tree, **When** hovering over it, **Then** a tooltip shows the maturity level name and criteria
9. **Given** a `maturity.json` or test file is updated, **When** saved, **Then** the tree view refreshes automatically to reflect the changes
10. **Given** the tree view, **When** the developer uses the "Expand All" command on a feature or user story, **Then** all child items are recursively expanded to show the full status
11. **Given** a "Refresh Maturity" command is executed, **When** test files exist in the test directory, **Then** the extension scans all test files and generates/updates `maturity.json` with discovered tests linked to their scenarios by test name

**Maturity Levels** (shown as icon color):

| Level | Value | Color | Criteria |
|-------|-------|-------|----------|
| None | `none` | Red (`charts.red`) | No test exists for this scenario |
| Partial | `partial` | Yellow (`charts.yellow`) | Test exists but doesn't fully cover Given/When/Then |
| Complete | `complete` | Green (`charts.green`) | Test fully covers the acceptance scenario and passes |

**Test File Naming Rules** (for linking to work):
- **Filename** must contain `usN` (case-insensitive, e.g., `us1-feature.spec.ts`) or `user-story-N` or `storyN`.
- **Test name** must contain the scenario ID (e.g., `US1-AS1`) for linking to that specific scenario.
- **Annotations**: `@spec: feature/US1-AS1` in comments is also supported for linking.

**Test Pass Status**:
- Status is stored in `maturity.json` under each test entry's `status` field (`pass`, `fail`, or `unknown`).
- The AI updates this status after running tests.
- The extension reads `maturity.json` to show ✓/✗ icons in the tree view.

**maturity.json Format**:
```json
{
  "lastUpdated": "2024-12-30T12:00:00Z",
  "testConfig": {
    "framework": "mocha",
    "runCommand": "pnpm test",
    "runSingleTestCommand": "SPECKIT_TEST_GREP=\"{testName}\" pnpm test",
    "runScenarioCommand": "SPECKIT_TEST_GREP=\"{scenarioId}\" pnpm test",
    "runUserStoryCommand": "SPECKIT_TEST_GREP=\"{userStoryPattern}\" pnpm test"
  },
  "userStories": {
    "US1": {
      "overall": "partial",
      "scenarios": {
        "US1-AS1": {
          "level": "complete",
          "tests": [
            {
              "filePath": "test/suite/us1-view-navigate.test.ts",
              "testName": "US1-AS1: Given plugin installed, When opening Windsurf...",
              "status": "pass",
              "lastRun": "2024-12-30"
            }
          ]
        },
        "US1-AS2": {
          "level": "none",
          "tests": []
        }
      }
    }
  }
}
```

**Test Configuration** (`testConfig` in maturity.json):
The AI analyzes the project during initial maturity.json creation to detect the test framework and generate appropriate run commands:

| Framework | Detection | Example Run Command |
|-----------|-----------|---------------------|
| Playwright | `@playwright/test` in package.json | `npx playwright test "{filePath}" --grep "{testName}"` |
| VS Code Extension | `@vscode/test-electron` in package.json | `SPECKIT_TEST_GREP="{testName}" pnpm test` |
| Mocha | `mocha` in package.json | `npx mocha --grep "{testName}" "{filePath}"` |
| Jest | `jest` in package.json | `npx jest "{filePath}" -t "{testName}"` |
| Go | `_test.go` file extension | `go test -v -run "{testName}" ./{testDir}` |

**Command Placeholders**:
- `{testName}` - The full test name (escaped for shell)
- `{filePath}` - Relative path to the test file
- `{scenarioId}` - The scenario ID (e.g., `US1-AS1`)
- `{userStoryPattern}` - Pattern to match all tests for a user story (e.g., `US1-`)
- `{testDir}` - Directory containing the test file

**Key Design Decisions**:
- **Test names instead of line numbers**: Line numbers are fragile and change when code is edited. Test names are stable identifiers.
- **JSON format**: Easier to parse programmatically, supports structured data, and is more reliable than markdown parsing.
- **Auto-discovery**: The extension can scan test files and automatically populate maturity.json by matching test names to scenario IDs.
- **File path storage**: Each test entry stores its file path, so the extension can find the test position by searching for the test name in that file.

**Icons**: 
- User stories: `book` (📖) icon with maturity color.
- Acceptance scenarios: `checklist` (✓) icon with maturity color.
- Tests: `pass` (✓), `error` (✗), or `beaker` (🧪) icon.

---

### Edge Cases

- What happens when spec files have syntax errors? Plugin shows validation errors in the Problems panel and highlights issues in the editor.
- How does the system handle very large spec files? Plugin uses virtual scrolling and lazy loading for tree views.
- What happens when Cascade is unavailable? Plugin degrades gracefully - tree view and editing still work, only AI features are disabled.
- How does the system handle concurrent edits to the same spec file? Plugin uses VS Code's file watcher and prompts for reload on external changes.
- What happens when the spec file format is invalid? Plugin provides a "Repair Spec" command that attempts to fix common formatting issues.
- What happens when the workspace has no `specs/` directory? Plugin shows an empty tree with a "Create First Spec" action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Plugin MUST register a sidebar view container with a tree view for specs
- **FR-002**: Plugin MUST scan the workspace's `specs/` directory for feature subdirectories containing spec.md files
- **FR-003**: Plugin MUST display feature specs, user stories, acceptance scenarios, and integration tests in a hierarchical tree
- **FR-004**: Plugin MUST open spec.md files in the center editor when tree items are clicked
- **FR-005**: Plugin MUST open integration test files in a split view on the right when a user story with linked tests is selected or when a test item is clicked
- **FR-006**: Plugin MUST scroll both editors to the relevant section when acceptance scenarios or tests are clicked in the tree
- **FR-007**: Plugin MUST provide a "Copy for Test" action that copies structured context (spec content, test directory, instructions) to the clipboard for use with Cascade AI
- **FR-008**: Plugin MUST include instructions for AI to scan and discover test files when `maturity.json` does not exist, creating an initial mapping of tests to acceptance scenarios
- **FR-009**: Plugin MUST watch spec.md, maturity.json, and test files for changes and update the tree view automatically
- **FR-010**: Plugin MUST provide a command to create a new spec directory and spec.md file from a template
- **FR-011**: Plugin MUST support "Expand All" to recursively expand tree nodes for a feature or user story
- **FR-012**: Plugin MUST track test maturity levels (none, partial, complete) in a `maturity.json` file
- **FR-013**: Plugin MUST read test pass/fail status from `maturity.json` to display execution status icons in the tree view
- **FR-014**: Plugin MUST provide outline view integration for spec file structure (via VS Code's native markdown support)
- **FR-015**: Plugin MUST persist user preferences (last opened spec, last selected item) in workspace state
- **FR-016**: Plugin MUST provide a "Run Test" action on test items in the tree view that executes the test in a terminal using the appropriate test framework

### Key Entities

- **Workspace**: The currently open VS Code/Windsurf workspace folder. Contains the `specs/` directory.
- **Feature Spec**: A subdirectory in `specs/` containing a spec.md file. Named with pattern `[number]-[feature-name]/`.
- **Spec File**: A markdown file (spec.md) containing user stories and acceptance scenarios.
- **Maturity File**: A JSON file (maturity.json) in the feature spec directory that tracks implementation progress, maturity levels, and test file paths with test names for stable linking.
- **User Story**: A section within a spec file describing a user journey. Linked to tests via filename matching (e.g., `us1`).
- **Acceptance Scenario**: A Given/When/Then case within a user story. Linked to tests via ID matching (e.g., `US1-AS1`) or `@spec:` annotations.
- **Integration Test**: A test case in a `.spec.ts` or `.test.ts` file. Shows pass/fail status based on inline comments.
- **Spec Metadata**: Configuration stored in the spec.md YAML frontmatter (e.g., `testDirectory`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can view and navigate specs within 2 seconds of opening the sidebar
- **SC-002**: Cascade responds with context-aware suggestions within 5 seconds of receiving a spec-related query
- **SC-003**: Spec file edits are reflected in the tree view within 1 second of saving
- **SC-004**: 90% of developers can create a new spec from natural language on first attempt
- **SC-005**: Generated integration tests compile and are runnable without manual fixes in 80% of cases
- **SC-006**: Plugin startup adds less than 500ms to VS Code launch time
- **SC-007**: Plugin memory footprint stays under 100MB for workspaces with up to 100 spec files
- **SC-008**: Split view opens within 500ms of clicking a user story with linked tests
