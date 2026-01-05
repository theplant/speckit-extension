---
description: Clean up features not included in spec.md and OpenAPI spec - remove unused features, routes, e2e tests, and related code.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Configuration

Before starting cleanup, identify the specification sources. These can be provided via user input or discovered from the project:

| Config | Default | Description |
|--------|---------|-------------|
| `SPEC_PATH` | `specs/*/spec.md` | Path to feature specification file |
| `OPENAPI_PATH` | `specs/*/contracts/openapi.yaml` | Path to OpenAPI contract file |
| `ORVAL_CONFIG` | `orval.config.ts` | Orval config (contains OpenAPI path) |

**Discovery method:**
1. Check `orval.config.ts` for `input.target` to find OpenAPI spec location
2. Look for `specs/` directory structure to find spec.md
3. User can override via `$ARGUMENTS`

## Goal

Remove **ALL** code artifacts that are NOT defined in the feature specification and OpenAPI contract. This includes:

- Feature modules (`src/features/*/`)
- Route files (`src/routes/*/`)
- E2E test files (`tests/e2e/*.spec.ts`)
- E2E test utilities (`tests/e2e/utils/`)
- MSW handlers (`src/mocks/handlers.ts`)
- Seed data (`src/lib/seed-data.ts`, `src/lib/*-seed-data.ts`)
- Storage keys (`src/lib/storage.ts`)
- Navigation/sidebar data (`src/components/layout/data/`)
- Generated API endpoints (`src/api/generated/endpoints/`)
- Generated API models (`src/api/generated/models/`)
- Context providers (`src/context/`)
- Custom hooks (`src/hooks/`)
- Shared components used only by removed features
- Type definitions for removed features

## Rationale

Keeping unused code creates maintenance burden, confusion, and potential security risks. This workflow ensures the codebase stays lean and aligned with the actual product specification. All code should be traceable back to a requirement in the spec.

## Core Principles (NON-NEGOTIABLE)

### Spec-Driven Development

- Code MUST only exist if it implements a feature defined in spec
- API endpoints MUST only exist if defined in OpenAPI spec
- E2E tests MUST only test features defined in the spec
- Components MUST only exist if used by spec-defined features
- Seed data MUST only contain entities defined in the spec
- Storage keys MUST only exist for spec-defined entities

### Safety First

- ALWAYS create a backup branch before cleanup
- NEVER delete shared utilities without checking all usages
- VERIFY no spec-defined features depend on code before deletion
- RUN all tests after cleanup to ensure nothing breaks

## Execution Steps

### Step 1: Discover Configuration

Find the specification sources:

```bash
# Find OpenAPI spec from orval config
cat orval.config.ts | grep "target:"

# Find spec.md files
find specs -name "spec.md"

# List all spec directories
ls -la specs/
```

Read the configuration files to determine paths:
- `orval.config.ts` → `input.target` contains OpenAPI path
- `specs/*/spec.md` → Feature specification

### Step 2: Analyze Specification Sources

Read and extract the list of valid features from both sources:

**From spec.md:**
- Extract all User Stories and their feature names
- Extract all Key Entities (these map to API resources)
- Extract all Functional Requirements
- Note the feature boundaries

**From openapi.yaml:**
- Extract all `tags` (these define feature/resource boundaries)
- Extract all `paths` (these define valid API endpoints)
- Extract all `components/schemas` (these define valid data models)
- Note the API structure

**Build a feature inventory:**
```
Feature Name | Spec Reference | OpenAPI Tag | API Paths
-------------|----------------|-------------|----------
[feature]    | [user story]   | [tag]       | [/api/v1/...]
```

### Step 3: Inventory ALL Current Codebase Artifacts

Systematically list ALL artifacts that could contain feature-specific code:

```bash
# 1. Feature modules
ls -la src/features/

# 2. Route files (authenticated)
ls -la src/routes/_authenticated/

# 3. Route files (public auth)
ls -la src/routes/\(auth\)/

# 4. Route files (errors)
ls -la src/routes/\(errors\)/

# 5. E2E test files
ls -la tests/e2e/*.spec.ts

# 6. E2E test utilities
ls -la tests/e2e/utils/

# 7. MSW handlers - list all http.* handlers
grep -n "http\.\(get\|post\|put\|patch\|delete\)" src/mocks/handlers.ts

# 8. Seed data files
ls -la src/lib/*seed*.ts

# 9. Storage keys
grep -A 20 "STORAGE_KEYS" src/lib/storage.ts

# 10. Navigation/sidebar data
cat src/components/layout/data/sidebar-data.ts

# 11. Generated API endpoints
ls -la src/api/generated/endpoints/

# 12. Generated API models
ls -la src/api/generated/models/

# 13. Context providers
ls -la src/context/

# 14. Custom hooks
ls -la src/hooks/

# 15. Shared components (check for feature-specific ones)
ls -la src/components/
```

### Step 4: Build Removal Checklist

For each artifact type, create a checklist comparing against spec:

**Feature Directories (`src/features/*/`):**
| Directory | In Spec? | Action | Dependencies |
|-----------|----------|--------|--------------|
| [name] | ✅/❌ | Keep/Remove | [list imports] |

**Route Directories (`src/routes/_authenticated/*/`):**
| Directory | In Spec? | Action | Feature Module |
|-----------|----------|--------|----------------|
| [name] | ✅/❌ | Keep/Remove | [src/features/*] |

**E2E Test Files (`tests/e2e/*.spec.ts`):**
| File | Tests Feature | In Spec? | Action |
|------|---------------|----------|--------|
| [name].spec.ts | [feature] | ✅/❌ | Keep/Remove |

**E2E Test Utilities (`tests/e2e/utils/`):**
| File | Used By | Action |
|------|---------|--------|
| [name].ts | [test files] | Keep if used by remaining tests |

**MSW Handlers (`src/mocks/handlers.ts`):**
| Handler Pattern | OpenAPI Path? | Action |
|-----------------|---------------|--------|
| `/api/v1/[path]` | ✅/❌ | Keep/Remove |

**Seed Data (`src/lib/*-seed-data.ts`):**
| File | Entities | In Spec? | Action |
|------|----------|----------|--------|
| [name].ts | [entities] | ✅/❌ | Keep/Remove |

**Storage Keys (`src/lib/storage.ts`):**
| Key | Entity | In Spec? | Action |
|-----|--------|----------|--------|
| [KEY_NAME] | [entity] | ✅/❌ | Keep/Remove |

**Navigation Items (`src/components/layout/data/sidebar-data.ts`):**
| Nav Item | URL | In Spec? | Action |
|----------|-----|----------|--------|
| [title] | [url] | ✅/❌ | Keep/Remove |

**Generated API (`src/api/generated/`):**
- These are auto-generated from OpenAPI spec
- Will be regenerated after cleanup
- No manual removal needed

### Step 5: Check Dependencies Before Removal

For EACH artifact marked for removal, verify no spec-defined features depend on it:

```bash
# Check feature imports
grep -r "from.*features/[FEATURE_NAME]" src/ --include="*.ts" --include="*.tsx"

# Check route references
grep -r "/[ROUTE_PATH]" src/ --include="*.ts" --include="*.tsx"

# Check component imports
grep -r "from.*components/[COMPONENT]" src/ --include="*.ts" --include="*.tsx"

# Check hook imports
grep -r "from.*hooks/[HOOK]" src/ --include="*.ts" --include="*.tsx"

# Check context imports
grep -r "from.*context/[CONTEXT]" src/ --include="*.ts" --include="*.tsx"

# Check storage key usage
grep -r "STORAGE_KEYS\.[KEY]" src/ --include="*.ts" --include="*.tsx"
```

### Step 6: Remove Artifacts (Ordered by Dependencies)

Remove in this order to avoid breaking dependencies:

**Phase 1: Tests (no dependencies)**
```bash
# Remove E2E test files for non-spec features
rm tests/e2e/[feature].spec.ts

# Remove test utilities only used by removed tests
rm tests/e2e/utils/[utility].ts
```

**Phase 2: Routes (depend on features)**
```bash
# Remove route directories
rm -rf src/routes/_authenticated/[feature]/

# Remove public route files if not in spec
rm src/routes/\(auth\)/[route].tsx
```

**Phase 3: Features (may have shared components)**
```bash
# Remove feature directories
rm -rf src/features/[feature]/
```

**Phase 4: Supporting Code**
```bash
# Clean up seed data files
# Edit or remove src/lib/seed-data.ts (legacy seed data)
# Keep src/lib/iam-seed-data.ts (if IAM is in spec)

# Clean up storage keys in src/lib/storage.ts
# Remove keys for deleted entities

# Clean up MSW handlers in src/mocks/handlers.ts
# Remove handlers for non-spec endpoints

# Clean up navigation in src/components/layout/data/sidebar-data.ts
# Remove nav items for deleted routes
```

**Phase 5: Shared Components (if only used by removed features)**
```bash
# Only remove if no remaining features use them
rm src/components/[component].tsx
```

**Phase 6: Hooks and Context (if only used by removed features)**
```bash
# Only remove if no remaining features use them
rm src/hooks/[hook].ts
rm src/context/[context].tsx
```

### Step 7: Regenerate Generated Code

After cleanup, regenerate all auto-generated code:

```bash
# Regenerate API code from OpenAPI spec
pnpm orval

# Regenerate route tree (happens automatically with dev server)
pnpm dev
# Or trigger manually if available
```

### Step 8: Verify Cleanup

Run comprehensive verification:

```bash
# 1. TypeScript compilation (catches broken imports)
pnpm tsc --noEmit

# 2. Lint check (catches unused imports, etc.)
pnpm lint

# 3. Run unit tests
pnpm test

# 4. Run remaining E2E tests
pnpm test:e2e

# 5. Start dev server and verify manually
pnpm dev
```

**Manual verification checklist:**
- [ ] All spec-defined routes are accessible
- [ ] Navigation only shows spec-defined features
- [ ] No console errors on any page
- [ ] All CRUD operations work for remaining features

### Step 9: Document Changes

Create a cleanup summary in the PR or commit message:

```markdown
## Feature Cleanup Summary

### Configuration Used
- Spec: [SPEC_PATH]
- OpenAPI: [OPENAPI_PATH]

### Removed Artifacts

**Features:**
- `src/features/[name]/` - [reason]

**Routes:**
- `src/routes/_authenticated/[name]/` - [reason]

**E2E Tests:**
- `tests/e2e/[name].spec.ts` - [reason]

**Supporting Code:**
- `src/lib/seed-data.ts` - Removed legacy seed data
- `src/lib/storage.ts` - Removed unused storage keys
- `src/mocks/handlers.ts` - Removed non-spec handlers
- `src/components/layout/data/sidebar-data.ts` - Removed nav items

### Updated Files
- Navigation sidebar
- MSW handlers
- Storage keys
- Route tree (auto-generated)
- API code (auto-generated)

### Verification Results
- [ ] TypeScript compiles without errors
- [ ] Lint passes
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Dev server starts successfully
- [ ] All spec-defined features work correctly
```

## CRITICAL: AI agents MUST NOT

- Delete features without checking the spec first
- Remove shared utilities used by spec-defined features
- Skip dependency checking before removal
- Leave broken imports after cleanup
- Remove error handling or utility features (errors/, utils)
- Delete without creating a backup first
- Hardcode spec paths without checking orval.config.ts
- Remove generated code manually (let orval regenerate)
- Skip any artifact type in the inventory

## AI Agent Requirements

- AI agents MUST discover spec/openapi paths from orval.config.ts first
- AI agents MUST read both spec.md and openapi.yaml before cleanup
- AI agents MUST inventory ALL artifact types listed in Step 3
- AI agents MUST verify each artifact against the spec before removal
- AI agents MUST check for dependencies before deleting any code
- AI agents MUST follow the removal order in Step 6
- AI agents MUST run TypeScript compilation after cleanup
- AI agents MUST run E2E tests after cleanup
- AI agents MUST update ALL supporting code (navigation, handlers, seed data, storage)
- AI agents MUST regenerate API code after cleanup

## Integration with Other Workflows

- **theplant.openapi-first**: Use OpenAPI spec as source of truth for API endpoints
- **theplant.system-exploration**: Trace code paths before removal to understand dependencies
- **theplant.e2e-testing**: Update E2E tests after cleanup
- **theplant.msw-mock-backend**: Update MSW handlers to match remaining features

## Context

$ARGUMENTS
