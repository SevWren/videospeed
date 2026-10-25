# Video Speed Controller

A Chrome WebExtension that attaches playback controls to every HTML media element on a page and controls the playback speed of animated GIFs, letting users change speed, seek, and toggle visibility via keyboard shortcuts.

## Language

**Action**:
A discrete operation dispatched to one or more media elements. The full set: `faster`, `slower`, `reset`, `fast`, `rewind`, `advance`, `pause`, `muted`, `louder`, `softer`, `mark`, `jump`, `display`, `blink`, `drag`. Actions are triggered by key bindings or controller buttons.
Note: GIF controllers support only a subset of actions (`faster`, `slower`, `reset`, `fast`, `display`, `pause`, `blink`, `drag`). The actions `rewind`, `advance`, `seek`, `muted`, `louder`, `softer`, `mark`, and `jump` are not supported for GIFs because GIFs have no timeline. When `drag` is dispatched for a GIF, the canvas element (not the original `<img>`) is passed to the DragHandler.
_Avoid_: command, event, operation

**audioBoolean**:
A persisted setting. When true (the default), audio elements receive controllers; when false, their controllers are hidden regardless of element size.
_Avoid_: audioEnabled, audioSupport

**Blacklist**:
A newline-separated list of hostnames where the extension is disabled entirely. A media element on a blacklisted site receives no controller.
_Avoid_: blocklist, exclusion list, ignore list, denylist

**Canvas Replacement**:
The DOM transformation where the original `<img>` is removed (or hidden for `<picture>` elements) and an identically-positioned `<canvas>` is inserted in its place. Managed by `GifController`.
_Avoid_: canvas swap, image substitution, canvas injection

**Cancelled Element**:
A media element carrying the `vsc-cancelled` CSS class. A controller exists but all action dispatch is skipped for it. Applied when the site handler or blacklist logic determines the element should be excluded after creation.
Note: GIF elements use `img.vscGifIgnore = true` instead of the `vsc-cancelled` CSS class to achieve the equivalent exclusion.
_Avoid_: ignored element, disabled element, skipped element

**controlGifs**:
A persisted setting. When false, no GIF controllers are created and `<img>` elements are left unmodified. Default: true.

**Controller**:
The floating UI element injected into a page and bound to a single media element. Created per media element; renders inside a Shadow DOM host attached to the page. Tracked on the element as `video.vsc.div`.
_Avoid_: widget, overlay, badge, panel

**Extension Icon**:
The browser action icon that signals VSC's presence in the current tab. Red when the tab has at least one active controller; gray otherwise. Managed by the background service worker via `VSC_CONTROLLER_CREATED` and `VSC_CONTROLLER_REMOVED` messages.
_Avoid_: toolbar icon, badge, action button

**forceLastSavedSpeed**:
A persisted setting that controls how speed changes are applied to HTML media elements. When true, speed changes are dispatched as a `ratechange` CustomEvent (with `detail.origin: 'videoSpeed'`) rather than by directly assigning `video.playbackRate`, allowing the extension to re-assert the chosen speed even when a site intercepts direct playbackRate writes. Does not affect GIF speed application.
_Avoid_: overrideSpeed, speedOverride

**GIF Controller**:
The per-GIF instance of `GifController` that owns the canvas, the rAF (requestAnimationFrame) loop, the controls overlay div, the memory allocation, and the speed state.
_Avoid_: gif handler, gif widget, gif overlay

**GIF Element**:
An animated `<img>` whose `src` ends in `.gif` or is a `data:image/gif` URI, detected by `GifObserver` and eligible for canvas replacement.
_Avoid_: animated image, gif image, gif tag

**GIF Frame Cache**:
`GifFrameCache` — the global singleton that tracks total decoded-frame memory across all active GIF controllers. Budget: 200 MB global, 50 MB per-GIF.
_Avoid_: frame store, gif cache, frame buffer

**GIF Frame Engine**:
`GifFrameEngine` — the utility class that calculates the effective per-frame delay in ms given a raw delay and speed multiplier (with a 10 ms floor).
_Avoid_: frame calculator, delay engine, timing engine

**gifSpeedStep**:
A persisted step size used for GIF speed increment and decrement actions. Default: 0.1.

**Key Binding**:
A user-configured mapping from a keyboard key code to an action and a numeric value. Each binding carries: `action`, `key` (keyCode integer), `value`, `force`, `predefined`.
_Avoid_: shortcut, keybind, hotkey

**lastGifSpeed**:
A persisted numeric GIF speed multiplier that records the most recently applied GIF speed and is restored when a GIF controller is created. Default: 1.0.

**Marker**:
A timestamp (in seconds) stored on a media element at `video.vsc.mark`. Set by the `mark` action; restored by the `jump` action.
_Avoid_: bookmark, timestamp, checkpoint, saved position

**Media Element**:
An HTML `<video>` or `<audio>` element that the extension has detected, validated against size thresholds, and attached a controller to.
Note: This term does NOT cover animated GIF `<img>` elements. GIFs are handled separately via canvas replacement and are managed by `GifController`. See **GIF Element** and **Canvas Replacement**.
_Avoid_: video element, player, media node

**Per-Video Speed**:
A src-URL-keyed record of the last playback rate applied to a specific HTML media element. Stored in `settings.speeds`, capped at 50 entries (oldest entry evicted when full). Populated and restored only when `rememberSpeed` is enabled. Does not apply to GIFs, which use a single global `lastGifSpeed`.
_Avoid_: per-source speed, video-specific speed, url speed

**Playback Rate**:
The numeric multiplier applied to a media element's playback speed (Chrome-enforced range: 0.07–16.0). Stored as `lastSpeed` in settings and displayed in the Speed Indicator.
Note: For GIFs, the rate is not applied via the native `playbackRate` property. Instead it acts as a frame-delay divisor inside `GifFrameEngine.effectiveDelay()`, which divides the raw per-frame delay by the multiplier (subject to a 10 ms floor).
_Avoid_: speed value, rate, velocity, multiplier

**Preferred Speed**:
A user-configured playback rate stored as the value of the `fast` key binding. The `fast` action toggles between the current playback rate and this value.
_Avoid_: fast speed, custom speed, saved speed

**rememberSpeed**:
A persisted setting. When true, the extension stores the playback rate used for each media element by src URL (as a Per-Video Speed) and restores it when the element loads. When false, all media elements start at 1.0x.
_Avoid_: saveSpeed, persistSpeed, keepSpeed

**Site Handler**:
A per-site subclass of `BaseHandler` that overrides default behavior for seeking, controller positioning, and element filtering on platforms with non-standard video embedding (YouTube, Netflix, Amazon, Apple, Facebook).
_Avoid_: adapter, plugin, integration, site override

**Speed Indicator**:
The text node inside the controller that renders the current playback rate. Updated synchronously on every `setSpeed` call.
_Avoid_: speed display, rate label, speed readout

**Visibility Pause**:
An automatic pause applied to a GIF controller when its canvas has been continuously off-screen for 30 or more seconds. Decoded frames are evicted from memory during the pause. The rAF loop resumes and frames are re-decoded from the raw GIF buffer when the canvas re-enters the viewport; if the global memory budget is already exhausted at that point, the GIF remains paused until budget is freed. Distinct from a user-initiated pause.
_Avoid_: auto-pause, background pause, off-screen pause
