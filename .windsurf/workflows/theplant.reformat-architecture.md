---
description: Refactor all code to apply E2E testing discipline following ThePlant's testing principles - Playwright-only testing with console error capture, HTML dump on failure, and strict selector hierarchy.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Refactor all code and E2E tests to follow ThePlant's testing discipline principles.

## CRITICAL: NO SKIPPING ALLOWED

**⚠️ AI MUST NEVER skip any task or nested workflow, regardless of:**
- Whether the project appears to be "static" or "demo"
- Whether API endpoints don't exist yet
- Whether the task seems "not applicable"
- Whether similar functionality already exists

**For every task, AI MUST:**
1. **Actually create the files** specified in the task
2. **Actually run the commands** specified in the task
3. **Actually implement the code** even if it requires creating new infrastructure
4. If a task requires API endpoints that don't exist → **CREATE THEM**
5. If a task requires localStorage that isn't used → **ADD IT**
6. If a task requires MSW handlers → **CREATE THEM**

**Marking a task complete without doing the work is FORBIDDEN.**

## How to Execute This Workflow

**⚠️ MANDATORY: AI MUST run the workflow-runner command below and follow its output.**

**DO NOT read the Steps section below and execute them manually.** The runner handles:
- Step sequencing and state tracking
- Nested workflow execution
- AI task delegation with proper context

```bash
deno run -A https://raw.githubusercontent.com/theplant/workflow-runner/HEAD/run.ts theplant.reformat-architecture
```

Run this command, then follow the runner's instructions. The runner will tell you what to do next.

## Steps

### Step 1: Configure `playwright.config.ts`

**Why:** Low timeouts enable fast feedback when selectors are wrong. AI agents cannot see the browser, so fast failure is critical for rapid fix-test-fix cycles.

- Low timeouts ensure fast failure when selectors are wrong
- `E2E_TARGET_URL` (not `BASE_URL`) avoids confusion with API base URL
- No `webServer` prevents Playwright from hanging
- Custom AI reporter provides clean, structured error output

Download and use: 
https://gist.githubusercontent.com/sunfmin/6f8f8cb9c9219cb1ae625c43fcb282ab/raw/playwright.config.ts


### Step 1.5: Create Custom AI Reporter `tests/e2e/utils/ai-reporter.ts`

**Why:** AI agents cannot see the browser. A custom reporter provides clean, structured error output without overwhelming verbose dumps. This is more effective than multiple auto-fixtures that output independently.

Download and use: 
https://gist.githubusercontent.com/sunfmin/6f8f8cb9c9219cb1ae625c43fcb282ab/raw/ai-reporter.ts

### Step 2: Create `tests/e2e/utils/test-helpers.ts`

**Why:** Console errors are captured and attached to test results. The custom AI reporter (Step 1.5) handles all error formatting and output. This keeps fixtures minimal and avoids verbose dumps.

Download and use: 
https://gist.githubusercontent.com/sunfmin/6f8f8cb9c9219cb1ae625c43fcb282ab/raw/test-helpers.ts

### Step 4: Run System Exploration Workflow

<!-- runner:workflow:theplant.system-exploration -->

### Step 5: Create Page Objects in `tests/e2e/utils/page-objects/`

**Why:** Page Objects encapsulate selectors and actions, making tests more maintainable. When UI changes, only the Page Object needs updating, not every test.

- One Page Object per major page/route
- Encapsulate all selectors as readonly Locator properties
- Provide navigation methods (`goto()`, `gotoNew()`)
- Provide action methods (`search()`, `filter()`, `save()`)

With each READ path in @.system-exploration.md, create a Page Object with:

```typescript
// tests/e2e/utils/page-objects/my-entity.page.ts
import type { Page, Locator } from '@playwright/test';

export class MyEntityListPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly newButton: Locator;
  readonly entityCards: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /my entities/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.newButton = page.getByRole('button', { name: /new/i });
    this.entityCards = page.locator('[data-testid="entity-card"]');
  }
  
  async goto() {
    await this.page.goto('/my-entities');
    await this.page.waitForLoadState('networkidle');
  }
  
  async search(query: string) {
    await this.searchInput.fill(query);
  }
}
```

### Step 4: Run OpenAPI-First Workflow

**⚠️ MANDATORY: Do NOT skip this workflow. If the project has no API, CREATE one.**

<!-- runner:workflow:theplant.openapi-first -->

### Step 5: Run MSW Mock Backend Workflow

**⚠️ MANDATORY: Do NOT skip this workflow. If the project has no MSW, SET IT UP.**

<!-- runner:workflow:theplant.msw-mock-backend -->

### Step 6: Run Test Data Seeding Workflow

**⚠️ MANDATORY: Do NOT skip this workflow. If the project has no localStorage persistence, ADD IT.**

<!-- runner:workflow:theplant.test-data-seeding -->


### Step 7: Write E2E Tests for All Read and Write Paths

<!-- runner:workflow:theplant.e2e-testing -->

