# Data Model: Windsurf Plugin for SpecKit

**Date**: 2024-12-30  
**Feature**: 002-windsurf-plugin

## Overview

This plugin uses **file-based storage** - all spec data lives in markdown files within the workspace. The data model describes the in-memory structures used to represent parsed spec content for the tree view.

## Storage Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Workspace                                 │
├─────────────────────────────────────────────────────────────────┤
│  specs/                          ← Spec data (Git-versioned)    │
│  ├── 001-feature-one/                                           │
│  │   ├── spec.md                 ← User stories, scenarios      │
│  │   ├── plan.md                 ← Technology plan              │
│  │   └── checklists/             ← Quality checklists           │
│  └── 002-feature-two/                                           │
│      └── spec.md                                                │
│                                                                  │
│  tests/e2e/                      ← Integration tests            │
│  └── us1-*.spec.ts               ← Linked to user stories       │
│                                                                  │
│  .windsurf/                      ← Cascade configuration        │
│  ├── workflows/                  ← Spec workflows               │
│  └── rules/                      ← Spec-aware rules             │
│                                                                  │
│  .vscode/                        ← VS Code workspace storage    │
│  └── speckit-state.json          ← UI state (expanded nodes)    │
└─────────────────────────────────────────────────────────────────┘
```

## In-Memory Data Structures

### FeatureSpec

Represents a feature specification directory containing a spec.md file.

```typescript
interface FeatureSpec {
  /** Absolute path to the feature directory */
  path: string;
  
  /** Feature name derived from directory (e.g., "001-feature-one") */
  name: string;
  
  /** Display name without number prefix (e.g., "Feature One") */
  displayName: string;
  
  /** Feature number extracted from directory name */
  number: number;
  
  /** Path to spec.md file */
  specFilePath: string;
  
  /** Path to plan.md file (optional) */
  planFilePath?: string;
  
  /** Parsed user stories */
  userStories: UserStory[];
  
  /** Last modified timestamp for cache invalidation */
  lastModified: number;
}
```

### UserStory

Represents a user story section within a spec.md file.

```typescript
interface UserStory {
  /** Story number (1, 2, 3, ...) */
  number: number;
  
  /** Story title (e.g., "View and Navigate Specs in VS Code Sidebar") */
  title: string;
  
  /** Priority level */
  priority: 'P1' | 'P2' | 'P3';
  
  /** Line number in spec.md where story starts (1-indexed) */
  startLine: number;
  
  /** Line number where story ends */
  endLine: number;
  
  /** Story description text */
  description: string;
  
  /** Why this priority explanation */
  whyPriority?: string;
  
  /** Independent test description */
  independentTest?: string;
  
  /** Acceptance scenarios within this story */
  acceptanceScenarios: AcceptanceScenario[];
  
  /** Parent feature spec reference */
  featureSpec: FeatureSpec;
}
```

### AcceptanceScenario

Represents a Given/When/Then acceptance scenario.

```typescript
interface AcceptanceScenario {
  /** Scenario number within the user story (1, 2, 3, ...) */
  number: number;
  
  /** Full scenario ID (e.g., "US1-AS1") */
  id: string;
  
  /** Given clause text */
  given: string;
  
  /** When clause text */
  when: string;
  
  /** Then clause text */
  then: string;
  
  /** Line number in spec.md (1-indexed) */
  line: number;
  
  /** Linked integration tests */
  linkedTests: IntegrationTest[];
  
  /** Parent user story reference */
  userStory: UserStory;
}
```

### IntegrationTest

Represents a linked integration test file/case.

```typescript
interface IntegrationTest {
  /** Absolute path to test file */
  filePath: string;
  
  /** Test file name (e.g., "us1-projects.spec.ts") */
  fileName: string;
  
  /** Test case name if specific case is linked */
  testName?: string;
  
  /** Line number of test case in file (1-indexed) */
  line?: number;
  
  /** Spec annotation found in test file (e.g., "001-feature/US1-AS1") */
  specAnnotation?: string;
  
  /** Parent acceptance scenario reference */
  acceptanceScenario: AcceptanceScenario;
}
```

## Tree View Items

### SpecTreeItem

VS Code TreeItem subclass for the sidebar tree view.

```typescript
type SpecTreeItemType = 'feature' | 'userStory' | 'scenario' | 'test';

interface SpecTreeItem extends vscode.TreeItem {
  /** Item type for context menu and icon selection */
  type: SpecTreeItemType;
  
  /** Reference to underlying data */
  data: FeatureSpec | UserStory | AcceptanceScenario | IntegrationTest;
  
  /** File path to open when clicked */
  filePath: string;
  
  /** Line number to scroll to when clicked */
  line?: number;
  
  /** Children items (lazy loaded) */
  children?: SpecTreeItem[];
}
```

## UI State (Persisted to Workspace Storage)

```typescript
interface SpecKitUIState {
  /** IDs of expanded tree nodes */
  expandedNodes: string[];
  
  /** Last opened spec file path */
  lastOpenedSpec?: string;
  
  /** Last selected tree item ID */
  lastSelectedItem?: string;
  
  /** Split view preference */
  splitViewEnabled: boolean;
}
```

## File Format: spec.md

The plugin parses spec.md files following this structure:

```markdown
# Feature Specification: [Feature Name]

**Feature Branch**: `[###-feature-name]`
**Created**: [DATE]
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - [Title] (Priority: P1)

[Description paragraph]

**Why this priority**: [Explanation]

**Independent Test**: [Test description]

**Acceptance Scenarios**:

1. **Given** [context], **When** [action], **Then** [outcome]
2. **Given** [context], **When** [action], **Then** [outcome]

---

### User Story 2 - [Title] (Priority: P2)
...
```

## Parsing Patterns

| Element | Regex Pattern |
|---------|---------------|
| User Story Header | `/^### User Story (\d+) - (.+?) \(Priority: (P\d)\)/` |
| Acceptance Scenario | `/^(\d+)\. \*\*Given\*\* (.+?), \*\*When\*\* (.+?), \*\*Then\*\* (.+)/` |
| Feature Branch | `/\*\*Feature Branch\*\*:\s*`([^`]+)`/` |
| Test Annotation | `/@spec:\s*([\w-]+)\/US(\d+)-AS(\d+)/` |

## Relationships

```
FeatureSpec (1) ──────< UserStory (many)
                            │
                            └──────< AcceptanceScenario (many)
                                          │
                                          └──────< IntegrationTest (many)
```

## Cache Strategy

1. **Initial Load**: Parse all `specs/*/spec.md` files on extension activation
2. **File Watcher**: Re-parse individual files when they change
3. **Lazy Children**: Only parse acceptance scenarios when user story is expanded
4. **TTL**: Cache invalidated when file `mtime` changes

## No Database Required

- All spec data is stored in markdown files
- Git provides version control and collaboration
- Workspace storage only holds UI preferences
- No SQLite, IndexedDB, or remote API needed
