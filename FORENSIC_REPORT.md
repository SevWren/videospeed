# Forensic Report — VSC Investigation

**Pinned SHA:** `4dea165868ab17b4f626bd0057b3a6a3d8045523`
**Effective code SHA:** `3f78e60` (docs-only difference)
**Baseline:** 133/133 tests passing
**Date:** 2026-10-27

---

## Bug A — Keybinding changes not applying / not persisting

### Summary
The reported symptom has two dimensions. Only one is actionable without a blocking human decision.

### Dimension 1: "Does not apply in already-open tabs"
**Status: CONFIRMED as existing design. No regression. No fix possible without human decision.**

Evidence (KK, D2):
- **H-A2 VERIFIED** [SD-04]: `StorageManager.onChanged` is defined but has zero callers in `src/`. No `chrome.storage.onChanged` relay exists in the content script.
- **H-A1 VERIFIED**: Suspect commit `144746a` removed only `console.warn` diagnostic code and two diagnostic event listeners. No functional path was removed.
- README documents "refresh the viewing tab" as the expected workflow.

To make changes apply in open tabs without reload would require a NEW `chrome.storage.onChanged` listener in `src/content/injector.js` that re-dispatches `VSC_USER_SETTINGS` to the page world. This is new functionality, not a bug fix.

**Blocking decision required (KU-2):** Should keybinding changes apply in already-open tabs without reload? Human must decide before any implementation proceeds.

### Dimension 2: "Does not persist after Save"
**Status: CANNOT CONFIRM without runtime evidence.**

Evidence (KK, D2):
- **SD-01**: Save path (`save_options → videoSpeedConfig.save → StorageManager.set → chrome.storage.sync.set`) is structurally correct for the extension context (options page has direct `chrome.storage` access).
- **SD-02**: `StorageManager.set()` callback does NOT check `chrome.runtime.lastError`. A failed write resolves silently.
- **SD-03**: Post-save validation checks only `keyBindings.length`, not key values. A changed key passing with unchanged count would not be caught.
- **H-A4 EVIDENCED**: Silent write failure is possible under quota conditions, but typical keybinding payloads (~500 bytes) are far below Chromium's 8192 B/item limit.

If persistence failures are being reported, the most likely cause is **H-A3** (unresolved): a stale-tab scenario where a full settings write from a background tab overwrites changes made in the options tab. This requires the human to run §10 Snippet B to confirm.

### Action items for Bug A
1. **KU-2 (blocking):** Decide if live-update-without-reload is required.
2. **H-A3:** Run §10 Snippet B to confirm or refute the lost-update scenario.
3. **Regardless of above:** `StorageManager.set()` should check `chrome.runtime.lastError` in the callback (SD-02 deficiency). This is a safe, independent improvement.

---

## Bug B — GIF controller attaches to non-animated elements

### Root Cause (D3) — Entry E-1

**GIF controllers are incorrectly created for single-frame (static) GIFs** because the guard in `GifController.create()` at `src/core/gif-controller.js:157` checks `frames.length === 0` but not `frames.length <= 1`.

Combined contributing factor (E-2): No post-decode size check — a GIF smaller than `GIF_MIN_SIZE_PX` (20px) is not rejected after its dimensions are known from `parsed.lsd`.

**Mechanism chain (all D2):**
1. Page contains a 1×1 tracking pixel GIF (e.g., `cleardot.gif`) — a real GIF file, not a false-positive from isGifSrc. [SD-09, H-B2 VERIFIED]
2. While the image is not yet loaded (`naturalWidth=0`), the size filter is not applied by `scanForGifs`. [SD-09 VERIFIED]
3. `onGifFound` → `GifController.create()` is called.
4. GIF is fetched and decoded by gifuct-js. `frames.length = 1`.
5. Guard at line 157: `if (!frames || frames.length === 0)` — passes (1 ≠ 0). [SD-10 VERIFIED]
6. Canvas replacement proceeds. The 1×1 `<img>` is replaced by a `<canvas>`. Controller UI is injected onto the surrounding DOM element.

**Why existing tests did not catch it (miss analysis):**
- `tests/unit/core/gif-controller.test.js` (21 tests) has no scenario that feeds a 1-frame GIF through `create()`.
- `tests/unit/observers/gif-observer.test.js` explicitly tests and ASSERTS that `naturalWidth=0` images pass through — the design intent is documented, but the downstream consequence in `GifController.create()` was not tested.

**Blast radius (FW-7 scope):**
- **File to change:** `src/core/gif-controller.js` — line 157 guard and a new size check after line 126.
- **Files that must NOT change:** `src/observers/gif-observer.js`, `src/observers/media-observer.js` (naturalWidth=0 passthrough is intentional and tested), `src/lib/gifuct-js.min.js` (vendor, read-only), `manifest.json`.

**Origin (FW-6):**
- `frames.length === 0` guard introduced in `914b85c feat: GIF playback speed control via canvas replacement`. No prior fix addressed single-frame rejection. The change to `<= 1` does NOT undo any prior fix.

### Fix (minimal, D3-supported)
In `src/core/gif-controller.js`, two changes at the post-decode point:

**Change 1** — After `gc._gifHeight = parsed.lsd.height` (line ~127), add a dimension guard:
```js
if (
  gc._gifWidth < window.VSC.Constants.GIF_MIN_SIZE_PX ||
  gc._gifHeight < window.VSC.Constants.GIF_MIN_SIZE_PX
) {
  window.VSC.GifFrameCache.releaseAllocation(frameBytes);
  gc._allocatedBytes = 0;
  return null;
}
```

**Change 2** — Change the frame count guard (line ~157) from:
```js
if (!frames || frames.length === 0) {
```
to:
```js
if (!frames || frames.length <= 1) {
```

Both changes work together: the dimension guard rejects tiny GIFs early (before decompressFrames, saving CPU); the frame count guard rejects all non-animated GIFs regardless of size.

### Adversary check (FW-8)
Three alternative hypotheses considered and refuted [H-B3 REFUTED, Alt-1 refuted, Alt-2 refuted, Alt-3 refuted]. H-B1 stands as the sole confirmed mechanism.

---

## Latent Defect — E-3 (inIframe call)

`event-manager.js:37` calls `window.VSC.inIframe()` which is never assigned. The correct reference is `window.VSC.DomUtils.inIframe`. The TypeError is silently caught; the effect is that keyboard shortcuts are never registered on `window.top.document` when the extension runs inside a sub-frame.

**Scope decision required (§13.3):** Orchestrator proposes this is IN SCOPE as a latent defect. Human confirmation needed before fix.

Fix (one-line): Change `window.VSC.inIframe()` to `window.VSC.DomUtils.inIframe()` at `src/utils/event-manager.js:37`.

---

## Outcome

| Bug | Status | Next action |
|---|---|---|
| A — keybinding apply at runtime | ESCALATED–INCOMPLETE | Human KU-2 decision required |
| A — keybinding persistence | ESCALATED–INCOMPLETE | Human H-A3 Snippet B confirmation; SD-02 lastError fix is safe independent improvement |
| B — GIF false positive | ACTIONABLE at D3 | Write red test, apply fix, verify |
| E-3 — inIframe call | ESCALATED | Human scope confirmation |
