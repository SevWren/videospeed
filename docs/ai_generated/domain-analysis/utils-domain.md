# Utils Domain Analysis

Source files analysed: `src/utils/constants.js`, `src/utils/event-manager.js`,
`src/core/storage-manager.js`, `src/utils/logger.js`, `src/utils/dom-utils.js`,
`src/utils/debug-helper.js`, `src/content/injector.js` (for event protocol context).

---

## 1. Constants Domain

### 1.1 Glossary correction: `GIF_SPEED_SAVE_DEBOUNCE_MS`

The glossary Constants table shows `—` (no value) for `GIF_SPEED_SAVE_DEBOUNCE_MS`.

**Actual value in constants.js (line 120):** `500` (milliseconds).

The entry must be updated to read `500 ms`.

### 1.2 Missing constant groups

The glossary Constants table covers only the four GIF memory/size constants. The following
constant groups exist in `constants.js` and are not listed anywhere in the glossary.

#### `SPEED_LIMITS` (lines 92-95)

```js
SPEED_LIMITS = { MIN: 0.07, MAX: 16 }
```

- `MIN`: 0.07 — Chrome-enforced lower bound on `playbackRate` (from Chromium source).
- `MAX`: 16 — Chrome-enforced upper bound on `playbackRate`.

The glossary's **Playback Rate** entry already notes the "Chrome-enforced range: 0.07–16.0"
in prose. These named constants are the code-level source of truth for those numbers. They
are not currently listed in the Constants table.

#### `CONTROLLER_SIZE_LIMITS` (lines 97-105)

```js
CONTROLLER_SIZE_LIMITS = {
  VIDEO_MIN_WIDTH: 40,
  VIDEO_MIN_HEIGHT: 40,
  AUDIO_MIN_WIDTH: 20,
  AUDIO_MIN_HEIGHT: 20,
}
```

No glossary entry or Constants row exists for these. `GIF_MIN_SIZE_PX` (20 px) is listed
but the analogous video/audio size thresholds are absent.

#### `LOG_LEVELS` (lines 69-76)

```js
LOG_LEVELS = { NONE: 1, ERROR: 2, WARNING: 3, INFO: 4, DEBUG: 5, VERBOSE: 6 }
```

An enumeration of integer verbosity levels. Referenced by `Logger` and by
`DEFAULT_SETTINGS.logLevel` / `DEFAULT_SETTINGS.defaultLogLevel`. Not in the glossary.

#### `MESSAGE_TYPES` (lines 78-90)

```js
MESSAGE_TYPES = {
  SET_SPEED: 'VSC_SET_SPEED',
  ADJUST_SPEED: 'VSC_ADJUST_SPEED',
  RESET_SPEED: 'VSC_RESET_SPEED',
  TOGGLE_DISPLAY: 'VSC_TOGGLE_DISPLAY',
  CONTROLLER_CREATED: 'VSC_CONTROLLER_CREATED',
  CONTROLLER_REMOVED: 'VSC_CONTROLLER_REMOVED',
  QUERY_ACTIVE_CONTROLLERS: 'VSC_QUERY_ACTIVE_CONTROLLERS',
  DISABLE_GIF_CONTROL: 'VSC_DISABLE_GIF_CONTROL',
  ENABLE_GIF_CONTROL: 'VSC_ENABLE_GIF_CONTROL',
}
```

A named set of string message-type constants. Not mentioned anywhere in the glossary.
These are the canonical identifiers for popup-to-page and lifecycle-event messages.

#### `CUSTOM_ACTIONS_NO_VALUES` (line 107)

```js
CUSTOM_ACTIONS_NO_VALUES = ['pause', 'muted', 'mark', 'jump', 'display']
```

Actions for which a numeric `value` field is meaningless. Not in the glossary.

#### `DEFAULT_SETTINGS` (lines 30-65)

The full default-settings object. Several of its fields are named in the glossary as
individual terms (`gifSpeedStep`, `lastGifSpeed`, `controlGifs`) but the object as a whole
has no named entry. Relevant default values to note:

| Field | Default | Notes |
|---|---|---|
| `lastSpeed` | 1.0 | Initial/reset playback rate |
| `controllerOpacity` | 0.3 | Not called out in glossary Constants table |
| `controllerButtonSize` | 14 | No glossary entry |
| `logLevel` | 3 (WARNING) | See Logger domain below |
| `defaultLogLevel` | 4 (INFO) | See Logger domain below |

---

## 2. Event Protocol Domain

### 2.1 Named custom events — none currently in glossary

The following `CustomEvent` type strings appear in the codebase and form a distinct
cross-world communication protocol. None are defined as terms in the glossary.

#### `VSC_USER_SETTINGS`

Fired by `injector.js::injectUserSettings()` on page load and by the live-settings relay
inside `setupMessageBridge()` whenever `chrome.storage.onChanged` fires. Carries the full
or partial settings object as `event.detail`. Consumed by `StorageManager._setupSettingsListener()`.

This is the primary settings-delivery channel from the ISOLATED world to the MAIN world.

#### `VSC_SAVE_SETTINGS`

Fired by `StorageManager.set()` when `chrome.storage` is unavailable (i.e., MAIN world
context). Consumed by `injector.js::setupMessageBridge()`, which writes the payload to
`chrome.storage.sync`. Bridges the inability of MAIN-world scripts to call `chrome.*` APIs.

#### `VSC_CONTROLLER_CREATED` / `VSC_CONTROLLER_REMOVED`

Fired by MAIN-world code when a controller is attached or detached. Consumed by
`injector.js::setupMessageBridge()`, which forwards them to the background service worker
via `chrome.runtime.sendMessage` for badge-count management.

#### `VSC_ENABLE_GIF_CONTROL` / `VSC_DISABLE_GIF_CONTROL`

Message types in `MESSAGE_TYPES` (and also used as event strings). Carry GIF
enable/disable intent from the popup through the message bridge. Distinct from
`VSC_USER_SETTINGS` for `controlGifs`: this channel triggers full GIF controller teardown
rather than a simple settings patch (see the comment in `injector.js` lines 190-197).

#### `VSC_MESSAGE`

Fired by `injector.js` to relay any `chrome.runtime.onMessage` payload that starts with
`VSC_` into the MAIN world. The generic envelope used by the popup for speed-control
commands (`VSC_SET_SPEED`, `VSC_ADJUST_SPEED`, etc.).

#### `VSC_FETCH_GIF_BYTES` / `VSC_GIF_FETCH_REQUEST` / `VSC_GIF_BYTES_RESPONSE` / `VSC_GIF_FETCHER_READY`

The file:// GIF byte-fetch proxy protocol. Used exclusively on `file://` pages.
Injector creates a hidden `<iframe>` at `chrome-extension://` origin; the four message
types define the request/response handshake between injector and iframe.

### 2.2 `ratechange` browser event

`EventManager.setupRateChangeListener()` (line 154) attaches a capturing listener for the
native DOM `ratechange` event. This is the browser's standard event that fires on an
`HTMLMediaElement` when `playbackRate` changes. The extension intercepts it in capture
phase to:
- block propagation when `coolDown` is active (preventing site overrides)
- enforce `forceLastSavedSpeed` if that setting is on
- update the Speed Indicator and sync `lastSpeed` to storage

No glossary term exists for this event or the interception pattern.

### 2.3 Cool Down

`EventManager.coolDown` (lines 13, 173, 250-258) is a `setTimeout` handle. While truthy,
`ratechange` events have `stopImmediatePropagation()` called on them. `refreshCoolDown()`
resets it to fire in 1000 ms. The purpose is to prevent a site's own `ratechange` listener
from immediately overwriting a speed the user just set via a key binding.

Not named in the glossary. The `coolDown` property name is used in the code; the concept
could be formalised.

### 2.4 Show Timer

`EventManager.timer` (lines 14, 283-291, 314-317). A `setTimeout` handle set in
`showController()`. When it fires (after 2000 ms), it removes the `vsc-show` CSS class,
hiding the controller again. Distinct from Cool Down; the two timers serve completely
different purposes. Not in the glossary.

---

## 3. Storage Domain

### 3.1 Sync Storage

`chrome.storage.sync` is the persistence layer for all user settings. Used in:
- `StorageManager.get()` / `set()` / `remove()` / `clear()` / `onChanged()`
- Direct calls in `EventManager.updateSpeedFromEvent()` and `injector.js`

The glossary has per-field entries (`gifSpeedStep`, `lastGifSpeed`) but no term for the
storage layer itself.

### 3.2 `window.__VSC_injectedSettings` — the race-condition guard property

`injector.js::injectUserSettings()` writes `window.__VSC_injectedSettings = userSettings`
before dispatching `VSC_USER_SETTINGS` (line 249). `StorageManager.waitForInjectedSettings()`
reads and deletes it (line 79-85) so that MAIN-world modules that call
`waitForInjectedSettings()` after the event has already fired can still recover the
settings object.

This is a deliberate protocol artifact, not just an implementation detail. Its
`delete window.__VSC_injectedSettings` usage after consumption is intentional to prevent
stale state. Not named or explained anywhere in the glossary.

### 3.3 Injected-Settings Race — already partially addressed but not ADR'd

The race between `injector.js` firing `VSC_USER_SETTINGS` and MAIN-world modules
registering their listener is solved by the `window.__VSC_injectedSettings` property
(called "Option A" in code comments). The audit document
`docs/audit/team1/T1-A6-settings-race.md` references this. No ADR exists for it despite
meeting all three ADR criteria (hard to reverse, surprising without context, result of a
real trade-off between Option A and a polling-only approach).

---

## 4. Logger Domain

### 4.1 `verbosity` vs `logLevel` — two overlapping concepts

The `Logger` class has two properties:

| Property | Initial value | Source of truth |
|---|---|---|
| `this.verbosity` | 3 (WARNING) | Set from `settings.logLevel` at startup |
| `this.defaultLevel` | 4 (INFO) | Set from `settings.defaultLogLevel` at startup |

`this.verbosity` controls the **filter threshold**: messages with `level > verbosity` are
suppressed. `this.defaultLevel` is the **fallback level** used when `logger.log(msg)` is
called without an explicit level argument.

The glossary has no entry for either concept. The field name in `DEFAULT_SETTINGS` is
`logLevel` (value 3); `Logger` calls its runtime mirror `verbosity`. These are the same
semantic concept under two different names. This is a naming inconsistency worth noting:
`logLevel` in storage vs `verbosity` in the runtime object.

### 4.2 `LOG_LEVELS` enumeration

Values 1-6: `NONE`, `ERROR`, `WARNING`, `INFO`, `DEBUG`, `VERBOSE`. `VERBOSE` (6) also
emits a `console.trace()` in addition to the log message. This enumeration underpins all
logger behaviour but has no glossary entry.

---

## 5. `debug-helper.js` domain notes

`DebugHelper` is a developer-facing diagnostic utility. It:
- overrides logger verbosity to `DEBUG` when enabled
- exposes `window.vscDebug` with imperative inspection commands
- uses `window.vscDebugHelper` as a global singleton

It references `window.videoSpeedExtension` (lines 84, 215), which implies a global
extension state object not defined in the surveyed files. This symbol should be verified
against `inject.js` or `controls.js`.

`DebugHelper` is not a domain concept; it is a development tool. It does not belong in
the glossary. No terms from this file require glossary entries.

---

## 6. Summary of glossary gaps

The table below lists every finding and the recommended action for the glossary maintainer.
Actions marked **Correct** mean the existing entry has a factual error. Actions marked
**Add** mean a term is missing. Actions marked **No action** mean the concept does not
qualify for a glossary entry under the format rules (general programming concepts, or
implementation details only).

| Finding | Action |
|---|---|
| `GIF_SPEED_SAVE_DEBOUNCE_MS` value shown as `—` | **Correct** to `500 ms` |
| `SPEED_LIMITS.MIN` (0.07) and `SPEED_LIMITS.MAX` (16) | **Add** rows to Constants table |
| `CONTROLLER_SIZE_LIMITS` (video 40 px, audio 20 px) | **Add** rows to Constants table |
| `MESSAGE_TYPES` object | **Add** as a Language term or Constants section |
| `LOG_LEVELS` enumeration | **Add** to Constants table (values 1-6) |
| `VSC_USER_SETTINGS` event | **Add** as Language term |
| `VSC_SAVE_SETTINGS` event | **Add** as Language term |
| `VSC_CONTROLLER_CREATED` / `VSC_CONTROLLER_REMOVED` events | **Add** as Language term |
| `VSC_ENABLE_GIF_CONTROL` / `VSC_DISABLE_GIF_CONTROL` events | **Add** as Language term |
| `VSC_MESSAGE` envelope event | **Add** as Language term |
| `ratechange` interception pattern | **Add** as Language term |
| Cool Down (`EventManager.coolDown`) | **Add** as Language term |
| Show Timer (`EventManager.timer`) | **Add** as Language term |
| `chrome.storage.sync` as Sync Storage | **Add** as Language term |
| `window.__VSC_injectedSettings` property | **Add** as Language term |
| `verbosity` vs `logLevel` naming inconsistency | **Add** note; pick canonical term |
| `CUSTOM_ACTIONS_NO_VALUES` | No action (implementation detail) |
| `DEFAULT_SETTINGS` object | No action (container; individual fields already covered) |
| `DebugHelper` | No action (dev tool, not a domain concept) |

---

## 7. ADR candidate

### Injected-Settings Race Resolution (Option A)

Meets all three ADR criteria:

- **Hard to reverse**: `window.__VSC_injectedSettings` is a named protocol property that
  `waitForInjectedSettings()` deletes on read. Changing the mechanism requires coordinated
  changes across `injector.js` and `storage-manager.js`.
- **Surprising without context**: A future reader will see `delete window.__VSC_injectedSettings`
  and wonder why a property is being deleted on first access instead of simply reading it.
- **Real trade-off**: The alternative ("Option B" polling-only) was explicitly considered
  and rejected (code comments in `storage-manager.js` lines 76-85 reference "Option A").

Recommended: create `docs/adr/0003-injected-settings-race-option-a.md` documenting that
the write-before-dispatch + delete-on-read pattern was chosen over a pure polling approach
because it recovers settings synchronously when the property is already present, avoiding
the 10 ms poll interval overhead on every page load.
