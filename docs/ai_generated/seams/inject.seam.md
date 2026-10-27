---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# inject.seam.md

**File**: `src/content/inject.js`
**World**: page-main (injected last by `injector.js` line 85)
**window.VSC registration**: `window.VideoSpeedExtension` (line 604), `window.videoSpeedExtension` (line 605)
**LOC**: 612

---

## window.VSC Depends On

Reads at `initialize()` time:

| Global | Used for |
|--------|----------|
| `window.VSC.VideoController` | Instantiate per-video overlay controllers |
| `window.VSC.ActionHandler` | Keyboard/click dispatch |
| `window.VSC.EventManager` | Keyboard listener setup |
| `window.VSC.logger` | Structured logging |
| `window.VSC.DomUtils.isBlacklisted` | Site blacklist check |
| `window.VSC.DomUtils.initializeWhenReady` | Defer initialization until DOM ready |
| `window.VSC.siteHandlerManager` | Site-specific video detection overrides |
| `window.VSC.VideoMutationObserver` | DOM mutation watching |
| `window.VSC.MediaElementObserver` | Initial media scan |
| `window.VSC.Constants.MESSAGE_TYPES` | Popup message type constants |
| `window.VSC.videoSpeedConfig` | Settings instance (load, save, element registry) |
| `window.VSC.GifController` | `GifController.create()` factory in `onGifFound` |

---

## Exposes

| Function/Method | Called by | Purpose |
|-----------------|-----------|---------|
| `VideoSpeedExtension` (class) | E2E tests; `window.videoSpeedExtension` instance | Top-level orchestrator; owns observer wiring and GIF/video lifecycle |
| `onGifFound(img, parent)` | `VideoMutationObserver` callback (line 290), `deferredMediaScan` (line 186, 244) | Async: guards, sets sentinel, calls `GifController.create()`, handles post-create DOM check |
| `onGifRemoved(img)` | `VideoMutationObserver` callback (line 291) | Calls `gc.remove()` if a real (non-sentinel) controller exists |

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P4 | Sentinel `{ pending: true, _cancelled: false }` set synchronously before `await GifController.create()` | `onGifFound()` lines 367–369 |
| P12 | `this.siteHandlerManager = window.VSC.siteHandlerManager` read at `initialize()` time; must exist before inject.js runs | `initialize()` line 29 |

### Sentinel Pattern Detail (P4)

```
onGifFound(img, parent):
  // Guards
  if img.vscGifFailed → return
  if img.gifController (existing real controller) → return
  // _vscTeardownSrc logic: skip if same src since teardown
  ...
  // Synchronous sentinel set (BEFORE first await)
  sentinel = { pending: true, _cancelled: false }
  sentinel.remove = () => { sentinel._cancelled = true }
  img.gifController = sentinel           // ← line 369 (P4 enforcement point)

  gc = await GifController.create(...)   // ← async window

  if sentinel._cancelled → gc.remove(); return
  if gc === null → img.vscGifFailed = true; return
  // Canvas-replacement check:
  if img not in DOM AND gc._canvas not in DOM → gc.remove(); return
  // Normal path: controller is live
```

The sentinel blocks:
1. Double-attach: second `onGifFound` call sees `img.gifController` (truthy) and returns.
2. Late cancellation: `mutation-observer.js` calling `node.gifController.remove()` sets `_cancelled = true`; the in-flight `create()` aborts on completion.

---

## Common Tasks

- **D1: Debug why a GIF is not getting a controller** — start here; `onGifFound()` contains all attach guards
- **D2: Understand popup speed commands** — `VSC_MESSAGE` listener (lines 476–587) handles `SET_SPEED`, `ADJUST_SPEED`, `RESET_SPEED`, `TOGGLE_DISPLAY`, `DISABLE_GIF_CONTROL`, `ENABLE_GIF_CONTROL`
- **D12: Diagnose a MutationObserver / sentinel interaction bug** — trace from `onGifFound` through sentinel to `onGifRemoved`

---

## Gotchas

- **`_docInitialized` flag prevents double-initialization.** If `initialize()` is called more than once (e.g., from a test environment), it returns immediately on the second call. Do not remove this guard.

- **Post-create DOM check.** After `await GifController.create()`, `inject.js` checks whether the `<img>` is absent from DOM AND the canvas is absent. If only the `<img>` is absent (normal canvas-replacement), it does NOT call `gc.remove()`. This was a real bug that was fixed in commit `794a3e7`. Do not revert to `!document.body.contains(img)` alone. (HANDOFF.md §4.6)

- **`deferredMediaScan` OR/AND guard.** Uses `&&` (not `||`) in the "nothing found" check for triggering a comprehensive 1-second re-scan. Using `||` caused a re-scan on every file:// GIF page load. (HANDOFF.md §4.8)
