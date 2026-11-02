# Core Playback Domain Analysis

## Terms to update in GLOSSARY.md

**Action** — set is incomplete.
The glossary lists 15 actions: `faster`, `slower`, `reset`, `fast`, `rewind`, `advance`, `pause`, `muted`, `louder`, `softer`, `mark`, `jump`, `display`, `blink`, `drag`. The code in `action-handler.js` (`executeAction` switch) also handles three internal message-type actions that are **not in the glossary**: `SET_SPEED`, `ADJUST_SPEED`, and `RESET_SPEED` (lines 310–342). These are dispatched via `MESSAGE_TYPES` in `constants.js` (e.g., `VSC_SET_SPEED`) and handled identically to user-triggered actions. The glossary definition should note these internal action types exist alongside the user-facing ones, or clarify that `SET_SPEED`/`ADJUST_SPEED`/`RESET_SPEED` are internal message-driven variants.

**Controller** — definition partially correct but imprecise.
The glossary says "renders inside a Shadow DOM host attached to the page." The code confirms the Shadow DOM host is the wrapper `<div class="vsc-controller">`, and `wrapper.attachShadow({ mode: 'open' })` is called in `ShadowDOMManager.createShadowDOM()`. However, the definition says the controller "renders inside a Shadow DOM host" — this is backwards: the controller *is* the Shadow DOM host (the wrapper `div`). The content rendered inside the shadow root is the `#controller` div containing the speed indicator and buttons. Audio elements go through the same `VideoController` class and `ShadowDOMManager.createShadowDOM()` path — so yes, audio controllers also use Shadow DOM. The definition should be tightened to reflect that `video.vsc.div` is the Shadow DOM host, and the visual content lives inside the shadow root attached to it.

**Playback Rate** — range value confirmed, but source attribution is VSC-enforced, not purely Chrome-enforced.
`constants.js` sets `SPEED_LIMITS.MIN = 0.07` and `SPEED_LIMITS.MAX = 16` with comments citing "Chromium source." However, VSC enforces these limits itself via `Math.min(..., SPEED_LIMITS.MAX)` and `Math.max(..., SPEED_LIMITS.MIN)` in `executeAction` before assigning to `video.playbackRate`. Chrome would also clamp the value independently, but the glossary's phrase "Chrome-enforced range" is misleading — VSC proactively clamps, so the enforcement is dual. The definition should say "range enforced by both VSC and Chrome's native clamp."

**Speed Indicator** — term is confirmed but the underlying element is more precisely a `<span>` with class `draggable`, not a generic "text node."
`ShadowDOMManager.getSpeedIndicator()` returns `shadow.querySelector('.draggable')`, and `video.vsc.speedIndicator` holds this reference. The `.draggable` span doubles as the drag handle for repositioning the controller. The glossary calls it a "text node inside the controller" — it is actually a `<span>` element (which contains the text). This distinction matters because it also carries `data-action="drag"`. Suggest updating to clarify it is the `.draggable` span inside the shadow root, serving dual purpose as speed display and drag handle.

**Preferred Speed** — definition is too narrow.
The glossary says it is "stored as the value of the `fast` key binding." The code shows this is true as the primary storage, but the `fast` binding's default value in `DEFAULT_SETTINGS` is `0.1` — which is nonsensically slow as a "preferred" fast speed. More importantly, the `resetSpeed()` method (action-handler.js:439–458) uses the `reset` binding's stored value as a toggle target, which is dynamically updated to the current playback rate each time a reset toggle happens. The `fast` action also works for GIFs via `executeGifAction` with the same value. The definition is accurate as far as it goes, but should note that the default Preferred Speed is `0.1` (i.e., the `fast` binding ships with `value: 0.1`), which means a user must configure it before it is useful.

**Marker** — canonical location needs correction.
The glossary says Marker is stored at `video.vsc.mark`. The code in `action-handler.js` `setMark()` (line 492) does: `video.vsc.mark = video.currentTime`. And `jumpToMark()` reads `video.vsc.mark`. This confirms the glossary is correct. No change needed here — see "Terms correct" section.

**Cancelled Element** — `vsc-cancelled` usage confirmed but incomplete.
The glossary says it is applied "when the site handler or blacklist logic determines the element should be excluded." A search across all source files finds `vsc-cancelled` referenced in only two places: `action-handler.js:62` (the skip check) and `debug-helper.js:210` (inspection only). There is **no code path in the current source that sets `vsc-cancelled`** on an element. The class is only ever *checked*, never *added*. This may be legacy from a prior implementation, or it may be added by site handlers not visible in the searched files. This should be flagged: the term's definition references an application mechanism that is not present in the current codebase.

**Key Binding** — field list correct but `force` semantics should be explicit.
The glossary lists fields `action`, `key`, `value`, `force`, `predefined`. The code confirms all five. The `force` field's meaning is defined in `event-manager.js:105`: `if (keyBinding.force === true) { event.preventDefault(); event.stopPropagation(); }`. This suppresses the host page's own handler for that key — it does not bypass the blacklist (blacklist prevents controller creation entirely, not key dispatch). The glossary entry should state what `force` does.

---

## New terms to add to GLOSSARY.md

**Shadow Host**:
The `<div class="vsc-controller">` element that `ShadowDOMManager` attaches the shadow root to via `wrapper.attachShadow({ mode: 'open' })`. This is `video.vsc.div`. It is the outermost DOM element of the controller, positioned absolutely over the media element. The shadow root, containing the `#controller` div and speed indicator, is a child of this element.
_Avoid_: wrapper, container, host element

**Cool Down**:
A 1-second timer (`EventManager.coolDown`) that is reset on every `setSpeed` call via `refreshCoolDown()`. While active, any `ratechange` event originating from outside VSC (e.g., the host page changing playback rate) has its propagation stopped via `event.stopImmediatePropagation()`. This prevents external rate changes from overwriting a speed the user just set.
_Avoid_: debounce, throttle, lockout

**Blink**:
An action that temporarily reveals a hidden controller. When triggered (e.g., automatically on `ratechange`), the controller's `vsc-hidden` class is removed and re-added after 1 second. For audio controllers, the timeout is skipped — the controller stays visible once blinked. The `blink` action is also dispatched automatically whenever the playback rate changes via an external `ratechange` event.
_Avoid_: flash, pulse, reveal

**Force** (key binding field):
A boolean field on a Key Binding. When `true`, the extension calls `event.preventDefault()` and `event.stopPropagation()` on the triggering keydown event, preventing the host page from handling that key. Does not affect blacklist behavior or Cancelled Elements.
_Avoid_: override, suppress

**Predefined** (key binding field):
A boolean field on a Key Binding. When `true`, the binding originated from VSC's default set (as shipped in `DEFAULT_SETTINGS`). When `false`, the binding was added by the user in the options page. The distinction is used by the UI to decide how to render and whether to allow deletion.
_Avoid_: default, built-in

**Last Speed** (`lastSpeed`):
The most recently applied playback rate, persisted in `chrome.storage.sync`. Updated on every `setSpeed` call. Used as the initialization speed for new controllers when `rememberSpeed` is enabled and no per-video speed exists for the current `src`. Distinct from Playback Rate in that it is a persisted setting, not the live browser property.
_Avoid_: current speed, saved speed

**Remember Speed** (`rememberSpeed`):
A boolean setting. When `true`, the extension restores `lastSpeed` (or a per-video stored speed from `settings.speeds`) as the initial playback rate when a media element's controller is created. When `false`, all new controllers start at 1.0× and the `reset` key binding is set to the `fast` binding's value (rather than the stored speed).
_Avoid_: persist speed, save speed, sticky speed

**Force Last Saved Speed** (`forceLastSavedSpeed`):
A boolean setting. When `true`, the extension intercepts every `ratechange` event and overrides it: if the event originated from VSC (detected via `event.detail.origin === 'videoSpeed'`), the speed is applied as requested; if the event originated from the host page, VSC overwrites it with `lastSpeed`. Prevents the host page from changing the playback rate against the user's saved preference. Implemented by routing all `setSpeed` calls through a custom `ratechange` CustomEvent instead of directly setting `video.playbackRate`.
_Avoid_: lock speed, override speed

**Audio Boolean** (`audioBoolean`):
A boolean setting (default `true`). When `true`, `<audio>` elements are detected and receive controllers via the same `VideoController` path as video elements. When `false`, audio elements are excluded from detection entirely. The name reflects legacy naming — semantically it means "audio controller support enabled."
_Avoid_: audio support, enable audio

**Start Hidden** (`startHidden`):
A boolean setting (default `false`). When `true`, newly created controllers are given both the `vsc-hidden` CSS class and inline `display: none` / `visibility: hidden` / `opacity: 0` fallback styles to prevent a flash of visible UI before the stylesheet loads. Controllers with `startHidden` will not be temporarily revealed by the `showController` call unless the user has manually toggled them (i.e., they carry the `vsc-manual` class).
_Avoid_: hide by default, invisible start

**Controller Opacity** (`controllerOpacity`):
A numeric setting (default `0.3`) controlling the CSS `opacity` of the `#controller` div inside the shadow root. Applied as an inline style at controller creation time. User-configurable in the options page.
_Avoid_: transparency, alpha

**Controller ID**:
A string identifier generated at `VideoController` construction time, formatted as `{tagName}-{srcHash}-{timestamp}`. Used exclusively for badge management via `VSC_CONTROLLER_CREATED` and `VSC_CONTROLLER_REMOVED` custom events. Not persisted; unique per page load.
_Avoid_: element ID, controller handle

---

## Fuzzy/overloaded terms

**"Speed Controller" vs. "Video Controller" vs. "Controller"**
Three distinct but overlapping concepts share similar names:
- `VideoController` — the JavaScript class (in `video-controller.js`) that owns the media element binding, the Shadow DOM host, the speed indicator reference, and the event handlers.
- `video.vsc.div` — the Shadow DOM host element in the DOM (the outer `<div class="vsc-controller">`). The glossary calls this "the controller."
- `#controller` — the `<div id="controller">` inside the shadow root that holds the speed indicator and buttons. This is the visual element the user sees.

These three things are all loosely called "controller" in both code and prose. The glossary's term "Controller" maps to `video.vsc.div` (the host element), but code comments and log messages use "controller" to mean any of the three. Consider adding a note to the "Controller" glossary entry clarifying which level is meant.

**"Reset" action vs. "reset" binding value**
The `reset` action does not always reset to 1.0×. `resetSpeed()` implements a toggle: if the current rate equals the `reset` binding's value, it toggles to `fast`; otherwise it saves the current rate into the `reset` binding and applies the target. When `rememberSpeed` is enabled, the `reset` binding value is initialized to `lastSpeed`. So the `reset` key binding's `value` field is a mutable toggle anchor, not a static default. The "Action" glossary entry describes `reset` only as resetting speed; this toggle semantics is undocumented.

**"Preferred Speed" and "fast" binding's default value**
The glossary defines Preferred Speed as "the value of the `fast` key binding." `DEFAULT_SETTINGS` ships `fast` with `value: 0.1`. This means the out-of-box Preferred Speed is `0.1×` — an extremely slow speed, not a "fast" one. The label `fast` and the term "Preferred Speed" imply a higher-than-normal speed. A user who never configures it will find the `fast` action slows their video to 0.1×. This deserves a note in the glossary.

---

## ADR candidates

**Speed limits are VSC-enforced, not only Chrome-enforced** (meets all three criteria)
The code clamps speed before assigning to `video.playbackRate`. Chrome also independently clamps. A reader who sees the `SPEED_LIMITS` constants might assume they exist only as documentation of Chrome's behavior, not as active enforcement. In reality VSC enforces them proactively (to prevent error states) and Chrome enforces them as a fallback. If VSC ever targets non-Chrome browsers, the VSC-side clamp is the canonical limit — the Chrome clamp is incidental. This distinction is hard to reverse (clamping is embedded in every speed-change path), surprising without context, and reflects a real choice (could have let Chrome do the clamping entirely).

**Per-video speed storage alongside global `lastSpeed`** (meets all three criteria)
`settings.speeds` is a dictionary from video `src` URL to the last speed used for that video. It is capped at 50 entries (oldest evicted first). This co-exists with global `lastSpeed`. The resolution order is: per-video speed > `lastSpeed` > 1.0. A reader would expect either global speed or per-video speed, not both. The cap of 50 is not documented anywhere in comments or the glossary. This decision is hard to reverse (it affects persistence semantics for all users), surprising (the dual-level lookup is non-obvious), and represents a real trade-off (per-video precision vs. storage limits).

**`forceLastSavedSpeed` uses a custom `ratechange` event to distinguish VSC-originated changes** (meets all three criteria)
When `forceLastSavedSpeed` is on, `setSpeed` does not directly assign `video.playbackRate`. Instead it dispatches a custom `ratechange` event with `detail.origin = 'videoSpeed'`, which the rate-change listener intercepts and uses to apply the speed. This round-trip via the event system exists because intercepting `ratechange` is the only way to also block *other* `ratechange` events from changing the rate. A direct assignment would fire a `ratechange` event indistinguishable from a host-page change. This is hard to reverse (changes the entire `setSpeed` execution path), surprising (why dispatch an event you immediately handle yourself?), and reflects a real trade-off (simpler: direct assignment + ignore external events by rate comparison; chosen: event tagging for reliable origin detection).

**Shadow DOM `open` mode** (borderline — may not meet "surprising" threshold)
`attachShadow({ mode: 'open' })` is used. This means host-page JavaScript can reach into `video.vsc.div.shadowRoot` and read or mutate the controller's internals. `closed` mode would prevent this. ADR-0002 records why Shadow DOM was chosen over iframes but does not address the open/closed choice. If this is a deliberate decision (e.g., to allow DevTools inspection, or to allow the extension's own scripts to access the shadow root without keeping a reference), it warrants a brief note. However if `open` was simply the default/obvious choice with no closed-mode consideration, this does not meet the "real trade-off" criterion.

---

## Terms correct — no change needed

**Blacklist** — definition matches code. Newline-separated hostnames, applied at detection time to prevent controller creation.

**Canvas Replacement** — confirmed correct.

**Marker** — `video.vsc.mark` confirmed as canonical storage. `setMark()` writes it, `jumpToMark()` reads it.

**Key Binding fields** (`action`, `key`, `value`, `force`, `predefined`) — all five fields confirmed in `DEFAULT_SETTINGS` and throughout `settings.js`.

**GIF-related terms** (GIF Controller, GIF Element, GIF Frame Cache, GIF Frame Engine, `gifSpeedStep`, `lastGifSpeed`, `controlGifs`) — not in scope for this analysis (core playback domain), but nothing found contradicts them.

**Media Element** — confirmed correct. Both `<video>` and `<audio>` are tracked; GIFs are explicitly excluded from this term.

**Site Handler** — confirmed correct. Not directly involved in core playback but referenced correctly.

**Speed Indicator reference** (`video.vsc.speedIndicator`) — stored in `VideoController.initializeControls()` (line 174) and accessed in `ActionHandler.setSpeed()` (line 373) and `EventManager.updateSpeedFromEvent()` (line 210). The reference is to the `.draggable` span returned by `ShadowDOMManager.getSpeedIndicator()`.
