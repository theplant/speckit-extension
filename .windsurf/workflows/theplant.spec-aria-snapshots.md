---
description: Update feature specifications with ARIA snapshots for page structure validation - adds accessibility tree outlines to spec.md files for pages that will be created.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty). If user provides a file path (e.g., `@specs/my-feature/spec.md`), use that directly instead of running setup script.

## Goal

Enhance feature specifications by adding ARIA snapshot outlines for each page defined in the spec. This ensures:
- Clear accessibility structure expectations before implementation
- E2E test patterns are defined upfront
- UI structure is validated against accessibility standards

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.spec-aria-snapshots
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Rules and Spec File Location

**IMPORTANT: Read and follow ALL rules in this step before proceeding.**

#### Critical Rules for ARIA Snapshots in Specs

1. **ARIA snapshots use partial matching** - Only include essential structural elements, not every element on the page.

2. **Use semantic roles** - Focus on `heading`, `button`, `textbox`, `link`, `table`, `list`, `checkbox`, `radio`, etc.

3. **Include accessibility attributes** - Add `[level=N]` for headings, `[checked]` for checkboxes/radios when relevant.

4. **Use regex for dynamic content** - Use `/pattern/` syntax for text that varies (e.g., user names, counts).

5. **Keep snapshots minimal** - 5-15 elements per page is ideal. Too many elements make specs brittle.

6. **Group by user story** - Each page/view should be tied to a user story in the spec.

#### Locate the Spec File

**Option A: User provided file path**
If user input contains a file path (e.g., `@specs/feature/spec.md`), use that file directly.

**Option B: Use setup script**
```bash
cd [repo-root] && .specify/scripts/bash/setup-plan.sh --json
```

Parse the JSON output to get `FEATURE_SPEC` path.

### Step 2: Analyze Spec for Pages

Read the spec file and identify all pages/views that will be created:

```bash
cat [SPEC_FILE_PATH]
```

Look for:
- Route definitions (e.g., `/users`, `/settings/account`)
- Page components mentioned
- User stories that imply new views
- Forms and their fields
- Tables and their columns
- Navigation elements

Document each page found:
```markdown
## Pages Identified

### Page 1: [Page Name]
- **Route**: /path/to/page
- **User Story**: US-X
- **Key Elements**: [list main interactive elements]

### Page 2: ...
```

### Step 3: Generate ARIA Snapshots for Each Page

For each page identified, create an ARIA snapshot outline following this format:

```markdown
### [Page Name] - ARIA Snapshot

**Route**: `/path/to/page`
**User Story**: US-X

```aria
- heading "[Page Title]" [level=1]
- textbox "[Field Label]"
- button "[Action Name]"
- table:
  - rowgroup:
    - row "[Header Row]"
- link "[Navigation Link]"
```

**Key Interactions**:
- [Describe main user interactions]
```

#### ARIA Snapshot Patterns

**Form Page**:
```aria
- heading "Form Title" [level=1]
- textbox "Email"
- textbox "Password"
- button "Submit"
- link "Forgot password?"
```

**List/Table Page**:
```aria
- heading "Items List" [level=2]
- textbox "Filter items..."
- combobox "Sort by"
- table
- button "Add Item"
```

**Dashboard Page**:
```aria
- heading "Dashboard" [level=2]
- heading "Statistics" [level=3]
- list
- button "View Details"
```

**Settings Page**:
```aria
- heading "Settings" [level=1]
- heading "Account" [level=3]
- textbox "Name"
- combobox "Language"
- button "Save Changes"
```

**Empty State**:
```aria
- heading "No Items" [level=2]
- text: /No .* found/
- button "Create First Item"
```

### Step 4: Update Spec File with ARIA Snapshots

Add a new section to the spec file called "## ARIA Snapshots" containing all the generated snapshots.

**Placement**: Add after the User Stories section, before Implementation Notes (if any).

**Format**:
```markdown
## ARIA Snapshots

These snapshots define the expected accessibility structure for each page. Use these as the basis for E2E tests with `toMatchAriaSnapshot`.

### [Page 1 Name]
...

### [Page 2 Name]
...
```

### Step 5: Verification

After updating the spec, verify:

1. **All pages covered** - Every route/view in the spec has an ARIA snapshot
2. **Snapshots are minimal** - Each snapshot has 5-15 essential elements
3. **User stories linked** - Each snapshot references its user story
4. **Semantic roles used** - Using proper ARIA roles, not CSS classes

Report:
```markdown
## Spec Updated

- **File**: [spec file path]
- **Pages with ARIA snapshots**: [count]
- **Total elements defined**: [count]

### Pages Covered:
1. [Page Name] - [element count] elements
2. ...
```
