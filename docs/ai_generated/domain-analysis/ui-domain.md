# UI Domain Analysis

Analysis of `src/ui/controls.js`, `src/ui/shadow-dom.js`, `src/ui/drag-handler.js`,
`src/ui/options/options.js` (first 200 lines), and `src/ui/popup/popup.js` against the
existing `GLOSSARY.md`.

---

## 1. Challenged existing terms

### "Controller" — host vs. shadow root confusion

The current glossary definition reads: "renders inside a Shadow DOM host attached to the page."

The code reveals a two-level structure that the single word "Controller" blurs:

1. **The wrapper div** (`video.vsc.div`) — a plain `<div class="vsc-controller">` inserted
   into the host page DOM. `shadow-dom.js` calls this the `wrapper`; `video-controller.js`
   calls it `wrapper` during construction and then stores it as `this.div`. This element IS
   the Shadow DOM host: `wrapper.attachShadow({ mode: 'open' })` is called on it.

2. **The `#controller` div** — a `<div id="controller">` created *inside* the shadow root.
   It holds the draggable speed indicator span and the `#controls` span with buttons.
   `shadow-dom.js` `getController()` returns `shadow.querySelector('#controller')`.
   `drag-handler.js` accesses it as `controller.shadowRoot?.querySelector('#controller')`.

So the glossary's "Controller" actually conflates two distinct DOM nodes. The phrase "renders
inside a Shadow DOM host" is backwards: the Shadow DOM host IS the outer wrapper div; what
renders inside it is the `#controller` div.

**Recommendation:** The glossary definition should be tightened. The "Controller" as a
product concept maps most cleanly to the wrapper div (`video.vsc.div`) — the Shadow DOM host
element inserted into the page. The `#controller` div inside the shadow root is an
implementation node (the "Shadow Controller" in drag-handler comments) and does not need a
separate glossary entry; it belongs to implementation detail, not domain vocabulary.

The current definition is not wrong enough to be actively misleading, but the phrase "renders
inside a Shadow DOM host" should be replaced with "IS the Shadow DOM host" or rephrased to
avoid the confusion.

### "Speed Indicator" — naming inconsistency with `.draggable`

The glossary defines **Speed Indicator** as "the text node inside the controller that renders
the current playback rate."

In the code, the element is:
- Queried as `shadow.querySelector('.draggable')` throughout `shadow-dom.js` (methods
  `getSpeedIndicator`, `updateSpeedDisplay`) and in `controls.js` line 105.
- The `ShadowDOMManager.getSpeedIndicator()` static method exists precisely to wrap this
  query, aliasing `.draggable` to "speedIndicator."
- Stored as `this.speedIndicator` on the `VideoController` instance (line 174,
  `video-controller.js`) and as `video.vsc.speedIndicator` accessed in `action-handler.js`
  and `event-manager.js`.

The CSS class is `.draggable` because the speed indicator span is also the drag handle — it
carries `data-action="drag"` and receives the mousedown that initiates dragging.

The term `speedIndicator` is used consistently in JS variable names and property names.
The CSS class `.draggable` describes its secondary role (drag handle). There is no element
in the code named `speedIndicator` as a CSS class or HTML id; the name only appears as a
JS variable/property.

**Verdict:** The glossary term "Speed Indicator" is correct as a domain concept. However,
the definition should note that this element doubles as the drag handle (`.draggable` CSS
class), to explain why the drag action is dispatched from it.

---

## 2. Missing terms

### Shadow Host

The element returned by `video.vsc.div` — the `<div class="vsc-controller">` inserted into
the host page — is the Shadow DOM host. `ShadowDOMManager.createShadowDOM(wrapper, ...)` is
called on it: `wrapper.attachShadow({ mode: 'open' })`. The drag handler accesses it as
`video.vsc.div` and then reaches into it via `controller.shadowRoot?.querySelector('#controller')`.

This is NOT a separate glossary term from "Controller." The Controller IS the Shadow DOM host
element. However, the existing glossary entry for "Controller" does not state this clearly and
the term "Shadow Host" does not appear in the glossary. Adding a note to the "Controller"
definition that it IS the shadow host element would remove the ambiguity without adding a
redundant term.

**Glossary-worthy as a standalone term? No** — it is the same thing as the Controller div.
The definition of "Controller" should just be corrected to say it IS the shadow host.

### Draggable / Drag Handle

The `.draggable` span is the Speed Indicator element in its role as drag handle.
When the user mousedowns on it, `controls.js` fires `data-action="drag"`, which routes to
`DragHandler.handleDrag(video, e)`. The drag handler:

1. Reads `video.vsc.div` (the Shadow DOM host wrapper).
2. Reads `controller.shadowRoot.querySelector('#controller')` (the inner `#controller` div).
3. Adds `.dragging` to the `#controller` div (cursor change) and `vcs-dragging` to the video.
4. Attaches `mousemove`/`mouseup`/`mouseleave` to the nearest same-size parent via
   `DomUtils.findVideoParent`.
5. Updates `shadowController.style.left` and `shadowController.style.top` in-memory on each
   mousemove. **Position is NOT persisted to storage.**

"Draggable" as a standalone term is not warranted — it is just the Speed Indicator in its
drag-handle role. What may be worth noting is the drag positioning behavior (see ADR
candidates below).

**Glossary-worthy as a standalone term? No.** The Speed Indicator definition should note the
drag-handle dual role.

### Controller Button

The `#controls` span inside the shadow root holds `<button>` elements. In `shadow-dom.js`
the buttons are constructed from a config array: `rewind` («), `slower` (−), `faster` (+),
`advance` (»), `display` (×). GIF controllers omit `rewind` and `advance`. Each button
carries `data-action` matching an Action name.

These are domain-relevant — they are the clickable triggers for Actions that appear on the
Controller. The glossary defines "Action" but does not name the buttons themselves. A user
or contributor talking about "the minus button" or "the hide button" needs a term.

**Glossary-worthy? Yes** — propose adding **Controller Button** as a term.

### Controller Opacity

`controllerOpacity` is a persisted setting (in `chrome.storage.sync`, loaded via
`settings.js`). It is passed as `opacity` to `ShadowDOMManager.createShadowDOM()` and
applied as inline `opacity` style on the inner `#controller` div. Default value is `0.3`
(from `shadow-dom.js` parameter default). Appears in `options.js` as a configurable field.

**Glossary-worthy? Yes** — it is a named, persisted, user-configurable concept. Propose
adding **Controller Opacity**.

### Controller Button Size

`controllerButtonSize` is a persisted setting (default `14`, from `constants.js`). Passed
as `buttonSize` to `ShadowDOMManager.createShadowDOM()` and applied as `font-size` on the
`.draggable` span and `#controls` span. Appears in `options.js` as a configurable field.

**Glossary-worthy? Yes** — same rationale as Controller Opacity. Propose adding
**Controller Button Size**.

### Start Hidden Mode

`startHidden` is a persisted boolean setting (default `false`). When `true`:

- The Controller wrapper gains CSS classes `vsc-hidden` plus inline
  `display: none !important; visibility: hidden !important; opacity: 0 !important` at
  creation time (video-controller.js lines 124–156).
- GIF controllers also gain `vsc-hidden` and inline hide styles
  (gif-controller.js line 641–645).
- `EventManager.showController()` checks `startHidden` before temporarily showing a
  controller on a ratechange event: if `startHidden` is true and the controller does NOT
  carry `vsc-manual`, the show is suppressed entirely.
- The `display` action (and the `vsc-manual` class) is the only way a user can make a
  start-hidden controller visible; once `vsc-manual` is set, `showController` respects it.

**Glossary-worthy? Yes** — it is a named mode with non-obvious behavioral consequences.
Propose adding **Start Hidden** (or **Start Hidden Mode**).

### Shadow DOM

Used in ADR-0002 and referenced heavily in code comments but not defined in the glossary.
The glossary rules say: "Only include terms specific to this project's context." Shadow DOM
is a web platform standard, not a project-specific concept.

**Glossary-worthy? No** — it is a general web platform concept. The relevant project-specific
concept is that the Controller IS the shadow host, which belongs in the "Controller" definition.

### Options Page

The full-screen Chrome extension page (`src/ui/options/options.html` + `options.js`) where
users configure key bindings, controller opacity, button size, start-hidden behavior,
blacklist, and other settings. Accessed via `chrome.runtime.getURL("src/ui/options/options.html")`,
opened from the popup's settings button. Distinct from the Popup.

**Glossary-worthy? Yes** — it is a named extension surface with a distinct identity.

### Popup

The browser action popup (`src/ui/popup/popup.js`). Provides quick speed controls
(increase/decrease/preset buttons), a settings button (opens Options Page), and a power
toggle. Communicates with the active tab by sending `VSC_SET_SPEED`, `VSC_ADJUST_SPEED`,
`VSC_RESET_SPEED`, and `VSC_TOGGLE_DISPLAY` messages via `chrome.tabs.sendMessage`. Distinct
from the Controller (which is injected into the page) and the Options Page.

**Glossary-worthy? Yes.**

### Blink

The `blink` action is defined in the glossary's Action set but the behavior is not described
there. `ActionHandler.blinkController(controller, duration)`:

1. If the controller has `vsc-hidden`, temporarily removes it (makes controller visible).
2. Sets `controller.blinkTimeOut` to re-add `vsc-hidden` after `duration` ms.
3. If the controller is already visible (no `vsc-hidden`), does nothing for video controllers;
   skips for audio controllers (comment: "audio elements are often invisible by design").
4. Also triggered automatically via `EventManager.updateSpeedFromEvent()` on every ratechange
   event, so the controller briefly flashes when speed changes via keyboard.

The term is listed in the Action glossary entry but its behavior (flash-then-hide) is not
described. Since "blink" is an action name in the domain vocabulary, it's fine where it is —
but the Action definition should note what it does, not just list it.

**Glossary-worthy as a standalone term? No** — it is already in the Action list. The Action
definition should describe it.

### Show Timer

`EventManager` holds `this.timer` — a `setTimeout` handle. When `showController(controller)`
is called (triggered by `blink` or `ratechange`), it:
1. Adds `vsc-show` to the controller.
2. Sets a 2000 ms timeout to remove `vsc-show` (hide the controller again).
3. Clears and resets the timer on each call, so rapid speed changes extend the visible window.

This is an internal implementation mechanism (a timer handle on the EventManager). It is not
user-configurable and not named in user-facing vocabulary.

**Glossary-worthy? No** — implementation detail.

### Cool Down

`EventManager.this.coolDown` — a 1000 ms `setTimeout` handle set by `refreshCoolDown()`.
While active, `handleRateChange()` calls `event.stopImmediatePropagation()` to suppress
ratechange events from reaching other listeners (preventing the site from overriding VSC's
applied speed). Reset on each action via `refreshCoolDown()`.

This is also an internal mechanism, not a user-facing concept and not referenced in
user-visible vocabulary.

**Glossary-worthy? No** — implementation detail.

### Controller Div (`video.vsc.div`)

`video.vsc.div` is the JS handle to the Controller's Shadow DOM host wrapper element.
`target.vsc = this` (the VideoController instance) is set at construction time; `this.div`
is the wrapper returned by `initializeControls()`. It is NOT a separate domain concept from
"Controller" — it is just how the Controller is accessed programmatically.

**Glossary-worthy as a standalone term? No** — same thing as Controller.

### GIF Controls Overlay

Inside `GifController._initializeControls()`, a `<div class="vsc-controller">` is created
and inserted adjacent to the canvas. A Shadow DOM is then attached to it in the same way
as for video controllers (`ShadowDOMManager.createShadowDOM(div, { isGif: true })`). So the
GIF "controls overlay" is structurally identical to a video Controller: it is a Shadow DOM
host div carrying the same `#controller` / `#controls` / `.draggable` inner structure. The
only differences are: it is positioned adjacent to the canvas (not inserted via site handler
logic), and GIF buttons omit `rewind` and `advance`.

ADR-0002 explicitly states its scope covers HTML media element controllers only, noting that
GIF controllers use "canvas replacement." This is true for the canvas itself, but the GIF
controller's floating speed UI is still a Shadow DOM host div — indistinguishable in
structure from a video Controller.

**Is this a distinct term from "Controller"? No.** The GIF Controller's speed overlay div is
a Controller in exactly the same sense. The glossary "GIF Controller" term refers to the
whole per-GIF instance (`GifController` class), not specifically the overlay div. The overlay
div is the Controller sub-concept that belongs to that GIF Controller instance. No new term
needed; the "Controller" definition should note it also applies to the overlay div inside a
GIF Controller.

---

## 3. Stress-test scenarios

### User drags the controller to a custom position

- User mousedowns on the `.draggable` span (Speed Indicator / drag handle).
- `ControlsManager.setupDragHandler` fires `data-action="drag"`.
- `ActionHandler` routes to `DragHandler.handleDrag(video, e)`.
- `DragHandler` reads `video.vsc.div` (Shadow DOM host wrapper) and then
  `controller.shadowRoot.querySelector('#controller')` (inner `#controller` div).
- Mouse move updates `shadowController.style.left` / `.top` in memory.
- On mouseup/mouseleave, drag ends. **Position is not persisted.** On page reload the
  controller resets to its calculated position from `ShadowDOMManager.calculatePosition(video)`.

Terms involved: Controller (wrapper = shadow host), Speed Indicator (= drag handle),
Action (`drag`), DragHandler (implementation class).

### User sets `startHidden: true` — when does the controller first appear?

At creation, the Controller wrapper receives `vsc-hidden` and inline hide styles. The
controller is invisible. It will NOT appear temporarily on ratechange events because
`EventManager.showController()` checks `startHidden` and suppresses the show unless
`vsc-manual` is present. The controller first becomes visible when the user explicitly
triggers the `display` Action (e.g., via a key binding or the Controller Button). The
`display` action adds `vsc-manual` to the wrapper and toggles `vsc-hidden`. Once `vsc-manual`
is set, `showController()` will respect it and the temporary-show path works normally.

Terms involved: Start Hidden (new), Controller, Action (`display`), `vsc-manual` (internal
CSS class, not a glossary term).

### User scrolls a video off-screen — is the controller hidden automatically?

No automatic hiding on scroll in the UI layer. `VideoController` sets up a
`ResizeObserver`/visibility check (video-controller.js lines ~350–410) that adds `vsc-hidden`
when the video becomes invisible (zero size, `display:none`, etc.) and removes it when it
becomes visible again — but this is triggered by element visibility, not scroll position
alone. If a video scrolls off-screen but remains in the DOM at its original size, the
controller stays visible (potentially floating off-screen).

### Site with z-index stacking that covers the controller

The Shadow DOM host wrapper has `z-index: 9999999 !important` as an inline style. The inner
`#controller` div also sets `z-index: 9999999` via its shadow-root stylesheet. Because the
shadow root's stylesheet is scoped inside the shadow tree, the `z-index` on `#controller`
is only in stacking context with other elements inside the same shadow root — it does not
compete with host-page elements. The effective z-index competing against the host page is the
wrapper div's `z-index: 9999999 !important`. Shadow DOM prevents host-page CSS from
overriding the controller's internal styles but does NOT prevent the host page from placing
elements above the wrapper in the stacking order via a higher z-index on a host element.

---

## 4. ADR candidates

### ADR candidate: Drag position stored in-memory only, not persisted

**Hard to reverse?** Moderately — adding persistence would require choosing a storage key,
deciding whether to key by URL/domain/element, and handling stale positions when page layout
changes. It would touch `DragHandler`, `VideoController`, and `settings.js`.

**Surprising without context?** Yes. A user who drags the controller to a comfortable
position expects it to stay there on next visit. The current behavior (reset on reload) is
counterintuitive and a contributor would not expect it from reading the drag implementation
in isolation.

**Real trade-off?** Yes. Persisting a pixel position per-site is straightforward but fragile
(the video element may be at a different position or a different size on reload, making the
saved position wrong or off-screen). The current choice avoids stale/invalid positions at the
cost of requiring the user to re-drag on each load.

**ADR verdict: qualifies.** This is surprising, has a meaningful reversal cost, and there
is a genuine trade-off worth recording.

### ADR candidate: Options page as a full HTML page vs. inline popup controls

**Hard to reverse?** Low — the popup already exists as a separate HTML/JS file; moving
controls between popup and options page is a UI restructuring exercise, not an architectural
one.

**Surprising without context?** Not particularly. Separating full settings from quick-access
popup controls is a standard extension pattern.

**Real trade-off?** Weak. The split is conventional for Chrome extensions with many settings.

**ADR verdict: does not qualify.** The three-criterion bar is not met. Not surprising, not
hard to reverse.

### ADR candidate: GIF overlay using Shadow DOM (same as video controllers)

ADR-0002 explicitly says its scope is HTML media controllers and describes GIF controllers
as using "canvas replacement instead of Shadow DOM." This is true for the canvas but
**not true for the speed controls overlay**: `GifController._initializeControls()` creates a
Shadow DOM host div in the same way as `VideoController.initializeControls()`.

This inconsistency between what ADR-0002 implies (GIF controllers do not use Shadow DOM) and
what the code actually does (the GIF speed overlay IS a Shadow DOM host) is potentially
confusing. A contributor reading ADR-0002 would expect GIF controllers to have no Shadow DOM
at all.

**Hard to reverse?** Moderate — switching GIF overlays to plain divs would mean re-adding
style scoping manually.

**Surprising without context?** Yes — ADR-0002 creates the false impression that Shadow DOM
is absent from GIF controllers.

**Real trade-off?** Yes — the GIF canvas itself benefits from no Shadow DOM (irrelevant for
a pixel surface), but the speed controls overlay injected adjacent to the canvas benefits
from the same style isolation as video controllers.

**ADR verdict: qualifies** — but as a clarifying amendment to ADR-0002, not a new ADR.
ADR-0002 should be updated to note that the GIF speed controls overlay div IS a Shadow DOM
host, and only the canvas element itself avoids Shadow DOM.

---

## 5. Proposed GLOSSARY.md changes (summary)

The following terms should be **added** to `GLOSSARY.md`. None of these are implementation
details; all are user-visible or contributor-visible named concepts.

**Controller Button**:
A `<button>` element inside a Controller's `#controls` span, visible on hover. Each button
carries a `data-action` attribute naming the Action it triggers. The standard set is: rewind,
slower, faster, advance, display. GIF Controllers omit rewind and advance.
_Avoid_: control button, action button, UI button

**Controller Opacity**:
A persisted numeric setting (`controllerOpacity`, default `0.3`) that controls the CSS
opacity of the `#controller` div inside the shadow root. Configurable on the Options Page.
_Avoid_: opacity, transparency, alpha

**Controller Button Size**:
A persisted numeric setting (`controllerButtonSize`, default `14`) applied as `font-size`
(in px) to the Speed Indicator and the buttons inside the Controller. Configurable on the
Options Page.
_Avoid_: button font size, icon size, control size

**Start Hidden**:
A persisted boolean setting (`startHidden`, default `false`). When `true`, every Controller
is created with `vsc-hidden` and inline hide styles, making it invisible until the user
explicitly shows it via the `display` Action. While active, automatic temporary visibility
(normally triggered on speed change) is also suppressed unless the user has previously
toggled the controller manually.
_Avoid_: hidden mode, invisible mode, auto-hide

**Options Page**:
The full-screen Chrome extension settings page (`options.html`) where users configure key
bindings, Controller Opacity, Controller Button Size, Start Hidden, blacklist, and other
settings. Opened from the Popup's settings button.
_Avoid_: settings page, options screen, preferences

**Popup**:
The browser action popup shown when the user clicks the extension icon. Provides quick
speed controls (increase, decrease, preset speeds), a toggle to enable/disable the extension,
and a button to open the Options Page. Communicates with the active tab via Chrome messaging.
_Avoid_: extension popup, toolbar popup, badge popup

The following existing definitions should be **amended**:

**Controller** — amend to clarify it IS the Shadow DOM host element (the wrapper div), not
an element that renders "inside" a shadow host.

**Speed Indicator** — amend to note it doubles as the drag handle (carries `.draggable` CSS
class and `data-action="drag"`), explaining why dragging the speed indicator repositions the
Controller.

**Action** — amend the `blink` entry to describe its behavior: flashes the Controller
briefly visible (removes `vsc-hidden` temporarily) in response to a speed change, then
re-hides it after a short duration.
