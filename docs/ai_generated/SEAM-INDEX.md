---
team: Team-L
agent: L3 SEAM-INDEX
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
module-count: 25
seam-cards:
  - gif-controller
  - inject
  - injector
  - settings
  - gif-observer
  - mutation-observer
---

# SEAM-INDEX

Single canonical source of truth for the Video Speed Controller module dependency graph.

---

## 1. Module Load Order

Source of truth: `src/content/injector.js:injectModules@e904370` lines 37–63 + line 85.

Modules are injected sequentially via `await injectScript(src)`. Order is critical:
each module reads `window.VSC.*` globals set by earlier modules.

| # | File | window.VSC registration |
|---|------|------------------------|
| 1 | `src/utils/constants.js` | `window.VSC.Constants` |
| 2 | `src/utils/logger.js` | `window.VSC.logger` |
| 3 | `src/utils/debug-helper.js` | `window.VSC.DebugHelper` |
| 4 | `src/utils/dom-utils.js` | `window.VSC.DomUtils` |
| 5 | `src/utils/event-manager.js` | `window.VSC.EventManager` |
| 6 | `src/core/storage-manager.js` | `window.VSC.StorageManager` |
| 7 | `src/core/settings.js` | `window.VSC.videoSpeedConfig`, `window.VSC.VideoSpeedConfig` |
| 8 | `src/observers/media-observer.js` | `window.VSC.MediaElementObserver` |
| 9 | `src/observers/mutation-observer.js` | `window.VSC.VideoMutationObserver` |
| 10 | `src/core/action-handler.js` | `window.VSC.ActionHandler` |
| 11 | `src/core/video-controller.js` | `window.VSC.VideoController` |
| 12 | `src/ui/controls.js` | `window.VSC.ControlsManager` |
| 13 | `src/ui/drag-handler.js` | `window.VSC.DragHandler` |
| 14 | `src/ui/shadow-dom.js` | `window.VSC.ShadowDOMManager` |
| 15 | `src/site-handlers/base-handler.js` | `window.VSC.BaseSiteHandler` |
| 16 | `src/site-handlers/netflix-handler.js` | `window.VSC.NetflixHandler` |
| 17 | `src/site-handlers/youtube-handler.js` | `window.VSC.YouTubeHandler` |
| 18 | `src/site-handlers/facebook-handler.js` | `window.VSC.FacebookHandler` |
| 19 | `src/site-handlers/amazon-handler.js` | `window.VSC.AmazonHandler` |
| 20 | `src/site-handlers/apple-handler.js` | `window.VSC.AppleHandler` |
| 21 | `src/site-handlers/index.js` | `window.VSC.siteHandlerManager` |
| 22 | `src/lib/gifuct-js.min.js` | `window.__VSC_gifuct` |
| 23 | `src/core/gif-frame-engine.js` | `window.VSC.GifFrameCache`, `window.VSC.GifFrameEngine` |
| 24 | `src/observers/gif-observer.js` | `window.VSC.GifObserver`, `window.VSC.gifFetchFailCache` |
| 25 | `src/core/gif-controller.js` | `window.VSC.GifController` |
| 26 | `src/content/inject.js` | `window.VideoSpeedExtension`, `window.videoSpeedExtension` |

After module injection: `injectUserSettings()` (line 86) dispatches `VSC_USER_SETTINGS`
CustomEvent to the page world, delivering all `chrome.storage.sync` settings to `StorageManager`.

Note: `src/module-loader.js` is listed in `web_accessible_resources` but is NOT in the
injection array and has no callers in any production module. It is dead code.
OBSERVED: `src/content/injector.js:37–63@e904370`.

---

## 2. window.VSC Registry

All 29 properties registered on `window.VSC` in the production injection path.
Source: `docs/ai_generated/structure-initiative/02-architecture/B-architecture.md` (B2).

| Global | Type | Registered in | Consumed by |
|--------|------|---------------|-------------|
| `window.VSC` (namespace) | Object | `src/utils/constants.js:1` | All modules |
| `window.VSC.Constants` | Object | `src/utils/constants.js:9` | settings.js, action-handler.js, gif-controller.js, gif-frame-engine.js, gif-observer.js, inject.js |
| `window.VSC.logger` | Logger instance | `src/utils/logger.js:107` | All modules |
| `window.VSC.DebugHelper` | Class | `src/utils/debug-helper.js:397` | Dev/debug only (not production path) |
| `window.VSC.DomUtils` | Object (functions) | `src/utils/dom-utils.js:7` | inject.js, mutation-observer.js, action-handler.js |
| `window.VSC.EventManager` | Class | `src/utils/event-manager.js:319` | inject.js:25 |
| `window.VSC.StorageManager` | Class (static) | `src/core/storage-manager.js:163` | settings.js |
| `window.VSC.videoSpeedConfig` | VideoSpeedConfig instance | `src/core/settings.js:304` | inject.js:37, inject.js:495 |
| `window.VSC.VideoSpeedConfig` | Class (constructor) | `src/core/settings.js:307` | options.js |
| `window.VSC.MediaElementObserver` | Class | `src/observers/media-observer.js:290` | inject.js:31 |
| `window.VSC.VideoMutationObserver` | Class | `src/observers/mutation-observer.js:351` | inject.js:30 |
| `window.VSC.ActionHandler` | Class | `src/core/action-handler.js:566` | inject.js:24 |
| `window.VSC.VideoController` | Class | `src/core/video-controller.js:430` | inject.js:23 |
| `window.VSC.ControlsManager` | Class | `src/ui/controls.js:131` | video-controller.js, gif-controller.js |
| `window.VSC.DragHandler` | Object/Class | `src/ui/drag-handler.js:60` | action-handler.js:163,277 |
| `window.VSC.ShadowDOMManager` | Class | `src/ui/shadow-dom.js:248` | video-controller.js:108, gif-controller.js:606 |
| `window.VSC.BaseSiteHandler` | Class | `src/site-handlers/base-handler.js:96` | site handler subclasses |
| `window.VSC.NetflixHandler` | Class | `src/site-handlers/netflix-handler.js:100` | site-handlers/index.js |
| `window.VSC.YouTubeHandler` | Class | `src/site-handlers/youtube-handler.js:120` | site-handlers/index.js |
| `window.VSC.FacebookHandler` | Class | `src/site-handlers/facebook-handler.js:142` | site-handlers/index.js |
| `window.VSC.AmazonHandler` | Class | `src/site-handlers/amazon-handler.js:69` | site-handlers/index.js |
| `window.VSC.AppleHandler` | Class | `src/site-handlers/apple-handler.js:60` | site-handlers/index.js |
| `window.VSC.siteHandlerManager` | SiteHandlerManager instance | `src/site-handlers/index.js:128` | inject.js:29 |
| `window.VSC.GifFrameCache` | Object (memory budget) | `src/core/gif-frame-engine.js:10` | gif-controller.js:140,151,159,285,333,763 |
| `window.VSC.GifFrameEngine` | Class (static) | `src/core/gif-frame-engine.js:47` | gif-controller.js:526 |
| `window.VSC.gifFetchFailCache` | Map | `src/observers/gif-observer.js:10` | gif-controller.js:82,87,407,429 |
| `window.VSC.GifObserver` | Object (3 functions) | `src/observers/gif-observer.js:56` | gif-controller.js:59, mutation-observer.js:112,238 |
| `window.VSC.GifController` | Class | `src/core/gif-controller.js:804` | inject.js:370 |
| `window.__VSC_gifuct` | Object (vendor lib) | `src/lib/gifuct-js.min.js:4` | gif-controller.js:108,147,664,665 |
| `window.VideoSpeedExtension` | Class (test export) | `src/content/inject.js:604` | E2E tests only |
| `window.videoSpeedExtension` | Instance (test export) | `src/content/inject.js:605` | E2E tests, debug-helper.js:84 |

---

## 3. Seam Cards Index

| Module | Seam card | Protected behaviors |
|--------|-----------|---------------------|
| `src/core/gif-controller.js` | [gif-controller.seam.md](seams/gif-controller.seam.md) | P2, P3, P5, P6, P7, P8, P13 |
| `src/content/inject.js` | [inject.seam.md](seams/inject.seam.md) | P4, P12 |
| `src/content/injector.js` | [injector.seam.md](seams/injector.seam.md) | P10, P11, P14 |
| `src/core/settings.js` | [settings.seam.md](seams/settings.seam.md) | (settings persistence path) |
| `src/observers/gif-observer.js` | [gif-observer.seam.md](seams/gif-observer.seam.md) | P2 (vscGifIgnore read), P14 (gifFetchFailCache) |
| `src/observers/mutation-observer.js` | [mutation-observer.seam.md](seams/mutation-observer.seam.md) | P2, P4 (sentinel check), P6 (teardown guard) |

---

## 4. IPC Crossing Points

Three mechanisms cross between worlds. All are CustomEvent or postMessage — no direct
function calls cross world boundaries.

### 4.1 CustomEvent (window.dispatchEvent / window.addEventListener)

Used for page-main ↔ content-isolated communication.

| Event | Direction | Sender file:line | Receiver file:line |
|-------|-----------|------------------|--------------------|
| `VSC_USER_SETTINGS` | isolated → main | injector.js:284 | storage-manager.js:17 |
| `VSC_SAVE_SETTINGS` | main → isolated | storage-manager.js:109 | injector.js:144 |
| `VSC_MESSAGE` | isolated → main | injector.js:132 | inject.js:476 |
| `VSC_CONTROLLER_CREATED` | main → isolated | gif-controller.js:322, video-controller.js:418 | injector.js:235 |
| `VSC_CONTROLLER_REMOVED` | main → isolated | gif-controller.js:794 | injector.js:253 |
| `VSC_FETCH_GIF_BYTES` | main → isolated | gif-controller.js:392 | injector.js:222 |

### 4.2 postMessage (iframe ↔ parent window)

Used for file:// GIF fetch proxy. Only active on `file://` pages.

| Message type | Direction | Sender file:line | Receiver file:line |
|--------------|-----------|------------------|--------------------|
| `VSC_GIF_FETCH_REQUEST` | isolated → gif-file-fetcher iframe | injector.js:203 | gif-file-fetcher.js:14 |
| `VSC_GIF_BYTES_RESPONSE` | iframe → page main world | gif-file-fetcher.js:33,39,48,55,64 | gif-controller.js:364 |
| `VSC_GIF_FETCHER_READY` | iframe → isolated | gif-file-fetcher.js:72 | injector.js:215 |

### 4.3 chrome.runtime (content script ↔ service worker ↔ popup)

Used for icon badge management and popup commands.

| Message type | Direction | Sender | Receiver |
|--------------|-----------|--------|----------|
| `VSC_CONTROLLER_CREATED` | isolated → service worker | injector.js:239 | background.js:66 |
| `VSC_CONTROLLER_REMOVED` | isolated → service worker | injector.js:257 | background.js:78 |
| `VSC_QUERY_ACTIVE_CONTROLLERS` | popup → service worker | popup JS | background.js:95 |
| Speed/control commands | popup → isolated → main | popup JS → injector.js:128 → inject.js:476 | bridged via `VSC_MESSAGE` CustomEvent |

---

## 5. Web-Accessible Resources (WAR Entries)

Source: `manifest.json:58–80@e904370`.

The WAR block uses glob patterns (not explicit file lists), covering all injected modules:

| Pattern | Files covered |
|---------|---------------|
| `src/styles/inject.css` | Injected stylesheet |
| `src/styles/shadow.css` | Shadow DOM stylesheet |
| `src/module-loader.js` | Dead code (never injected in production) |
| `src/core/*.js` | action-handler, gif-controller, gif-frame-engine, settings, storage-manager, video-controller |
| `src/utils/*.js` | constants, debug-helper, dom-utils, event-manager, logger |
| `src/ui/*.js` | controls, drag-handler, shadow-dom |
| `src/observers/*.js` | gif-observer, media-observer, mutation-observer |
| `src/site-handlers/*.js` | base-handler, netflix-handler, youtube-handler, facebook-handler, amazon-handler, apple-handler, index |
| `src/site-handlers/scripts/*.js` | netflix.js (conditionally injected) |
| `src/content/*.js` | inject.js, injector.js |
| `src/lib/*.js` | gifuct-js.min.js |
| `src/gif-file-fetcher.html` | iframe page for file:// GIF proxy |
| `src/gif-file-fetcher.js` | XHR worker inside the iframe |

All patterns match: `http://*/*`, `https://*/*`, `file:///*`.

The `host_permissions` field adds `file://*` — required for the GIF iframe proxy to
XHR local files (user must also enable "Allow access to file URLs" in chrome://extensions/).

---

## 6. Dead Code Notes

- `src/module-loader.js` — in WAR list and on disk but never injected. Registers
  `window.VSC_MODULES`, `window.defineModule`, `window.loadModule` — none called anywhere.
  OBSERVED: `B-architecture.md` B2, module-loader status section.

- `StorageManager.onChanged` — defined at `src/core/storage-manager.js:153` but has
  zero callers; live settings changes from the options page are not propagated to running
  content scripts. OBSERVED: B-architecture.md B4.
