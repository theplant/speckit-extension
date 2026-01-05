# Research: Windsurf Plugin for SpecKit

**Date**: 2024-12-30  
**Feature**: 002-windsurf-plugin  
**Purpose**: Resolve technical unknowns for VS Code/Windsurf extension development

## Research Questions

### 1. Storage Architecture

**Question**: How should the plugin store and access spec data?

**Decision**: File-based storage using workspace `specs/` directory

**Rationale**:
- The plugin does NOT have its own database or storage layer
- All data lives in markdown files within the workspace's `specs/` directory structure
- Each feature has a subdirectory: `specs/[number]-[feature-name]/spec.md`
- Git handles version control and collaboration (push/pull)
- No remote sync API needed - developers use standard Git workflows

**Alternatives Considered**:
- Custom database (SQLite, IndexedDB): Rejected - adds complexity, duplicates data already in files
- Remote API sync: Rejected - Git already provides this functionality
- VS Code workspace storage: Only for UI preferences (expanded nodes, last opened), not spec data

**Implementation**:
```
specs/
├── 001-feature-one/
│   ├── spec.md          # User stories, acceptance scenarios, FRs
│   ├── plan.md          # Technology plan
│   └── checklists/      # Quality checklists
├── 002-feature-two/
│   └── spec.md
└── ...
```

---

### 2. Cascade AI Integration

**Question**: How does the plugin integrate with Windsurf's Cascade AI?

**Decision**: Leverage Cascade's native capabilities - no custom AI integration needed

**Rationale**:
- Cascade is Windsurf's built-in AI assistant with full codebase awareness
- Cascade already has access to all files in the workspace including spec.md files
- Cascade can read, edit, and create files directly
- Cascade supports **Workflows** (`.windsurf/workflows/*.md`) for guided tasks
- Cascade supports **Rules** (`.windsurf/rules/*.md`) for behavior customization
- Cascade supports **Memories** for persisting context across conversations

**Key Cascade Features to Leverage**:

1. **Real-time Awareness**: Cascade sees what files are open and selected
2. **File Operations**: Cascade can read/write/create files directly
3. **Workflows**: Define spec-related workflows like `/speckit.specify`, `/speckit.plan`
4. **@-mentions**: Users can `@spec.md` to include spec context
5. **Tool Calling**: Cascade has built-in tools for search, analyze, terminal

**What the Plugin Does NOT Need**:
- Custom AI chat panel (Cascade provides this)
- Custom AI API integration (Cascade handles this)
- Context passing API (Cascade reads files directly)

**Plugin's Role with Cascade**:
- Provide convenient tree view navigation to spec files
- Open spec files in editor so Cascade can see them
- Define workflows in `.windsurf/workflows/` for spec operations
- Define rules in `.windsurf/rules/` for spec-aware behavior

---

### 3. VS Code Extension Architecture

**Question**: How to build the sidebar tree view and editor integration?

**Decision**: Standard VS Code Extension API with TreeDataProvider

**Rationale**:
- VS Code Extension API is well-documented and stable
- Windsurf is built on VS Code, so extensions work identically
- TreeDataProvider pattern is the standard for sidebar views

**Key Components**:

1. **View Container** (Activity Bar icon):
```json
{
  "contributes": {
    "viewsContainers": {
      "activitybar": [{
        "id": "speckit-explorer",
        "title": "SpecKit",
        "icon": "media/speckit-icon.svg"
      }]
    }
  }
}
```

2. **Tree View**:
```json
{
  "contributes": {
    "views": {
      "speckit-explorer": [{
        "id": "speckit.specsView",
        "name": "Specs",
        "contextualTitle": "SpecKit"
      }]
    }
  }
}
```

3. **TreeDataProvider** Implementation:
- `SpecTreeDataProvider` class implementing `vscode.TreeDataProvider<SpecTreeItem>`
- Parse `specs/*/spec.md` files to extract user stories and acceptance scenarios
- Return hierarchical tree items with collapsible states

4. **File Watcher**:
- Use `vscode.workspace.createFileSystemWatcher('**/specs/**/spec.md')`
- Refresh tree view when spec files change

5. **Editor Integration**:
- `vscode.window.showTextDocument()` to open spec files
- `vscode.commands.executeCommand('vscode.open')` for split view
- `TextEditor.revealRange()` to scroll to specific sections

---

### 4. Spec File Parsing

**Question**: How to parse spec.md files to extract user stories and acceptance scenarios?

**Decision**: Regex-based markdown parsing with line number tracking

**Rationale**:
- Spec files follow a consistent markdown format
- Need to track line numbers for "scroll to section" feature
- Full markdown AST parsing is overkill for this use case

**Parsing Strategy**:

1. **User Story Pattern**:
```regex
/^### User Story (\d+) - (.+?) \(Priority: (P\d)\)/
```
Captures: story number, title, priority

2. **Acceptance Scenario Pattern**:
```regex
/^\d+\. \*\*Given\*\* (.+?), \*\*When\*\* (.+?), \*\*Then\*\* (.+)/
```
Captures: given, when, then clauses

3. **Line Number Tracking**:
- Store start line for each parsed element
- Use for `TextEditor.revealRange()` when clicking tree items

**Data Structure**:
```typescript
interface FeatureSpec {
  path: string;
  name: string;
  userStories: UserStory[];
}

interface UserStory {
  number: number;
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  line: number;
  acceptanceScenarios: AcceptanceScenario[];
}

interface AcceptanceScenario {
  number: number;
  given: string;
  when: string;
  then: string;
  line: number;
  linkedTests?: IntegrationTest[];
}
```

---

### 5. Integration Test Linking

**Question**: How to link acceptance scenarios to integration test files?

**Decision**: Convention-based naming + comment annotations

**Rationale**:
- Tests in `tests/e2e/` directory follow naming convention
- Test files can include comments linking to acceptance scenarios

**Linking Strategies**:

1. **File Naming Convention**:
   - `tests/e2e/us1-*.spec.ts` → User Story 1
   - `tests/e2e/us2-*.spec.ts` → User Story 2

2. **Comment Annotations in Test Files**:
```typescript
// @spec: 001-feature-name/US1-AS1
test('should do something', async () => { ... });
```

3. **Scan Pattern**:
```regex
/@spec:\s*(\d+-[\w-]+)\/US(\d+)-AS(\d+)/
```

---

### 6. Split View Implementation

**Question**: How to open spec and test files side-by-side?

**Decision**: Use VS Code's built-in editor column API

**Implementation**:
```typescript
// Open spec in left column
await vscode.window.showTextDocument(specUri, {
  viewColumn: vscode.ViewColumn.One,
  preserveFocus: false
});

// Open test in right column (split)
await vscode.window.showTextDocument(testUri, {
  viewColumn: vscode.ViewColumn.Two,
  preserveFocus: true
});

// Scroll to specific line
editor.revealRange(
  new vscode.Range(line, 0, line, 0),
  vscode.TextEditorRevealType.InCenter
);
```

---

## Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Language | TypeScript | VS Code extension standard |
| Build | esbuild | Fast bundling for extensions |
| Package Manager | pnpm | Consistent with project |
| Testing | VS Code Extension Test | Official testing framework |
| Tree View | VS Code TreeDataProvider | Native API |
| File Watching | VS Code FileSystemWatcher | Native API |
| Markdown Parsing | Custom regex | Lightweight, sufficient |

---

## Dependencies

**Runtime** (bundled):
- `vscode` (types only, provided by VS Code)

**Development**:
- `@types/vscode` - VS Code API types
- `@vscode/test-electron` - Extension testing
- `esbuild` - Bundling
- `typescript` - Compilation

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Spec format changes break parsing | Use defensive parsing with fallbacks |
| Large spec files slow down tree | Lazy loading, only parse on expand |
| Cascade context limits | Rely on Cascade's built-in file access |
| Test file linking accuracy | Multiple linking strategies as fallback |

---

## Open Questions (Resolved)

1. ~~How to pass context to Cascade?~~ → Cascade reads open files automatically
2. ~~Where to store plugin data?~~ → Workspace `specs/` directory + workspace storage for UI state
3. ~~How to sync with remote?~~ → Git handles this, no plugin sync needed
