---
team: F
role: Build, Tooling, Packaging & CI
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: complete
---

# F-tooling: Tooling Gaps, Config Conflicts, and CI Design

## F1: ESLint Config Reconciliation

### Config Sources

Two ESLint config sources coexist in the repository:

| Source | Location | Status |
|---|---|---|
| `.eslintrc.json` | Repo root | EXISTS — VERIFIED |
| `eslintConfig` field | `package.json` | EXISTS — VERIFIED |

**ESLint precedence rule:** `.eslintrc.json` is a file-based config and beats the `package.json` `eslintConfig` field when both are present in the same directory. OBSERVED via `eslint --print-config` output (rules from `.eslintrc.json` are the effective set).

### Rule Comparison

| Rule | `.eslintrc.json` | `package.json eslintConfig` | Effective (winner: .eslintrc.json) |
|---|---|---|---|
| `no-unused-vars` | `["error", {argsIgnorePattern:"^_"}]` | same | `.eslintrc.json` |
| `no-console` | `"off"` | same | `.eslintrc.json` |
| `prefer-const` | `"error"` | same | `.eslintrc.json` |
| `no-var` | `"error"` | same | `.eslintrc.json` |
| `eqeqeq` | `"error"` | same | `.eslintrc.json` |
| `curly` | `"error"` | same | `.eslintrc.json` |
| `semi` | `["error","always"]` | same | `.eslintrc.json` |
| `quotes` | `["error","single",{avoidEscape:true}]` | same | `.eslintrc.json` |
| `no-eval` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `no-implied-eval` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `no-new-func` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `no-script-url` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `arrow-spacing` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `no-duplicate-imports` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `prefer-arrow-callback` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `prefer-template` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `no-unreachable` | `"error"` | **ABSENT** | `.eslintrc.json` only |
| `no-useless-return` | `"error"` | **ABSENT** | `.eslintrc.json` only |

The `package.json eslintConfig` section defines only 8 rules. `.eslintrc.json` defines 18 rules and also includes a `tests/**/*.js` override enabling the `jest` env and disabling `no-unused-expressions`. VERIFIED: the `package.json` `eslintConfig` section is effectively dead — it is silently overridden by `.eslintrc.json` and never applied.

### `.eslintignore`

VERIFIED: `.eslintignore` exists with a single entry:

```
src/lib/*.min.js
```

The `package.json eslintConfig` also has `"ignorePatterns": ["src/lib/*.min.js"]`. Both point to the same glob. The `.eslintignore` takes effect (since `.eslintrc.json` wins the config race), and the dead `ignorePatterns` in `package.json` has no additional effect. `src/lib/gifuct-js.min.js` is excluded from linting by both mechanisms — VERIFIED.

### Effective Rule Set for `src/content/injector.js`

VERIFIED via `eslint --print-config`: 18 custom rules from `.eslintrc.json` plus the full `eslint:recommended` ruleset (which adds ~50 additional rules including `constructor-super`, `for-direction`, `getter-return`, `no-async-promise-executor`, `no-case-declarations`, `no-const-assign`, `no-constant-condition`, `no-debugger`, etc.).

**Gap / conflict identified:** The `package.json eslintConfig` section is a stale, dead config artefact. It defines a weaker ruleset (no security rules: `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`) and no test override. Any developer inspecting `package.json` alone would see an incomplete picture. The two configs must be kept in sync manually, which is an ongoing maintenance seam risk. INFERRED: the `package.json` section was created first and `.eslintrc.json` was added later with expanded rules, but the `package.json` entry was never removed.

---

## F2: Script Audit

| Script | Command | Actual Behavior | Issues |
|---|---|---|---|
| `test` | `node tests/run-tests.js` | Runs all test suites (unit + integration + gif) | VERIFIED |
| `test:unit` | `node tests/run-tests.js unit` | Runs unit tests only | OK |
| `test:integration` | `node tests/run-tests.js integration` | Runs integration tests only | OK |
| `test:e2e` | `node tests/e2e/run-e2e.js` | Runs Puppeteer e2e tests | Requires Chrome; not isolated |
| `test:gif` | `node tests/run-tests.js gif` | INFERRED: passes "gif" filter to run-tests.js; A2 found it runs all 133 tests regardless — the filter argument may not be implemented in run-tests.js | Filter argument likely ignored — UNVERIFIED if bug or design |
| `test:browser` | `echo 'Open tests/fixtures/test-page.html in browser'` | Prints a message; does nothing automated | Not a real test |
| `serve` | `python3 -m http.server 8000` | Starts local HTTP server on port 8000 | Dev-only; no port conflict check |
| `lint` | `eslint src/**/*.js tests/**/*.js` | Lints JS files matching glob | **Unquoted globs**: in bash, `src/**/*.js` with `globstar` disabled (the default in many shells) expands only one level deep. In strict POSIX `sh`, `**` is not recursive. Lint may silently miss deeply nested files (e.g., `src/site-handlers/scripts/*.js`) depending on invoking shell. OBSERVED: glob is unquoted in the JSON value. |
| `lint:fix` | `eslint src/**/*.js tests/**/*.js --fix` | Same as lint but auto-fixes | Same unquoted-glob issue; mutates source files |
| `format` | `prettier --write src/**/*.js tests/**/*.js` | Formats files in-place | Same unquoted-glob issue; mutates source files |
| `build` | `npm run lint:fix && npm run format && npm run test` | Runs lint:fix → format → test | **Mutates files before testing**: lint:fix and format both write changes to source before the test suite runs. A pre-mutation test baseline is never captured. CI should never run this script. |
| `zip` | `rm -rf dist && mkdir -p dist/videospeed && cp -r manifest.json src *.md dist/videospeed/ && cd dist && zip -r videospeed.zip videospeed && cd .. && echo '...'` | Packages extension into `dist/videospeed.zip` | (1) **Root *.md files are included** — see F4. (2) Uses `rm`, `cp`, `zip`, `cd` — POSIX-only, Windows-incompatible. (3) Uses shell glob `*.md` which expands at invocation time in the developer's shell. (4) No integrity check on output zip. |

---

## F3: Dependency and Vendor Provenance

| Package | Version | Type | Used Where | Notes |
|---|---|---|---|---|
| `gifuct-js` | `^2.1.2` (locked: `2.1.2`) | `dependencies` | Runtime (GIF decoding) | **Also vendored** as `src/lib/gifuct-js.min.js` — see below |
| `@eslint/js` | `^8.57.0` | `devDependencies` | ESLint config | VERIFIED in devDeps |
| `eslint` | `^8.57.1` | `devDependencies` | Linting | VERIFIED |
| `globals` | `^13.24.0` | `devDependencies` | ESLint config globals | VERIFIED |
| `jsdom` | `^23.2.0` | `devDependencies` | Unit/integration tests | VERIFIED |
| `prettier` | `^3.1.0` | `devDependencies` | Code formatting | VERIFIED |
| `puppeteer` | `^24.10.2` | `devDependencies` | E2E tests | 480K in node_modules (puppeteer shell only — browser downloaded separately on first use; actual download ~300MB) |

### Lockfile

VERIFIED: `package-lock.json` exists (108 KB). No `yarn.lock` or `pnpm-lock.yaml` found.

### Node Version

VERIFIED: No `.nvmrc` file. No `engines` field in `package.json` (empty object `{}`). Node version is unpinned. INFERRED: any Node version that supports ES modules (`"type": "module"`) and `ecmaVersion: 2022` syntax is implicitly required, but this is not enforced.

### Vendored `src/lib/gifuct-js.min.js` vs npm package

OBSERVED:
- `src/lib/gifuct-js.min.js` is 16,153 bytes (16 KB).
- First line: `// gifuct-js — MIT License — wrapped under window.__VSC_gifuct to prevent namespace collisions`
- Second line: `// Inlines js-binary-schema-parser and gifuct-js lib code (no external dependencies at runtime)`
- The file is a **custom build**: it wraps both `gifuct-js` and its transitive dependency `js-binary-schema-parser` into a single IIFE under `window.__VSC_gifuct`.

This is **not** a direct copy of the npm package. It is a custom-built adapter that bundles the dependency tree and namespaces it to avoid collisions with page-level code. The npm `gifuct-js` package in `dependencies` is the upstream source, but the vendored file is a hand-crafted bundle.

**Provenance risk:** If `gifuct-js` is updated in npm (security patch, API change), the vendored file must be manually rebuilt and updated. There is no automated sync between the npm dependency and `src/lib/gifuct-js.min.js`. The `.eslintignore` and `eslintConfig.ignorePatterns` both exclude `src/lib/*.min.js` from linting, which is correct for a minified vendor file, but the lack of a rebuild script means the provenance chain is manual and undocumented. INFERRED.

---

## F4: Package Contents and `web_accessible_resources` Analysis

### What `npm run zip` Ships

The zip command: `cp -r manifest.json src *.md dist/videospeed/`

**Contents of `dist/videospeed/` (and thus `dist/videospeed.zip`):**

| Item | Included | Intentional? |
|---|---|---|
| `manifest.json` | YES | Yes — required by Chrome |
| `src/` (entire directory) | YES | Yes — extension code and assets |
| `CLAUDE.md` | YES | **UNVERIFIED — likely unintentional** |
| `CONTEXT.md` | YES | **UNVERIFIED — likely unintentional** |
| `HANDOFF.md` | YES | **UNVERIFIED — likely unintentional** |
| `CONTRIBUTING.md` | YES | Possibly intentional (contributor info) |
| `PRIVACY.md` | YES | Possibly intentional (store listing) |
| `README.md` | YES | Possibly intentional (store listing) |
| `docs/` | NO | Correct — excluded |
| `scripts/` | NO | Correct — excluded (directory not present at root) |
| `CLAUDE/` | NO | Correct — excluded |
| `package.json` | NO | Correct — excluded |
| `node_modules/` | NO | Correct — excluded |

**Package surprise:** `CLAUDE.md`, `CONTEXT.md`, and `HANDOFF.md` are agent/AI instruction files that would be bundled into the Chrome Web Store submission. `CLAUDE.md` in particular contains AI agent instructions that have no place in a published extension. The `*.md` glob in the zip script is intentionally broad but has grown dangerous as the repo has accumulated AI tooling files at the root. VERIFIED by reading the zip script and listing root `.md` files.

### `web_accessible_resources` vs Files That Exist

VERIFIED from `manifest.json`:

```json
[{
  "resources": [
    "src/styles/inject.css",
    "src/styles/shadow.css",
    "src/module-loader.js",
    "src/core/*.js",
    "src/utils/*.js",
    "src/ui/*.js",
    "src/observers/*.js",
    "src/site-handlers/*.js",
    "src/site-handlers/scripts/*.js",
    "src/content/*.js",
    "src/lib/*.js",
    "src/gif-file-fetcher.html",
    "src/gif-file-fetcher.js"
  ],
  "matches": ["http://*/*", "https://*/*", "file:///*"]
}]
```

`src/lib/*.js` matches `src/lib/gifuct-js.min.js` — the vendored file is declared web-accessible, which is required for the extension's content scripts to load it. VERIFIED.

`src/content/*.js` matches both `src/content/injector.js` and `src/content/inject.js`. VERIFIED.

`.md` files colocated in `src/` would not be caught by any of these globs (which are all `*.js` or named CSS/HTML files). If `.md` files were placed in `src/`, they would be bundled into the zip (since the zip script copies the entire `src/` directory) but would NOT be web-accessible. This is a latent risk with no current instance. INFERRED.

---

## F5: CI Design Proposal

The following is a YAML proposal for a minimal GitHub Actions workflow. **This file does not exist in the repository and is not to be created by this program.**

```yaml
# Proposed: .github/workflows/ci.yml
# Purpose: Lint check, format check, and test — no file mutation.
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  ci:
    name: Lint, Format Check, Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint (check only — no --fix)
        run: npx eslint "src/**/*.js" "tests/**/*.js"
        # Quotes prevent shell glob expansion; ESLint handles glob internally.

      - name: Format check (no --write)
        run: npx prettier --check "src/**/*.js" "tests/**/*.js"
        # --check exits non-zero if any file would be reformatted.

      - name: Run tests
        run: npm test
        # Runs unit + integration + gif suites via tests/run-tests.js
```

**Design decisions:**

1. Uses `npm ci` (not `npm install`) for reproducible installs from lockfile.
2. Globs are quoted (`"src/**/*.js"`) so the shell does not expand them — ESLint/Prettier handle recursive glob internally. This fixes the unquoted-glob defect in the existing `lint` script.
3. Uses `eslint` (lint check) and `prettier --check` (format check) instead of `lint:fix` / `format` — no files are mutated during CI.
4. Does NOT run `npm run build` (which calls `lint:fix` then `format` then `test` — all three are run separately in read-only mode instead).
5. Node version pinned to `20` LTS in the workflow (compensates for missing `.nvmrc` / `engines` field).
6. Does NOT run `test:e2e` (requires a real Chrome binary; would need a separate job with `puppeteer` browser installation and headful/headless setup).
7. No `.github/` directory exists yet in the repo — this workflow would require creating `.github/workflows/`.

---

## Summary of Top Issues

| Priority | Issue | Severity | Type |
|---|---|---|---|
| 1 | `package.json eslintConfig` is a dead, weaker config silently overridden by `.eslintrc.json` — 10 security and quality rules are absent from it | HIGH | Config conflict |
| 2 | `npm run zip` bundles `CLAUDE.md`, `CONTEXT.md`, and `HANDOFF.md` into the Chrome extension package via the `*.md` glob | HIGH | Packaging gap |
| 3 | Unquoted globs in `lint`, `lint:fix`, `format` scripts may silently miss files in deeply nested directories depending on shell `globstar` setting | MEDIUM | Tooling gap |
| 4 | `npm run build` mutates source files (lint:fix + format) before running tests — unsafe for CI | MEDIUM | Script design |
| 5 | No Node version pin (no `.nvmrc`, no `engines` field) | LOW | Tooling gap |
| 6 | No `.github/` directory — no CI exists | LOW | Gap |
| 7 | No vendored file rebuild script — `src/lib/gifuct-js.min.js` diverges from npm `gifuct-js` silently | LOW | Provenance gap |
