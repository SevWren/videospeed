# T06: Fix mutating build gate

**Finding**: F-E-002 (build script mutates files before testing)
**Type**: cleanup
**Prerequisite tickets**: none
**Human approval required**: NO — this ticket makes additive changes to `package.json` scripts only (adding `check:lint` and `check:format`). It does not touch `src/`, `manifest.json`, `LICENSE`, `PRIVACY.md`, or any test file. The charter explicitly permits adding `check:*` script entries to `package.json` (§5 allowed writes). No behavior of the production extension changes.

## Problem

The `npm run build` script in `package.json` runs `lint:fix` (auto-rewrites files) and `format` (auto-rewrites files) before running tests. This means `npm run build` mutates the working tree it is about to judge. A CI system running `npm run build` will have its working tree modified during the run, making it impossible to detect whether the source was already correctly formatted/linted. No non-mutating equivalent (`check:lint`, `check:format`) exists. Agents and CI pipelines have no safe way to verify code quality without side-effects. This is rated Medium severity (F-E-002, VERIFIED by Teams E, F, A2).

Additionally, the `build` script's mutating nature should be documented so developers know it is for local use only, not for CI.

## Proposed change

File: `package.json`

**Add two new script entries** (non-mutating checks):

```json
"check:lint": "eslint 'src/**/*.js' 'tests/**/*.js'",
"check:format": "prettier --check 'src/**/*.js' 'tests/**/*.js'"
```

**Add a comment-style clarification** (via a companion script name) to signal that `build` is developer-only. Since JSON does not support comments, add a no-op documentation entry:

```json
"build:ci-note": "echo 'Use check:lint and check:format in CI. build mutates files (lint:fix + format) and is for local dev only.'"
```

**Do not modify** the existing `build`, `lint:fix`, or `format` scripts. Existing behavior is preserved; this is purely additive.

Note: F-A-001 (29 lint errors at baseline) and F-A-004 (34 files fail prettier) mean `check:lint` and `check:format` will both exit non-zero against the current baseline. This is expected and correct — these scripts reveal the existing debt. A separate cleanup commit can fix the errors; that is out of scope for this ticket.

## Verification command

```bash
# Confirm new scripts are present
cat package.json | grep -E '"check:(lint|format)"'

# Run the new non-mutating checks (expected to exit non-zero at current baseline due to existing debt)
npm run check:lint  || echo "lint errors present (expected at baseline)"
npm run check:format || echo "format errors present (expected at baseline)"

# Confirm the working tree was NOT modified by the check scripts
git diff --name-status
# Expected: no modified src/ files
```

## Expected diff

```
package.json | 4 ++++
1 file changed, 4 insertions(+)
```

## Rollback

```bash
git revert HEAD
```

Removing the two new script entries has no effect on any runtime behavior.

## Constraints

- Charter §5: `package.json` edits are permitted for `check:*` and `map:*` script additions only. This ticket adds `check:lint` and `check:format`, which exactly match the allowed pattern.
- Do NOT modify the `build` script itself in this ticket. Renaming or removing `build` would break existing developer workflows and contributor muscle memory.
- The glob strings in the new scripts (`'src/**/*.js'`) should be quoted to avoid shell globstar issues (F-F-003 from findings register).
- After this ticket, update `CONTRIBUTING.md` (in a separate commit) to document the distinction between `npm run build` (local dev, mutating) and `npm run check:lint` + `npm run check:format` (CI-safe, non-mutating).
