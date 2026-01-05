---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Tests are OPTIONAL - only include them if explicitly requested in the feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Source**: `src/` at repository root
- **API Layer**: `src/api/` for OpenAPI spec, client, and generated types
  - `src/api/openapi.yaml` - OpenAPI 3.0+ specification (deliverable for backend)
  - `src/api/generated/` - Generated files - **AI MUST NOT EDIT** (regenerate from spec)
  - `src/api/generated/schema.d.ts` - Generated types from openapi-typescript
  - `src/api/client.ts` - Typed API client using openapi-fetch
- **MSW Mocks**: `src/mocks/` for Mock Service Worker handlers
  - `src/mocks/handlers.ts` - MSW request handlers (reads/writes localStorage)
  - `src/mocks/browser.ts` - MSW browser worker setup
- **Hooks**: `src/hooks/` for custom hooks wrapping typed API client
- **Components**: `src/components/` for reusable UI components
- **Pages**: `src/pages/` for route-level components
- **Utilities**: `src/lib/` for helpers (storage.ts, etc.)
- **Seed Data**: `src/data/` for demo/testing data
- **E2E Tests**: `tests/e2e/` for Playwright tests only
  - `tests/e2e/utils/` - Test utilities (console error capture, etc.)
  - `tests/e2e/infrastructure.spec.ts` - Infrastructure verification tests

**Code Generation**: Run `pnpm api:generate` after any OpenAPI spec changes

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

**⚠️ IMPORTANT**: NEVER manually create config files that CLI tools generate (e.g., `tailwind.config.js`, `postcss.config.js`, `components.json`). Let CLI tools generate them.
**⚠️ IMPORTANT**: Keep the below T001 exactly as it is.
- [ ] T001 Create Vite project in current folder (non-interactive): `pnpm create vite@latest ./app --template react-ts --no-interactive && mv ./app/{.,}* . 2>/dev/null; rm -rf app`
- [ ] T002 Install dependencies: `pnpm add react-router-dom lucide-react`
- [ ] T003 Update `tsconfig.json` to add path alias (required before shadcn init):
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@/*": ["./src/*"]
      }
    }
  }
  ```
- [ ] T004 Initialize shadcn/ui: `pnpm dlx shadcn@latest init --defaults`
- [ ] T005 Configure Playwright: `pnpm create playwright`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### API Layer Setup

- [ ] T006 Install API dependencies: `pnpm add openapi-fetch && pnpm add -D openapi-typescript`
- [ ] T007 Create OpenAPI spec in `src/api/openapi.yaml` defining all endpoints
- [ ] T008 Add npm script: `"api:generate": "openapi-typescript src/api/openapi.yaml -o src/api/generated/schema.d.ts"`
- [ ] T009 Generate types: `pnpm api:generate` (creates `src/api/generated/schema.d.ts` - DO NOT EDIT)
- [ ] T010 Create typed API client in `src/api/client.ts` using openapi-fetch

### MSW Mock Backend Setup

- [ ] T011 Install MSW: `pnpm add -D msw`
- [ ] T012 Initialize MSW: `pnpm dlx msw init public/ --save`
- [ ] T013 Create MSW handlers in `src/mocks/handlers.ts` (reads/writes localStorage)
- [ ] T014 Create MSW browser setup in `src/mocks/browser.ts`
- [ ] T015 Update `src/main.tsx` to start MSW in dev mode before rendering app:
  ```typescript
  async function enableMocking() {
    if (import.meta.env.DEV) {
      const { worker } = await import('./mocks/browser');
      return worker.start({ onUnhandledRequest: 'bypass' });
    }
  }
  enableMocking().then(() => { /* render app */ });
  ```

### Storage & Routing

- [ ] T016 [P] Create localStorage wrapper in `src/lib/storage.ts` with logging for test mode
- [ ] T017 [P] Setup React Router with base routes in `src/App.tsx`
- [ ] T018 [P] Create seed data utilities in `src/data/`

### Playwright Configuration

- [ ] T019 Configure Playwright in `playwright.config.ts`:
  - Use `chromium` project only
  - Set `baseURL: 'http://localhost:5173'`
  - Set `actionTimeout: 1000` (1 second - fail fast)
  - Set `timeout: 10000` (10 seconds overall)
  - Use `reporter: 'list'` for AI-parseable output
  - Omit `webServer` config (dev server started separately)
- [ ] T020 Create test utilities in `tests/e2e/utils/`:
  - Console error capture utility
  - HTML dump on failure fixture
- [ ] T021 Create `tests/e2e/infrastructure.spec.ts` with console error capture verification test

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### E2E Tests for User Story 1 (MANDATORY)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T011 [P] [US1] E2E test for [user journey] in tests/e2e/[feature].spec.ts

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create TypeScript interface in src/types/[entity].ts
- [ ] T013 [P] [US1] Create localStorage hook in src/hooks/use[Entity].ts
- [ ] T014 [US1] Implement page component in src/pages/[Page].tsx
- [ ] T015 [US1] Add UI components in src/components/[Component].tsx
- [ ] T016 [US1] Add route in src/App.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### E2E Tests for User Story 2 (MANDATORY)

- [ ] T017 [P] [US2] E2E test for [user journey] in tests/e2e/[feature].spec.ts

### Implementation for User Story 2

- [ ] T018 [P] [US2] Create TypeScript interface in src/types/[entity].ts
- [ ] T019 [US2] Create localStorage hook in src/hooks/use[Entity].ts
- [ ] T020 [US2] Implement page component in src/pages/[Page].tsx
- [ ] T021 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### E2E Tests for User Story 3 (MANDATORY)

- [ ] T022 [P] [US3] E2E test for [user journey] in tests/e2e/[feature].spec.ts

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create TypeScript interface in src/types/[entity].ts
- [ ] T024 [US3] Create localStorage hook in src/hooks/use[Entity].ts
- [ ] T025 [US3] Implement page component in src/pages/[Page].tsx

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX [P] Add more seed data for demo purposes
- [ ] TXXX Run quickstart.md validation
- [ ] TXXX Verify all E2E tests pass with `pnpm test:e2e`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- E2E tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch E2E test for User Story 1:
Task: "E2E test for [user journey] in tests/e2e/[feature].spec.ts"

# Launch all types/hooks for User Story 1 together:
Task: "Create TypeScript interface in src/types/[entity].ts"
Task: "Create localStorage hook in src/hooks/use[Entity].ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
