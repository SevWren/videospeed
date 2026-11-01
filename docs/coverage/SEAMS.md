# Coverage Seam Charter

Charter adopted 2026-11-01. Human approval assumed (user launched task; see ledger P0-seam-charter).
Any seam marked ASSUMED requires a second-agent validation before tests are written against it.

## Seam definitions

A **seam** is the public boundary where tests observe behavior without reaching inside.
Tests must only be written at chartered seams below. To add a seam, stop and report to orchestrator.

---

## Group A — Utilities (constants, logger, dom-utils, debug-helper, event-manager)

| Module | Seam | Notes |
|---|---|---|
| constants.js | `window.VSC.Constants.*` after side-effect import | 100% covered — no new tests needed |
| logger.js | `window.VSC.logger.*` methods; observable verbosity state | Partial — extend existing tests |
| dom-utils.js | `window.VSC.DomUtils.*` exported functions | Extend existing tests |
| event-manager.js | `window.VSC.EventManager` constructor + public methods | Extend existing tests |
| debug-helper.js | `window.VSC.DebugHelper` or exported functions after side-effect import | NEW test file needed |

## Group B — Core state (settings, storage-manager, video-controller, action-handler)

| Module | Seam | Notes |
|---|---|---|
| settings.js | `window.VSC.VideoSpeedConfig` constructor + `load()`, `save()`, `applySettings()` | Extend existing tests |
| storage-manager.js | `window.VSC.StorageManager.waitForInjectedSettings()`, `get()` | Extend existing tests |
| video-controller.js | `window.VSC.VideoController` constructor + `remove()`, `updateSpeed()` | Extend existing tests |
| action-handler.js | `window.VSC.ActionHandler` + `runAction()`, `runGifAction()` | Extend existing tests |

## Group C — GIF path (gif-controller, gif-frame-engine, gif-observer, frame cache)

| Module | Seam | Notes |
|---|---|---|
| gif-frame-engine.js | `window.VSC.GifFrameEngine.create()` + `effectiveDelay()` + `GifFrameCache` | 97.9% — close remaining line 23 |
| gif-controller.js | `window.VSC.GifController.create()` + public instance methods (`setSpeed`, `cleanup`) | Extend existing tests; many paths at 38% |
| gif-observer.js | `window.VSC.GifObserver.*` exported utilities | 83% — extend for lines 31-36, 42-46 |

## Group D — Observers (mutation-observer, media-observer)

| Module | Seam | Notes |
|---|---|---|
| mutation-observer.js | `VideoMutationObserver.processMutations([mutationRecord])` entry point | Extend existing tests |
| media-observer.js | `MediaElementObserver` constructor + `checkElement()` public method | Extend existing tests |

## Group E — Content scripts (inject.js, injector.js)

| Module | Seam | Notes |
|---|---|---|
| inject.js | `window.VSC._shouldInjectInCurrentFrame`, `window.videoSpeedExtension.*` | Extend existing tests |
| injector.js | CS-3 exception: structural source test (`readFileSync`) + `window.__VSC_injectedSettings` protocol | Extend injector-relay.test.js (structural) |

## Group F — Site handlers (base, youtube, netflix, amazon, apple, facebook)

| Module | Seam | Notes |
|---|---|---|
| base-handler.js | `window.VSC.BaseSiteHandler` constructor + public methods | Extend existing tests |
| site-handlers/index.js | `window.VSC.SiteHandlerManager` constructor + `getHandler()`, `refresh()` | Extend existing tests |
| youtube-handler.js | `window.VSC.YouTubeHandler` public methods | NEW test file: `tests/unit/site-handlers/youtube-handler.test.js` |
| netflix-handler.js | `window.VSC.NetflixHandler` public methods | NEW test file: `tests/unit/site-handlers/netflix-handler.test.js` |
| amazon-handler.js | `window.VSC.AmazonHandler` public methods | NEW test file: `tests/unit/site-handlers/amazon-handler.test.js` |
| apple-handler.js | `window.VSC.AppleHandler` public methods | NEW test file: `tests/unit/site-handlers/apple-handler.test.js` |
| facebook-handler.js | `window.VSC.FacebookHandler` public methods | NEW test file: `tests/unit/site-handlers/facebook-handler.test.js` |

## Group G — UI surface (controls, shadow-dom, drag-handler, options, popup)

| Module | Seam | Notes |
|---|---|---|
| controls.js | `window.VSC.Controls` constructor + public methods; DOM elements emitted | Extend/new tests |
| shadow-dom.js | `window.VSC.ShadowDomController` or shadow root creation function | Extend existing tests |
| drag-handler.js | `window.VSC.DragHandler` or exported drag-setup function; mouse event simulation | NEW test file |
| options.js | Function-level seams exported or on `window`; DOMContentLoaded logic | ASSUMED BROWSER-ONLY — adjudication agent |
| popup.js | Same as options.js | ASSUMED BROWSER-ONLY — adjudication agent |

## Group H — Service-worker and side-scripts (background.js, gif-file-fetcher.js, netflix.js scripts)

| Module | Seam | Notes |
|---|---|---|
| background.js | No seam available in JSDOM (requires chrome.runtime.onInstalled, chrome.tabs) | ASSUMED BROWSER-ONLY — adjudication agent |
| gif-file-fetcher.js | Runs in chrome-extension:// iframe; no JSDOM seam | ASSUMED BROWSER-ONLY — adjudication agent |
| src/site-handlers/scripts/netflix.js | Inline script, 7 lines | Adjudication: likely DEAD-CODE or BROWSER-ONLY |

---

## Uncovered range reference (baseline 2026-11-01)

Pulled from docs/coverage/baseline.json — use `npm run coverage` to verify current state.

Key ranges needing tests:
- gif-controller.js: lines 82+, 685-757, 760-779, 782-866 (animation loop, canvas, overlay)
- drag-handler.js: lines 15-58 (ALL functions at 29%)
- action-handler.js: lines 458, 512-533, 542-550, 557-566
- settings.js: lines 139-141, 156-157, 166-269
- video-controller.js: lines 349-367, 374-410, 426-427
- inject.js: lines 90, 692-693, 701-705, 714-715
- site-handlers: each has lines 24-100 range uncovered
