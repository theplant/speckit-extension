---
description: Apply System Exploration Protocol before writing tests - trace BOTH read paths (storage → UI) AND write paths (UI → storage) to understand complete data flow.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Before writing tests for an unfamiliar system, trace **BOTH** the read path (storage → UI) **AND** the write path (UI → storage). Generate a `.system_exploration.md` file at project root with detailed documentation.

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:

- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.system-exploration
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Check Existing Exploration Document

**Why:** If `.system_exploration.md` exists, verify its content is still valid before adding new traces.

```bash
cat .system_exploration.md 2>/dev/null || echo "No existing exploration document"
```

If the file exists:

1. Check if documented routes still exist in `src/routes/`
2. Check if documented API endpoints still exist in `src/api/openapi.yaml` or MSW handlers
3. Check if localStorage keys are still valid
4. **Remove any outdated sections** before proceeding

### Step 2: List Route Files

**Why:** Understanding the route structure reveals what pages exist and how they're organized.

```bash
find src/routes -name "*.tsx" | head -50
```

For each route, trace:

**READ Path (Data Display):**

```
Route → Component → Query Hook → GET API → MSW Handler → Storage
```

**WRITE Path (Data Mutation):**

```
Form/Button → Submit Handler → Mutation Hook → POST/PUT/DELETE API → MSW Handler → Storage
```

The READ trace reveals:

- What data entities the route displays
- What fields are required for each entity
- What relationships exist between entities
- What localStorage key to use for seeding

The WRITE trace reveals:

- What forms exist and what fields they contain
- What validation is applied (client-side and server-side)
- What mutation hooks are used (useCreateX, useUpdateX, useDeleteX)
- What API endpoints handle mutations (POST, PUT, DELETE)
- How MSW handlers persist data to localStorage
- What cache invalidation happens after mutation

### Step 2.5: Trace WRITE Path (Data Mutation) (NON-NEGOTIABLE)

For each feature, trace the full WRITE code path:

1. **Find forms/dialogs** in the component (look for `<form>`, `<Dialog>`, modal components)
2. **Find submit handlers** (onSubmit, onClick for save/delete buttons)
3. **Find mutation hooks** (useCreateX, useUpdateX, useDeleteX)
4. **Read the mutation hooks** to find which POST/PUT/DELETE API endpoints they call
5. **Read the MSW handlers** to understand how data is persisted to storage
6. **Check cache invalidation** (queryClient.invalidateQueries after mutation)

**Common patterns to look for:**

```typescript
// Form with react-hook-form
const form = useForm<CreateUserRequest>({ ... })
const createUser = useCreateUser()
const onSubmit = (data) => createUser.mutate({ data })

// Delete button
const deleteUser = useDeleteUser()
onClick={() => deleteUser.mutate({ userId: user.id })}

// Inline edit
const updateTask = useUpdateTask()
onBlur={(e) => updateTask.mutate({ taskId, data: { title: e.target.value } })}
```

### Step 3: Generate `.system_exploration.md`

**Why:** This document serves as the single source of truth for understanding the system's data flow, useful for generating OpenAPI specs and writing tests.

Create or update `.system_exploration.md` at project root with the following structure:

````markdown
# System Exploration Document

Generated: [timestamp]

## Routes Overview

| Route URL    | Route File                                  | Component    | Description      |
| ------------ | ------------------------------------------- | ------------ | ---------------- |
| `/users`     | `src/routes/_authenticated/users/index.tsx` | `Users`      | User management  |
| `/users/:id` | `src/routes/_authenticated/users/$id.tsx`   | `UserDetail` | User detail/edit |

## Data Entities

### Entity: User

**localStorage Key:** `iam-console-users`

**TypeScript Type:**

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  status: "active" | "inactive";
  createdAt: string;
}
```
````

**Required Fields:** id, email, name
**Optional Fields:** status, createdAt
**Relationships:** None

## API Endpoints

### GET /api/v1/users

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | number | No | Page number (default: 1) |
| limit | number | No | Items per page (default: 20) |
| status | string | No | Filter by status |

**Response Type:** `ListUsersResponse`

```typescript
{
  data: User[];
  meta: { page: number; limit: number; total: number; totalPages: number; }
}
```

### POST /api/v1/users

**Request Body:** `CreateUserRequest`

```typescript
{
  email: string;  // required
  name: string;   // required
  status?: 'active' | 'inactive';
}
```

**Response Type:** `UserItemResponse`

### PUT /api/v1/users/:userId

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID |

**Request Body:** `UpdateUserRequest`

### DELETE /api/v1/users/:userId

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | Yes | User ID |

## Forms and Input Fields

### UserForm (Create/Edit User)

**Location:** `src/features/users/components/user-form.tsx`

| Field Name | Input Type   | Validation             | Required |
| ---------- | ------------ | ---------------------- | -------- |
| email      | text (email) | email format           | Yes      |
| name       | text         | min 1 char             | Yes      |
| status     | select       | enum: active, inactive | No       |

**Submit Handler:** `useCreateUser().mutate()` or `useUpdateUser().mutate()`

## Component Data Dependencies

### Users List Page (`/users`)

**Components Used:**

- `UsersTable` - displays user list
- `UsersActionDialog` - create/edit modal
- `UsersDeleteDialog` - delete confirmation

**Data Hooks:**

- `useListUsers()` - fetches user list
- `useCreateUser()` - creates new user
- `useUpdateUser()` - updates existing user
- `useDeleteUser()` - deletes user

**Cache Invalidation:**

- After create/update/delete: `queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() })`

## localStorage Structure

**Key:** `iam-console-users`

**Data Structure:**

```json
{
  "state": {
    "users": [
      {
        "id": "1",
        "email": "user@example.com",
        "name": "John",
        "status": "active"
      }
    ]
  }
}
```

## Test Data Requirements

| Entity | Required for Tests | Seed Helper                       |
| ------ | ------------------ | --------------------------------- |
| User   | Yes                | `createTestUser(id, email, name)` |

## Notes

- [Add any special behaviors, edge cases, or gotchas discovered during exploration]

```

### Step 4: Verify Document Completeness

**Why:** Ensure the exploration document contains all information needed for OpenAPI generation and test writing.

Checklist:
- [ ] All routes documented with URL patterns and query parameters
- [ ] All data entities with TypeScript types and localStorage keys
- [ ] All API endpoints with request/response types
- [ ] All forms with input fields and validation rules
- [ ] All component data dependencies documented
- [ ] localStorage structure documented for test data seeding

```
