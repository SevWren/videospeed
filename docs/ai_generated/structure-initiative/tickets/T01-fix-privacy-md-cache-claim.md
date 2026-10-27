# T01: Fix PRIVACY.md cache claim

**Finding**: F-C-001 (PRIVACY.md cache claim is FALSE — published policy)
**Type**: bugfix
**Prerequisite tickets**: none
**Human approval required**: YES — this is a published privacy policy submitted to the Chrome Web Store. Any change to it is a policy document change that requires legal/owner review before re-submission.

## Problem

`PRIVACY.md` line 17 states `cache: force-cache` as the fetch option used when loading GIF data. The actual runtime code in `src/core/gif-controller.js:405` uses `cache: 'default'`. These two behaviors differ materially: `force-cache` instructs the browser to serve from cache even if stale, while `default` follows normal HTTP cache semantics. The published privacy statement therefore misrepresents the extension's network behavior. This is a compliance defect for Chrome Web Store submission and is rated Blocker severity (F-C-001, Confidence: High, VERIFIED by Teams C and G).

## Proposed change

File: `PRIVACY.md`

Change line 17 from:
```
cache: force-cache
```
to:
```
cache: 'default'
```

No other files change in this ticket. `src/` is on the ZERO-DIFF surface and must not be touched.

## Verification command

```bash
grep "cache" PRIVACY.md
```

Expected output contains `cache: 'default'` and does not contain `force-cache`.

Also run the zero-diff guard:
```bash
git diff --name-status master...HEAD -- src manifest.json LICENSE
```
Must print nothing (PRIVACY.md itself will show `M PRIVACY.md` which is expected for this ticket).

## Expected diff

```
PRIVACY.md | 2 +-
1 file changed, 1 insertion(+), 1 deletion(-)
```

## Rollback

```bash
git revert HEAD
```
or manually restore the original line:
```
cache: force-cache
```

## Constraints

- C-list C-ZERO-DIFF: `PRIVACY.md` is on the protected surface for the structure-initiative program. This ticket is explicitly planned to modify it and requires human approval before execution.
- Charter §3: Any design or migration step that touches `PRIVACY.md` is a ZERO-DIFF violation within the scaffold program and must only be executed after the scaffold program completes and a human approves the change.
- R-06 (RAID): This finding feeds directly into store compliance risk.
- Do not combine with any `src/` changes; keep this a single-file, single-line change for clean revert.
