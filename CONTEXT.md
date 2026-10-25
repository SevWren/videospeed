# Video Speed Controller

A Chrome WebExtension that attaches playback controls to every HTML media element on a page and controls the playback speed of animated GIFs, letting users change speed, seek, and toggle visibility via keyboard shortcuts.

## Language

**Action**:
A discrete operation dispatched to one or more media elements. The full set: `faster`, `slower`, `reset`, `fast`, `rewind`, `advance`, `pause`, `muted`, `louder`, `softer`, `mark`, `jump`, `display`, `blink`, `drag`. Actions are triggered by key bindings or controller buttons.
Note: GIF controllers support only a subset of actions (`faster`, `slower`, `reset`, `fast`, `display`, `pause`, `blink`). The actions `rewind`, `advance`, `seek`, `muted`, `louder`, `softer`, `mark`, and `jump` are not supported for GIFs because GIFs have no timeline.
_Avoid_: command, event, operation

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

**controlGifs** setting:
Boolean (default `true`). When `false`, no GIF controllers are created and `<img>` elements are left unmodified.

**Controller**:
The floating UI element injected into a page and bound to a single media element. Created per media element; renders inside a Shadow DOM host attached to the page. Tracked on the element as `video.vsc.div`.
_Avoid_: widget, overlay, badge, panel

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
Persisted step size for GIF speed increment/decrement (default `0.1`). Stored in `chrome.storage.sync`.

**Key Binding**:
A user-configured mapping from a keyboard key code to an action and a numeric value. Each binding carries: `action`, `key` (keyCode integer), `value`, `force`, `predefined`.
_Avoid_: shortcut, keybind, hotkey

**lastGifSpeed**:
Persisted numeric GIF speed multiplier. Stored in `chrome.storage.sync`.

**Marker**:
A timestamp (in seconds) stored on a media element at `video.vsc.mark`. Set by the `mark` action; restored by the `jump` action.
_Avoid_: bookmark, timestamp, checkpoint, saved position

**Media Element**:
An HTML `<video>` or `<audio>` element that the extension has detected, validated against size thresholds, and attached a controller to.
Note: This term does NOT cover animated GIF `<img>` elements. GIFs are handled separately via canvas replacement and are managed by `GifController`. See **GIF Element** and **Canvas Replacement**.
_Avoid_: video element, player, media node

**Playback Rate**:
The numeric multiplier applied to a media element's playback speed (Chrome-enforced range: 0.07–16.0). Stored as `lastSpeed` in settings and displayed in the Speed Indicator.
Note: For GIFs, the rate is not applied via the native `playbackRate` property. Instead it acts as a frame-delay divisor inside `GifFrameEngine.effectiveDelay()`, which divides the raw per-frame delay by the multiplier (subject to a 10 ms floor).
_Avoid_: speed value, rate, velocity, multiplier

**Preferred Speed**:
A user-configured playback rate stored as the value of the `fast` key binding. The `fast` action toggles between the current playback rate and this value.
_Avoid_: fast speed, custom speed, saved speed

**Site Handler**:
A per-site subclass of `BaseHandler` that overrides default behavior for seeking, controller positioning, and element filtering on platforms with non-standard video embedding (YouTube, Netflix, Amazon, Apple, Facebook).
_Avoid_: adapter, plugin, integration, site override

**Speed Indicator**:
The text node inside the controller that renders the current playback rate. Updated synchronously on every `setSpeed` call.
_Avoid_: speed display, rate label, speed readout

## Constants

| Constant | Value | Description |
|---|---|---|
| `GIF_GLOBAL_MEMORY_BUDGET_BYTES` | 200 MB | Maximum total decoded-frame memory across all active GIF controllers. |
| `GIF_FRAME_CACHE_LIMIT_BYTES` | 50 MB | Maximum decoded-frame memory for a single GIF controller. |
| `GIF_MIN_SIZE_PX` | 20 px | Minimum detected GIF dimension (width or height) required for a GIF to be eligible for canvas replacement. |
| `GIF_SPEED_SAVE_DEBOUNCE_MS` | — | Debounce delay (in ms) before persisting a changed GIF speed to `chrome.storage.sync`. |
