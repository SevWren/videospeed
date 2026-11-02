# Hover activation setting is checked at registration time for video, at event time for GIF

`VideoController.setupEventHandlers()` checks `hoverActivatesVideoTarget` once, at construction time: if the setting is false, no `mouseenter`/`mouseleave` listeners are ever registered on the controller div. `GifController._initializeControls()` always registers both listeners and checks `hoverActivatesGifTarget` inside the `mouseenter` handler at event time — the setting is re-read on every pointer entry.

## Why this is surprising

A reader expects the two controllers to apply the same pattern. Seeing an `if (setting)` guard around listener registration in one file and an `if (!setting) return` guard inside the listener body in the other file looks like an inconsistency or an oversight. Both produce the same observable behavior when the setting is static, so the difference is invisible under normal use.

## Why the asymmetry exists

The two controllers were designed under different constraints:

- **Video** (`hoverActivatesVideoTarget`, default `true`): The mouseenter/mouseleave listener pair has no purpose at all when the setting is off. Skipping registration entirely is the cleanest expression of that — zero overhead, zero handler on the div.
- **GIF** (`hoverActivatesGifTarget`, default `false`): The GIF controller's overlay div is created once and never replaced. Because `hoverActivatesGifTarget` is an opt-in setting that users are more likely to toggle at runtime (it is off by default, making its toggle more deliberate than video's), the check was placed inside the handler so that toggling the setting takes immediate effect without reloading the page or recreating the controller.

## Implications for live setting changes

The asymmetry produces a real behavioral difference when a user changes the setting while the page is open:

- **`hoverActivatesGifTarget` changed**: takes effect immediately on the next `mouseenter` event. No controller re-creation needed.
- **`hoverActivatesVideoTarget` changed**: the listener is (or is not) registered at construction time. Changing the setting after a `VideoController` is created has no effect on that controller's behavior. The new value only applies to controllers created after the settings change — which, in practice, means a page reload is required.

## Considered options

- **Unify on registration-time checks** (both controllers only register listeners when the setting is true): would make the code symmetrical but would require video controllers to support re-registration when the setting changes, which is currently out of scope.
- **Unify on event-time checks** (both controllers always register and check inside the handler): would make GIF-style live toggles work for video too, but adds a handler invocation on every mouseenter even when the feature is off.
- **Keep the asymmetry (chosen)**: each controller uses the pattern that fits its existing lifecycle. The trade-off is documented here rather than hidden in code comments.

## Consequences

If `hoverActivatesVideoTarget` is ever made live-toggleable without a page reload, `VideoController` will need to either re-register its listeners on settings change or move the check inside the handler body — matching the GIF pattern. Any future hover-capable controller type should document which pattern it follows.
