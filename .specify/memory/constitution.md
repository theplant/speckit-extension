<!--
SYNC IMPACT REPORT - 2025-12-18
================================
Version change: 2.6.0 → 2.7.0 (MINOR)

Modified Principles:
- ALL principles: Replaced Roman numeral numbering with short descriptive names
  - This allows inserting new principles without disturbing existing references
  - Format: `### SHORT-NAME: Full Title`
  - Examples: E2E-TESTING, ROOT-CAUSE-TRACING, OPENAPI-FIRST

Principle Name Mapping (old → new):
- I → E2E-TESTING
- II → SPEC-EVOLUTION
- III → ROOT-CAUSE-TRACING
- IV (first) → TASK-VERIFICATION
- IV (second, was duplicate) → MSW-MOCK-BACKEND
- VI → COMPONENT-UI
- VII → STATE-MANAGEMENT
- VIII → SIMPLICITY
- IX → ACCEPTANCE-COVERAGE
- X → OPENAPI-FIRST

Templates Updated:
- ✅ theplant workflows - Updated to use new principle names

Previous Changes (v2.6.0):
- Principle E2E-TESTING: Enhanced test data requirements
  - Added requirement to use TypeScript types from openapi.yaml for test data
  - Added Zustand persist store seeding pattern with page.reload()
  - Added correct localStorage key documentation (pim-mock-db)
- Principle ROOT-CAUSE-TRACING: Added No-Give-Up Rule
  - AI agents MUST NOT abandon problems by reverting to simpler approaches
  - AI agents MUST continue investigating until root cause is found
  - Added violation and correct behavior examples
================================
-->

# Clickable Prototype Constitution

## Core Principles

### E2E-TESTING: E2E Testing Discipline (NON-NEGOTIABLE)

All testing MUST be done exclusively with Playwright end-to-end tests.

**Testing Approach**

- Every feature MUST have corresponding E2E tests before it is considered complete
- Tests MUST simulate real user behavior through the browser
- Tests MUST cover the full user journey, not isolated components
- No unit tests, no integration tests in isolation

**Coverage Requirements**

- All routes (public, error) MUST have E2E test coverage
- All user interactions (buttons, forms, modals, navigation, CRUD) MUST be tested
- All loading states and error states MUST be verified
- Route parameters and query strings MUST be tested for edge cases

**Local Storage Data**

- All data persistence MUST use browser localStorage
- Tests MUST be able to seed localStorage with test data
- Tests MUST clear localStorage before each test run for isolation

**Test Independence**

- Tests MUST NOT depend on execution order of other tests
- Tests MUST clean up any data they create (or use isolated test data)
- Tests MUST be able to run in parallel without conflicts

**AI-Driven Execution**

- Tests MUST run non-interactively without waiting for human review
- The test-fix cycle MUST be autonomous: run tests → read errors → fix code → re-run
- Playwright MUST use only the `'list'` reporter for clean, parseable AI output

**Console Error Capture (NON-NEGOTIABLE)**

- All browser console errors MUST cause the test to **fail immediately** when they occur
- Tests MUST listen to `page.on('console')` (filtering for `msg.type() === 'error'`) and `page.on('pageerror')` events in a `beforeEach` hook
- Console errors MUST be logged to **stderr** (not console.log) using `process.stderr.write()`
- Tests MUST NOT collect errors for later assertion - they MUST throw immediately to fail fast
- When tests fail due to console errors, AI agents MUST apply Root Cause Tracing to fix the underlying issue

**Console Error Capture Implementation (NON-NEGOTIABLE)**

- Example implementation in `tests/e2e/utils/test-helpers.ts`:

  ```typescript
  import { test as base, Page } from '@playwright/test'

  export function setupConsoleErrorCapture(
    page: Page,
    failTest: (error: Error) => void
  ): void {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        process.stderr.write(`[Console Error] ${text}\n`)
        failTest(new Error(`Console error: ${text}`))
      }
    })

    page.on('pageerror', (error) => {
      process.stderr.write(`[Page Error] ${error.message}\n`)
      failTest(new Error(`Page error: ${error.message}`))
    })
  }

  export const test = base.extend<{}>({})

  test.beforeEach(async ({ page }, testInfo) => {
    setupConsoleErrorCapture(page, (error) => {
      testInfo.annotations.push({
        type: 'console-error',
        description: error.message,
      })
      throw error
    })
  })

  export { expect } from '@playwright/test'
  ```

- This approach ensures tests fail immediately on console errors without manual assertions

**LocalStorage Transparency (NON-NEGOTIABLE)**

- Create a simple wrapper (`src/lib/storage.ts`) for localStorage read/write operations
- Wrapper MUST log key and value on every read/write when running in test mode
- This enables AI agents to see data flow when debugging test failures

**Configuration**

- Playwright MUST only include the `chromium` project (no Firefox/WebKit)
- Playwright MUST NOT start its own dev server - tests MUST connect to an existing, separately running dev server
- The dev server MUST be started manually before running tests (e.g., `pnpm dev` in a separate terminal)
- Playwright config MUST use `webServer: undefined` or omit the webServer config entirely
- Tests MUST use `baseURL` pointing to the existing dev server (e.g., `http://localhost:5173`)
- Test files MUST be in `tests/e2e/` with naming `{route-or-feature}.spec.ts`
- Page objects MUST be used for reusable page interactions
- Test utilities MUST be in `tests/e2e/utils/`

**Operation Timeout with HTML Dump (NON-NEGOTIABLE)**

- Playwright action timeout MUST be set to 1 second (`actionTimeout: 1000` in config)
- This ensures tests fail fast when elements are not found or page is broken
- On timeout failure, the page HTML MUST be dumped immediately for AI inspection
- Implement a global error handler that outputs `page.content()` on timeout errors
- Example playwright.config.ts:
  ```typescript
  export default defineConfig({
    timeout: 10000,
    expect: { timeout: 1000 },
    use: {
      actionTimeout: 1000,
    },
  })
  ```
- Example test fixture for HTML dump on failure:
  ```typescript
  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      const html = await page.content()
      console.log('=== PAGE HTML ON FAILURE ===')
      console.log(html)
      console.log('=== END PAGE HTML ===')
    }
  })
  ```
- This approach replaces manual `assertNoPageErrors()` calls - the fast timeout + HTML dump provides equivalent debugging information automatically

**Quality Gates**

- All E2E tests MUST pass before merge
- New routes/interactions MUST have corresponding E2E tests
- No flaky tests allowed - tests MUST be deterministic

**TypeScript and Test Integrity (NON-NEGOTIABLE)**

- NEVER ignore TypeScript type checking errors - all code MUST pass `tsc` without errors
- tsconfig MUST NOT use `exclude` to skip files with type errors - fix the errors instead
- Tests written based on business code MUST NOT be simplified just to make them pass
- If a test fails, trace the root cause and fix the underlying issue, not the test
- Generated code with type errors MUST be fixed at the source (OpenAPI spec) and regenerated
- Workarounds that hide type errors (like `as unknown as Type`) are forbidden

**Test Description Alignment (NON-NEGOTIABLE)**

- Test expectations MUST directly verify what the test description claims to test
- If a test is named "should display activities", it MUST assert that activities are visible, not just a header
- Test descriptions are contracts - the assertions MUST fulfill that contract
- Avoid proxy assertions: testing a header exists does NOT prove the feature works
- Each test MUST have at least one assertion that directly validates the described behavior
- Example violation: `test('should display activities')` with only `expect(header).toBeVisible()` - this tests the header, not activities
- Example correct: `test('should display activities')` with `expect(activityItems.count()).toBeGreaterThan(0)`

**AI Test Writing Guidelines (NON-NEGOTIABLE)**

The following guidelines enable AI agents to write effective E2E tests autonomously without human intervention.

**Selector Strategy Hierarchy (NON-NEGOTIABLE)**
AI agents MUST use selectors in this priority order:
1. `data-testid` - Most stable, explicitly added for testing, survives refactoring
2. `role` - Semantic, accessible, follows ARIA patterns (e.g., `getByRole('button')`)
3. `text` - Human-readable but fragile, changes with copy updates (e.g., `getByText('Submit')`)
4. `CSS` - Last resort, most fragile, breaks with styling changes (e.g., `locator('.btn')`)

Example:
```typescript
// ✅ Priority 1: data-testid (best)
page.getByTestId('submit-button')

// ✅ Priority 2: role (good)
page.getByRole('button', { name: /submit/i })

// ⚠️ Priority 3: text (acceptable)
page.getByText('Submit')

// ❌ Priority 4: CSS (avoid)
page.locator('.submit-btn')
```

**Test Assertion Anti-Patterns (NON-NEGOTIABLE)**
AI agents MUST NOT use these patterns:

| Anti-Pattern | Why Bad | Correct Pattern |
|--------------|---------|-----------------|
| `expect(body).toBeVisible()` | Tests nothing meaningful | Test specific feature elements |
| `expect(header).toBeVisible()` alone | Proxy assertion, doesn't test feature | Test actual feature content |
| Guessing selectors without reading code | Causes strict mode violations | Read code or HTML dump first |
| Using `.first()` without understanding why | Masks selector specificity issues | Make selector more specific |

Example violation:
```typescript
// ❌ BAD: Tests nothing about the feature
test('should display products', async ({ page }) => {
  await page.goto('/products');
  await expect(page.locator('body')).toBeVisible();
});

// ✅ GOOD: Tests actual feature behavior
test('should display products', async ({ page }) => {
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: /products/i })).toBeVisible();
  await expect(page.getByTestId('product-list')).toBeVisible();
  await expect(page.locator('[data-testid="product-item"]').first()).toBeVisible();
});
```

**Error Diagnosis Flowchart (NON-NEGOTIABLE)**
When tests fail, AI agents MUST follow this diagnosis process using the HTML dump output:

1. **"strict mode violation" error** (multiple elements match)
   - Read the error message for element count and suggestions
   - Action: Make selector more specific using `data-testid`, or use `.first()` only if multiple matches are expected

2. **"element not found" error**
   - Check HTML dump for:
     - Element exists with different attributes → Update selector to match actual attributes
     - Element truly missing → Check if feature is implemented
     - Page shows error boundary/crash → Fix application bug first

3. **"timeout" error**
   - Check HTML dump for:
     - Page loaded but element missing → Wrong selector or missing feature
     - Page shows loading state → Add explicit wait for content
     - Page shows error boundary → Fix application crash first

4. **Console error captured**
   - Fix application error first, then re-run test
   - Do NOT modify test to ignore the error

**System Exploration Protocol (NON-NEGOTIABLE)**
Before writing tests for an unfamiliar system, AI agents MUST follow this protocol:

**Step 1: Read Route Definitions**
- Explore `src/routes/` directory structure
- List all route files to understand available pages
- Note route parameters and authentication requirements
- Example: `find_by_name` or `list_dir` on `src/routes/`

**Step 2: Trace Code to Storage Layer (NON-NEGOTIABLE)**
For every route, AI agents MUST trace the code path from route → component → hooks → storage:

1. **Read the route file** to find which component it renders
2. **Read the component** to find which hooks/data fetching it uses
3. **Read the hooks** to find which API endpoints or storage keys it accesses
4. **Read the MSW handlers or storage layer** to understand the data schema

Example trace for `/products`:
```
src/routes/_authenticated/products/index.tsx
  → renders Products component
    → src/features/products/index.tsx
      → uses useProducts() hook
        → src/features/products/hooks/use-products.ts
          → calls api.GET('/api/products')
            → src/mocks/handlers.ts
              → reads from localStorage key 'prototype_products'
```

**Step 3: Identify Required Test Data**
From the storage layer trace, identify:
- What data entities the route displays (products, users, categories, etc.)
- What fields are required for each entity
- What relationships exist between entities
- What states/variations need testing (empty, single item, multiple items, error states)

**Step 4: Provide Test Data in beforeEach (NON-NEGOTIABLE)**
Every test MUST seed its own data in `beforeEach`. Tests MUST NOT rely on pre-existing data.

**Test Data MUST Use Generated TypeScript Types (NON-NEGOTIABLE)**
Test data MUST be typed using TypeScript types generated from `openapi.yaml`. This ensures:
- Compile-time validation of test data schema
- Automatic detection of API schema changes
- Consistent data structure between tests and application

```typescript
// ✅ GOOD: Import types from generated API schemas
import type { Product } from '@/lib/api/generated/schemas';

// Helper function with proper typing
const createTestProduct = (
  id: string, 
  sku: string, 
  name: string, 
  price: number, 
  status: Product['status'] = 'active'
): Product => ({
  id,
  sku,
  name: { en: name },
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  description: { en: `Description for ${name}` },
  shortDescription: { en: `Short desc for ${name}` },
  status,
  categoryIds: [],
  tags: [],
  attributes: [],
  variants: [],
  pricing: { price, currency: 'USD' },
  mediaIds: [],
  media: [],
  seo: { slug: name.toLowerCase().replace(/\s+/g, '-') },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ❌ BAD: Untyped object literals that may miss required fields
const badProduct = { id: '1', name: 'Test', price: 99 }; // Missing required fields!
```

**Seeding Pattern for Zustand Persist Stores**
When the app uses Zustand with persist middleware:
1. Navigate to app first to access localStorage
2. Seed data with correct localStorage key (check store.ts for `name` in persist config)
3. Call `page.reload()` to force Zustand to re-hydrate from localStorage
4. Navigate to target route

```typescript
test.describe('Products', () => {
  const testProducts: Product[] = [
    createTestProduct('1', 'SKU-001', 'Test Product 1', 99.99, 'active'),
    createTestProduct('2', 'SKU-002', 'Test Product 2', 149.99, 'draft'),
  ];

  test('should display products with seeded data', async ({ page }) => {
    // 1. Navigate to app first to access localStorage
    await page.goto('/');
    
    // 2. Seed test data with correct localStorage key
    await page.evaluate((products) => {
      const existingData = localStorage.getItem('pim-mock-db'); // Check store.ts for key
      const data = existingData ? JSON.parse(existingData) : { state: {} };
      data.state = data.state || {};
      data.state.products = products;
      data.state.isSeeded = true;
      localStorage.setItem('pim-mock-db', JSON.stringify(data));
    }, testProducts);
    
    // 3. CRITICAL: Full page reload to force Zustand to re-hydrate
    await page.reload();
    
    // 4. Navigate to target route
    await page.goto('/products');
    
    // Assert on the ACTUAL seeded data
    await expect(page.getByText('Test Product 1')).toBeVisible();
    await expect(page.getByText('SKU-001')).toBeVisible();
  });
});
```

**Step 5: Test All Data Cases (NON-NEGOTIABLE)**
For each route, AI agents MUST write tests for these data scenarios:

| Scenario | Test Data | Expected Behavior |
|----------|-----------|-------------------|
| Empty state | `[]` or `null` | Shows empty state message/illustration |
| Single item | `[{...}]` | Shows single item correctly |
| Multiple items | `[{...}, {...}, {...}]` | Shows all items, pagination if applicable |
| Error state | Invalid data or API error | Shows error message |
| Loading state | Delay in data | Shows loading indicator |

Example:
```typescript
test.describe('Products - Data Scenarios', () => {
  test('should show empty state when no products exist', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('prototype_products', JSON.stringify([]));
    });
    await page.goto('/products');
    await expect(page.getByText(/no products/i)).toBeVisible();
  });

  test('should display single product', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('prototype_products', JSON.stringify([
        { id: '1', name: 'Only Product', sku: 'ONLY-001' }
      ]));
    });
    await page.goto('/products');
    await expect(page.getByText('Only Product')).toBeVisible();
  });

  test('should display multiple products', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('prototype_products', JSON.stringify([
        { id: '1', name: 'Product A', sku: 'A-001' },
        { id: '2', name: 'Product B', sku: 'B-001' },
        { id: '3', name: 'Product C', sku: 'C-001' },
      ]));
    });
    await page.goto('/products');
    await expect(page.getByText('Product A')).toBeVisible();
    await expect(page.getByText('Product B')).toBeVisible();
    await expect(page.getByText('Product C')).toBeVisible();
  });
});
```

**Step 6: Assert on Seeded Data (NON-NEGOTIABLE)**
Assertions MUST reference the actual test data that was seeded:
- ❌ BAD: `expect(page.getByRole('table')).toBeVisible()` - doesn't verify data
- ✅ GOOD: `expect(page.getByText('Test Product 1')).toBeVisible()` - verifies seeded data appears

**CRITICAL**: AI agents MUST NOT:
- Guess what data exists in the system
- Write tests that pass regardless of data
- Use generic assertions that don't verify actual content
- Skip the storage layer trace step

**Authenticated Route Testing (NON-NEGOTIABLE)**
For routes requiring authentication, AI agents MUST:

1. Identify auth mechanism by reading route guards or middleware
2. Create auth fixture in `tests/e2e/utils/test-helpers.ts`
3. Use fixture in `beforeEach` for authenticated tests

Example fixture:
```typescript
export async function loginAsTestUser(page: Page) {
  // For mock auth (localStorage-based)
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('user', JSON.stringify({ 
      id: 1, 
      email: 'test@example.com' 
    }));
  });
}

// Usage in test
test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});
```

**Async Content Wait Patterns (NON-NEGOTIABLE)**
For dynamic content, use explicit waits instead of arbitrary timeouts:
```typescript
// ✅ Wait for specific element (preferred)
await expect(page.getByTestId('data-loaded')).toBeVisible();

// ✅ Wait for network idle (use sparingly)
await page.waitForLoadState('networkidle');

// ✅ Wait for specific response
await page.waitForResponse(resp => resp.url().includes('/api/data'));

// ❌ Avoid: arbitrary timeouts (flaky)
// await page.waitForTimeout(1000);
```

### SPEC-EVOLUTION: Spec Evolution and Test Maintenance

When new specifications are written that conflict with previous specs, the following rules apply:

**Spec Conflict Resolution**

- New specs take precedence over old specs for the same feature area
- Old tests MUST be updated to match new specs, NOT the other way around
- Tests MUST NOT be skipped to avoid fixing them - use Root Cause Tracing instead
- Duplicate tests covering the same behavior MUST be removed
- Tests from old specs that no longer apply MUST be deleted or rewritten

**Test Fix Discipline**

- NEVER use `test.skip()` to avoid fixing a complicated test
- ALWAYS trace the root cause of test failures before implementing fixes
- When UI changes break tests, update test selectors and assertions to match new UI
- When behavior changes, rewrite test assertions to validate new expected behavior
- Remove tests that test removed functionality

**Rationale**: Skipping tests creates hidden technical debt and masks real issues. Every skipped test is a gap in coverage that can allow bugs to ship. Root cause tracing ensures we understand why tests fail and fix them properly rather than hiding problems.

### ROOT-CAUSE-TRACING: Root Cause Tracing (Debugging Discipline)

When problems occur during development, root cause analysis MUST be performed before implementing fixes:

- Problems MUST be traced backward through the call chain to find the original trigger
- Symptoms MUST be distinguished from root causes
- Fixes MUST address the source of the problem, NOT work around symptoms
- Test cases MUST NOT be removed or weakened to make tests pass
- Debuggers and logging MUST be used to understand control flow
- Multiple potential causes MUST be systematically eliminated
- Documentation MUST be updated to prevent similar issues
- Root cause MUST be verified through testing before closing the issue

**Rationale**: Superficial fixes create technical debt and hide underlying architectural problems. Root cause analysis ensures problems are solved at their source, preventing recurrence and maintaining system integrity. This discipline transforms debugging from firefighting into systematic problem-solving that improves overall code quality.

**Debugging Process**:

1. **Reproduce**: Create reliable reproduction case
2. **Observe**: Gather evidence through logs, debugger, tests
3. **Hypothesize**: Form theories about root cause
4. **Test**: Design experiments to validate/invalidate hypotheses
5. **Fix**: Implement fix addressing root cause
6. **Verify**: Ensure fix works and doesn't break existing functionality
7. **Document**: Update docs/tests to prevent regression

**No-Give-Up Rule (NON-NEGOTIABLE)**
AI agents MUST NEVER abandon a problem by:
- Reverting to "simpler" approaches that avoid the actual issue
- Saying "this won't work easily with this architecture"
- Removing tests or features because they're "too complex"
- Giving up after initial failures without exhausting root cause analysis

Instead, AI agents MUST:
1. Continue investigating until the root cause is found
2. Try multiple hypotheses systematically
3. Read source code to understand the actual implementation
4. Document findings even if the fix requires architectural changes
5. Only escalate to the user when genuinely blocked after thorough investigation

**Example of Violation**:
```
❌ "The data seeding approach won't work easily with this architecture. 
    Let me revert to simpler tests that work with the existing seeded data."
```

**Example of Correct Behavior**:
```
✅ "The seeding isn't working. Let me trace the root cause:
    1. Reproduce: Data not appearing after seeding localStorage
    2. Observe: Check the actual localStorage key in store.ts
    3. Hypothesize: Maybe wrong key? Maybe Zustand not re-hydrating?
    4. Test: Found key is 'pim-mock-db' not 'mock-db-storage'
    5. Fix: Use correct key and add page.reload() for re-hydration
    6. Verify: Tests now pass"
```

**AI Implementation Requirement**:

- AI agents MUST perform root cause analysis before implementing fixes
- AI agents MUST NOT implement superficial workarounds
- AI agents MUST document the root cause analysis process
- AI agents MUST update tests to prevent regression of root causes

### TASK-VERIFICATION: Task Completion Verification (NON-NEGOTIABLE)

Before declaring any task as complete, the following verification steps MUST pass:

**TypeScript Compilation**

- `pnpm tsc --noEmit` MUST complete with zero errors
- Type errors MUST be fixed, not suppressed or ignored
- No `@ts-ignore` or `@ts-expect-error` comments to bypass errors
- Generated types MUST be regenerated if OpenAPI spec changes

**Test Suite**

- `pnpm test` MUST complete with all tests passing
- No skipped tests (`test.skip()`) to avoid failures
- No flaky tests - if a test fails intermittently, fix the root cause
- New features MUST have corresponding E2E tests

**Verification Command Sequence**

```bash
pnpm tsc --noEmit && pnpm test
```

**AI Agent Requirements**

- AI agents MUST run both verification commands before declaring task completion
- AI agents MUST NOT claim "task complete" if either command fails
- If verification fails, AI agents MUST fix the issues and re-verify
- Verification results MUST be included in task completion summary

**Rationale**: TypeScript compilation and test execution are the minimum quality gates that ensure code correctness. Declaring a task complete without passing these checks creates false confidence and technical debt. This principle ensures every completed task maintains the codebase's integrity.


### MSW-MOCK-BACKEND: Local Storage Data Layer (MSW Mock Backend)

All data persistence MUST use browser localStorage, served via Mock Service Worker (MSW) that responds to OpenAPI-formatted HTTP requests. This architecture enables seamless future migration to a real backend API.

**Data Storage Rules**

- All data MUST be stored in localStorage with JSON serialization
- Each data entity type MUST have its own localStorage key (e.g., `prototype_users`, `prototype_projects`)
- Data operations MUST be synchronous and immediate within handlers
- CRUD operations MUST update localStorage directly

**MSW Architecture (NON-NEGOTIABLE)**

- MUST use Mock Service Worker (MSW) library for API mocking
- Install: `pnpm add -D msw`
- Initialize: `pnpm dlx msw init public/ --save`
- MSW handlers MUST be defined in `src/mocks/handlers.ts`
- MSW browser worker setup MUST be in `src/mocks/browser.ts`
- MSW MUST be started in development mode only (not in production builds)
- Handlers MUST use standard Fetch API Request/Response objects
- This enables the frontend to use real `fetch()` calls that work identically with a real backend

**MSW Handler Pattern**

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'
import { storage, STORAGE_KEYS } from '@/lib/storage'

export const handlers = [
  http.get('/api/todos', () => {
    const todos = storage.get(STORAGE_KEYS.TODOS) || []
    return HttpResponse.json(todos)
  }),
  http.post('/api/todos', async ({ request }) => {
    const body = await request.json()
    // ... handle creation
    return HttpResponse.json(newTodo, { status: 201 })
  }),
]
```

**MSW Browser Setup**

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)
```

**MSW Initialization in App**

```typescript
// src/main.tsx
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    return worker.start({ onUnhandledRequest: 'bypass' })
  }
}

enableMocking().then(() => {
  // Render app after MSW is ready
})
```

**Type Safety Requirements**

- Define TypeScript interfaces for all data entities in `src/types/`
- NEVER use `any` type for data operations
- All localStorage read/write operations MUST be type-safe
- Use Zod or similar for runtime validation when reading from localStorage

**Data Utilities**

- Create reusable hooks for localStorage operations (e.g., `useLocalStorage`)
- Implement helper functions for CRUD operations in `src/lib/storage.ts`
- Seed data MUST be available for demo/testing purposes

### COMPONENT-UI: Component-Driven UI

Build UI as a composition of reusable, isolated components.

- MUST use shadcn/ui as the component library foundation
- Components MUST be stateless where possible; lift state up
- Styling MUST use utility-first CSS (e.g., Tailwind CSS)
- Each component MUST have a single responsibility
- Prefer composition over prop drilling; use context sparingly

### STATE-MANAGEMENT: State Management

Use React state and context for data management with localStorage persistence.

- Use React Context for shared state across components
- Use custom hooks for localStorage read/write operations
- State updates MUST immediately persist to localStorage
- On app load, state MUST be hydrated from localStorage
- Minimal global state; prefer component-local state where possible
- Use React state for UI-only concerns (modals, forms, etc.)

### SIMPLICITY: Simplicity

Start simple. Add complexity only when proven necessary.

- YAGNI: Do not build features "just in case"
- Prefer fewer dependencies over many
- Avoid premature abstraction; wait for patterns to emerge
- Configuration over code where possible
- Delete code that is not used

### ACCEPTANCE-COVERAGE: Acceptance Scenario Coverage (Spec-to-Test Mapping)

Every user scenario in specifications MUST have corresponding automated tests.

**Test Case Requirements**

- Each acceptance scenario (US#-AS#) in spec.md MUST have a test case
- Test case names MUST reference source scenarios (e.g., "US1-AS1: New customer enrolls")
- Test functions MUST use table-driven design with test case structs where applicable
- Each test case struct MUST include `name` field with scenario ID
- Tests MUST validate complete "Then" clause, not partial behavior

**Coverage Enforcement**

- No untested scenarios MUST exist (or be explicitly deferred with justification)
- Test coverage analysis MUST verify all scenarios are tested
- AI agents MUST flag any scenarios that cannot be tested with justification
- AI agents MUST update tests when specifications change to add/modify scenarios

**Rationale**: Specifications define expected behavior, but only automated tests guarantee that behavior is maintained. Acceptance scenario coverage bridges the gap between business requirements and implementation, ensuring the system actually does what the specifications claim. Without this mapping, specifications become documentation that drifts from reality, leading to false assumptions and undetected regressions.

**Code Review Checklist**:

- [ ] Every acceptance scenario in spec.md has a corresponding test case
- [ ] Test case names reference source scenarios (e.g., "US1-AS1: New customer enrolls")
- [ ] Test function uses table-driven design with test case structs (where applicable)
- [ ] Test case struct includes `name` field with scenario ID (US#-AS#)
- [ ] No untested scenarios exist (or are explicitly deferred with justification)
- [ ] Test validates complete "Then" clause, not partial behavior
- [ ] Traceability matrix is up to date (optional but recommended)

### OPENAPI-FIRST: OpenAPI-First API Architecture (Backend-Ready Design)

All data access MUST go through an API layer defined by OpenAPI specification. This ensures the prototype can be easily migrated to a real backend.

**OpenAPI Specification Requirements**

- An OpenAPI 3.0+ spec MUST be defined in `src/api/openapi.yaml` (or `.json`)
- All API endpoints MUST be documented in the OpenAPI spec before implementation
- Request/response schemas MUST be defined in the OpenAPI spec
- The spec MUST be complete enough to hand to backend developers for implementation

**Code Generation with Orval (NON-NEGOTIABLE)**

- TypeScript types and React Query hooks MUST be generated from OpenAPI spec using `orval`
- Install: `pnpm add -D orval`
- Create config file `orval.config.ts` at project root:

  ```typescript
  import { defineConfig } from 'orval'

  export default defineConfig({
    api: {
      output: {
        mode: 'tags-split',
        target: 'src/api/generated/endpoints',
        schemas: 'src/api/generated/models',
        client: 'react-query',
        mock: false,
        baseUrl: '/api',
      },
      input: {
        target: './src/api/openapi.yaml',
      },
    },
  })
  ```

- Add npm script: `"api:generate": "orval"`
- Generated files MUST be in `src/api/generated/` directory
- **AI agents MUST NOT directly edit files in `src/api/generated/`** - regenerate from OpenAPI spec instead
- Run `pnpm api:generate` after any OpenAPI spec changes

**Orval Output Structure**

- `src/api/generated/models/` - TypeScript interfaces for all schemas
- `src/api/generated/endpoints/` - React Query hooks and fetch functions
- MSW handlers are manually written in `src/mocks/handlers.ts` (NOT generated)

**Typed API Client (Orval-generated)**

- Orval generates type-safe React Query hooks and fetch functions automatically
- Import generated hooks directly from `src/api/generated/endpoints/`:
  ```typescript
  import {
    useListUsers,
    useGetUser,
    useCreateUser,
  } from '@/api/generated/endpoints/users'
  ```
- All API calls MUST use the generated hooks or functions
- For custom fetch wrapper, use Orval's mutator option:
  ```typescript
  // orval.config.ts
  output: {
    override: {
      mutator: {
        path: './src/api/custom-fetch.ts',
        name: 'customFetch',
      },
    },
  }
  ```

**HTTP Fetch Pattern (NON-NEGOTIABLE)**

- Frontend code MUST use Orval-generated hooks/functions for all data operations
- Generated code uses proper HTTP methods (GET, POST, PUT, DELETE) automatically
- Generated code uses proper URL paths matching OpenAPI spec automatically
- NO direct localStorage access from React components - all data MUST flow through generated API client

**MSW Integration with Orval (NON-NEGOTIABLE)**

- Orval config MUST set `mock: false` - faker.js mock data is NOT used
- **All data MUST come from localStorage** - this is the only data source for clickable prototypes
- MSW handlers MUST be manually written in `src/mocks/handlers.ts` using `http` from msw
- Handlers MUST import types from orval-generated models for type safety
- Use localStorage for all CRUD operations:

  ```typescript
  // src/mocks/handlers.ts
  import { http, HttpResponse } from 'msw'
  import { storage, STORAGE_KEYS } from '@/lib/storage'
  // Import types from orval-generated models for type safety
  import type {
    ListUsersResponse,
    UserItemResponse,
    User,
  } from '@/api/generated/models'

  export const handlers = [
    // GET /api/users - read from localStorage
    http.get('/api/v1/users', () => {
      const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
      return HttpResponse.json<ListUsersResponse>({
        data: users,
        meta: { page: 1, limit: 20, total: users.length, totalPages: 1 },
      })
    }),

    // GET /api/users/:userId - read from localStorage
    http.get('/api/v1/users/:userId', ({ params }) => {
      const { userId } = params
      const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
      const user = users.find((u) => u.id === userId)
      if (!user) {
        return HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        )
      }
      return HttpResponse.json<UserItemResponse>({ data: user })
    }),

    // POST /api/users - persist to localStorage
    http.post('/api/v1/users', async ({ request }) => {
      const body = await request.json()
      const users = storage.get<User[]>(STORAGE_KEYS.USERS) || []
      const newUser = {
        id: `user-${Date.now()}`,
        ...body,
        createdAt: new Date().toISOString(),
      }
      storage.set(STORAGE_KEYS.USERS, [...users, newUser])
      return HttpResponse.json<UserItemResponse>(
        { data: newUser },
        { status: 201 }
      )
    }),
  ]
  ```

- **Key principle**: Orval generates types and React Query hooks; MSW handlers use localStorage for data
- When OpenAPI spec changes, run `pnpm api:generate` to update types, then update handlers to match
- Handler paths MUST match OpenAPI spec paths exactly (e.g., `/api/v1/users`)

**Backend Migration Path**

- To migrate to real backend: disable MSW, update `baseUrl` in orval.config.ts and regenerate
- OpenAPI spec serves as contract for backend implementation
- No frontend code changes required beyond configuration
- Backend team receives complete OpenAPI spec with all endpoints documented

**Rationale**: By using Orval with MSW, the prototype behaves identically to a production app with a real backend. Code generation ensures types and hooks stay in sync with the API contract. Orval provides compile-time type safety for all API calls and generates React Query hooks automatically. This eliminates the common problem of prototypes that "work" but require complete rewrites when connecting to real APIs.

**Code Organization**:

```
src/api/
├── openapi.yaml              # OpenAPI 3.0+ specification (source of truth)
├── generated/                # Generated files - DO NOT EDIT
│   ├── models/               # Generated TypeScript interfaces
│   │   ├── index.ts
│   │   └── ...
│   └── endpoints/            # Generated React Query hooks
│       ├── users/            # useListUsers, useGetUser, etc.
│       └── ...
├── custom-fetch.ts           # Optional custom fetch wrapper
orval.config.ts               # Orval configuration (at project root)
```

## Technology Stack

**Core Framework:**

- TypeScript ~5.9 (strict mode enabled)
- React 19 with functional components and hooks
- Vite 7 for build tooling
- pnpm 10.25+ as package manager
- Node.js 24.10+

**Data Layer:**

- Browser localStorage for data persistence (via MSW)
- OpenAPI 3.0+ specification for API contract
- `orval` ^7.17 for generating TypeScript types and React Query hooks from OpenAPI spec
- MSW ^2.12 (Mock Service Worker) to intercept fetch and respond from localStorage
- TanStack Query (React Query) ^5.90 for server state management
- Zustand ^5.0 for client state management
- React Context for shared UI state

**UI Layer:**

- Tailwind CSS ^4.1 for styling
- shadcn/ui components (Radix UI primitives)
- Lucide React ^0.545 for icons
- TanStack Table ^8.21 for data tables
- Recharts ^3.2 for charts and visualizations
- React Hook Form ^7.64 + Zod ^4.1 for forms and validation
- Sonner ^2.0 for toast notifications
- cmdk for command palette

**Testing:**

- Playwright ^1.57 for E2E tests
- E2E tests: test all user journeys with localStorage
- Faker.js ^10.1 for mock data generation

**Routing:**

- TanStack Router ^1.132 (file-based routing)
- Route structure mirrors resource hierarchy
- Auto-generated route types via `@tanstack/router-plugin`

**Command Execution (NON-NEGOTIABLE)**

- All CLI commands MUST run with default values - NEVER wait for user input
- Use `--yes`, `--default`, `-y`, or equivalent flags to auto-accept defaults
- Example: `pnpm dlx shadcn@latest init --defaults`
- If a command has no auto-accept flag, pipe `yes` or use expect scripts

**Project Setup**

- Use your preferred tools and templates to scaffold new projects (e.g., `npx tiged`, Vite templates, admin templates)
- Ensure the project includes the technology stack defined above
- NEVER manually create config files that are supposed to be generated by CLI tools
- Let the CLI tools generate configs with their default/recommended configurations
- Only modify generated configs AFTER they are created by the tool if customization is needed

## Development Workflow

### Implementation Order (MANDATORY)

For each user story, tasks MUST be executed in this exact order:

1. **Define OpenAPI Spec**: Add endpoints/schemas to `src/api/openapi.yaml`
2. **Generate Code**: Run `pnpm api:generate` to regenerate types and hooks
3. **Write E2E Tests**: Create failing tests in `tests/e2e/`
4. **Verify Tests Fail**: Run `pnpm test:e2e` - all new tests MUST fail
5. **Update MSW Handlers**: Add/update handlers in `src/mocks/handlers.ts` for localStorage persistence
6. **Implement Components**: Build UI components using generated React Query hooks
7. **Verify Tests Pass**: Run full test suite - all tests MUST pass
8. **Refactor**: Clean up code while keeping tests green

**⚠️ VIOLATION**: Implementing code before tests exist is a constitution violation.

### Code Organization

```
spec/                 # API specification documents (human-readable)
└── *.md  # feature doc
src/
├── api/              # API layer
│   ├── openapi.yaml      # OpenAPI 3.0+ specification (source of truth)
│   ├── generated/        # Generated files - DO NOT EDIT
│   │   ├── models/       # Generated TypeScript interfaces
│   │   └── endpoints/    # Generated React Query hooks (organized by domain)
│   └── custom-fetch.ts   # Custom fetch wrapper
├── mocks/            # MSW setup and handlers
│   ├── browser.ts        # MSW browser worker setup
│   └── handlers.ts       # MSW handlers with localStorage persistence
├── components/       # Reusable UI components
├── features/         # Feature-specific components (organized by domain)
├── routes/           # TanStack Router file-based routes
├── services/         # Business logic and data services
├── hooks/            # Custom React hooks
├── context/          # React Context providers
├── stores/           # Zustand stores
├── lib/              # Utilities
├── types/            # TypeScript type definitions
├── data/             # Seed data for demo/testing
├── config/           # App configuration
├── assets/           # Static assets
└── styles/           # Global styles and theme
orval.config.ts       # Orval configuration (at project root)
tests/
└── e2e/              # End-to-end tests (organized by feature)
    └── utils/            # Test utilities
```

### Quality Gates

- All tests MUST pass before merge
- Type checking MUST pass (`tsc --noEmit`)
- Generated code MUST be up-to-date (`pnpm api:generate` produces no changes)
- Linting MUST pass (ESLint)
- Format MUST be consistent (Prettier)
- No `any` types without explicit justification
- AI agents MUST NOT edit files in `src/api/generated/`

## Governance

This constitution supersedes all other development practices for this clickable prototype project.

**Amendment Process:**

1. Propose change with rationale
2. Review impact on existing code
3. Update constitution with version bump
4. Communicate changes to team

**Compliance:**

- All PRs MUST verify compliance with these principles
- Complexity MUST be justified in PR description
- Violations require explicit exception with documented reasoning

**Version Policy:**

- MAJOR: Principle removal or fundamental change
- MINOR: New principle or significant guidance addition
- PATCH: Clarifications and minor refinements

**Version**: 2.7.0 | **Ratified**: 2025-12-13 | **Last Amended**: 2025-12-18
