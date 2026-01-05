# Implementation Plan: Windsurf Plugin for SpecKit

**Branch**: `002-windsurf-plugin` | **Date**: 2024-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-windsurf-plugin/spec.md`

## Summary

Convert the SpecKit project into a Windsurf (VS Code) plugin that provides a sidebar tree view for navigating specs, with Cascade AI integration for spec clarification and refinement. The plugin uses **file-based storage** (workspace `specs/` directory) with **Git for collaboration** - no custom database or remote sync needed. Cascade AI is leveraged as the built-in AI chat feature.

## Technical Context

**Language/Version**: TypeScript (strict mode)  
**Package Manager**: pnpm  
**Primary Dependencies**: VS Code Extension API (`vscode` types)  
**Build Tool**: esbuild (fast bundling for extensions)  
**Storage**: File-based - workspace `specs/` directory (Git-versioned)  
**UI State**: VS Code workspace storage (expanded nodes, preferences)  
**AI Integration**: Windsurf Cascade (built-in, no custom integration)  
**Testing**: VS Code Extension Test framework (`speckit-extension/test/`)  
**Target Platform**: Windsurf / VS Code  
**Project Type**: VS Code Extension  
**Constraints**: Extension must work with existing SpecKit spec.md format

### Test Directory Configuration

The extension uses **user-configured test directories** stored in spec.md metadata. This approach:
- Avoids guessing and auto-discovery complexity
- Gives users explicit control over test location
- Persists configuration in version-controlled spec files

**Configuration Flow**:
1. First time user clicks "Copy for Update Integration Test" on a spec
2. Extension shows folder picker dialog to select test directory
3. Selected path is stored in spec.md YAML frontmatter as `testDirectory`
4. Subsequent clicks use the stored path without prompting

**Spec.md Metadata Format**:
```yaml
---
testDirectory: speckit-extension/test/suite
---
# Feature Specification: ...
```

**AI-Driven Test Creation**:
- Extension does NOT auto-create test files or placeholders
- Instead, copied context includes instructions for AI to create tests
- AI generates proper test structure based on project conventions

### Test Maturity Level Tracking

The extension tracks test maturity levels for user stories and acceptance scenarios, stored in a `maturity.md` file alongside `spec.md`.

**Maturity Levels**:
| Level | Icon | Value | Criteria |
|-------|------|-------|----------|
| None | 🔴 | `none` | No test exists for this scenario |
| Partial | 🟡 | `partial` | Test exists but doesn't fully cover Given/When/Then |
| Complete | 🟢 | `complete` | Test fully covers the acceptance scenario |
| Verified | ⭐ | `verified` | Test passes and has been manually reviewed |

**maturity.md File Format**:
```markdown
---
lastUpdated: 2024-12-30T12:00:00Z
---
# Test Maturity Levels

## US1 - View and Navigate Specs
- **Overall**: partial
- **US1-AS1**: complete
- **US1-AS2**: partial
- **US1-AS3**: none

## US2 - Split View
- **Overall**: none
- **US2-AS1**: none
```

**Implementation Components**:
1. `MaturityManager` (`src/helpers/maturityManager.ts`) - Read/write maturity.md files
2. `MaturityParser` (`src/parsers/maturityParser.ts`) - Parse maturity.md format
3. Updated `SpecTreeProvider` - Display maturity icons in tree view
4. Updated `copyForTest` command - Include maturity evaluation instructions

**Tree View Icon Display**:
- User story icon shows the **lowest** maturity level among its acceptance scenarios
- Acceptance scenario icon shows its individual maturity level
- Icons appear as prefix in the tree item label: `🟢 US1-AS1: Given...`

**AI Maturity Evaluation Prompt** (appended to copyForTest output):
```
## After Implementation

Once you have created/updated the test, evaluate the maturity level:

1. Read the acceptance scenario carefully:
   - Given: [condition]
   - When: [action]  
   - Then: [result]

2. Compare with the test implementation:
   - Does the test set up the Given condition?
   - Does the test perform the When action?
   - Does the test verify the Then result?

3. Update maturity.md with the appropriate level:
   - `none`: No test exists
   - `partial`: Test exists but missing Given/When/Then coverage
   - `complete`: Test fully covers Given/When/Then
   - `verified`: Test passes and manually reviewed (set by human)
```

### Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Spec Data Storage: Workspace specs/ directory                  │
│  - All specs stored as markdown files                           │
│  - Git provides version control and collaboration               │
│  - No database, no remote API sync                              │
├─────────────────────────────────────────────────────────────────┤
│  UI State Storage: VS Code workspace storage                    │
│  - Expanded tree nodes                                          │
│  - Last opened spec                                             │
│  - User preferences                                             │
├─────────────────────────────────────────────────────────────────┤
│  Cascade Integration: Native Windsurf feature                   │
│  - Cascade reads open files automatically                       │
│  - Workflows in .windsurf/workflows/ guide Cascade              │
│  - Rules in .windsurf/rules/ customize behavior                 │
│  - No custom AI API integration needed                          │
└─────────────────────────────────────────────────────────────────┘
```

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| E2E-TESTING | N/A | VS Code extensions use different testing approach |
| SPEC-EVOLUTION | ✅ Pass | Plugin reads existing spec.md format |
| ROOT-CAUSE-TRACING | ✅ Pass | Will apply during development |
| TASK-VERIFICATION | ✅ Pass | TypeScript strict mode, extension tests |
| MSW-MOCK-BACKEND | N/A | No web app, no MSW needed |
| COMPONENT-UI | N/A | VS Code native UI, not React |
| STATE-MANAGEMENT | ✅ Pass | VS Code workspace storage for UI state |
| SIMPLICITY | ✅ Pass | File-based storage, no database |
| ACCEPTANCE-COVERAGE | ✅ Pass | Extension tests for each user story |
| OPENAPI-FIRST | N/A | No API layer, file-based |

**Gate Result**: PASS - No violations requiring justification

## Project Structure

This is a **pnpm monorepo** with two packages:
- `web/` - The original web application (React + Vite)
- `speckit-extension/` - The VS Code/Windsurf extension

### Monorepo Root

```text
specflow/                    # Monorepo root
├── package.json             # Workspace scripts
├── pnpm-workspace.yaml      # pnpm workspace config
├── specs/                   # Feature specifications (shared)
├── web/                     # Web application package
└── speckit-extension/       # VS Code extension package
```

### Documentation (this feature)

```text
specs/002-windsurf-plugin/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research
├── data-model.md        # Phase 1: Data structures
├── quickstart.md        # Phase 1: Implementation guide
├── contracts/           # Phase 1: API contracts
│   └── extension-api.md # VS Code extension interfaces
└── tasks.md             # Phase 2: Implementation tasks (via /speckit.tasks)
```

### Web Application (`web/`)

```text
web/                         # React web application
├── src/                     # React source code
├── tests/e2e/               # Playwright E2E tests
├── public/                  # Static assets
├── package.json             # Web app dependencies
├── vite.config.ts           # Vite configuration
├── playwright.config.ts     # Playwright configuration
└── tsconfig.*.json          # TypeScript configs
```

### VS Code Extension (`speckit-extension/`)

```text
speckit-extension/           # VS Code extension project
├── src/
│   ├── extension.ts         # Extension entry point (activate/deactivate)
│   ├── providers/
│   │   └── specTreeProvider.ts  # TreeDataProvider for sidebar
│   ├── parsers/
│   │   ├── specParser.ts        # Parse spec.md files
│   │   └── planParser.ts        # Parse plan.md for test discovery
│   ├── linkers/
│   │   └── testLinker.ts        # Link acceptance scenarios to tests
│   ├── controllers/
│   │   └── editorController.ts  # Open files, split view, scroll
│   ├── helpers/
│   │   └── testGenerator.ts     # Generate test placeholders
│   ├── state/
│   │   └── stateManager.ts      # Workspace storage for UI state
│   └── types/
│       └── index.ts             # TypeScript interfaces
├── test/suite/              # Extension tests (@vscode/test-electron)
├── media/
│   └── speckit-icon.svg         # Activity bar icon
├── package.json                 # Extension manifest
├── tsconfig.json
└── .vscodeignore                # Files to exclude from package

.windsurf/                   # Cascade configuration (existing)
├── workflows/
│   ├── speckit.specify.md   # Existing workflow
│   ├── speckit.plan.md      # Existing workflow
│   └── speckit.tasks.md     # Existing workflow
└── rules/
    └── specify-rules.md     # Existing rules
```

**Structure Decision**: Create a new `speckit-extension/` directory at repository root for the VS Code extension. This keeps the extension code separate from the existing web app while sharing the same `specs/` directory and Windsurf workflows.

## Complexity Tracking

> No violations - file-based storage and native Cascade integration keep complexity minimal.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Storage | File-based (specs/) | Git handles sync, no database needed |
| AI | Native Cascade | No custom AI integration code |
| UI | VS Code TreeView | Native extension API |
| Testing | Extension tests | Standard VS Code testing |
