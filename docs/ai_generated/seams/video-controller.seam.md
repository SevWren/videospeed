---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# video-controller.seam.md

**File**: `src/core/video-controller.js`
**World**: page-main (injected at position 11 in load order)
**window.VSC registration**: `window.VSC.VideoController` (class, line 430)
**LOC**: 432

---

## window.VSC Depends On

| Global | Used for |
|--------|----------|
| `window.VSC.ControlsManager` | Creates the speed-control overlay UI for each video |
| `window.VSC.ShadowDOMManager` | Calculates controller position, creates Shadow DOM wrapper, retrieves speed indicator element |
| `window.VSC.logger` | Structured logging throughout |
| `window.VSC.Constants` | `DEFAULT_SPEED`, setting keys (e.g. `rememberSpeed`, `forceLastSavedSpeed`) |

---

## Exposes

### `window.VSC.VideoController` (class)

| Method / Property | Called by | Purpose |
|-------------------|-----------|---------|
| `new VideoController(target, parent, config, actionHandler, shouldStartHidden)` | `inject.js:23` | Constructor: attaches controller to `target` video/audio element; idempotent (returns existing `target.vsc` if already attached). Dispatches `VSC_CONTROLLER_CREATED` CustomEvent. |
| `vc.remove()` | `inject.js` (media removal path) | Tears down controls, removes shadow DOM, dispatches `VSC_CONTROLLER_REMOVED`, removes `target.vsc`. |
| `vc.setSpeed(speed)` | `action-handler.js` | Sets `target.playbackRate` and updates speed indicator. |
| `vc.div` | `action-handler.js`, `drag-handler.js` | The wrapper `<div>` containing the shadow DOM controller UI. |
| `vc.video` | `inject.js`, `action-handler.js` | Reference to the managed `<video>` / `<audio>` element. |
| `vc.speedIndicator` | `action-handler.js` | The span element inside shadow DOM displaying current speed. |

### Expando Properties Written on `<video>` / `<audio>` Elements

| Property | Set at | Meaning |
|----------|--------|---------|
| `target.vsc` | `video-controller.js:15` | Reference to the `VideoController` instance; presence indicates controller is attached |

---

## IPC: CustomEvents Dispatched

| Event | Direction | Dispatched at | Received by |
|-------|-----------|---------------|-------------|
| `VSC_CONTROLLER_CREATED` | main → isolated | `video-controller.js:418` (via `dispatchControllerEvent`) | `injector.js:235` (forwards to `chrome.runtime` for badge) |
| `VSC_CONTROLLER_REMOVED` | main → isolated | `video-controller.js` (`remove()`) | `injector.js:253` |

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P10 | `window.VSC.VideoController` registered in page-main world; all cross-world communication uses CustomEvent / postMessage, never direct function calls across content-script boundary | `video-controller.js:430`; `dispatchControllerEvent()` method |

---

## Common Tasks

- **D2: Speed control UI not showing on a site** — check `VideoController` constructor; inspect `shouldStartHidden` logic and `ShadowDOMManager.calculatePosition()` output
- **D7: Add a keyboard shortcut action** — `action-handler.js` calls `vc.setSpeed()`; look at `ActionHandler` for the action dispatch table, not this file

---

## Gotchas

- **Constructor is idempotent via `target.vsc` guard.** If `target.vsc` already exists, the constructor returns the existing instance without creating a second controller. Do not remove this guard — duplicate controllers cause double UI overlays.

- **`vc.div` is the Shadow DOM host wrapper, not the shadow root.** `DragHandler` moves `vc.div` in the DOM. `ShadowDOMManager.createShadowDOM(wrapper, ...)` attaches a shadow root to `wrapper`; `vc.div === wrapper`. Confusing the two causes drag positioning bugs.

- **`VSC_CONTROLLER_CREATED` fires during constructor.** Badge count increments as soon as the controller is attached, before the video begins playing. This is intentional — the badge reflects attached controllers, not playing videos.
