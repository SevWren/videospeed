# Video Speed Controller

A Chrome WebExtension that attaches playback controls to every HTML media element on a page, letting users change speed, seek, and toggle visibility via keyboard shortcuts.

## Language

**Controller**:
The floating UI element injected into a page and bound to a single media element. Created per media element; renders inside a Shadow DOM host attached to the page. Tracked on the element as `video.vsc.div`.
_Avoid_: widget, overlay, badge, panel

**Media Element**:
An HTML `<video>` or `<audio>` element that the extension has detected, validated against size thresholds, and attached a controller to.
_Avoid_: video element, player, media node

**Key Binding**:
A user-configured mapping from a keyboard key code to an action and a numeric value. Each binding carries: `action`, `key` (keyCode integer), `value`, `force`, `predefined`.
_Avoid_: shortcut, keybind, hotkey

**Action**:
A discrete operation dispatched to one or more media elements. The full set: `faster`, `slower`, `reset`, `fast`, `rewind`, `advance`, `pause`, `muted`, `louder`, `softer`, `mark`, `jump`, `display`, `blink`, `drag`. Actions are triggered by key bindings or controller buttons.
_Avoid_: command, event, operation

**Playback Rate**:
The numeric multiplier applied to a media element's playback speed (Chrome-enforced range: 0.07–16.0). Stored as `lastSpeed` in settings and displayed in the Speed Indicator.
_Avoid_: speed value, rate, velocity, multiplier

**Preferred Speed**:
A user-configured playback rate stored as the value of the `fast` key binding. The `fast` action toggles between the current playback rate and this value.
_Avoid_: fast speed, custom speed, saved speed

**Speed Indicator**:
The text node inside the controller that renders the current playback rate. Updated synchronously on every `setSpeed` call.
_Avoid_: speed display, rate label, speed readout

**Marker**:
A timestamp (in seconds) stored on a media element at `video.vsc.mark`. Set by the `mark` action; restored by the `jump` action.
_Avoid_: bookmark, timestamp, checkpoint, saved position

**Blacklist**:
A newline-separated list of hostnames where the extension is disabled entirely. A media element on a blacklisted site receives no controller.
_Avoid_: blocklist, exclusion list, ignore list, denylist

**Site Handler**:
A per-site subclass of `BaseHandler` that overrides default behavior for seeking, controller positioning, and element filtering on platforms with non-standard video embedding (YouTube, Netflix, Amazon, Apple, Facebook).
_Avoid_: adapter, plugin, integration, site override

**Cancelled Element**:
A media element carrying the `vsc-cancelled` CSS class. A controller exists but all action dispatch is skipped for it. Applied when the site handler or blacklist logic determines the element should be excluded after creation.
_Avoid_: ignored element, disabled element, skipped element
