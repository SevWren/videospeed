# Video Speed Controller

A Chrome WebExtension that attaches playback controls to every HTML media element on a page and controls the playback speed of animated GIFs, letting users change speed, seek, and toggle visibility via keyboard shortcuts.

## Language

### Core Playback

**Action**:
A discrete operation dispatched to one or more media elements. The user-facing set: `faster`, `slower`, `reset`, `fast`, `rewind`, `advance`, `pause`, `muted`, `louder`, `softer`, `mark`, `jump`, `display`, `blink`, `drag`. The internal message-driven set (dispatched via `MESSAGE_TYPES`): `SET_SPEED`, `ADJUST_SPEED`, `RESET_SPEED`. Actions are triggered by key bindings, controller buttons, or popup messages.
Note: GIF controllers support only a subset of user-facing actions (`faster`, `slower`, `reset`, `fast`, `display`, `pause`, `blink`). The actions `rewind`, `advance`, `muted`, `louder`, `softer`, `mark`, and `jump` are not supported for GIFs because GIFs have no timeline.
Note: The `blink` action temporarily reveals a hidden controller — it removes `vsc-hidden` for a short duration and then re-hides it. Triggered explicitly or automatically on speed change.
Note: When a keyboard shortcut fires and a Hover Target is set (but no controller button was clicked), the actions `mark` and `jump` bypass the Hover Target and broadcast to all media elements. All other actions route exclusively to the Hover Target. See ADR-0010.
_Avoid_: command, event, operation

**Playback Rate**:
The numeric multiplier applied to a media element's playback speed. VSC enforces the range 0.07–16.0 via `Math.min`/`Math.max` before assigning `video.playbackRate`; Chrome independently clamps the value as a second layer. Stored as `lastSpeed` in settings and displayed in the Speed Indicator.
Note: For GIFs, the rate is not applied via the native `playbackRate` property. Instead it acts as a frame-delay divisor inside `GifFrameEngine.effectiveDelay()`, which applies a 10 ms floor to the raw delay before dividing and a second 10 ms floor to the result.
_Avoid_: speed value, rate, velocity, multiplier

**Preferred Speed**:
A user-configured playback rate stored as the value of the `fast` key binding. The `fast` action toggles between the current playback rate and this value. Ships with a default value of `0.1`, which is deliberately slow; the user must configure a higher value before the `fast` action behaves as a "fast" preset.
_Avoid_: fast speed, custom speed, saved speed

**Last Speed** (`lastSpeed`):
The most recently applied playback rate, persisted in `chrome.storage.sync`. Updated on every `setSpeed` call. Used as the initialization speed for new controllers when `rememberSpeed` is enabled. Distinct from Playback Rate in that it is a persisted setting, not the live browser property.
_Avoid_: current speed, saved speed

**Remember Speed** (`rememberSpeed`):
A boolean setting (default `false`). When `true`, the extension restores `lastSpeed` (or a per-video stored speed from `settings.speeds`) as the initial playback rate when a controller is created.
_Avoid_: persist speed, save speed, sticky speed

**Force Last Saved Speed** (`forceLastSavedSpeed`):
A boolean setting (default `false`). When `true`, `setSpeed` dispatches a custom `ratechange` `CustomEvent` with `detail.origin = 'videoSpeed'` instead of directly setting `video.playbackRate`. The event listener intercepts all `ratechange` events and, if the origin is not `'videoSpeed'`, overwrites the rate with `lastSpeed`. This prevents the host page from overriding the user's saved speed.
_Avoid_: lock speed, override speed

**Cool Down**:
A 1000 ms `setTimeout` managed by `EventManager.refreshCoolDown()`. While active, any `ratechange` event not originating from VSC has `event.stopImmediatePropagation()` called on it, preventing the host page from overriding a speed the user just set. Reset on every `setSpeed` call.
_Avoid_: debounce, throttle, lockout

**Marker**:
A timestamp (in seconds) stored on a media element at `video.vsc.mark`. Set by the `mark` action; restored by the `jump` action.
_Avoid_: bookmark, timestamp, checkpoint, saved position

**Key Binding**:
A user-configured mapping from a keyboard key code to an action and a numeric value. Each binding carries: `action`, `key` (keyCode integer), `value`, `force`, `predefined`.
Note: `force: true` causes the extension to call `event.preventDefault()` and `event.stopPropagation()` on the triggering keydown event, preventing the host page from handling that key.
Note: `predefined: true` means the binding originated from VSC's default set (as shipped in `DEFAULT_SETTINGS`). The UI uses this to decide whether deletion is allowed.
_Avoid_: shortcut, keybind, hotkey

**Blacklist**:
A newline-separated list of hostnames where the extension is disabled entirely. A media element on a blacklisted site receives no controller.
_Avoid_: blocklist, exclusion list, ignore list, denylist

**Audio Boolean** (`audioBoolean`):
A boolean setting (default `true`). When `true`, `<audio>` elements receive controllers via the same `VideoController` path as video elements. When `false`, audio elements are excluded from detection entirely.
_Avoid_: audio support, enable audio

**Start Hidden** (`startHidden`):
A boolean setting (default `false`). When `true`, every Controller is created with `vsc-hidden` and inline hide styles, making it invisible until the user explicitly shows it via the `display` Action. While active, automatic temporary visibility (normally triggered on speed change) is also suppressed unless the user has previously toggled the controller manually (i.e., `vsc-manual` is set).
_Avoid_: hidden mode, invisible mode, auto-hide

### UI

**Controller**:
The floating UI element injected into a page and bound to a single media element. The Controller IS the Shadow DOM host: it is a `<div class="vsc-controller">` on which `attachShadow({ mode: 'open' })` is called, making it the outermost DOM element inserted into the page. The visual content (speed indicator, buttons) lives inside the shadow root. Tracked on the element as `video.vsc.div`. Carries `tabindex="-1"` so it can receive programmatic focus during Conditional Focus Steal.
Note: The GIF Controller's speed overlay div is also a Controller in this sense — it is an identically-structured Shadow DOM host inserted adjacent to the GIF canvas.
_Avoid_: widget, overlay, badge, panel

**Speed Indicator**:
The `.draggable` `<span>` inside the controller's shadow root that displays the current playback rate. Stored as `video.vsc.speedIndicator`. This element doubles as the drag handle: it carries `data-action="drag"`, so a mousedown on it initiates controller repositioning.
_Avoid_: speed display, rate label, speed readout

**Controller Button**:
A `<button>` element inside a Controller's `#controls` span, visible on hover. Each button carries a `data-action` attribute naming the Action it triggers. The standard set is: rewind (`«`), slower (`−`), faster (`+`), advance (`»`), display (`×`). GIF Controllers omit `rewind` and `advance`.
_Avoid_: control button, action button, UI button

**Controller Opacity** (`controllerOpacity`):
A persisted numeric setting (default `0.3`) applied as CSS `opacity` to the `#controller` div inside the shadow root. Configurable on the Options Page.
_Avoid_: opacity, transparency, alpha

**Controller Button Size** (`controllerButtonSize`):
A persisted numeric setting (default `14`) applied as `font-size` (in px) to the Speed Indicator and buttons inside the Controller. Configurable on the Options Page.
_Avoid_: button font size, icon size, control size

**Options Page**:
The full-screen Chrome extension settings page (`options.html`) where users configure key bindings, Controller Opacity, Controller Button Size, Start Hidden, Blacklist, and other settings. Opened from the Popup's settings button.
_Avoid_: settings page, options screen, preferences

**Popup**:
The browser action popup shown when the user clicks the extension icon. Provides quick speed controls (increase, decrease, preset speeds), a toggle to enable/disable the extension, and a button to open the Options Page. Communicates with the active tab via Chrome messaging (`VSC_SET_SPEED`, `VSC_ADJUST_SPEED`, `VSC_RESET_SPEED`, `VSC_TOGGLE_DISPLAY`).
_Avoid_: extension popup, toolbar popup, badge popup

### Extension Architecture

**MAIN World**:
The JavaScript execution environment shared with the host page. Scripts declared with `"world": "MAIN"` in `manifest.json` have direct access to the page's `window` object and `window.VSC`. All 26 VSC core/UI/handler modules plus `inject.js` run here. Chrome injects them natively via the manifest declaration — no DOM `<script>` tag is involved.
_Avoid_: page context, injected context (note: "page world" appears informally in code comments as a synonym)

**ISOLATED World**:
The JavaScript execution environment reserved for Chrome content scripts. Scripts here share the DOM with the page but have a completely separate JavaScript scope — they cannot read or write `window.VSC` or any page-defined variables. Only `injector.js` runs here. Its sole purpose is to bridge `chrome.*` APIs (unavailable in the MAIN World) to the rest of the extension.
_Avoid_: content script context, isolated context

**Path B**:
The current injection architecture. All VSC modules are listed directly in `manifest.json` under `content_scripts[1]` with `"world": "MAIN"`. Chrome injects them natively, bypassing the host page's Content Security Policy. No `chrome.scripting.executeScript` call is made at runtime. See ADR-0003.
_Avoid_: native injection, manifest injection

**Path A**:
The abandoned prior architecture in which `injector.js` dynamically called `chrome.scripting.executeScript` (or created `<script>` tags in the DOM) to load modules into the page. Superseded by Path B. The name survives in `injector.js` comments as historical context.
_Avoid_: dynamic injection, scripting injection

**Content Script Bridge**:
The bidirectional message channel implemented in `injector.js` (`setupMessageBridge()`) between the ISOLATED World and the MAIN World. Uses `window.dispatchEvent`/`window.addEventListener` with `CustomEvent` for ISOLATED→MAIN direction, and `chrome.runtime.sendMessage`/`chrome.runtime.onMessage` for MAIN→Service Worker direction.
_Avoid_: message bridge, event bridge, relay

**Injected Settings** (`window.__VSC_injectedSettings`):
A `window` property written by `injector.js` immediately before dispatching the initial `VSC_USER_SETTINGS` event. Acts as a race-condition fallback: if the MAIN World's `StorageManager` listener registers after the event fires, it reads and deletes this property to recover the settings synchronously. See ADR-0005.
_Avoid_: settings cache, window settings property

**Extension Context Invalidated**:
The error state that occurs when the extension is reloaded or updated while a tab remains open. The `chrome.runtime` APIs in the still-running ISOLATED World content script throw an error containing `"Extension context invalidated"`. The `isExtensionContextInvalidated()` helper in `injector.js` detects this; all `catch` blocks in `setupMessageBridge()` silently swallow it to prevent console noise.
_Avoid_: stale context, dead context, invalidated extension

**Service Worker**:
The background script (`src/background.js`) running in the extension's own process, separate from any tab. Responsible for tracking per-tab controller counts and updating the extension icon. Stateless across browser restarts; all tab-controller mappings are cleared on `onStartup` and `onInstalled`.
_Avoid_: background script, background page (the MV2 term)

**VSC Event Protocol**:
The set of `CustomEvent` type strings used for cross-world communication. Key events: `VSC_USER_SETTINGS` (settings delivery from ISOLATED to MAIN), `VSC_SAVE_SETTINGS` (storage write request from MAIN to ISOLATED), `VSC_CONTROLLER_CREATED`/`VSC_CONTROLLER_REMOVED` (controller lifecycle, forwarded to Service Worker), `VSC_MESSAGE` (generic envelope for popup commands), `VSC_ENABLE_GIF_CONTROL`/`VSC_DISABLE_GIF_CONTROL` (GIF enable/disable triggering full teardown).
_Avoid_: message protocol, event names, custom events

### Observers & Site Handlers

**Media Element**:
An HTML `<video>` or `<audio>` element that the extension has detected and attached a controller to. Detection requires the element to be connected to the DOM, pass the Audio Boolean check, and not be excluded by the Site Handler. There is no size threshold for media elements — size thresholds apply to GIF Elements only.
Note: This term does NOT cover animated GIF `<img>` elements. GIFs are handled separately via canvas replacement and are managed by `GifController`. See **GIF Element** and **Canvas Replacement**.
_Avoid_: video element, player, media node

**Valid Media Element**:
A media element that passes `MediaElementObserver.isValidMediaElement()`: connected to the DOM, correct tag (VIDEO or AUDIO), enabled by Audio Boolean if AUDIO, and not excluded by the Site Handler. This is the acceptance predicate for controller attachment.
_Avoid_: qualifying element, eligible element

**Cancelled Element**:
A media element carrying the `vsc-cancelled` CSS class. A controller exists but all action dispatch is skipped for it. Applied when the site handler or blacklist logic determines the element should be excluded after creation.
Note: GIF elements use `img.vscGifIgnore = true` instead of the `vsc-cancelled` CSS class to achieve the equivalent exclusion.
_Avoid_: ignored element, disabled element, skipped element

**Video Mutation Observer**:
The `VideoMutationObserver` class. Wraps the browser `MutationObserver` to watch the document (and all discovered shadow roots) for added or removed media elements and GIF elements, firing callbacks when they appear or disappear. Mutations are processed via `requestIdleCallback` to avoid blocking the main thread.
_Avoid_: DOM observer, mutation watcher

**Media Element Observer**:
The `MediaElementObserver` class. Scans the DOM for existing media elements on demand, applying the Valid Media Element predicate and delegating to the Site Handler for site-specific filtering. Distinct from the Video Mutation Observer, which watches for DOM changes reactively.
_Avoid_: media scanner, element finder

**Shadow Root Scan**:
The recursive traversal of `shadowRoot` properties to find media elements not reachable by a normal `querySelectorAll` on `document`. Performed by both Media Element Observer (at scan time) and Video Mutation Observer (which also attaches a sub-observer to each newly discovered shadow root).
_Avoid_: shadow DOM scan, shadow traversal

**GIF Scan**:
The operation performed by `MediaElementObserver.scanForGifs()`: queries all `<img>` elements (including those in shadow DOMs), applies `isGifElement()`, excludes already-managed elements, and applies the `GIF_MIN_SIZE_PX` size threshold when the image has decoded. Used at startup and after document replacement.
_Avoid_: gif detection, gif discovery

**Document Replacement**:
The event where a site replaces `document.documentElement` (e.g., via `document.write`). Detected by `VideoMutationObserver` when `document.documentElement` appears as an added node. Requires full reinitialization of the observer pipeline.
_Avoid_: document reload, page reset

**Site Handler**:
A per-site class (subclass of `BaseSiteHandler` or `BaseSiteHandler` itself) that provides default or overridden behavior for seeking, controller positioning, and element filtering. Five named site-specific subclasses exist: YouTube, Netflix, Amazon, Apple, Facebook. For all other sites, `BaseSiteHandler` is instantiated directly.
_Avoid_: adapter, plugin, integration, site override

**Base Handler**:
The `BaseSiteHandler` instance used on sites with no custom handler. Provides generic implementations for all handler interface methods: `insertionMethod: 'firstChild'`, direct `video.currentTime` seeking, no video exclusions. `BaseSiteHandler` is both the superclass for custom handlers and a directly instantiated runtime handler for generic sites.
_Avoid_: default handler, fallback handler

**Site Handler Manager**:
The `SiteHandlerManager` singleton. Maintains an ordered list of site-specific handler classes, selects the active handler by calling each class's static `matches()` method, and proxies all handler calls through the selected instance. Falls back to `BaseSiteHandler` when no specific handler matches.
_Avoid_: handler factory, handler registry

**Handler Refresh**:
The operation of discarding the active Site Handler and forcing re-detection on the next request. Performed by `SiteHandlerManager.refresh()`. Called on SPA navigation to allow the correct handler to be selected after a URL change.
_Avoid_: handler reset, handler reinit

**Controller Positioning**:
The return value of `BaseSiteHandler.getPositioning()`. An object with three fields:
- `insertionPoint`: the DOM element relative to which the controller is inserted
- `insertionMethod`: `'firstChild'` | `'beforeParent'` | `'afterParent'`
- `targetParent`: the element that becomes the controller's parent node

Site handlers override `getPositioning()` to escape site-specific overlay structures.
_Avoid_: positioning object, insert config, placement data, positioning info, insertion config

**Controller Parent**:
The DOM element selected by `findControllerParent()` as the insertion ancestor for the controller's shadow host. Determined by the active Site Handler's Controller Positioning.
_Avoid_: parent node, container element

**Custom Seek**:
A Site Handler override of seek behavior that uses a site-native mechanism instead of direct `video.currentTime` assignment. Currently only `NetflixHandler`, which fires `window.postMessage({ action: 'videospeed-seek', seekMs })` because Netflix's player intercepts direct time writes. See ADR-0004.
_Avoid_: postMessage seek, native seek override

**GifDecoder**:
The port interface for decoding an `ArrayBuffer` of raw GIF bytes into frame data. The production adapter wraps `gifuct-js` (exposed as `window.__VSC_gifuct`); the test adapter returns synthetic frames without parsing real GIF binary data.
_Avoid_: gif parser, frame decoder, gif reader

**MediaPipeline**:
The proposed future module that will own media detection, observer setup, and scan scheduling behind a single `start(document, onMediaFound, onMediaRemoved)` interface. Not yet implemented; recorded here as the architectural destination for the currently scattered detection logic across `MediaElementObserver`, `VideoMutationObserver`, and the scan calls in `VideoSpeedExtension`.
_Avoid_: media scanner, observer pipeline, detection pipeline

**HOVER_EXCLUDED_ACTIONS**:
The named set of actions (`mark`, `jump`) that bypass Hover Target routing and broadcast to all media elements when triggered via keyboard. When a keyboard shortcut fires and the only resolved target would be the Hover Target (no controller button was clicked), actions in this set ignore the Hover Target entirely. A click-derived target is not affected — the exclusion applies only to the hover-derived path. See ADR-0010.
_Avoid_: broadcast actions, hover bypass actions, excluded hover actions

### GIF System

**GIF Element**:
An animated `<img>` whose `src` or `currentSrc` ends in `.gif` (regex `/\.gif([/?#]|$)/i`) or is a `data:image/gif` URI, detected by `GifObserver`. The `currentSrc` check is needed for `<picture>` elements where the browser resolves a different source URL. An element is excluded if `img.vscGifIgnore = true` or `img.gifController` is already set. Size is filtered by `GIF_MIN_SIZE_PX` when `naturalWidth > 0`; unloaded images pass through to `GifController.create()` for a post-decode size check.
_Avoid_: animated image, gif image, gif tag

**GIF Controller**:
The per-GIF instance of `GifController` that owns the canvas, the rAF loop, the controls overlay div, the memory allocation, and the speed state.
_Avoid_: gif handler, gif widget, gif overlay

**Canvas Replacement**:
The DOM transformation where the original `<img>` is removed (or hidden for `<picture>` elements) and an identically-positioned `<canvas>` is inserted in its place. Produces up to three new DOM nodes: the canvas itself, an optional Position Wrapper `<span>` (for GIFs without a positioned ancestor), and a controls overlay `<div>` (a Shadow DOM host providing the speed controls UI). Managed by `GifController`.
_Avoid_: canvas swap, image substitution, canvas injection

**Position Wrapper**:
A `<span>` with `position: relative; display: inline-block` inserted around the canvas during Canvas Replacement when the GIF has no positioned ancestor (`canvas.offsetParent` resolves to `document.body` or `document.documentElement`). Provides a CSS containing block so the controls overlay can be positioned relative to the canvas. Not inserted for `<picture>`-hosted GIFs.
_Avoid_: wrapper span, container span, positioning container

**Composite Canvas**:
The offscreen `<canvas>` (`_compositeCanvas`) that accumulates the full GIF frame state across disposal operations. Each frame is blended onto this canvas before the result is copied to the visible canvas. Persists for the lifetime of the `GifController` and is never shown directly in the DOM.
_Avoid_: offscreen canvas, backing canvas, accumulation canvas

**Patch Canvas**:
A temporary offscreen `<canvas>` reused across frames to composite partial GIF frames via `drawImage` (source-over blending) rather than raw `putImageData`. Required because `putImageData` bypasses `globalCompositeOperation`, causing transparent pixels in sub-image patches to produce black artifacts. Created lazily on the first `_drawFrame` call.
_Avoid_: temp canvas, compositing canvas

**Disposal Type**:
A per-frame integer flag from the GIF spec that tells the renderer how to handle the composite canvas region before drawing the next frame. Values used: `0`/`1` — leave previous pixels in place; `2` — clear region to background (or transparent); `3` — restore region to pixels that existed before the frame (via the Patch Canvas save/restore mechanism).
_Avoid_: disposal method, frame disposal, frame type

**Loop Count**:
The `loopCount` decoded from the GIF's Netscape application extension, stored as `_loopCount` on `GifController`. `0` means infinite looping. A positive integer `N` means the animation plays exactly `N` times; the rAF loop stops after `N × frameCount` frames.
_Avoid_: loop iterations, repeat count, animation count

**GIF Frame Cache**:
`GifFrameCache` — the global singleton (defined in `gif-frame-engine.js`) that tracks total decoded-frame memory across all active GIF controllers. The global 200 MB budget is atomically enforced by `tryAllocate`. The 50 MB per-GIF limit is a soft pre-flight estimate checked before decompression; it is not dynamically enforced after frames are decoded.
_Avoid_: frame store, gif cache, frame buffer

**GIF Frame Engine**:
`GifFrameEngine` — the utility class that calculates the effective per-frame delay given a raw delay and speed multiplier. The 10 ms floor is applied twice: first to the raw input delay (so a 0 ms declared delay is treated as 10 ms before dividing), then to the final result (so no output is shorter than 10 ms regardless of speed).
_Avoid_: frame calculator, delay engine, timing engine

**Visibility Pause**:
The state where a `GifController` has suspended its rAF loop because the canvas has been off-screen for 30 seconds (set by the GIF Intersection Observer timer via `_visibilityPaused`). Distinct from User Pause. The rAF loop does not restart until both `_visibilityPaused` and `_userPaused` are clear.
_Avoid_: auto-pause, scroll pause, background pause

**User Pause**:
The state where a `GifController` has suspended its rAF loop because the user explicitly triggered the `pause` action (set via `_userPaused`). Distinct from Visibility Pause. Cleared only by the `resume()` method; scrolling back into view does not clear it.
_Avoid_: manual pause, explicit pause

**Memory Eviction**:
The act of releasing decoded frame data (`_frames = null`, allocation counter reset to zero) after a GIF has been off-screen for 30 seconds. The raw byte buffer (`_rawBuffer`) is retained so frames can be Re-decoded when the GIF scrolls back into view. Does not destroy the `GifController` instance.
_Avoid_: frame release, memory release, cache eviction

**Re-decode**:
The process of re-running `parseGIF` + `decompressFrames` on the retained `_rawBuffer` when a visibility-paused GIF scrolls back into view after Memory Eviction. A new global memory budget allocation is attempted; if the budget is exhausted the GIF remains paused.
_Avoid_: frame reload, reparse, redecode

**GIF Speed Debounce**:
The 500 ms delay (`GIF_SPEED_SAVE_DEBOUNCE_MS`) between the last speed-change action and the actual write to `chrome.storage.sync`. Prevents storage rate-limit errors when the user holds down a speed key binding. Implemented in `ActionHandler._saveGifSpeedDebounced`.
_Avoid_: speed save delay, debounce timer, persist delay

### Keyboard Targeting

**Hover Target** (`_hoverTargetController`):
The Controller currently designated as the exclusive keyboard hotkey target, set by Hover Activation and stored as `ActionHandler._hoverTargetController`. When a Hover Target is set, keyboard-triggered Actions route only to the media element whose Controller matches it — except `mark` and `jump`, which always broadcast. Replaced only when another Controller completes Hover Activation (Sticky Hover). See ADR-0008, ADR-0009.
_Avoid_: active controller, focused controller, selected controller, hover target controller

**Hover Activation**:
The mechanism by which a pointer `mouseenter` event on a Controller div, after Dwell Time elapses without `mouseleave`, calls `ActionHandler.setHoverTarget()` to set that Controller as the Hover Target. Enabled per media type by `hoverActivatesVideoTarget` (for video/audio) and `hoverActivatesGifTarget` (for GIFs). See ADR-0008.
_Avoid_: hover focus, hover select, mouse activation

**Sticky Hover**:
The design property that the Hover Target persists after the pointer leaves a Controller div. `mouseleave` cancels any pending Dwell Time but does not clear the Hover Target; only a new Hover Activation on a different Controller replaces it. See ADR-0009.
_Avoid_: sticky focus, persistent hover, hover lock

**Dwell Time** (`HOVER_DWELL_MS`):
The 200 ms delay between a `mouseenter` event on a Controller and the commit of that Controller as the Hover Target. Implemented as a `setTimeout` started on `mouseenter` and cancelled on `mouseleave`. Defined as `window.VSC.Constants.HOVER_DWELL_MS = 200`.
_Avoid_: hover delay, activation delay, dwell timeout

**Conditional Focus Steal**:
The act of calling `div.focus({ preventScroll: true })` on the Controller div at Dwell Time commit, performed only when `!document.hasFocus()`. Restores keyboard event delivery to the page when the browser address bar or another non-page surface has focus, without disturbing focus already held within the page.
_Avoid_: focus grab, focus steal, focus hijack

**hoverActivatesVideoTarget**:
Persisted boolean setting (default `true`) in `chrome.storage.sync` that enables Hover Activation for video and audio Controllers. When `false`, no `mouseenter`/`mouseleave` listeners are registered on video/audio Controller divs.

**hoverActivatesGifTarget**:
Persisted boolean setting (default `false`) in `chrome.storage.sync` that enables Hover Activation for GIF Controllers. Opt-in unlike `hoverActivatesVideoTarget`. The check occurs inside the `mouseenter` handler at runtime rather than at listener-registration time, so toggling the setting takes effect without reloading the page.

### Settings (named storage keys)

**controlGifs**:
Boolean (default `true`). When `false`, no GIF controllers are created and `<img>` elements are left unmodified.

**gifSpeedStep**:
Persisted step size for GIF speed increment/decrement (default `0.1`). Stored in `chrome.storage.sync`.

**lastGifSpeed**:
Persisted numeric GIF speed multiplier. Stored in `chrome.storage.sync`.

**Log Level** (`logLevel`):
Persisted integer setting (default `3` / WARNING) controlling which logger messages are emitted. Stored as `logLevel` in `chrome.storage.sync`; exposed at runtime as `Logger.verbosity`. The `defaultLogLevel` setting (default `4` / INFO) controls the fallback level used when no explicit level is passed to `logger.log()`.

## Constants

| Constant | Value | Description |
|---|---|---|
| `SPEED_LIMITS.MIN` | 0.07 | Minimum playback rate enforced by VSC (and independently by Chrome). |
| `SPEED_LIMITS.MAX` | 16.0 | Maximum playback rate enforced by VSC (and independently by Chrome). |
| `CONTROLLER_SIZE_LIMITS.VIDEO_MIN_WIDTH/HEIGHT` | 40 × 40 px | Minimum video element dimensions before the controller is rejected entirely. |
| `CONTROLLER_SIZE_LIMITS.AUDIO_MIN_WIDTH/HEIGHT` | 20 × 20 px | Minimum audio element dimensions before the controller starts hidden. |
| `GIF_GLOBAL_MEMORY_BUDGET_BYTES` | 200 MB | Maximum total decoded-frame memory across all active GIF controllers. |
| `GIF_FRAME_CACHE_LIMIT_BYTES` | 50 MB | Soft pre-flight per-GIF decoded-frame memory estimate. Not dynamically enforced after decode. |
| `GIF_MIN_SIZE_PX` | 20 px | Minimum detected GIF dimension (width or height) required for a GIF to be eligible for canvas replacement. |
| `GIF_SPEED_SAVE_DEBOUNCE_MS` | 500 ms | Debounce delay before persisting a changed GIF speed to `chrome.storage.sync`. |
