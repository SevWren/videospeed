# T03: Remove dead src/module-loader.js

**Finding**: F-B-002 (src/module-loader.js is dead code in WAR)
**Type**: cleanup
**Prerequisite tickets**: T-characterization (a characterization test must be written and passing that confirms zero production callers of `module-loader.js` at runtime; this test must be added to `tests/unit/` and must pass before this ticket is executed)
**Human approval required**: YES — this ticket touches `src/module-loader.js` (ZERO-DIFF surface, `src/**`) and `manifest.json` (ZERO-DIFF surface). Both files are on the protected surface defined in the charter. This is a planned runtime change that requires explicit human approval and must not be executed during the scaffold program.

## Problem

`src/module-loader.js` is a file that is listed in `manifest.json` under `web_accessible_resources` (WAR) but has zero callers anywhere in `src/`. It is dead code. Its inclusion in the WAR list means it is web-accessible to any page script injected by the extension, unnecessarily expanding the attack surface. It also adds 3 global names to `window` that pollute the global namespace. Cold-start agents reading the repo assume it is a functioning module loading system, creating navigation confusion. This is rated Medium severity (F-B-002, VERIFIED by Team B, Confidence: High).

## Proposed change

**Step 1 (prerequisite — must happen first in a separate commit):**

Write a characterization test at `tests/unit/scaffold/module-loader-callers.test.js` that statically confirms no file in `src/` imports or calls anything from `module-loader.js`. This test must pass and be registered in `tests/run-tests.js` (see T08) before the deletion proceeds.

**Step 2 (this ticket):**

File 1: `src/module-loader.js` — delete the file.

File 2: `manifest.json` — remove the `web_accessible_resources` entry that references `src/module-loader.js`. Find the entry in the `web_accessible_resources` array and remove it. Do not touch any other entries.

No other files change.

## Verification command

```bash
# Confirm the file is gone
ls src/module-loader.js 2>&1
# Expected: "No such file or directory"

# Confirm no WAR entry remains
grep "module-loader" manifest.json
# Expected: no output

# Confirm no callers exist (characterization test must still pass)
npm test
# Expected: 133/133 (or higher if new tests were added) passing
```

## Expected diff

```
manifest.json        | 3 ---
src/module-loader.js | [N] deletions(-)
2 files changed, 0 insertions(+), N+3 deletions(-)
```

## Rollback

```bash
git revert HEAD
```

This restores both `src/module-loader.js` and the `manifest.json` WAR entry in one operation. Because these two files are changed in one commit, revert is atomic.

## Constraints

- **ZERO-DIFF surface**: Both `src/module-loader.js` and `manifest.json` are on the ZERO-DIFF list for the scaffold program. This ticket MUST NOT be executed during the scaffold program. It is planned only.
- The characterization test prerequisite is mandatory; do not skip it. Without it there is no automated proof that no callers exist.
- After deletion, run `npm run check:structure` (once that script exists) to verify WAR consistency.
- R-04 (RAID): WAR glob changes require careful review. Removing a specific file entry from WAR is lower risk than changing a glob, but still requires `npm test` pass.
- OBS-09 (obstacle list): Confirms low regression risk once characterization test exists.
