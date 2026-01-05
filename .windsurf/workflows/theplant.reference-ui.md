---
description: Download a reference UI implementation (shadcn-admin) for AI to use as a guide when building UI/UX components.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

This workflow downloads the [shadcn-admin](https://github.com/theplant/shadcn-admin) project as a reference implementation for UI/UX patterns. The AI should use this codebase as a guide when building user interfaces.

## Goal

Ensure UI/UX implementation follows the patterns and best practices from the shadcn-admin reference project.

## Rationale (UI-CONSISTENCY)

Consistent UI/UX improves user experience and reduces development time. By referencing a well-designed template project, we ensure:

- Consistent component usage across the application
- Best practices for layout, navigation, and forms
- Proven UX patterns for common interactions
- Reduced decision fatigue for UI implementation

## Core Principles (NON-NEGOTIABLE)

### UI Implementation MUST Reference Template

When implementing any UI feature, you MUST:

1. **Search the template first** for similar components or patterns
2. **Study the implementation** in the template before writing new code
3. **Follow the same patterns** for consistency
4. **Adapt, don't copy blindly** - understand the pattern and apply it to your context

### Reference Lookup Process

```bash
# Find similar components in template
grep -r "DataTable" .reference/shadcn-admin/src/
grep -r "Dialog" .reference/shadcn-admin/src/
grep -r "Form" .reference/shadcn-admin/src/

# Read specific component implementation
cat .reference/shadcn-admin/src/components/data-table/data-table.tsx
```

## Steps

1. **Check if reference already exists**:

   ```bash
   ls -la .reference/shadcn-admin 2>/dev/null || echo "NOT_EXISTS"
   ```

   - If the directory exists and contains files, skip to step 4
   - If not exists, proceed to step 2

2. **Create reference directory**:

   ```bash
   mkdir -p .reference
   ```

3. **Download reference implementation**:

   // turbo

   ```bash
   npx tiged --mode=git theplant/shadcn-admin .reference/shadcn-admin
   ```

   This downloads the shadcn-admin template which includes:

   - Modern React + TypeScript setup
   - shadcn/ui components
   - TailwindCSS styling
   - Dashboard layouts and patterns
   - Authentication UI patterns
   - Data table implementations
   - Form patterns with validation
   - Responsive design patterns

4. **Exclude reference directory from tooling**:

   The reference directory MUST be excluded from lint/format/typecheck/tooling scans.

   - If your project treats `.reference/` as **non-versioned** reference material, ensure it is ignored by Git:

     ```bash
     # Create .gitignore if missing
     test -f .gitignore || touch .gitignore

     # Ensure .reference/ is ignored
     grep -q "^\.reference/" .gitignore 2>/dev/null || echo ".reference/" >> .gitignore
     ```

   - If your project commits `.reference/shadcn-admin` into the repo, you MUST still exclude it from tooling checks. Verify (if these files exist in your project):

     **knip.config.ts**

     ```typescript
     const config = {
       ignore: [".reference/**"],
     };
     ```

     **eslint.config.js**

     ```javascript
     export default [
       {
         ignores: [".reference/**"],
       },
     ];
     ```

     **tsconfig.json (if needed)**

     ```json
     {
       "exclude": [".reference"]
     }
     ```

     **.prettierignore**

     ```
     .reference/
     ```

5. **Report completion**:

   Confirm the reference UI has been downloaded and is ready for use. Provide a summary of key directories:

   ```
   .reference/shadcn-admin/
   ├── src/
   │   ├── components/    # Reusable UI components
   │   ├── pages/         # Page layouts and patterns
   │   ├── hooks/         # Custom React hooks
   │   └── lib/           # Utility functions
   └── ...
   ```

## Usage Guidelines

When building UI/UX for this project, the AI should:

1. **Reference component patterns** from `.reference/shadcn-admin/src/components/`
2. **Follow layout conventions** from `.reference/shadcn-admin/src/pages/`
3. **Adopt styling patterns** using TailwindCSS classes as demonstrated
4. **Use similar UX patterns** for:
   - Navigation and sidebars
   - Data tables with sorting/filtering
   - Forms with validation feedback
   - Modal dialogs and sheets
   - Toast notifications
   - Loading states and skeletons

## Key Rules

- The `.reference/` directory is for AI reference only, not for direct code copying
- Always adapt patterns to fit the project's specific needs and architecture
- Maintain consistency with existing project conventions when they differ

## Execution Steps (When Implementing UI)

### 1. Before Implementing UI

Before writing any UI code, search the template for similar patterns:

| UI Feature     | Template Location to Check                           |
| -------------- | ---------------------------------------------------- |
| Data tables    | `.reference/shadcn-admin/src/components/data-table/` |
| Forms          | `.reference/shadcn-admin/src/features/*/components/` |
| Dialogs/Modals | Search for `Dialog` usage                            |
| Navigation     | `.reference/shadcn-admin/src/components/layout/`     |
| Dashboard      | `.reference/shadcn-admin/src/features/dashboard/`    |
| Authentication | `.reference/shadcn-admin/src/features/auth/`         |
| Settings       | `.reference/shadcn-admin/src/features/settings/`     |

### 2. Study Template Patterns

When you find a relevant component in the template:

1. **Read the full implementation** - understand all props and behaviors
2. **Check the styling approach** - Tailwind classes, variants, responsive design
3. **Note the component composition** - how smaller components are combined
4. **Understand the data flow** - props, state, hooks usage

### 3. Apply Patterns Consistently

```typescript
// GOOD: Follow template patterns
import { Button } from '@/components/ui/button'
<Button variant="outline" size="sm">Action</Button>

// BAD: Invent new patterns without checking template
<button className="custom-btn">Action</button>
```

### 4. Common UI Patterns from Template

#### Page Structure Pattern (CRITICAL)

**IMPORTANT**: Every feature page MUST follow the complete page structure from template. Do NOT only focus on the content area.

**ALWAYS reference the template file directly**:

```bash
# Read the template's feature page structure
cat .reference/shadcn-admin/src/features/users/index.tsx
```

Key points to verify:

- **Header section**: what components are included in `<Header>`
- **Main section**: className and layout structure
- **Provider pattern**: how the feature wraps its content
- **Dialogs placement**: where dialogs are rendered

#### Data Table Pattern

```typescript
// Reference: .reference/shadcn-admin/src/components/data-table/
// - Column definitions with sorting/filtering
// - Row actions with dropdown menu
// - Pagination controls
// - Toolbar with search and filters
```

#### Form Pattern

```typescript
// Reference: .reference/shadcn-admin/src/features/*/components/*-form.tsx
// - React Hook Form with Zod validation
// - Form field components with labels and errors
// - Submit button with loading state
// - Form layout and spacing
```

#### Dialog Pattern

```typescript
// Reference: Search for Dialog usage in template
// - Controlled open state
// - Header with title and description
// - Footer with action buttons
// - Form inside dialog pattern
```

#### Layout Pattern

```typescript
// Reference: .reference/shadcn-admin/src/components/layout/
// - Sidebar navigation
// - Header with user menu
// - Main content area
// - Responsive design
```

## Quality Gates

- UI implementation MUST reference template patterns before writing new code
- New components MUST follow template's component structure
- Styling MUST use Tailwind classes consistent with template
- Forms MUST follow template's form patterns
- Tables MUST follow template's data table patterns

## Feature Page Implementation Checklist

When implementing or refactoring a feature page, verify ALL items below by **comparing with the template**:

### Page Structure Checklist

**Reference**: `.reference/shadcn-admin/src/features/users/index.tsx`

- [ ] **Header component** - Page includes `<Header>` with the same children as template (read template to verify)
- [ ] **Main component** - Content wrapped in `<Main>` with same className as template
- [ ] **Page title section** - Follows same layout pattern as template
- [ ] **Primary buttons** - Positioned same as template (if applicable)

### Common Mistakes to Avoid

| Mistake                           | Correct Approach                                                          |
| --------------------------------- | ------------------------------------------------------------------------- |
| Missing `Header` component        | Read template's feature `index.tsx` and include the same Header structure |
| Only refactoring content area     | Check complete page structure from template                               |
| Hardcoding patterns from workflow | Always read the actual template files                                     |
| Manual table implementation       | Reference template's table components and patterns                        |

## AI Agent Requirements

- AI agents MUST search template before implementing UI features
- AI agents MUST read and understand template patterns before writing code
- AI agents MUST follow template's component composition patterns
- AI agents MUST use consistent styling with template
- AI agents MUST NOT invent new UI patterns without checking template first
- AI agents MUST cite template file paths when implementing similar features
- AI agents MUST check the complete page structure from template's feature `index.tsx`
- AI agents MUST NOT copy code patterns from this workflow file; always read the template source files directly

## Template Directory Structure

```
.reference/shadcn-admin/
├── src/
│   ├── components/
│   │   ├── data-table/     # Table components
│   │   ├── layout/         # Layout components
│   │   └── ui/             # shadcn/ui components
│   ├── features/
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Dashboard components
│   │   ├── settings/       # Settings pages
│   │   ├── tasks/          # Task management
│   │   └── users/          # User management
│   └── hooks/              # Custom hooks
├── public/                 # Static assets
└── package.json           # Dependencies reference
```
