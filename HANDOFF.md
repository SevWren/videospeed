# Video Speed Controller — Full Session Handoff Document

**Repository**: https://github.com/SevWren/videospeed
**Branch**: `master`
**HEAD commit**: `144746a` — *chore: remove keybinding diagnostic system (dead debug code)*
**Session date**: 2026-10-25 → 2026-10-26
**Test status at handoff**: **133 / 133 passing (100%)**
**Working directory in sandbox**: `/home/vercel-sandbox/videospeed`

---

## 1. Project Identity

Video Speed Controller is a Chrome WebExtension (Manifest V3) that:

- Attaches a floating speed-control UI to every HTML `<video>` and `<audio>` element on a page
- Controls playback speed of animated GIFs via **canvas replacement** (not the `playbackRate` HTMLMediaElement API — GIFs don't have that)
- Supports per-site handlers for YouTube, Netflix, Amazon, Apple TV+, and Facebook
- Language: vanilla JavaScript ES modules loaded sequentially by the content script injector
- Version: `0.9.1` (manifest) / `0.8.0` (package.json) — discrepancy is pre-existing, do not change without user instruction
- License: MIT

---

## 2. Repository Structure

```
videospeed/
├── src/
│   ├── content/
│   │   ├── inject.js          ← Main extension class (VideoSpeedExtension)
│   │   └── injector.js        ← Content script: injects modules, bridges messages, proxies file:// GIF fetches
│   ├── core/
│   │   ├── action-handler.js  ← Dispatches actions (faster/slower/reset etc.)
│   │   ├── gif-controller.js  ← GIF canvas replacement, rAF loop, speed control, memory budget
│   │   ├── gif-frame-engine.js← GifFrameCache singleton + GifFrameEngine.effectiveDelay()
│   │   ├── settings.js        ← Config class (load/save to chrome.storage.sync)
│   │   ├── storage-manager.js ← Low-level chrome.storage wrapper
│   │   └── video-controller.js← Video controller (attaches UI to <video>/<audio>)
│   ├── observers/
│   │   ├── gif-observer.js    ← isGifSrc(), isGifElement(), detectGifsInDOM()
│   │   ├── media-observer.js  ← scanForMedia, scanForGifs, isValidMediaElement
│   │   └── mutation-observer.js← VideoMutationObserver watches DOM for add/remove/src changes
│   ├── site-handlers/
│   │   ├── base-handler.js
│   │   ├── youtube-handler.js
│   │   ├── netflix-handler.js
│   │   ├── amazon-handler.js
│   │   ├── apple-handler.js
│   │   ├── facebook-handler.js
│   │   └── index.js
│   ├── ui/
│   │   ├── controls.js
│   │   ├── drag-handler.js
│   │   ├── shadow-dom.js
│   │   ├── options/options.html + options.js
│   │   └── popup/popup.html
│   ├── utils/
│   │   ├── constants.js       ← DEFAULT_SETTINGS, SPEED_LIMITS, GIF constants
│   │   ├── dom-utils.js
│   │   ├── event-manager.js
│   │   ├── logger.js
│   │   └── debug-helper.js
│   ├── lib/
│   │   └── gifuct-js.min.js   ← Vendored GIF decoder; exposed as window.__VSC_gifuct
│   ├── background.js          ← MV3 service worker (icon badge management)
│   ├── gif-file-fetcher.html  ← NEW: extension page iframed to proxy file:// GIF fetches
│   ├── gif-file-fetcher.js    ← NEW: runs inside the iframe; does XHR to file:// URL
│   └── styles/
│       ├── inject.css
│       └── shadow.css
├── tests/
│   ├── unit/core/
│   │   ├── gif-controller.test.js
│   │   ├── gif-frame-engine.test.js
│   │   ├── action-handler-gif.test.js
│   │   ├── action-handler.test.js
│   │   ├── settings.test.js
│   │   └── video-controller.test.js
│   ├── unit/observers/
│   │   ├── gif-observer.test.js
│   │   └── mutation-observer.test.js
│   ├── unit/content/
│   │   └── inject.test.js
│   ├── unit/utils/
│   │   ├── blacklist-regex.test.js
│   │   └── recursive-shadow-dom.test.js
│   ├── unit/core/
│   │   ├── f-keys.test.js
│   │   ├── icon-integration.test.js
│   │   └── keyboard-shortcuts-saving.test.js
│   ├── integration/
│   │   ├── gif-integration.test.js
│   │   └── module-integration.test.js
│   ├── helpers/
│   │   ├── module-loader.js
│   │   └── test-utils.js
│   └── run-tests.js
├── docs/ai_generated/         ← AI-generated documentation
├── CLAUDE.md                  ← Per-repo agent instructions
├── CONTEXT.md                 ← Domain glossary (key terms defined here)
├── README.md
├── CONTRIBUTING.md
├── manifest.json
└── package.json
```

---

## 3. manifest.json — Key Fields

```json
{
  "name": "Video Speed Controller-AI-Fix",
  "version": "0.9.1",
  "manifest_version": 3,
  "permissions": ["storage", "activeTab", "tabs"],
  "host_permissions": ["file://*"],
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*", "file:///*"],
    "js": ["src/content/injector.js"]
  }],
  "web_accessible_resources": [{
    "resources": ["src/core/*.js", "src/lib/*.js", ... "src/gif-file-fetcher.html", "src/gif-file-fetcher.js"],
    "matches": ["http://*/*", "https://*/*", "file:///*"]
  }]
}
```

**Critical**: `host_permissions: ["file://*"]` is required for the GIF iframe proxy. `file:///*` in content_scripts matches and web_accessible_resources is also required. These were added during this session.

---

## 4. Session Overview — What Was Built

This session implemented GitHub Issue #8: **GIF playback speed control**.

### 4.1 Initial Feature (commit `914b85c`, 2026-10-25 05:03 UTC)

GIF speed control implemented via canvas replacement:
- `src/core/gif-controller.js` — `GifController` class
- `src/core/gif-frame-engine.js` — `GifFrameCache` singleton + `GifFrameEngine.effectiveDelay()`
- `src/observers/gif-observer.js` — `isGifSrc()`, `isGifElement()`, `detectGifsInDOM()`
- New tests: `gif-controller.test.js`, `gif-frame-engine.test.js`, `gif-observer.test.js`, `action-handler-gif.test.js`, `gif-integration.test.js`

### 4.2 Post-Implementation Bug Fixes (commits `1ba6510` through `c0286de`)

Multiple passes of forensic investigation found and fixed bugs including:
- GIF speed control frozen at slow speeds
- Wheel changes not persisted
- Memory budget guard issues
- Lazy-loaded / WebP-served image detection
- Passive touchstart listener warning
- Various race conditions

### 4.3 GIF Loops All GIFs (commit `bbdc668`)

Fixed GIF speed control working for SOME but not ALL GIFs.

### 4.4 Black Artifacts During Playback (commits `401c11d`, `aa83609`)

Two separate black artifact causes fixed:
1. `putImageData()` writing raw RGBA bytes ignored compositeOperation — transparent pixels showed as black. Fixed by routing through an offscreen `_patchCanvas` + `drawImage()` (source-over compositing).
2. `disposal=2` handler called `clearRect()` which erased background fills. Fixed by filling with `_bgColor` instead.

### 4.5 Local file:// GIF Support (commits `3f383bf` → `9fe70db`)

**Problem**: GIF speed control worked for `file:///D:/path.mp4` (videos) but NOT for `file:///D:/path.gif`.

**Three-attempt fix evolution:**

**Attempt 1 (`3f383bf`)**: Direct XHR from page script:
- Changed `fetch(..., {mode: 'cors'})` to `XMLHttpRequest` for `file://` URLs
- Fixed `origin = 'null'` cache poisoning (all local files sharing one cache key)
- Skipped Content-Type check for file:// (no HTTP headers on file:// responses)
- FAILED: Page scripts on `file://` pages run with `origin: null`. Chrome blocks XHR from null origin.

**Attempt 2 (`b34eaa4`, `2973d0c`)**: Content-script bridge:
- Added `VSC_FETCH_GIF_BYTES` CustomEvent bridge in `injector.js`
- Content script (isolated world) receives the event, does XHR, posts back via `window.postMessage`
- FAILED: Content scripts on `file://` pages ALSO get `origin: null` in Chrome's implementation. Same CORS block.

**Attempt 3 (`9fe70db`) — THE WORKING SOLUTION**:

Root cause: Chrome assigns origin `null` to ALL XHR/fetch from scripts running on a `file://` page — including content scripts in the extension's isolated world. Chrome blocks cross-origin XHR from null origin.

Fix: A hidden `<iframe src="chrome-extension://...gif-file-fetcher.html">` is embedded in the page. This iframe runs at `chrome-extension://` origin — which IS in Chrome's allowed list. From that context, XHR to `file://` URLs succeeds (given "Allow access to file URLs" is enabled in chrome://extensions/).

**New files created in this commit**:
- `src/gif-file-fetcher.html` — the extension page that the iframe loads
- `src/gif-file-fetcher.js` — XHR worker; receives `VSC_GIF_FETCH_REQUEST` via `postMessage`, sends `VSC_GIF_BYTES_RESPONSE` back to `window.parent`

**Modified**:
- `manifest.json` — added `host_permissions: ["file://*"]`; added both new files to `web_accessible_resources`; added `file:///*` to content_script matches and web_accessible_resources matches
- `injector.js` — replaced old bridge with `setupFileGifFetcherProxy()` IIFE that: only activates on `file://` pages, lazily creates the iframe, queues requests until `VSC_GIF_FETCHER_READY` fires, then flushes

**gif-controller.js** `_fetchGifBytes()` still dispatches `VSC_FETCH_GIF_BYTES` CustomEvent and listens for `VSC_GIF_BYTES_RESPONSE` via `window.addEventListener('message')` — this contract is unchanged from Attempt 2, only the bridge implementation changed.

### 4.6 Canvas-Replacement Teardown Race Fixes (commits `9a5de5e`, `794a3e7`)

**Problem**: GIF controller appeared briefly then disappeared. Console showed `Controller created → Controller removed`.

**Root cause 1 (`9a5de5e`)**: `MutationObserver` fires for the `<img>` removal during canvas-replacement (rIC delay up to 2s). By then `img.gifController` is a real object with `.remove()`. The observer called `onGifRemoved`, tearing down the new controller.

Fix in `mutation-observer.js`: In the IMG removal branch, skip `onGifRemoved` if the GIF controller's canvas is still in the DOM (`node.gifController._canvas && document.body?.contains(gc._canvas)`). Canvas alive = img removal was intentional canvas-replacement; skip teardown.

**Root cause 2 (`794a3e7`)**: `onGifFound` in `inject.js` checked `!document.body.contains(img)` after the async `await GifController.create()`. `create()` always removes the `<img>` from DOM (canvas replacement), so this was always true, calling `gc.remove()` immediately.

Fix in `inject.js`: When img is absent from DOM, ALSO check whether the canvas is still present. Only call `gc.remove()` if both img AND canvas are gone.

### 4.7 Loop Count Fix (commit `4bac82d`)

**Problem**: GIFs stopped after exactly one full cycle.

**Root cause**: `gifuct` returns `undefined`/`null` for `loopCount` when a GIF has no Netscape extension. Previous code defaulted to `1`, halting after one cycle. All browsers treat missing loop extension as infinite.

Fix: `gc._loopCount = (parsed.loopCount == null) ? 0 : parsed.loopCount;` (0 = infinite in GIF spec).

### 4.8 Visual Rendering Fixes (commit `7e967f7`)

Four rendering issues fixed in one commit:

1. **Composite background**: Composite canvas started transparent. GIFs using `alpha=0` pixels to mean "show background" rendered as black. Fix: store `_bgColor` from `parsed.lsd.backgroundColorIndex + parsed.gct` at create time; pre-fill composite canvas.

2. **Disposal-type-2 background**: `disposal=2` handler used `clearRect()` erasing the background fill. Fix: when `_bgColor` available, use `fillStyle = rgb(r,g,b); fillRect()` instead.

3. **First-frame blank**: RAF loop did not draw frame 0 until `rawElapsed >= effectiveDelay`. Fix: `gc._drawFrame(0)` called synchronously in `create()` before starting RAF.

4. **Redundant comprehensive scan**: `deferredMediaScan` used `||` instead of `&&` in the "nothing found" guard, triggering a 1-second re-scan on every file:// GIF page. Fix: changed to `&&`.

### 4.9 Dead Code Removal (commit `144746a`)

Removed the entire keybinding diagnostic system (added earlier in the session for debugging):
- `event-manager.js`: removed `shouldLogKeyBindingDiagnostic()`, `logKeyBindingDiagnostic()`, `summarizeElement()`, `getKeyBindingDiagnosticSummary()`, all `logDiagnostic` guard blocks
- `action-handler.js`: removed same diagnostic functions + `const before = summarizeMediaElement()`
- `injector.js`: removed keydown spy listener and `VSC_KEYBINDING_DIAGNOSTIC` mirror listener

---

## 5. Complete Session Commit Log (HEAD → start of session)

| Hash | Date (UTC) | Message |
|------|-----------|---------|
| `144746a` | 2026-10-26 05:20 | chore: remove keybinding diagnostic system (dead debug code) |
| `7e967f7` | 2026-10-26 04:38 | fix: correct GIF visual rendering — background colour, disposal-2, first-frame |
| `4bac82d` | 2026-10-26 03:56 | fix: default loopCount to 0 (infinite) when GIF has no Netscape extension |
| `794a3e7` | 2026-10-26 03:05 | fix: don't tear down gif controller when img is absent from DOM post-canvas-replacement |
| `9a5de5e` | 2026-10-26 02:53 | fix: stop mutation-observer from destroying gif controller after canvas-replacement |
| `9fe70db` | 2026-10-26 02:29 | fix: proxy file:// GIF fetches through chrome-extension:// iframe ← **THE WORKING file:// FIX** |
| `b34eaa4` | 2026-10-26 02:12 | fix: route file:// GIF byte fetches through content-script bridge ← SUPERSEDED (kept in history) |
| `2973d0c` | 2026-10-25 20:18 | fix: harden file:// XHR path and add test coverage (review remediation) ← SUPERSEDED |
| `c126d35` | 2026-10-25 15:16 | simultaneous work alongside claude code investigating bugs |
| `3f383bf` | 2026-10-25 20:15 | fix: support local file:// GIFs (file:///D:/path/to/animation.gif) ← SUPERSEDED |
| `2b2a791` | 2026-10-25 15:15 | chore(clean remote) - added entries that should never be pushed to remote |
| `8062bef` | 2026-10-25 14:43 | Merge branch 'master' of https://github.com/SevWren/videospeed |
| `ff6a511` | 2026-10-25 14:33 | chore - refreshed manifest so that the extension name/title is a descriptive identifier |
| `c0286de` | 2026-10-25 19:21 | fix: remediate 3 incompletely resolved bugs found by investigation audit |
| `17f05f7` | 2026-10-25 19:13 | fix: enterprise-grade forensic resolution of 76 critical bugs (Phase 3) |
| `9a72655` | 2026-10-25 18:55 | docs: second sweep — options UI, popup, and pip-research docs |
| `3032982` | 2026-10-25 18:54 | docs: refresh all documentation for GIF playback speed control feature |
| `aa83609` | 2026-10-25 18:30 | fix: black artifacts from disposal=2 filling composite with opaque background colour |
| `401c11d` | 2026-10-25 18:23 | fix: black artifacts in GIF playback from putImageData erasing transparent pixels |
| `414c6a2` | 2026-10-25 17:40 | fix: GIF controller missing on lazy-loaded and WebP-served images |
| `bbdc668` | 2026-10-25 17:37 | fix: GIF speed control frozen at slow speeds and wheel changes not persisted |
| `1893eac` | 2026-10-25 17:33 | fix: passive touchstart listener and GIF memory budget guards |
| `1ba6510` | 2026-10-25 06:17 | fix: address bugs identified by post-implementation analysis |
| `914b85c` | 2026-10-25 05:03 | feat: GIF playback speed control via canvas replacement (issue #8) ← **INITIAL FEATURE** |

---

## 6. Current State of Key Files

### 6.1 `src/core/gif-controller.js` (806 lines)

**GifController static factory `create(imgElement, parent, config, actionHandler)`**:
1. Guards: `controlGifs` setting, resolved src, `gifFetchFailCache` (origin-keyed; file:// URLs get `origin=null` so cache is NOT consulted for local files)
2. Calls `_fetchGifBytes(resolvedSrc, origin)` — async, handles data:, file://, and https:// protocols
3. Parses with `window.__VSC_gifuct.parseGIF()`, decompresses with `decompressFrames()`
4. Extracts `_bgColor` from `parsed.lsd.backgroundColorIndex + parsed.gct`
5. Memory check: per-GIF 50MB limit (`GIF_FRAME_CACHE_LIMIT_BYTES`), global 200MB budget (`GifFrameCache.tryAllocate()`)
6. Creates visible `<canvas>` + offscreen composite `<canvas>` (+ `_patchCanvas` for frame compositing)
7. Pre-fills composite with `_bgColor` if available
8. DOM insertion: if parent is `<picture>`, hides the `<img>` instead of removing it (`_inPicture = true`)
9. Optionally wraps canvas in a `<span style="position:relative">` (`_positionWrapper`) for unpositioned ancestors
10. Registers with `config.addGifElement(img)`, sets `img.gifController = gc`
11. Calls `_initializeControls()` — creates Shadow DOM overlay via `ShadowDOMManager`
12. Draws frame 0 synchronously (`_drawFrame(0)`), advances `_frameIdx` to 1
13. Starts RAF loop via `_startRafLoop()`
14. Sets up `IntersectionObserver` (30s off-screen pause → frame eviction + re-decode on return)
15. Sets up `MutationObserver` on `img.src` for src-change teardown (`_setupTargetObserver`)
16. Dispatches `VSC_CONTROLLER_CREATED` event

**`_fetchGifBytes(src, origin)`** (static):
- `data:` URI: decoded from base64 inline
- `file://` URL: dispatches `VSC_FETCH_GIF_BYTES` CustomEvent; listens for `VSC_GIF_BYTES_RESPONSE` on `window.message`; 10s outer timeout
- All other URLs: `fetch(src, {mode:'cors', cache:'default'})` + content-type check

**`_drawFrame(frameIndex)`**:
- Handles `disposal=2` by filling with `_bgColor` (or `clearRect` if no bg color)
- Handles `disposal=3` via `getImageData`/`putImageData` save/restore
- Routes patches through `_patchCanvas` + `drawImage()` (source-over compositing — critical for correct transparency)
- Copies composite to visible canvas via `drawImage(_compositeCanvas)`

**`_tick(timestamp)`**: RAF callback; compares elapsed vs `effectiveDelay`; enforces overshoot cap to one `effectiveDelay` (prevents burst after tab backgrounding); respects `_loopCount` (0 = infinite).

**`remove()`**: Full teardown — stops RAF, disconnects IntersectionObserver + target MutationObserver, releases memory budget, sets `img._vscTeardownSrc = img.src`, sets `img.vscGifIgnore = true`, re-inserts `<img>` (or restores picture visibility), removes canvas, removes controller div, calls `config.removeGifElement(img)`, deletes `img.gifController`, dispatches `VSC_CONTROLLER_REMOVED`.

### 6.2 `src/content/injector.js` (320 lines)

Module injection sequence (ORDER MATTERS):
```
constants.js → logger.js → debug-helper.js → dom-utils.js → event-manager.js →
storage-manager.js → settings.js → media-observer.js → mutation-observer.js →
action-handler.js → video-controller.js → controls.js → drag-handler.js →
shadow-dom.js → base-handler.js → netflix-handler.js → youtube-handler.js →
facebook-handler.js → amazon-handler.js → apple-handler.js → index.js →
gifuct-js.min.js → gif-frame-engine.js → gif-observer.js → gif-controller.js →
[site-specific scripts] → inject.js
```

After modules: `injectUserSettings()` fires `VSC_USER_SETTINGS` event with all chrome.storage.sync settings.

**`setupFileGifFetcherProxy()`** IIFE (lines 183–232):
- Only runs on `file://` pages
- Lazily creates `<iframe src="chrome-extension://.../gif-file-fetcher.html">` (display:none, aria-hidden)
- Listens for `VSC_GIF_FETCHER_READY` message from iframe, then flushes pending queue
- Listens for `VSC_FETCH_GIF_BYTES` CustomEvent from page (gif-controller.js), routes to iframe via `postMessage`
- Response messages (`VSC_GIF_BYTES_RESPONSE`) flow directly from iframe → parent window → gif-controller.js message handler (NOT re-dispatched by injector)

### 6.3 `src/gif-file-fetcher.js` (73 lines)

Runs inside the hidden iframe at `chrome-extension://` origin.
- Listens for `VSC_GIF_FETCH_REQUEST` via `window.addEventListener('message')`
- Does `XMLHttpRequest` to the file:// URL; `responseType = 'arraybuffer'`; 8s timeout
- `xhr.onload`: status 0 (file:// success) or 200–299; posts `VSC_GIF_BYTES_RESPONSE` with ArrayBuffer (transferred, not copied)
- `xhr.onerror`: posts `{success:false, error:'blocked'}` — user needs to enable "Allow access to file URLs"
- `xhr.ontimeout`: posts `{success:false, error:'timeout'}`
- On DOMContentLoaded: posts `VSC_GIF_FETCHER_READY` to parent

### 6.4 `src/observers/mutation-observer.js` (352 lines)

**`VideoMutationObserver` constructor** now accepts 6 args: `(config, onVideoFound, onVideoRemoved, mediaObserver, onGifFound, onGifRemoved)`. The 4-arg form (without gif callbacks) still works (backward compat — tested).

**`shadowObservers`**: Changed from `Set` to `Map` (shadowRoot → observer instance) so `stop()` can call `obs.disconnect()` on each.

**`checkForVideoAndShadowRoot(node, parent, added=false)`**:
- IMG removal path: skips `onGifRemoved` if `node.gifController._canvas && document.body?.contains(gc._canvas)` — canvas still in DOM means intentional canvas-replacement removal
- IMG removal path: also skips if `node.gifController.pending === true` (sentinel phase)
- IMG added path: checks `_vscTeardownSrc` and `vscGifIgnore` with `suppressedByIgnore` logic

**`processAttributeMutation`**: Handles `src` changes on IMG elements. Uses `_vscTeardownSrc` + `srcChangedSinceTeardown` + `suppressedByIgnore` to decide whether to call `onGifFound` or `onGifRemoved`.

### 6.5 `src/content/inject.js` (612 lines)

**`VideoSpeedExtension` class**:
- `_docInitialized` flag prevents double-initialization
- `onGifFound(img, parent)` async method:
  - Guards: `controlGifs`, `vscGifFailed`, existing `gifController`
  - `_vscTeardownSrc` logic: if src changed since teardown, clears flags and reattaches; if not changed, returns
  - Sets sentinel `{ pending: true, _cancelled: false }` on `img.gifController`
  - After `await GifController.create()`: if sentinel cancelled, calls `gc.remove()` immediately
  - If canvas is still in DOM but img is not (normal canvas-replacement), does NOT call `gc.remove()`
  - Only calls `gc.remove()` if BOTH img AND canvas are gone
- `deferredMediaScan`: fixed `||` → `&&` in comprehensive scan guard

### 6.6 `src/observers/gif-observer.js` (57 lines)

- `isGifSrc(src)`: regex `/\.gif([/?#]|$)/i` — handles query strings, fragments, directory paths correctly; also handles `data:image/gif` prefix
- `isGifElement(element)`: checks `element.src` and `element.currentSrc` via `isGifSrc`
- `detectGifsInDOM(doc)`: filters `querySelectorAll('img')` — requires `naturalWidth > 0 && naturalHeight > 0` (AND not OR) plus minimum `GIF_MIN_SIZE_PX` (20px)
- `window.VSC.gifFetchFailCache = new Map()` initialized here

### 6.7 `src/core/gif-frame-engine.js` (49 lines)

- `GifFrameCache` singleton: `tryAllocate(bytes)` / `releaseAllocation(bytes)` — atomic, no separate confirm step
- `GifFrameEngine.effectiveDelay(rawDelayMs, speed)`: enforces 10ms floor on both raw delay and result; `safeSpeed = speed > 0 ? speed : 1.0`

### 6.8 `src/utils/constants.js` (122 lines)

GIF-relevant constants:
```js
GIF_GLOBAL_MEMORY_BUDGET_BYTES = 200 * 1024 * 1024  // 200 MB global budget
GIF_FRAME_CACHE_LIMIT_BYTES    = 50 * 1024 * 1024   // 50 MB per-GIF limit
GIF_MIN_SIZE_PX                = 20                  // min dimension for GIF detection
GIF_SPEED_SAVE_DEBOUNCE_MS     = 500                 // debounce for saving speed to storage
```

Default settings added this session:
```js
controlGifs: true,       // GIF speed control enabled by default
lastGifSpeed: 1.0,       // persisted GIF speed
gifSpeedStep: 0.1,       // step size for GIF speed buttons
```

---

## 7. Critical Architectural Decisions (ADRs)

### ADR: Why iframe proxy for file:// GIFs

**Context**: Three approaches failed before the iframe proxy worked.

**Decision**: Use a hidden `<iframe>` at `chrome-extension://` origin to proxy `file://` byte fetches.

**Reasoning**:
- Page scripts (`inject.js`): run in the page's JavaScript context on a `file://` page. Chrome assigns `origin: null` to all XHR/fetch from the null origin. Blocked.
- Content scripts (`injector.js`): run in an isolated world, but still under the `file://` page. Chrome still assigns `origin: null`. Still blocked.
- Extension page iframe (`gif-file-fetcher.html`): runs at `chrome-extension://` origin. Chrome allows XHR to `file://` URLs FROM `chrome-extension://` origin (when "Allow access to file URLs" is checked). WORKS.

**Consequence**: The user MUST have "Allow access to file URLs" enabled in `chrome://extensions/` for local GIF speed control to work. The extension logs a clear warning if they don't: `"Local GIF blocked — enable 'Allow access to file URLs' in chrome://extensions/ to use GIF speed control on local files"`.

### ADR: Canvas Replacement vs. CSS Animation Speed

**Decision**: Replace `<img>` with `<canvas>` + RAF loop.

**Reasoning**: CSS `animation-duration` is not exposed or controllable by JavaScript. The only way to control GIF speed is to decode the raw bytes, extract frames, and re-render at a controlled rate. The `<img>` is removed and a canvas takes its visual place.

### ADR: Offscreen Patch Canvas for Frame Compositing

**Decision**: Route frame patches through a temporary `_patchCanvas` and use `drawImage()` instead of `putImageData()` directly onto the composite.

**Reasoning**: `putImageData()` writes raw RGBA bytes, ignoring `globalCompositeOperation`. Transparent pixels (alpha=0) in a patch frame are meant to "show the previous layer" (GIF's progressive compositing model). With `putImageData()`, those pixels ERASE the underlying composite pixels, producing black artifacts wherever a partial frame is transparent. `drawImage()` uses source-over blending, preserving underlying pixels where the patch is transparent.

---

## 8. Known Remaining Gaps / Potential Issues

1. **Blob URL GIFs** (`blob:...`): Not detected by `isGifSrc` (no `.gif` extension). Documented as a known limitation in `gif-observer.js`. No fix planned.

2. **SVG `<image>` elements**: Out of scope for v1. Documented.

3. **Content Security Policy (CSP)**: If a site's CSP blocks `canvas` or `blob:` resources, `GifController.create()` returns `null` (canvas 2D context unavailable). This is handled gracefully — the GIF just plays normally. No controller appears.

4. **The `file:///*` content script match** was added in `manifest.json` during this session. Verify this does not cause unexpected behavior on sites that previously had the extension silently inactive on file:// pages for video.

5. **Sentinel race condition**: The sentinel `{ pending: true, _cancelled: false }` correctly blocks double-attach. However, if `onGifFound` is called from both `deferredMediaScan` and `mutationObserver` for the same element within the same tick, the second call will see `img.gifController` (the sentinel) and bail out. This is correct behavior but depends on the sentinel being set synchronously before the first `await`.

6. **`gifuct-js.min.js` is vendored** and not on npm in the normal way. It is in `src/lib/`. Do not attempt to update it without thorough testing — the disposal type behavior, `loopCount` behavior, and `bgColor`/`gct` field availability all depend on this specific build.

7. **Documentation state**: `docs/ai_generated/` was updated during the session to reflect the GIF feature. Other docs like `README.md`, `CONTRIBUTING.md`, `PRIVACY.md` were also refreshed.

---

## 9. Test Suite

**Runner**: Custom Node + JSDOM runner (NOT Jest CLI). Started with `npm test`.

**Total**: 133 tests, 17 test files, 100% passing.

**GIF-specific test files**:
- `tests/unit/core/gif-controller.test.js` — `GifController.create()`, `_fetchGifBytes()`, file:// bridge protocol, sentinel, canvas replacement
- `tests/unit/core/gif-frame-engine.test.js` — `GifFrameCache`, `effectiveDelay()`
- `tests/unit/observers/gif-observer.test.js` — `isGifSrc()`, `isGifElement()`, `detectGifsInDOM()`
- `tests/unit/core/action-handler-gif.test.js` — GIF actions via action handler
- `tests/integration/gif-integration.test.js` — end-to-end GIF controller lifecycle

**Run tests**: `npm test` (or `npm run test:gif` for GIF-only)

---

## 10. Development Commands

```bash
npm test              # run all 133 tests
npm run test:gif      # GIF tests only
npm run test:unit     # unit tests only
npm run test:integration  # integration tests only
npm run lint          # ESLint
npm run lint:fix      # auto-fix lint
npm run format        # Prettier
npm run build         # lint:fix → format → test (full gate)
npm run zip           # package to dist/videospeed.zip
```

---

## 11. Loading Extension Locally

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. "Load unpacked" → select the `/home/vercel-sandbox/videospeed` directory (or the unzipped package)
4. **IMPORTANT for local GIF testing**: Enable "Allow access to file URLs" on the extension's card in `chrome://extensions/`
5. Navigate to a `file:///` path containing `.gif` images to test

**Testing local GIFs**:
- The extension needs `file:///*` in content_scripts matches (already in manifest)
- The iframe proxy only activates on `file://` pages (`if (!location.href.startsWith('file://')) return`)
- If "Allow access to file URLs" is NOT enabled, the XHR in the iframe fails with `onerror`, and the extension logs a clear console warning

---

## 12. Message Protocol Reference

### Between page scripts and content script (CustomEvents):

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `VSC_FETCH_GIF_BYTES` | page → content | `{ url: 'file://...', requestId }` | Request file bytes |
| `VSC_SAVE_SETTINGS` | page → content | settings object | Persist to chrome.storage.sync |
| `VSC_USER_SETTINGS` | content → page | all settings | Initial settings injection |
| `VSC_MESSAGE` | content → page | `{ type: 'VSC_*', ... }` | Popup → page bridge |
| `VSC_CONTROLLER_CREATED` | page → content | `{ controllerId }` | Icon badge update |
| `VSC_CONTROLLER_REMOVED` | page → content | `{ controllerId }` | Icon badge update |

### Between injector iframe and gif-file-fetcher iframe (postMessage):

| Message type | Direction | Payload | Purpose |
|--------------|-----------|---------|---------|
| `VSC_GIF_FETCH_REQUEST` | injector → iframe | `{ type, url, requestId }` | Request XHR |
| `VSC_GIF_BYTES_RESPONSE` | iframe → parent window | `{ type, requestId, success, bytes?, error? }` | XHR result |
| `VSC_GIF_FETCHER_READY` | iframe → parent window | `{ type }` | iframe loaded, flush queue |

---

## 13. GIF Controller State Machine

```
img element found (isGifElement)
  ↓
onGifFound(img, parent)
  ↓
img.gifController = sentinel { pending:true, _cancelled:false }
  ↓
await GifController.create(img, ...)   ← async, fetch + decode
  ├─ SUCCESS: img.gifController = real GifController instance
  │     canvas in DOM, rAF loop running
  │     img removed from DOM (or hidden if <picture>)
  ├─ FETCH FAILED: img.vscGifFailed = true; delete img.gifController
  └─ SENTINEL CANCELLED: gc.remove(); return
        (happens if mutation observer called remove() during await window)
  ↓
Running: RAF tick every effectiveDelay ms
  ↓
Speed change: gc.setSpeed(newSpeed); saved via _saveGifSpeedDebounced
  ↓
Off-screen (30s): _visibilityPaused=true; frames evicted; rawBuffer kept for re-decode
  ↓
Back on screen: re-decode frames, restart RAF
  ↓
img.src changes: _setupTargetObserver fires → gc.remove() → img._vscTeardownSrc set
  → onGifFound fires again with new src → new controller created
  ↓
Page unload: extension.cleanup() → gc.remove() for all GIF controllers
```

---

## 14. Variables/Properties on DOM Elements

| Property | Set on | Meaning |
|----------|--------|---------|
| `img.gifController` | `<img>` | Sentinel `{pending:true}` during create; real `GifController` after; deleted on remove |
| `img.vscGifIgnore` | `<img>` | Set by `gc.remove()` before re-inserting img; prevents immediate re-attach |
| `img._vscTeardownSrc` | `<img>` | Set to `img.src` at teardown moment; used to distinguish "same src" vs "new src" re-attach |
| `img.vscGifFailed` | `<img>` | Set when `create()` returns null; prevents repeated retry attempts on the same element |
| `canvas.vsc` | `<canvas>` | `{ div: gc.div }` — adapter for DragHandler compatibility |
| `video.vsc` | `<video>`/`<audio>` | `VideoController` instance |

---

## 15. Open Issues / Unfinished Work

- GitHub Issue #8 was the primary focus of this session. Based on session history, it was closed. Verify with `maton gh issues` or `gh issue view 8 --repo SevWren/videospeed`.
- No new GitHub issues were explicitly opened during this session for remaining gaps.
- The `docs/ai_generated/pip-research/` directory contains research on Picture-in-Picture hotkey support — this is a separate future feature that was researched but NOT implemented. Do not confuse with the GIF feature.

---

## 16. Gotchas for the Next LLM

1. **Do not re-attempt a direct XHR for file:// GIFs.** Three approaches were tried and failed. The iframe proxy (`gif-file-fetcher.html`) is the correct and working solution. Do not revert or replace it.

2. **`img.vscGifIgnore` and `img._vscTeardownSrc` work together.** `vscGifIgnore` alone would permanently suppress re-attach after a src change. The `_vscTeardownSrc` check in `onGifFound` and `processAttributeMutation` lets a new src bypass the ignore flag. Do not break this interaction.

3. **The sentinel pattern matters.** During the `await GifController.create()` window, the page can change. The sentinel on `img.gifController` blocks double-attach AND carries a `_cancelled` flag so late-arriving `remove()` calls (from mutation observer) can signal the in-flight create to abort.

4. **`putImageData()` vs `drawImage()` in `_drawFrame`.** If someone "optimizes" the patch canvas step back to direct `putImageData()` onto the composite canvas, black artifacts return. The indirection through `_patchCanvas` is not accidental — it is required for correct GIF compositing semantics.

5. **`loopCount = 0` means infinite** in the GIF spec (Netscape extension). `gifuct` returns `null`/`undefined` when the extension is absent; default to 0, not 1.

6. **`disposal=2` must fill with `_bgColor`, not clearRect.** Many GIFs use transparent pixels in subsequent frames that are meant to reveal the background color, not be transparent. `clearRect` produces black; `fillRect` with the LSD background color produces the correct result.

7. **The test runner is a custom Node+JSDOM runner**, not Jest. Do NOT add `jest.config.js` or run `npx jest`. Use `npm test`.

8. **Module load order in `injector.js` is critical.** Each file may depend on globals set by the previous one (all via `window.VSC.*`). Do not reorder or parallelize the injection sequence.

9. **`gh` CLI is not installed in this sandbox.** Use the Maton `api-gateway` skill or the Python `gh_app_token.py` script + curl for GitHub API calls.

10. **The sandbox is ephemeral.** Commit and push after every meaningful change. The repo remote is already configured with a token.
