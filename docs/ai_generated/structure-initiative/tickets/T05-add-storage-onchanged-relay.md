# T05: Add StorageManager.onChanged relay

**Finding**: F-B-001 (StorageManager.onChanged has zero callers)
**Type**: feature (new capability)
**Prerequisite tickets**: T-characterization (write a characterization test that documents current behavior — i.e., that settings changes do NOT propagate live to open tabs — before adding the relay, so the new behavior is provably different)
**Human approval required**: YES — two reasons:
1. This ticket modifies `src/core/storage-manager.js`, which is in `src/**` (ZERO-DIFF surface). It must not be executed during the scaffold program.
2. This is a **new capability** (not a bug fix): it changes extension behavior such that settings changes propagate to already-open tabs without a page reload. The scope and UX implications of this change require a human decision before implementation.

## Problem

`src/core/storage-manager.js` exposes an `onChanged` method (or equivalent hook) that has zero callers anywhere in `src/`. This means that when a user changes extension settings (e.g., via the options page), those changes are not relayed to content scripts running in already-open tabs. Users must reload the tab to see setting changes take effect. The zero-caller state was VERIFIED by Team B via grep (F-B-001, Confidence: High). This is noted in `HANDOFF.md` as a known gap and is flagged as a NEW CAPABILITY — meaning it is not currently promised behavior and enabling it changes the observable contract of the extension.

## Proposed change

File: `src/core/storage-manager.js`

Add a caller for the `onChanged` hook so that storage changes are relayed to the appropriate recipients (e.g., content scripts, settings module). The exact integration point must be determined at implementation time by tracing:

1. Who calls `StorageManager` today (find all callers in `src/`).
2. What the `onChanged` signature expects (parameters, callback shape).
3. Where the relay should land (likely `src/content/injector.js` or `src/background.js`).

The implementation should:
- Register a `chrome.storage.onChanged` listener in the appropriate module.
- Call `StorageManager.onChanged` (or dispatch an equivalent event) when storage changes are detected.
- Update only the changed keys, not perform a full settings reload.

**Scope decision required before implementation**: The human owner must decide whether live propagation should apply to:
- (a) Speed and keyboard shortcut settings only
- (b) All sync-stored settings
- (c) A specific subset defined by a new allowlist

This scope decision affects test design and the definition of "done."

## Verification command

```bash
# After implementation, the characterization test must now show the opposite behavior
npm test

# Integration test (must be written as part of this ticket):
# Simulate a chrome.storage.onChanged event and verify the settings module updates
# without a tab reload. This test should live at tests/integration/storage-relay.test.js
```

## Expected diff

```
src/core/storage-manager.js          | ~20 +
tests/integration/storage-relay.test.js | ~40 +
2 files changed, ~60 insertions(+), 0 deletions(-)
```

## Rollback

```bash
git revert HEAD
```

If the relay causes unexpected re-renders or race conditions in already-open tabs, revert restores the zero-caller state immediately.

## Constraints

- **ZERO-DIFF surface**: `src/core/storage-manager.js` is in `src/**`. Do not execute during the scaffold program.
- **New capability gate**: Enabling live settings propagation is a behavior change visible to users. It must be scoped and approved before implementation. Do not ship this as a drive-by fix.
- F-B-001 (findings register): Agents currently assume settings propagate live; they do not. After this ticket lands, update `docs/ai_generated/protected-behaviors/registry.md` and any agent-facing docs to reflect the new behavior.
- Coordinate with T04: if `VSC_SAVE_SETTINGS` validation (T04) is not yet landed, the relay could amplify the security issue by propagating unvalidated payloads. T04 should land first or concurrently.
- Write an integration test as part of this ticket — not as a separate follow-up.
