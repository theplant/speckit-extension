---
description: Apply test data seeding patterns for Zustand persist stores - seed localStorage with typed test data and reload page for re-hydration.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Ensure E2E tests properly seed test data into Zustand persist stores via localStorage.

## CRITICAL: NO SKIPPING ALLOWED

**⚠️ AI MUST NEVER skip any step in this workflow, regardless of:**

- Whether the project appears to be "static" or "demo"
- Whether Zustand persist isn't currently used
- Whether localStorage isn't currently used for data

**For every step, AI MUST:**

1. **Actually find or create** the localStorage key structure
2. **Actually create the seed-data files** specified
3. **Actually create the seed-helpers.ts** file
4. If the project doesn't use Zustand persist → **ADD IT or use plain localStorage**
5. If the project uses static data → **CONVERT IT to localStorage-based data**

**Marking a step complete without doing the work is FORBIDDEN.**

## Core Principles (NON-NEGOTIABLE)

### Test Data MUST Use TypeScript Types (OPENAPI-FIRST)

Test data MUST be typed using TypeScript types from `@/api/generated/models` (generated from OpenAPI spec). This ensures:

- Compile-time validation of test data schema
- Automatic detection of schema changes
- Consistent data structure between tests and application
- Types match OpenAPI specification (single source of truth)

### Expected Values MUST Be Derived from Fixtures (OPENAPI-FIRST)

- **Expected values MUST be derived from TEST FIXTURES** (seeded data, request data)
- **Copy from response ONLY for truly random fields**: UUIDs, timestamps, crypto-rand tokens
- **Copying non-random response fields defeats testing** (test always passes)

```typescript
// ✅ CORRECT: Expected from fixtures
const testProduct = createTestProduct("1", "SKU-001", "Test Product", 99.99);
await seedData([testProduct]);
await expect(page.getByText(testProduct.name.en)).toBeVisible(); // From fixture

// ❌ WRONG: Copying from response
const response = await page.textContent('[data-testid="product-name"]');
await expect(page.getByText(response)).toBeVisible(); // Always passes!
```

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:

- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.test-data-seeding
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Find the localStorage Key

**Why:** Zustand persist stores use a specific localStorage key. Using the wrong key means seeded data won't be loaded by the app.

```bash
# Search for persist middleware configuration
grep -r "persist(" src/lib/
```

Look for the `name` property in persist config:

```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'pim-mock-db',  // ← This is the localStorage key
  }
)
```

### Step 2: Create `tests/e2e/utils/seed-data/index.ts`

**Why:** Typed test data factories ensure test data matches the API contract. Compile-time validation catches schema changes automatically.

```typescript
import type { Product } from "@/api/generated/models";

// Typed test data factory
export const createTestProduct = (
  id: string,
  sku: string,
  name: string,
  price: number,
  status: "active" | "draft" = "active"
): Product => ({
  id,
  sku,
  name: { en: name },
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  description: { en: `Description for ${name}` },
  status,
  categoryIds: [],
  pricing: { price, currency: "USD" },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Storage keys (must match src/lib/storage.ts)
export const STORAGE_KEYS = {
  PRODUCTS: "prototype_products",
  USERS: "prototype_users",
} as const;
```

**Type Rules:**

- Test data MUST use TypeScript types from generated models
- Use factory functions (NOT inline objects)
- Types ensure compile-time validation

### Step 3: Create `tests/e2e/utils/seed-helpers.ts`

**Why:** The `seedAndNavigate` helper encapsulates the correct seeding sequence: navigate → seed → reload → navigate. Missing any step causes data to not appear.

```typescript
import type { Page } from "@playwright/test";
import { STORAGE_KEYS } from "./seed-data";

export async function seedAndNavigate(
  page: Page,
  targetRoute: string,
  data: { products?: Product[]; users?: User[] }
): Promise<void> {
  // 1. Navigate to app first (initialize MSW, access localStorage)
  await page.goto("/");

  // 2. Seed test data
  await page.evaluate(
    ({ data, keys }) => {
      if (data.products !== undefined) {
        localStorage.setItem(keys.PRODUCTS, JSON.stringify(data.products));
      }
      if (data.users !== undefined) {
        localStorage.setItem(keys.USERS, JSON.stringify(data.users));
      }
    },
    { data, keys: STORAGE_KEYS }
  );

  // 3. CRITICAL: Reload to force Zustand re-hydration
  await page.reload();

  // 4. Navigate to target route
  if (targetRoute !== "/") {
    await page.goto(targetRoute);
  }
}

// For Zustand persist stores (different localStorage structure)
export async function seedZustandStore(
  page: Page,
  storeName: string, // e.g., 'pim-mock-db'
  stateData: Record<string, unknown>
): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ({ storeName, stateData }) => {
      const data = { state: { ...stateData, isSeeded: true } };
      localStorage.setItem(storeName, JSON.stringify(data));
    },
    { storeName, stateData }
  );
  await page.reload();
}
```

### Step 4: Review and Update Existing Test Files

**Why:** Existing tests may not use proper seeding patterns. Loop through all test files to ensure consistency.

<!-- runner:loop:TEST_FILE -->

```bash
find tests/e2e -name "*.spec.ts" -o -name "*.test.ts" | head -20
```

**For test file `$TEST_FILE`, check and update:**

1. **Import seed helpers:**

```typescript
import { seedAndNavigate } from "./utils/seed-helpers";
import { createTestProduct, createTestUser } from "./utils/seed-data";
```

2. **Replace hardcoded data with factories:**

```typescript
// ❌ BAD: Hardcoded data
const product = { id: "1", name: "Test" };

// ✅ GOOD: Factory function
const product = createTestProduct("1", "SKU-001", "Test", 99);
```

3. **Use seedAndNavigate instead of direct localStorage:**

```typescript
// ❌ BAD: Direct localStorage manipulation
await page.evaluate(() => localStorage.setItem("products", "[]"));
await page.goto("/products");

// ✅ GOOD: Use seed helper
await seedAndNavigate(page, "/products", { products: [] });
```

4. **Ensure assertions reference seeded data:**

```typescript
// ❌ BAD: Generic assertion
await expect(page.getByRole("row")).toHaveCount(2);

// ✅ GOOD: Assert on actual seeded data
await expect(page.getByText(testProducts[0].name)).toBeVisible();
```

### Step 5: Write New Tests with Seeded Data

**Why:** Assertions must reference actual seeded data, not generic elements. Copying from response defeats testing because tests always pass.

```typescript
import { test, expect } from "./utils/test-helpers";
import { createTestProduct } from "./utils/seed-data";
import { seedAndNavigate } from "./utils/seed-helpers";

test("should display products with seeded data", async ({ page }) => {
  const testProducts = [
    createTestProduct("1", "SKU-001", "Test Product 1", 99.99),
    createTestProduct("2", "SKU-002", "Test Product 2", 149.99),
  ];

  await seedAndNavigate(page, "/products", { products: testProducts });

  // Assert on ACTUAL seeded data (not generic elements)
  await expect(page.getByText("Test Product 1")).toBeVisible();
  await expect(page.getByText("SKU-001")).toBeVisible();
});
```

**Assertion Rules:**

- Expected values MUST come from test fixtures
- NEVER copy from response (defeats testing)
- Assert specific data, not generic elements

Testing empty, single, and multiple item scenarios ensures the UI handles all data states correctly.

```typescript
test.describe("Products - Data Scenarios", () => {
  test("empty state", async ({ page }) => {
    await seedAndNavigate(page, "/products", { products: [] });
    await expect(page.getByText(/no products/i)).toBeVisible();
  });

  test("single item", async ({ page }) => {
    const products = [createTestProduct("1", "ONLY-001", "Only Product", 50)];
    await seedAndNavigate(page, "/products", { products });
    await expect(page.getByText("Only Product")).toBeVisible();
  });

  test("multiple items", async ({ page }) => {
    const products = [
      createTestProduct("1", "A-001", "Product A", 10),
      createTestProduct("2", "B-001", "Product B", 20),
      createTestProduct("3", "C-001", "Product C", 30),
    ];
    await seedAndNavigate(page, "/products", { products });
    await expect(page.getByText("Product A")).toBeVisible();
    await expect(page.getByText("Product B")).toBeVisible();
    await expect(page.getByText("Product C")).toBeVisible();
  });
});
```

These mistakes cause data to not appear in tests. Understanding them prevents hours of debugging.

**Wrong localStorage Key:**

```typescript
// ❌ BAD
localStorage.setItem("mock-db-storage", JSON.stringify(data));

// ✅ GOOD: Use key from store.ts
localStorage.setItem("pim-mock-db", JSON.stringify(data));
```

**Missing Page Reload:**

```typescript
// ❌ BAD: Zustand won't re-hydrate
await page.evaluate(() => localStorage.setItem(...));
await page.goto('/products');  // Data won't appear!

// ✅ GOOD
await page.evaluate(() => localStorage.setItem(...));
await page.reload();  // ← Critical!
await page.goto('/products');
```

**Untyped Test Data:**

```typescript
// ❌ BAD: May miss required fields
const product = { id: "1", name: "Test" };

// ✅ GOOD: Factory ensures all fields
const product = createTestProduct("1", "SKU-001", "Test", 99);
```

**Default Seed Data Interference:**

```typescript
// ❌ BAD: App re-seeds default data after clear
await page.goto('/');
await clearAllData(page);
await page.goto('/products');  // Default data reappears!

// ✅ GOOD: Overwrite AFTER page loads, then reload
await page.goto('/');
await page.evaluate(() => localStorage.setItem(...));
await page.reload();  // Clear React Query cache
await page.goto('/products');
```

If tests fail with missing data, verify the seeding sequence is correct.

```bash
# Run a single test with seeding
pnpm test:e2e --grep "seeded data"

# Check localStorage in browser DevTools
# Application → Local Storage → localhost:5173
```

If data doesn't appear:

1. Check localStorage key matches store config
2. Ensure `page.reload()` is called after seeding
3. Verify Zustand store structure (`{ state: { ... } }`)

### Default Seed Data Interference (MSW Pattern)

When using MSW with localStorage (not Zustand persist), the app may load default seed data on startup. Tests must overwrite this data:

```typescript
// ❌ BAD: Default seed data loads when navigating to '/', then test data is ignored
await page.goto("/");
await clearAllData(page); // Clears data
await page.goto("/products"); // App re-seeds default data!

// ✅ GOOD: Seed test data AFTER page loads, then reload to clear React Query cache
await page.goto("/"); // Initialize MSW and access localStorage
await page.evaluate((products) => {
  // Overwrite default seed data with test data
  localStorage.setItem("iam-console-products", JSON.stringify(products));
}, testProducts);
await page.reload(); // Clear React Query cache
await page.goto("/products"); // Now shows test data
```

### Recommended Helper Pattern for MSW + localStorage

Create a `seedAndNavigate` helper that handles the correct sequence:

```typescript
// tests/e2e/utils/seed-helpers.ts
export async function seedAndNavigate(
  page: Page,
  targetRoute: string,
  data: { users?: User[]; tasks?: Task[]; apps?: App[] }
): Promise<void> {
  // 1. Navigate to app first to initialize MSW and access localStorage
  await page.goto("/");

  // 2. Seed test data (overwrites any default seed data)
  await page.evaluate(
    ({ data, keys }) => {
      if (data.users !== undefined) {
        localStorage.setItem(keys.USERS, JSON.stringify(data.users));
      }
      if (data.tasks !== undefined) {
        localStorage.setItem(keys.TASKS, JSON.stringify(data.tasks));
      }
      if (data.apps !== undefined) {
        localStorage.setItem(keys.APPS, JSON.stringify(data.apps));
      }
    },
    { data, keys: STORAGE_KEYS }
  );

  // 3. Reload to clear React Query cache
  await page.reload();

  // 4. Navigate to target route
  if (targetRoute !== "/") {
    await page.goto(targetRoute);
  }
}

// Usage in tests:
test("should display seeded users", async ({ page }) => {
  const testUsers = [createTestUser("1", "johndoe", { status: "active" })];
  await seedAndNavigate(page, "/users", { users: testUsers });
  await expect(page.getByText("johndoe", { exact: true })).toBeVisible();
});
```
