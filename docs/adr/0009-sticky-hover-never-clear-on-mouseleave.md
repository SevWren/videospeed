# Hover Target is never cleared on mouseleave (sticky hover)

When the pointer leaves a Controller div, the `mouseleave` handler cancels any pending Dwell Time timer but does not clear `ActionHandler._hoverTargetController`. The Hover Target persists until a different Controller completes Hover Activation. Both `VideoController.setupEventHandlers()` and `GifController._initializeControls()` carry an explicit comment: "Intentionally NOT clearing … sticky hover."

## Why this is surprising

Most hover-activated UIs reset their state when the pointer leaves: a tooltip disappears, a highlighted item deselects. A reader seeing `mouseenter` set a target naturally expects `mouseleave` to unset it. The absence of a clear call is a deliberate gap, not an oversight.

## Trade-off

- **Sticky hover (chosen)**: The Hover Target remains active after the pointer leaves, so the user can move the mouse away from the controller (e.g., to the video area or an adjacent text block) and keep typing speed shortcuts without losing the selected target. This is critical for the primary use case: hover to select a video, then use keyboard shortcuts freely.
- **Clear on mouseleave**: The Hover Target is removed the moment the pointer exits the controller div. The user would have to keep the pointer on the controller while pressing shortcuts, or re-hover every time — unusable for any keyboard-centric workflow.

## Consequences

The Hover Target can become stale if a Controller is removed from the DOM while it is the active Hover Target. `VideoController.remove()` cancels the pending dwell timer but does not call `setHoverTarget(null)`. The dispatch loop guards against this: `v.vsc?.div` check in `runAction()` will not match a removed controller's div, so stale references produce no action rather than an error. If the page has exactly one media element and its controller is removed, the next keypress broadcasts to all remaining media elements (i.e., none), which is correct.
