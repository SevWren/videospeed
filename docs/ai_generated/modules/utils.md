---
area: utils
module-card: true
base-sha: e904370863d69a2b5d853af62745141953c4860d
---

# utils — shared utilities and cross-cutting concerns

**Mission**: Provide pure utility functions, a logger, constants, DOM helpers, and the keyboard
event manager that all other page-world modules depend on. These are loaded first in the injector
load order.

---

## Files

| File | LOC | Role |
|------|-----|------|
| `src/utils/constants.js` | 121 | SHALLOW — `window.VSC` namespace initializer; `DEFAULT_SETTINGS`, `SPEED_LIMITS`, `MESSAGE_TYPES`, GIF constants; loaded FIRST in injector order |
| `src/utils/logger.js` | 110 | SHALLOW — verbosity-gated console wrapper; exposes `window.VSC.logger`; loaded second |
| `src/utils/debug-helper.js` | 400 | SHALLOW — dev/debug tool; `window.VSC.DebugHelper`; NOT consumed by any production path |
| `src/utils/dom-utils.js` | 228 | SHALLOW — pure utility functions: `getShadow`, `isBlacklisted`, `initializeWhenReady` |
| `src/utils/event-manager.js` | 319 | DEEP — `EventManager`: keyboard event listener setup, `keydown` routing, scroll-based speed control, event cleanup |

---

## Key invariants (protected behaviors)

| PB | Rule | Code location |
|----|------|--------------|
| P10 | `constants.js` is the FIRST module injected; it initializes `window.VSC = window.VSC \|\| {}`. All other modules guard `window.VSC.X = window.VSC.X \|\| <value>` | `constants.js:1` |
| P11 | `constants.js` and `logger.js` must remain the first two entries in `injector.js` load order; every other module reads `window.VSC.logger` at call time (not parse time) | `injector.js` lines 37–38 |

---

## Seam: what this area exposes / consumes

**Exposes (via `window.VSC.*`):**
- `window.VSC` (namespace) — `constants.js`
- `window.VSC.Constants` — consumed by all modules
- `window.VSC.logger` — consumed by all modules
- `window.VSC.DebugHelper` — consumed only by E2E / dev tooling
- `window.VSC.DomUtils` — consumed by `inject.js`, `mutation-observer.js`, `action-handler.js`
- `window.VSC.EventManager` — consumed by `inject.js:25`

**Consumes:**
- Nothing from other `window.VSC.*` globals (utils are lowest in the dependency graph)
- `window.VSC.Constants` (logger, event-manager) — self-referential but safe since constants.js loads first

---

## Common D-tasks landing here

| Task | Entry point |
|------|------------|
| D5 — add a keyboard shortcut action | `event-manager.js` (key routing) → `action-handler.js` (action dispatch) |
| D14 — add a new constant or default setting | `constants.js::DEFAULT_SETTINGS` |

---

## Notes

- `debug-helper.js` (400 LOC) is loaded in production (it is in `injector.js` load order, position 3)
  but its `window.VSC.DebugHelper` class is not consumed by any production module. It exposes dev
  utilities and can dispatch `CustomEvent('VSC_MESSAGE')` directly (see B-architecture.md B3). It is
  NOT dead code — it is a development aid that ships with the extension.
- `event-manager.js` (319 LOC, DEEP) mixes keyboard binding dispatch with scroll-speed control; a
  natural seam exists at the scroll handler (B-architecture.md B5 seam 4). Do not add more concerns
  here — prefer a new utility module.
- `dom-utils.js::isBlacklisted` is the canonical check for whether a page URL is on the user's
  blacklist. This check must be called before attaching any controller.
