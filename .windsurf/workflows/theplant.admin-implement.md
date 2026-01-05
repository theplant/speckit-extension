---
description: Admin Console Implementation Guide - Project structure and code implementation best practices
---

## Project Structure

```
src/
├── api/          # Auto-generated API client (orval from OpenAPI)
├── components/   # Shared components
│   ├── ui/       # Base UI components (shadcn/ui)
│   ├── layout/   # Layout components (Header, Sidebar, Main)
│   └── data-table/
├── features/     # Feature modules by business domain
├── routes/       # TanStack Router file-based routing
├── hooks/        # Custom Hooks (useDebounce, etc.)
├── context/      # React Context
├── services/     # Business service layer
├── lib/          # Utility functions
├── types/        # TypeScript types
├── mocks/        # Mock data for dev/test
└── main.tsx      # Entry point

tests/e2e/        # Playwright E2E tests
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript + Vite |
| Routing | TanStack Router |
| Data Fetching | TanStack Query |
| UI | shadcn/ui + Tailwind CSS |
| Forms | react-hook-form + zod |
| Testing | Playwright |
| API Client | orval (OpenAPI) |

## Implementation Rules

### 1. Input Debounce
- **Rule**: Use `useDebounce` hook for search/filter inputs to delay API calls (default 300ms)
- **Why**: Prevents excessive requests on every keystroke

### 2. Async Loading States
- **Rule**: All async data loading must handle three states: **Loading**, **Empty**, and **Error**
- **Loading State**:
  - Use Skeleton placeholders to indicate loading progress
  - Skeleton should match the expected content layout (e.g., table skeleton for table data)
  - Never block the entire page; isolate loading states to specific components
  - Use Suspense boundaries to isolate loading states
- **Empty State**:
  - Display a clear, user-friendly message when no data is available (e.g., "No members found")
  - Consider showing helpful actions (e.g., "Create your first member" button)
  - Empty state should be visually distinct from loading state
- **Error State**:
  - Display user-friendly error messages (avoid technical jargon)
  - Provide retry action when appropriate
  - Log detailed errors to console for debugging
- **Long Loading / Refetch**:
  - For operations that may take longer than 300ms, always show skeleton/spinner
  - Use `placeholderData: keepPreviousData` in TanStack Query to avoid flickering during refetch
- **Example**:
```tsx
if (isPending) {
  return <Skeleton className='h-96 w-full' />
}

if (error) {
  return (
    <div className='text-center py-8'>
      <p className='text-destructive'>Failed to load data</p>
      <Button onClick={() => refetch()}>Retry</Button>
    </div>
  )
}

if (!data?.length) {
  return (
    <div className='text-center py-8'>
      <p className='text-muted-foreground'>No items found</p>
    </div>
  )
}

return <DataTable data={data} />
```

### 3. React 19 + Third-Party Library Compatibility
- **Rule**: When updating external state in third-party library callbacks (e.g., `react-day-picker` `onSelect`), wrap state updates in `setTimeout(() => { ... }, 0)`
- **Why**: React 19's concurrent features can conflict with library internal state updates, causing infinite loops
- **Applies to**: Any library with focus/blur management (Radix UI, Headless UI, react-day-picker, etc.)

### 4. Props Stability
- **Rule**: Use `useMemo` for object props, `useCallback` for function props
- **Rule**: Move static values (constants, dates) outside component
- **Rule**: Inline arrow functions in props (e.g., `disabled={(date) => date > maxDate}`) must be wrapped with `useCallback`
- **Why**: Prevents unnecessary child re-renders; inline functions create new references on every render, causing child components to re-render and potentially triggering infinite loops

### 5. Form Validation
- **Rule**: Use `react-hook-form` + `zod` for all forms
- **Rule**: Validate on blur and submit; clear errors on change
- **Rule**: Show inline error messages near fields

### 6. Date/Range Validation
- **Rule**: End date must be >= Start date
- **Rule**: Max value must be >= Min value
- **Rule**: Disable invalid options in UI (e.g., disable dates before start date in end date picker)

### 7. Edge Case
- **Rule**: Always consider edge case for coding, like the text visible in PC or Mobile, overflow text should be ellipsis

### 8. E2E Testing
- **Rule**: No need to run full test suite every time; run only related tests when fixing specific code
- **Command**: `npx playwright test tests/e2e/<specific-test>.spec.ts` for targeted testing
- **Rule**: Run full suite (`npm test`) only before committing or for final verification
- **Rule**: Use `--timeout=<ms>` flag to set shorter timeouts when debugging (e.g., `--timeout=3000`)

### 9. TanStack Table with Backend Sorting
- **Rule**: When using `manualSorting: true` (backend sorting), MUST add `placeholderData: keepPreviousData` to the query
- **Why**: Without `keepPreviousData`, sorting triggers API refetch → data becomes `undefined` → table re-renders with empty data → new data arrives → table re-renders again. This causes flickering and potential infinite re-render loops
- **Example**:
```typescript
const { data } = useListItems(
  { sort: sortParam },
  {
    query: {
      placeholderData: keepPreviousData, // REQUIRED for manual sorting
    },
  }
)
```

### 10. TanStack Query Cache & staleTime
- **Rule**: For queries that need fresh data on every parameter change (e.g., sorting, filtering), set `staleTime: 0` to disable caching
- **Why**: Default `staleTime` (configured in `main.tsx`) causes TanStack Query to return cached data for identical query keys within the stale period. For toggle-style parameters (asc/desc sorting), the same query key repeats, causing stale data to be returned instead of fresh API calls
- **When to use `staleTime: 0`**:
  - Real-time data lists (e.g., member lists, transaction lists) that need fresh data on every interaction
  - Sorting/filtering operations where users expect immediate server response
  - Any query where data freshness is more important than performance
- **Fix**:
```typescript
const { data } = useListItems(
  { sort: sortParam },
  {
    query: {
      placeholderData: keepPreviousData,
      staleTime: 0, // Always refetch to get fresh data
    },
  }
)
```

### 11. Mock API Integration
- **Rule**: When implementing or modifying backend integration features, ALWAYS check `src/mocks/handlers.ts` first to ensure the mock handler supports the required parameters (e.g., `sort`, `filter`, `pagination`)
- **Rule**: If field names or parameters don't match between frontend and mock, use the auto-generated types in `src/api/generated/models/` as the source of truth (generated from OpenAPI schema)
- **Rule**: Mock handler requests AND responses MUST use generated schema types for type safety
- **Why**: Mock handlers may be incomplete or outdated; missing parameter handling causes features to appear broken during development. Using schema types ensures mock requests/responses match the actual API contract
- **Checklist**:
  1. Check if the mock handler exists for the endpoint
  2. Verify all query parameters are parsed and handled
  3. Ensure request body matches the schema (e.g., `AdjustPointsRequest`, `CreateRewardRequest`)
  4. Ensure response structure matches the schema in `src/api/generated/models/`
  5. Import and use generated types for both request and response
- **Example**:
```typescript
// Import generated schema types for request AND response
import type {
  ListMembersResponse,
  MemberListItem,
  AdjustPointsRequest,
  AdjustPointsResponse,
} from '@/api/generated/models'

// Use request type in POST/PATCH handlers
http.post(MSW_PATTERNS.MEMBERS.ADJUST_POINTS, async ({ request }) => {
  const body = (await request.json()) as AdjustPointsRequest
  // body.points, body.reason are now type-safe
})

// Use response type in handler return
const data: MemberListItem[] = paginatedData.map((m) => ({
  id: m.id,
  firstName: m.firstName,
  // ... only fields defined in schema
}))

const response: ListMembersResponse = {
  data,
  meta: { total, limit, hasNext, hasPrev, nextCursor, prevCursor },
}
return HttpResponse.json(response)
```

### 12. Batch Tasks & Build
- **Rule**: When performing batch modifications (e.g., adding types to multiple handlers), complete ALL changes first before running `npm run build`
- **Why**: Running build after each small change wastes time and may show intermediate errors that will be resolved by subsequent changes
- **Workflow**:
  1. Plan all changes needed
  2. Make all changes in sequence
  3. Run `npm run build` only after all changes are complete
  4. Fix any remaining errors

### 13. Backend Logic in Mock Layer
- **Rule**: When implementing integration features, if no explicit frontend implementation is required, implement the business logic in the mock layer (`src/mocks/handlers.ts`) to simulate backend behavior
- **Why**: This allows frontend development to proceed without waiting for actual backend implementation, and ensures the mock API behaves like a real backend
- **Examples of backend logic to implement in mock**:
  - Calculating derived fields (e.g., `totalPoints` from transactions)
  - Creating related records (e.g., creating a transaction when adjusting points)
  - Applying business rules (e.g., tier upgrades based on points)
  - Sorting and filtering data
  - Validating request data and returning appropriate errors
- **Principle**: The mock layer should behave as closely as possible to the expected real backend, so that switching to the real API requires minimal frontend changes

## Development Workflow

1. Create feature modules under `src/features/`
2. Define routes under `src/routes/`
3. Use auto-generated API hooks from `src/api/`
4. Write E2E tests under `tests/e2e/`
5. Run `npm test` before committing
