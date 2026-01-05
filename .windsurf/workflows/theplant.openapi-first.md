---
description: Apply OpenAPI-First API Architecture - define API spec before implementation, generate types and React Query hooks with Orval, use generated hooks for all data access.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure all API development follows OpenAPI-First principles. Define the API contract before implementation, generate TypeScript types and React Query hooks using Orval, and use generated hooks for all data access.

## CRITICAL: NO SKIPPING ALLOWED

**⚠️ AI MUST NEVER skip any step in this workflow, regardless of:**

- Whether the project appears to be "static" or "demo"
- Whether API endpoints don't exist yet
- Whether the project currently uses static data

**For every step, AI MUST:**

1. **Actually install the packages** specified
2. **Actually create the files** specified (orval.config.ts, openapi.yaml, etc.)
3. **Actually run the commands** specified
4. If the project has no API → **CREATE an openapi.yaml based on the data structures found in the codebase**
5. If the project uses static data → **CONVERT IT to use API hooks with MSW**

**Marking a step complete without doing the work is FORBIDDEN.**

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:

- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.openapi-first
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Pre-Execution: Detect Existing Configuration (MUST DO FIRST)

Before proceeding with any steps, AI agents MUST detect existing OpenAPI setup:

### Step 0.1: Check for existing orval.config.ts

```bash
# Check if orval.config.ts exists
ls -la orval.config.ts 2>/dev/null || echo "NOT_FOUND"
```

If `orval.config.ts` exists:

1. Read the file to find the `input.target` path - this is the OpenAPI spec location
2. Use the existing spec location instead of the default `src/api/openapi.yaml`
3. Skip Step 2 (Create Orval Configuration) unless user explicitly requests changes

### Step 0.2: Check for existing OpenAPI spec

```bash
# Search for existing OpenAPI spec files
find . -name "openapi.yaml" -o -name "openapi.json" -o -name "*.openapi.yaml" 2>/dev/null | head -10
```

Decision matrix:

| orval.config.ts | OpenAPI spec               | Action                                               |
| --------------- | -------------------------- | ---------------------------------------------------- |
| Exists          | Exists at configured path  | **UPDATE** existing spec, skip orval setup           |
| Exists          | Missing at configured path | **CREATE** spec at configured path                   |
| Missing         | Exists somewhere           | **CREATE** orval.config.ts pointing to existing spec |
| Missing         | Missing                    | **CREATE** both (use default `src/api/openapi.yaml`) |

### Step 0.3: Determine spec location

The OpenAPI spec location is determined by (in priority order):

1. Path specified in existing `orval.config.ts` → `input.target`
2. User-provided path in `$ARGUMENTS`
3. Existing spec file found in project
4. Default: `src/api/openapi.yaml`

**IMPORTANT**: Do NOT assume `src/api/openapi.yaml` - always check first!

## Steps

### Step 1: Install Orval

**Why:** Orval generates TypeScript types and React Query hooks from OpenAPI spec, ensuring type safety and eliminating manual API code.

```bash
pnpm add -D orval
```

### Step 2: Create `orval.config.ts`

**Why:** This configuration tells Orval where to find the OpenAPI spec and where to output generated code. Setting `mock: false` ensures we use MSW with localStorage instead of faker.js.

Create `orval.config.ts` at project root:

```typescript
import { defineConfig } from "orval";

export default defineConfig({
  api: {
    output: {
      mode: "tags-split",
      target: "src/api/generated/endpoints",
      schemas: "src/api/generated/models",
      client: "react-query",
      mock: false, // IMPORTANT: Do NOT use faker.js mocks - use MSW with localStorage instead
      baseUrl: "/api",
    },
    input: {
      target: "./src/api/openapi.yaml",
    },
  },
});
```

### Step 3: Add Scripts to `package.json`

**Why:** A single command to regenerate types ensures consistency. Run this after any OpenAPI spec change.

```json
{
  "scripts": {
    "api:generate": "orval"
  }
}
```

### Step 4: Create `src/api/openapi.yaml`

**Why:** The OpenAPI spec is the single source of truth for API contracts. It enables code generation for both frontend (Orval) and backend (oapi-codegen), ensuring type safety across the stack.

Create the OpenAPI specification file.

**OpenAPI Spec Requirements:**

- Every endpoint MUST have `operationId` (Orval uses this to generate hook names)
- All request/response schemas MUST be defined in `components/schemas`
- The spec MUST be complete enough to hand to backend developers

### Step 5: Generate TypeScript Types and Hooks

**Why:** Generated code is always in sync with the API contract. Manual edits to generated files will be overwritten.

```bash
pnpm api:generate
```

This generates:

- `src/api/generated/models/` - TypeScript interfaces
- `src/api/generated/endpoints/` - React Query hooks

**NEVER edit files in `src/api/generated/`**

### Step 6: Create `src/api/custom-fetch.ts`

**Why:** Custom fetch wrapper enables consistent error handling, auth headers, and logging across all API calls.

For custom fetch logic (auth headers, error handling):

**IMPORTANT:** Orval passes a config object, NOT (url, options). The customFetch signature must match:

```typescript
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestConfig = {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export const customFetch = async <T>(
  config: RequestConfig,
  _options?: RequestInit
): Promise<T> => {
  const { url, method, params, data, headers, signal } = config;

  // Build URL with query params
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      fullUrl = `${url}?${queryString}`;
    }
  }

  const response = await fetch(fullUrl, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: data ? JSON.stringify(data) : undefined,
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorBody.code || "UNKNOWN_ERROR",
      errorBody.message || `HTTP ${response.status}`,
      errorBody.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};
```

Then update `orval.config.ts`:

```typescript
override: {
  mutator: {
    path: './src/api/custom-fetch.ts',
    name: 'customFetch',
  },
},
```

### Step 7: Convert Static Data Sources to API Hooks

**Why:** Static data (faker, hardcoded arrays) must be replaced with API hooks at the DATA SOURCE level, not just at the component level. Components that receive data as props may look "clean" but their parent components are importing static data.

**CRITICAL: Find and convert ALL static data imports:**

```bash
# Find static data imports (faker, hardcoded data files)
grep -rln "from '.*data/\|from '@faker-js" src/ --include="*.ts" --include="*.tsx" | grep -v generated | grep -v node_modules
```

**For each file with static data imports:**

1. **Identify the data source pattern:**

```typescript
// ❌ BEFORE: Static data import
import { users } from "./data/users"; // faker-generated array
import { tasks } from "./data/tasks"; // static array

// Component passes static data to child
<UsersTable data={users} />;
```

2. **Replace with API hook:**

```typescript
// ✅ AFTER: API hook
import { useListUsers } from "@/api/generated/endpoints/users/users";

export function Users() {
  const { data, isLoading, error } = useListUsers();

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <UsersTable data={data?.data ?? []} />;
}
```

3. **Update child component types to use API-generated types:**

```typescript
// ❌ BEFORE: Local schema type
import { type User } from "../data/schema";

// ✅ AFTER: API-generated type
import type { User } from "@/api/generated/models";
```

4. **Update ALL related files that use the local type:**
   - Table components
   - Column definitions
   - Row action components
   - Provider/context files
   - Dialog components

### Step 8: Migrate Remaining Components to Use Orval Hooks

**Why:** Orval hooks have different interfaces than manual hooks. Systematic migration ensures all components use the correct patterns. Additional features like toast notifications should be added inside components, not in wrapper hooks.

<!-- runner:loop:FILE -->

```bash
grep -rln "from '@/services/\|from '@/hooks/use-\|from '@/types/" src/ --include="*.ts" --include="*.tsx" | grep -v generated | grep -v node_modules
```

**Refactor `$FILE`:**

MANDATORY: Replace all manual API code with Orval hooks. Never Give up with /theplant.root-cause-tracing.md

1. **Replace imports:**

```typescript
// ❌ BEFORE
import { workflowService } from "@/services/workflow-api";
import { useWorkflows } from "@/hooks/use-workflows";
import type { Workflow } from "@/types/workflow";
import { WorkflowStatus } from "@/types/workflow";

// ✅ AFTER
import {
  useListWorkflows,
  useCreateWorkflow,
} from "@/api/generated/endpoints/workflows/workflows";
import type { Workflow } from "@/api/generated/models";
import { WorkflowStatus } from "@/api/generated/models";
```

2. **Update enum values (Orval uses full prefixes):**

```typescript
// ❌ BEFORE
WorkflowStatus.DRAFT;
TriggerType.MANUAL;

// ✅ AFTER
WorkflowStatus.WORKFLOW_STATUS_DRAFT;
TriggerType.TRIGGER_TYPE_MANUAL;
```

3. **Update mutation calls (Orval wraps body in `{ data: ... }`):**

```typescript
// ❌ BEFORE
createMutation.mutate({ name: "New" });

// ✅ AFTER
createMutation.mutate({ data: { name: "New" } });
```

4. Run `pnpm tsc --noEmit` after each file.

### Step 9: Delete Manual Code Files

**Why:** Keeping manual files causes confusion and potential import conflicts. Delete them after migration is complete.

```bash
rm -f src/services/*-api.ts
rm -f src/hooks/use-workflows.ts  # Keep non-API hooks like use-mobile.ts
rm -f src/types/workflow.ts
```

### Step 10: Final Verification

**Why:** Verify that all manual API code has been replaced and the project compiles without errors.

```bash
# 1. No manual API imports
grep -rn "from '@/services/\|from '@/hooks/use-workflows\|from '@/types/workflow'" src/ --include="*.ts" --include="*.tsx" && echo "FAIL" || echo "PASS"

# 2. TypeScript compiles
pnpm tsc --noEmit

# 3. Tests pass
pnpm test:e2e
```

## Common Pitfalls When Refactoring to OpenAPI-First

### Orval Does NOT Generate Zod Schemas

Orval generates TypeScript types and React Query hooks, but NOT Zod schemas. If existing code uses Zod schemas for validation:

```typescript
// ❌ WRONG: Importing non-existent Zod schema from generated models
import { taskSchema } from "@/api/generated/models";
const task = taskSchema.parse(row.original); // Runtime error!

// ✅ CORRECT: Use TypeScript type and trust the data
import type { Task } from "@/api/generated/models";
const task = row.original as Task; // Or just use row.original directly
```

### Type-Only Imports for Generated Models

When importing from generated models, prefer `import type` to make it clear these are types, not runtime values:

```typescript
// ✅ GOOD: Clear that this is a type import
import type { User, Task, App } from "@/api/generated/models";

// ⚠️ ACCEPTABLE: Works but less clear
import { User, Task, App } from "@/api/generated/models";

// ❌ BAD: Trying to import runtime values that don't exist
import { userSchema, taskSchema } from "@/api/generated/models"; // These don't exist!
```

### Verify Imports After Refactoring

After switching from local schemas to generated types, run TypeScript check to catch missing exports:

```bash
# ALWAYS run after refactoring imports
pnpm tsc --noEmit

# If you see "does not provide an export named 'X'" errors:
# 1. Check what's actually exported: cat src/api/generated/models/index.ts
# 2. Use type imports only, not runtime values
# 3. Remove any Zod schema imports - they don't exist in generated code
```
