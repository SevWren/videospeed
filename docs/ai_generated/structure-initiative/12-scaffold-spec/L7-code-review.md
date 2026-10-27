---
team: Team-L
agent: L7 Code Reviewer
axes: Standards, Spec
base-sha: e904370863d69a2b5d853af62745141953c4860d
branch: ai-structure/initiative
date: 2026-10-27
---

# L7 Code Review — Scaffold Spec (12-scaffold-spec)

## Scope

Files added on `ai-structure/initiative` vs `master` (`git diff --name-only master...HEAD`):
- 31 files added, all under `docs/ai_generated/structure-initiative/` and `docs/ai_generated/adr/`
- Branch diff is ALL adds (no modifications). Zero-diff gate on protected files confirmed clean.

The scripts (`scripts/*.mjs`), `AGENTS.md`, `CLAUDE.md`, seam cards, module cards, registry, and
SEAM-INDEX were already present on `master` (or a sibling branch); they are **not** in the
`master...HEAD` diff. They are reviewed here under their respective axes as part of the
scaffold spec deliverable that this branch depends on and references.

---

## Axis 1 — Standards (scripts/*.mjs)

### S-1 [MEDIUM] [scripts/check-seams.mjs] — File: regex does not match bold-colon format used by all seam cards

`parseSeamCardFilePaths()` regex at line 56:

```
/^\s*(?:\*{0,2}File:\*{0,2})\s*[`]?([^\s`]+)[`]?\s*$/gim
```

This handles `File:`, `*File:*`, and `**File:**` (colon before closing `**`), but every seam card
uses `**File**: \`path\`` (colon after closing `**`). Result: all 6 seam cards report the warning
"has no File: src/... line" at runtime and the file-path verification step is silently skipped for
all of them. Broken-citation detection is entirely inert for the current card set.

Observable: `node scripts/check-seams.mjs` exits 0 but emits 6 warnings and performs zero
file-path checks.

### S-2 [Low] [scripts/check-seams.mjs] — parseSeamIndexModules cannot parse SEAM-INDEX.md as written

`parseSeamIndexModules()` looks for a YAML front-matter `modules:` block or a `## Modules`
heading. SEAM-INDEX.md has neither: modules are listed in a numbered table under
`## 1. Module Load Order`. The Seam Cards Index is in `## 3. Seam Cards Index`. Because no
module names can be parsed, the script warns "no module names could be parsed" and skips
coverage checking. SEAM-INDEX module-coverage verification is inert.

### S-3 [Info] [scripts/gen-repo-map.mjs] — Valid ESM, shebang present, zero npm dependencies, graceful error handling confirmed

All four read paths (`manifest.json`, directory walk, `REPO_MAP.md`) use try/catch or
`existsSync` guards. Exit codes are correct (0 on success, 1 on missing file in `--check`
mode). No issues.

### S-4 [Info] [scripts/check-structure.mjs] — Valid ESM, exported functions enable unit testing, graceful handling confirmed

`injector.js`, `manifest.json`, and `SEAM-INDEX.md` absence are all handled gracefully.
`checkStructure()` returns `{ errors, warnings }` on early-exit conditions. ESM entry-point
guard (compare `import.meta.url` to `process.argv[1]`) is correct. No issues.

### S-5 [Info] [scripts/check-docs.mjs] — Valid ESM, path-extraction logic is conservative and correct

Skips globs, SHA-suffixed refs, and URLs. Deduplicated output. Exits 0 correctly. No issues.

### S-6 [Info] [scripts/verify-citations.mjs] — Valid ESM, symbol-existence check is sound

`symbolExistsInFile()` uses word-boundary regex patterns covering function declarations,
const/let/var assignments, and method definitions. Graceful on missing registry. No issues.

---

## Axis 2 — Spec Compliance (documentation files)

### SP-1 [Info] [AGENTS.md] — Line count 137, within R-02 ≤200 limit; D3 and D9 answered within 1 hop

- Line count: 137 (limit 200). PASS.
- D3 answer: line 60 `gif-controller.js::_drawFrame` + line 122 table row. Direct answer in
  the file — 0 hops. PASS.
- D9 answer: line 123 table row points to `injector.js` → `src/gif-file-fetcher.js`. 0 hops.
  PASS.
- Three required CLAUDE.md pointers (lines 13–15): REPO_MAP.md, protected-behaviors/registry.md,
  SEAM-INDEX.md. PASS.

### SP-2 [Info] [docs/ai_generated/protected-behaviors/registry.md] — 14 rows, all have code location; 3 rows have "untestable" test location

- Row count: 14 (P1–P14). PASS.
- Code location: all 14 rows have a `src/...` citation with function name or line number.
  `verify-citations.mjs` exits 0 (3 warnings for line-number-only citations, no errors). PASS.
- Test location: P1, P7, P13 cite "untestable" with rationale. This is accurate and documented
  in the Notes section. Acceptable — the spec requires a test location field, not a passing test.
  PASS.

### SP-3 [Medium] [docs/ai_generated/SEAM-INDEX.md] — module-count: 25 matches injector.js; but Section 1 table has 26 rows including inject.js

- `module-count: 25` in front matter matches the `modules[]` array in `injector.js` (25 entries).
  `check-structure.mjs` exits 0. PASS on the automated check.
- However, Section 1 table contains row 26 (`src/content/inject.js`). `inject.js` is injected
  after the `modules[]` loop via a separate `await injectScript('src/content/inject.js')` call.
  The `module-count` field (25) correctly excludes inject.js; the table is accurate but
  inconsistent in framing — inject.js appears as row 26 in the same numbered sequence.
  This is a readability issue, not an automated check failure.

### SP-4 [Medium] [docs/ai_generated/seams/*.seam.md] — All 6 seam cards have correct File: paths, but the path format is invisible to check-seams.mjs (see S-1)

- All 6 cards use `**File**: \`src/...\`` at line 10. The cited source files exist on disk.
  Manual verification: all 6 file paths are valid.
- Because `check-seams.mjs` cannot parse the `**File**:` format (S-1), automated verification
  of these citations is silently skipped. The paths are correct; the tooling does not confirm it.
- SEAM-INDEX Section 3 lists 6 seam cards; 6 cards exist. Coverage matches. PASS.

### SP-5 [Low] [docs/ai_generated/modules/*.md] — Module cards are value-bearing; D-task table present in all 6 cards

Reviewed `core.md` and `content.md` in full. Cards include: area mission, file table with
LOC and roles, key invariants table with PB codes and code pointers, seam expose/consume
summary, D-task quick-answer table, and area-specific notes. Content is not restatement of
scripts — cards contain invariant reasoning, gotcha explanations, and cross-module dependency
context not available from `gen-repo-map.mjs` output. PASS.

### SP-6 [Info] [CLAUDE.md] — Three required pointers added without breaking existing content

Lines 13–15 of CLAUDE.md add the three pointers (REPO_MAP.md, protected-behaviors/registry.md,
SEAM-INDEX.md) in the "Project Structure" section. Existing content (build commands, style guide,
testing guidelines) is intact. PASS.

---

## Gate G5 Checklist

- [x] `git diff master...HEAD -- src manifest.json LICENSE PRIVACY.md` → empty (confirmed: no output)
- [x] `git diff master...HEAD -- tests` → only A lines (confirmed: no output = no test changes)
- [x] `npm test` → 133/133 (confirmed: 133 passed, 0 failed)
- [x] `check-structure.mjs` → exit 0 (confirmed: "check-structure: OK")
- [x] `check-seams.mjs` → exit 0 with 7 warnings (confirmed; warnings are not errors — exit 0 is correct behavior)
- [x] `check-docs.mjs` → exit 0 (confirmed: "check-docs: OK")
- [x] `verify-citations.mjs` → exit 0 with 3 line-number warnings (confirmed)

All 7 gate checks pass (exit 0). G5 verdict: **CONDITIONAL PASS** — see blocking notes below.

---

## Summary

| Axis | Findings | High | Medium | Low | Info |
|------|----------|------|--------|-----|------|
| Standards | 6 | 0 | 1 | 1 | 4 |
| Spec | 6 | 0 | 2 | 1 | 3 |
| **Total** | **12** | **0** | **3** | **2** | **7** |

**Blocking issues for scaffold use:**

None at High severity. Two Medium issues degrade automated verification:

1. **S-1 / SP-4** (linked): `check-seams.mjs` silently skips all file-path verification because
   the `**File**:` bold-colon format used by every seam card does not match the parser regex.
   The paths are correct on disk, but the check is inert. Fix: update the regex in
   `parseSeamCardFilePaths()` to handle `**File**:\s*\`path\`` (colon after closing `**`).

2. **S-2**: `check-seams.mjs` cannot parse module names from SEAM-INDEX.md's table format.
   Module-coverage verification is inert. Fix: add a `modules:` YAML front-matter list to
   SEAM-INDEX.md or update `parseSeamIndexModules()` to parse the numbered table.

**G5 verdict: CONDITIONAL PASS** — all gate scripts exit 0 and tests are green, but two
Medium-severity issues leave seam-card file-path verification and module-coverage checks
silently disabled. The scaffold is usable but follow-up fixes are required before those
automated checks can be trusted.
