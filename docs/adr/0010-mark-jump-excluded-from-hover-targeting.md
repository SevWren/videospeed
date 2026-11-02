# Exclude mark and jump from hover-only targeting — they always broadcast

When a keyboard shortcut fires and the only resolved target is the Hover Target (no controller button was clicked), the actions `mark` and `jump` ignore the Hover Target and broadcast to all media elements. In `ActionHandler.runAction()` and `runGifAction()`, the guard reads:

```js
const isMarkOrJump = action === 'mark' || action === 'jump';
const hoverTarget = !isMarkOrJump ? this._hoverTargetController : null;
const resolvedTarget = targetController ?? hoverTarget ?? null;
```

A click-derived `targetController` still routes `mark` and `jump` to the clicked controller; the exclusion applies only to the hover-derived path.

## Why this is surprising

A user who hovers a video to activate keyboard targeting would reasonably expect all hotkeys — including `mark` and `jump` — to target that video. Finding that two specific actions silently broadcast instead of targeting is non-obvious.

## Trade-off

- **Broadcast mark/jump from hover (chosen)**: `mark` and `jump` are stateful operations: `mark` writes a timestamp to `video.vsc.mark`; `jump` reads it back. On a page with multiple videos where the user has not explicitly clicked a controller, broadcasting `mark` and `jump` means the timestamp is set and restored on every video simultaneously, which is the safest default — no video is silently excluded from a mark the user wanted to set. The hover path represents "I glanced at a video"; a button click represents "I explicitly chose this video." Only the explicit click should restrict stateful mark/jump.
- **Target mark/jump to Hover Target**: Would be consistent with all other actions but risks the user marking the wrong video when the hover was incidental (e.g., the pointer passed over a video while moving to a different part of the page after Dwell Time elapsed).

## Consequences

`mark` and `jump` behave differently from all other actions in the hover-only path. This asymmetry must be documented in `GLOSSARY.md` under **Action** and understood by anyone adding new stateful actions — any action that operates on per-element persistent state should be evaluated for the same exclusion.
