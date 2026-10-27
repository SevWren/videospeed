# T02: Exclude .md files from extension zip

**Finding**: F-F-002 (Root .md files ship in extension zip — CLAUDE.md, HANDOFF.md, CONTEXT.md)
**Type**: bugfix / cleanup
**Prerequisite tickets**: none
**Human approval required**: YES — changes the exact set of files shipped to the Chrome Web Store. Any change to the release artifact must be reviewed by the extension owner before the next store submission.

## Problem

The `npm run zip` script (defined in `package.json`) currently copies all root `.md` files into the distribution zip with a glob like `cp *.md dist/`. This causes AI agent instruction files — `CLAUDE.md`, `HANDOFF.md`, and `CONTEXT.md` — to be packaged inside the extension and uploaded to the Chrome Web Store with every release. These files contain internal scaffolding notes, agent-to-agent handoff instructions, and codebase analysis. They have no value to end users and should not be part of a published browser extension. This is rated High severity (F-F-002, VERIFIED by Team F).

## Proposed change

File: `package.json`

Locate the `zip` script entry. Replace the wildcard `.md` copy with an explicit list of user-facing documents only.

Current pattern (approximate):
```json
"zip": "... && cp *.md dist/ && ..."
```

Change to copy only the following explicitly named files:
- `README.md`
- `PRIVACY.md`
- `CONTRIBUTING.md`

Do NOT copy:
- `CLAUDE.md`
- `HANDOFF.md`
- `CONTEXT.md`
- Any future `*.md` files added at root that are agent/developer-only

Example replacement (adapt to match actual script structure):
```json
"zip": "... && cp README.md PRIVACY.md CONTRIBUTING.md dist/ && ..."
```

Verify `CONTRIBUTING.md` exists at root before adding it to the list; if it does not exist, omit it rather than creating it.

## Verification command

```bash
# Build the zip (requires zip binary; may not work in sandbox — use dry-run inspection instead)
cat package.json | grep '"zip"'
```

Confirm the output shows explicit filenames rather than `*.md`.

To verify the zip contents once `zip` is available:
```bash
npm run zip && unzip -l dist/videospeed.zip | grep "\.md$"
```

Expected: only `README.md`, `PRIVACY.md` (and `CONTRIBUTING.md` if it exists) appear. No `CLAUDE.md`, `HANDOFF.md`, or `CONTEXT.md`.

## Expected diff

```
package.json | 2 +-
1 file changed, 1 insertion(+), 1 deletion(-)
```

## Rollback

```bash
git revert HEAD
```
or restore the original `*.md` glob in the zip script.

## Constraints

- C-list ZERO-DIFF: `src/`, `manifest.json`, `LICENSE`, `PRIVACY.md`, existing `tests/**` must not change. This ticket touches only `package.json` scripts.
- Charter §5 allowed writes: `package.json` edits are permitted (adding `check:*` / `map:*` scripts); this ticket modifies the `zip` script which is adjacent but not a check/map addition — confirm with human owner that zip script changes fall within scope.
- R-06 (RAID): Store compliance risk; coordinate with T01 if both are submitted together in a single store update.
- F-A-002: `zip` binary is absent in the sandbox; the script change can be made and verified syntactically, but end-to-end zip output verification must be done in a local dev environment before store submission.
- Do not add `CLAUDE.md` exclusion via a negative glob (shell behavior is inconsistent); use an explicit allowlist.
