# T04: Add VSC_SAVE_SETTINGS payload validation

**Finding**: F-G-001 (VSC_SAVE_SETTINGS: no payload validation)
**Type**: bugfix (security)
**Prerequisite tickets**: T-characterization (a characterization test must be written first that documents current behavior — i.e., that arbitrary keys can currently be written — so that the fix can be verified as a behavioral change; add to `tests/unit/content/`)
**Human approval required**: YES — this ticket modifies `src/content/injector.js`, which is on the ZERO-DIFF surface (`src/**`). It must not be executed during the scaffold program. Human review is also warranted because this is a security-relevant change; the allowlist must be reviewed against the full set of legitimate settings keys.

## Problem

In `src/content/injector.js` at approximately line 148, the `VSC_SAVE_SETTINGS` CustomEvent handler passes the event payload directly to `chrome.storage.sync.set()` without validating which keys are present. Because CustomEvents on the page can be dispatched by any JavaScript running in the page context (including third-party scripts on the injected site), this allows arbitrary key–value pairs to be written to the extension's synced storage. An attacker or misbehaving page script could pollute or overwrite extension settings. This is rated High severity with High confidence and is VERIFIED (F-G-001, Team G). It is also a constraint for any future work that adds new CustomEvent handlers (C-list C-3, C-4 per OBS-08).

## Proposed change

File: `src/content/injector.js`

Before the `chrome.storage.sync.set()` call in the `VSC_SAVE_SETTINGS` handler, add a key-allowlist filter. The filter should:

1. Define a `const ALLOWED_SETTINGS_KEYS` array containing every legitimate settings key (sourced from `src/utils/constants.js` and/or the settings schema in `src/core/settings.js`).
2. Before calling `chrome.storage.sync.set(payload)`, filter `payload` to include only keys present in `ALLOWED_SETTINGS_KEYS`.
3. If the filtered payload is empty (all keys were invalid), log a warning and return without writing to storage.

Pseudocode (do not copy verbatim — adapt to match actual code style):
```javascript
const ALLOWED_SETTINGS_KEYS = [ /* all known settings keys */ ];
const safePayload = Object.fromEntries(
  Object.entries(payload).filter(([k]) => ALLOWED_SETTINGS_KEYS.includes(k))
);
if (Object.keys(safePayload).length === 0) {
  console.warn('[VSC] VSC_SAVE_SETTINGS: no valid keys in payload; ignoring.');
  return;
}
chrome.storage.sync.set(safePayload);
```

The exact list of `ALLOWED_SETTINGS_KEYS` must be derived from the live codebase at implementation time; do not guess the list in this ticket.

## Verification command

```bash
# Characterization test (prerequisite) must continue to pass with new behavior reflected
npm test

# Manual spot check (after implementing):
# Dispatch a VSC_SAVE_SETTINGS event with an unknown key and confirm it is not written
# This requires an integration test or manual browser test
```

## Expected diff

```
src/content/injector.js | ~15 +(allowlist + filter + guard)
1 file changed, ~15 insertions(+), 1 deletion(-)
```

(Exact line count depends on allowlist size and style choices.)

## Rollback

```bash
git revert HEAD
```

## Constraints

- **ZERO-DIFF surface**: `src/content/injector.js` is in `src/**`. Do not execute during the scaffold program.
- C-list C-3, C-4 (OBS-08): Any future CustomEvent handler must use the same allowlist pattern established here. Document this constraint in `docs/ai_generated/protected-behaviors/registry.md` after the fix lands.
- The allowlist must be kept in sync with the settings schema. Consider a follow-up ticket or a `check:structure` assertion to detect drift between `ALLOWED_SETTINGS_KEYS` and the actual settings definition.
- R-07 (RAID): This is a constraint for Teams J and L; the pattern established here must be reflected in any design proposal that adds new CustomEvents.
- Do not use a denylist (blocking unknown keys by name); use a positive allowlist (only permit known keys).
