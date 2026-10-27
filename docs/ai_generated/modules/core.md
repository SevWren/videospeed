---
area: core
module-card: true
base-sha: e904370863d69a2b5d853af62745141953c4860d
---

# core — playback state, GIF animation, settings, storage

**Mission**: Own all playback-state logic for video/audio and GIF elements; manage settings
persistence and the in-memory GIF frame budget.

---

## Files

| File | LOC | Role |
|------|-----|------|
| `src/core/gif-controller.js` | 805 | DEEP — canvas-replacement, rAF loop, frame compositing (disposal 0/1/2/3), memory budget, IntersectionObserver, overlay, file:// fetch bridge, full teardown |
| `src/core/video-controller.js` | 432 | DEEP — VideoController class: overlay div, speed display, ShadowDOM integration, per-video event dispatch |
| `src/core/action-handler.js` | 568 | DEEP — all keyboard/click action dispatch, speed clamping, GIF speed-save debounce, routing for video and GIF paths |
| `src/core/settings.js` | 310 | MEDIUM — VideoSpeedConfig: load, save, key-binding migration, media/GIF element registry |
| `src/core/storage-manager.js` | 164 | SHALLOW — static wrapper around `chrome.storage.sync`; injected-settings fallback for page world |
| `src/core/gif-frame-engine.js` | 48 | SHALLOW — `GifFrameEngine.effectiveDelay(rawDelayMs, speed)` (pure); `GifFrameCache` memory budget counter |

---

## Key invariants (protected behaviors)

| PB | Rule | Code location |
|----|------|--------------|
| P3 | `disposal=2`: fill frame region with `bgColor` before drawing. `disposal=3`: restore prior frame canvas snapshot | `gif-controller.js::_drawFrame` |
| P4 | Sentinel `{pending:true, _cancelled:false}` must be placed on `img.gifController` before `GifController.create()` starts; if `sentinel.remove()` was called before `create()` returns, the new gc is immediately torn down | `gif-controller.js::create` |
| P6 | GIF teardown must follow the 10-step sequence: stop rAF → disconnect observers → remove listeners → remove controls div → null frame data → release memory budget → set `img._vscTeardownSrc` + `img.vscGifIgnore=true` → re-insert img → remove canvas → dispatch `VSC_CONTROLLER_REMOVED` | `gif-controller.js::remove` |
| P7 | `_patchCanvas` pixel compositing: replace `<img>` with `<canvas>` in-place; canvas must match img computed layout dimensions | `gif-controller.js::_patchCanvas` |
| P8 | Memory budget: `GifFrameCache.requestAllocation` must be checked before decoding; if budget exceeded, GIF falls back to native browser rendering | `gif-frame-engine.js::GifFrameCache`, `gif-controller.js::create` |
| P9 | `effectiveDelay` must not be rounded or clamped; floating-point result is the rAF schedule interval | `gif-frame-engine.js::GifFrameEngine.effectiveDelay` |

---

## Seam: what this area exposes / consumes

**Exposes (via `window.VSC.*`):**
- `window.VSC.GifController` — consumed by `inject.js`
- `window.VSC.VideoController` — consumed by `inject.js`
- `window.VSC.ActionHandler` — consumed by `inject.js`
- `window.VSC.videoSpeedConfig` / `window.VSC.VideoSpeedConfig` — consumed by `inject.js`, `options.js`
- `window.VSC.StorageManager` — consumed by `settings.js`
- `window.VSC.GifFrameCache` / `window.VSC.GifFrameEngine` — consumed by `gif-controller.js`

**Consumes (reads from `window.VSC.*`):**
- `window.VSC.Constants`, `window.VSC.logger`, `window.VSC.DomUtils`
- `window.VSC.ControlsManager`, `window.VSC.ShadowDOMManager`, `window.VSC.DragHandler` (UI area)
- `window.VSC.GifObserver`, `window.VSC.gifFetchFailCache` (observers area)
- `window.__VSC_gifuct` (vendored gifuct library)

**CustomEvent crossings (core → injector):**
- `VSC_CONTROLLER_CREATED` — fired by `gif-controller.js:321` and `video-controller.js:418`
- `VSC_CONTROLLER_REMOVED` — fired by `gif-controller.js:793`
- `VSC_FETCH_GIF_BYTES` — fired by `gif-controller.js:391` to request file:// GIF bytes

---

## Common D-tasks landing here

| Task | Entry point |
|------|------------|
| D3 — fix disposal=3 rendering | `gif-controller.js::_drawFrame` |
| D4 — change GIF speed calculation | `gif-frame-engine.js::GifFrameEngine.effectiveDelay` |
| D5 — add keyboard action | `action-handler.js` |
| D8 — replace gifuct decoder | `gif-controller.js::create` (ArrayBuffer handoff seam) + P1 |

---

## Notes

- `storage-manager.js::StorageManager.onChanged` is defined but has **zero callers** — live settings changes from the options page are not propagated to running content scripts (known gap; see B-architecture.md B4).
- `gif-controller.js` mixes 4 separable concerns (fetch+decode, animate, DOM management, overlay); natural split seams are documented in B-architecture.md B5.
