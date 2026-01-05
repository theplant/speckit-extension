---
description: Run code quality gates (format:check, lint, test:unit, test:e2e, build) discovered from package.json, then fix failures using root-cause-tracing until all pass.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Provide a repeatable, project-aware quality gate workflow that:

- Discovers runnable scripts from the current project's `package.json` (no hardcoded script list)
- Runs the available quality checks in a sensible order
- When a check fails, applies **Root Cause Tracing** to fix the underlying issue (no superficial workarounds)
- Re-runs checks until **all pass**
- Commits the resulting changes

## Preconditions

- Use the project's package manager (discover from `packageManager` in `package.json`)
- Dependencies already installed (if not, install first)

## Discover package manager (NON-NEGOTIABLE: do not hardcode)

From repo root, derive the package manager command into `$PM`:

```bash
PM=$(node -e "const pm=require('./package.json').packageManager||''; console.log((pm.split('@')[0]||'pnpm').trim()||'pnpm')")
echo "Using package manager: $PM"
```

Notes:

- If `packageManager` is missing, default to `pnpm`.
- Use `"$PM" run <script>` to execute scripts consistently across package managers.

## Discover scripts (NON-NEGOTIABLE: do not hardcode)

From repo root, print available scripts:

```bash
node -e "const p=require('./package.json'); console.log(Object.keys(p.scripts||{}).sort().join('\n'))"
```

Also print command lines for relevant scripts:

```bash
node -e "const p=require('./package.json'); const s=p.scripts||{}; const keys=Object.keys(s).sort(); for (const k of keys){ console.log(`${k}: ${s[k]}`) }"
```

Generate the gate list (in recommended order) based on which scripts exist:

```bash
node - <<'NODE'
const p = require('./package.json');
const s = p.scripts || {};
const gates = [];
if (s['format:check']) gates.push('format:check');
if (s['lint']) gates.push('lint');
if (s['test:unit']) gates.push('test:unit');
else if (s['test']) gates.push('test');
if (s['test:e2e']) gates.push('test:e2e');
if (s['build']) gates.push('build');
console.log(gates.join('\n'));
NODE
```

## Recommended quality gate order

Run gates in this order (only if the script exists in `package.json`):

1. `format:check`
2. `lint`
3. `test:unit` (or `test` if `test:unit` is missing)
4. `test:e2e`
5. `build`

## Execution Steps

### 1) Format check

If `format:check` exists:

```bash
"$PM" run format:check
```

If it fails, do **ONE** formatting run, then re-check:

```bash
"$PM" run format
"$PM" run format:check
```

Do not loop formatting repeatedly. If `format:check` still fails after one `format`, trace the root cause (e.g., different prettier config, ignored files, plugin mismatch) and fix it.

### 2) Lint

If `lint` exists:

```bash
"$PM" run lint
```

If it fails, follow **theplant.root-cause-tracing** discipline:

- Trace backward from the lint error to the originating code pattern
- Fix at the source (types, imports, rules, incorrect usage)
- Do NOT disable rules broadly or add ignores unless it is the correct root fix
- Re-run `"$PM" run lint` until it passes

### 3) Unit tests

If `test:unit` exists:

```bash
"$PM" run test:unit
```

Else, if `test` exists:

```bash
"$PM" run test
```

When tests fail:

- Reproduce consistently
- Identify the failing assertion and the real behavior
- Fix the implementation (or fix the test only if the expected behavior changed for legitimate reasons)
- Re-run unit tests until green

### 4) E2E tests

If `test:e2e` exists:

```bash
"$PM" run test:e2e
```

When E2E fails, apply:

- `theplant.e2e-testing` discipline (console error capture, HTML dump, strict selector hierarchy)
- `theplant.root-cause-tracing` discipline (fix app error first, then test)

### 5) Build

If `build` exists:

```bash
"$PM" run build
```

If build fails:

- Prefer root fixes (types, exports, module resolution, config)
- Avoid patching around errors
- Re-run `"$PM" run build` until it passes

### 6) Extra commands from user input

If `$ARGUMENTS` includes additional commands to run:

- Treat each non-empty line as an additional command
- If the line is a **single token** and matches a script name in `package.json`, run it as `"$PM" run <script>`
- Otherwise, run it as-is as a shell command (this lets user specify `pnpm knip`, `node ...`, etc.)
- Run them **after** the core gates (or at the user-specified position if explicitly stated)
- Apply the same root cause tracing discipline on failures

Example format:

```text
knip
api:check-generated
```

## Root Cause Tracing (NON-NEGOTIABLE)

When any step fails, apply:

- `theplant.root-cause-tracing` workflow principles
- Fix root cause, not symptoms
- Never weaken or skip tests to make CI green
- Verify by re-running the failing command and then the full gate set

## Final verification

After all fixes, re-run the full gate sequence once more (format:check → lint → unit → e2e → build) to ensure a clean pass.

## Commit changes

When all checks pass:

```bash
git status
git add -A
git commit -m "chore: pass quality gates"
```

If user requested a specific commit message or convention, follow that.
