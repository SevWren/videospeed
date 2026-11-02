# ActionHandler / EventManager / Action Targeting — Cluster Analysis

**Date**: 2026-11-02
**Cluster**: `src/core/action-handler.js` + `src/utils/event-manager.js`
**Scope**: Architecture analysis only. No implementation changes proposed here.

---

## Ask-Matt Routing Log

The goal is "improve the codebase architecture by deepening the ActionHandler/EventManager/targeting cluster."

Per the ask-matt skill's Codebase Health section:

> `/improve-codebase-architecture` runs whenever you have a spare moment to keep the codebase good for agents to operate in. It surfaces deepening opportunities; picking one generates an idea you can take into the main flow at `/grill-with-docs`. It is the survey that finds the candidates; `/codebase-design` is the bench you design the chosen one on.

Routing applied:

1. **`/improve-codebase-architecture` — Step 1 (Explore)**: Apply the deletion test and depth analysis to the named cluster. Surface friction points and candidates. This document is that step.
2. **`/codebase-design` vocabulary**: Applied throughout. All architectural terms below use the codebase-design glossary exactly (module, interface, depth, seam, adapter, leverage, locality).
3. **Next step**: Take the top recommendation into `/grill-with-docs` to design the deepened module. Do not implement here.

ADRs consulted: ADR-0008 (hover state on ActionHandler), ADR-0009 (sticky hover), ADR-0010 (mark/jump excluded from hover targeting). None are contradicted by this analysis.

---

## Cluster Overview

The cluster consists of two modules and one inline mechanism:

| Module | File | Declared purpose |
|---|---|---|
| `ActionHandler` | `src/core/action-handler.js` | Execute Actions on media elements and GIF elements |
| `EventManager` | `src/utils/event-manager.js` | Manage DOM event listeners (keyboard, ratechange) |
| Targeting (inline) | inside `ActionHandler.runAction` / `runGifAction` | Resolve which controller(s) receive a dispatched Action |

The two modules are mutually dependent: `ActionHandler` receives `eventManager` in its constructor and calls `eventManager.showController()` and `eventManager.refreshCoolDown()`. `EventManager` receives `actionHandler` in its constructor and calls `actionHandler.runAction()` and `actionHandler.runAction('blink', ...)`. This is a **circular dependency** (see Friction Point 4 below).

---

## Friction Points — Deletion Test Results

### Friction Point 1: Duplicate target-resolution logic in `runAction` and `runGifAction`

**The code that duplicates:**

```js
// In runAction (video path):
const isMarkOrJump = action === 'mark' || action === 'jump';
const hoverTarget = !isMarkOrJump ? this._hoverTargetController : null;
const resolvedTarget = targetController ?? hoverTarget ?? null;

// In runGifAction (GIF path) — identical:
const isMarkOrJump = action === 'mark' || action === 'jump';
const hoverTarget = !isMarkOrJump ? this._hoverTargetController : null;
const resolvedTarget = targetController ?? hoverTarget ?? null;
```

**Deletion test**: If this block were extracted to a `_resolveTarget(action, e)` method, would complexity concentrate or spread?

**Result: concentrate.** The three-source resolution rule (click-derived > hover-derived > broadcast), the mark/jump exclusion, and the precedence ordering are all policy. Right now that policy lives twice — once per media type — and any future change to targeting (adding a new excluded action, changing precedence) must be made in two places. Extracting to `_resolveTarget(action, e)` would make that policy live once, with both `runAction` and `runGifAction` calling it. The callers become shallower; the extracted method earns its keep. **Complexity concentrates: extraction is justified.**

The extracted method could be named `_resolveTarget(action, e)` returning `HTMLElement | null`, where `null` means broadcast to all.

---

### Friction Point 2: Is `showController` in the right place?

`EventManager.showController(controller)` is called from three sites:
- `ActionHandler.runAction()` — for each video controller that matches the resolved target
- `ActionHandler.runGifAction()` — for GIF controllers, gated on a `showActions` list
- `EventManager.updateSpeedFromEvent()` — via `actionHandler.runAction('blink', null, null)` (indirect)

**Deletion test**: If `showController` were deleted from `EventManager` and its implementation moved to a dedicated `ControllerVisibility` module (or to `ActionHandler`), would complexity concentrate or spread?

**Result: spread.** `showController` manages a `timer` reference (the 2 s auto-hide timeout), the `vsc-show` CSS class, inline style clearing, and the `startHidden` + `vsc-manual` guard. Moving it out of `EventManager` does not reduce that complexity — it just moves it. The implementation would be equally tractable in `ActionHandler` or in a separate module.

**However**, the placement question is real. `showController` is not an input event concern. Its logic — temporarily reveal a Controller on action, then hide it after 2 s — belongs to the domain of **controller visibility**, not to the domain of "listen for keyboard events and ratechange events." `EventManager`'s other methods (`setupKeyboardShortcuts`, `handleKeydown`, `setupRateChangeListener`, `handleRateChange`, `refreshCoolDown`, `cleanup`) are all about input event wiring and the Cool Down mechanism. `showController` is the odd one out.

**Conclusion**: `showController` is not in the wrong *file* in a catastrophic way, but it is in the wrong *concern*. It is a guest in a module dedicated to event subscription. Whether to extract it is a depth question, not a deletion-test failure. See Deepening Candidate 2.

---

### Friction Point 3: `mark`/`jump` exclusion as imperative inline check

The current expression is:

```js
const isMarkOrJump = action === 'mark' || action === 'jump';
```

This is a boolean local variable used in one place. It encodes a design decision (ADR-0010) whose full reasoning is: "actions that operate on per-element persistent state should broadcast from hover, not target." The variable name `isMarkOrJump` is accurate but names the *members* rather than the *rule*.

**Is this primitive obsession?** Yes, in the narrow sense: the set of hover-excluded actions is represented as an ad hoc boolean expression rather than a named set. If a future contributor adds a new stateful action (e.g., `bookmark`, `loop`) with the same broadcast-from-hover semantics, they must know to update this expression in two places — `runAction` and `runGifAction`. The ADR says explicitly: "any action that operates on per-element persistent state should be evaluated for the same exclusion."

A declarative set:

```js
const HOVER_EXCLUDED_ACTIONS = new Set(['mark', 'jump']);
```

...would make the rule maintainable: one addition updates both paths simultaneously (once the duplicate is eliminated, as per Friction Point 1). It is also documentable and testable in isolation.

**Conclusion**: This is a mild primitive obsession smell. The set is currently size two and stable, but the ADR documents that it is an open category. A named constant `Set` is the appropriate representation.

---

### Friction Point 4: Circular dependency between ActionHandler and EventManager

`ActionHandler` constructor accepts `eventManager` and calls:
- `this.eventManager.showController(controller)` — in `runAction` and `runGifAction`
- `this.eventManager.refreshCoolDown()` — in `setSpeed`

`EventManager` constructor accepts `actionHandler` and calls:
- `this.actionHandler.runAction(keyBinding.action, keyBinding.value, event)` — in `handleKeydown`
- `this.actionHandler.runAction('blink', null, null)` — in `updateSpeedFromEvent`

This is a true circular dependency: each module holds a reference to the other and invokes methods on it. The construction-time consequence is that one must be instantiated before the other (the second receives a fully-initialised first), and both must be assembled by a third party (the bootstrap code). In practice this works, but it means neither module can be tested in isolation without constructing a stub of the other.

**The consequences for depth:**
- `ActionHandler` cannot be deep without knowing about `EventManager`'s interface, and vice versa. Any test of `ActionHandler.runAction()` must satisfy `eventManager.showController` and `eventManager.refreshCoolDown`.
- `EventManager` cannot be tested for its keyboard-shortcut dispatch without satisfying `actionHandler.runAction`.
- The cycle means the two modules together form a single **effective interface** for callers, even though they are separate classes.

**Where the real seam is**: the actual seam in this cluster is between *input event delivery* (keyboard, ratechange) and *action execution* (playback rate change, seeking, visibility). The current code draws the seam between the two class definitions, but the circular calls mean the seam is porous in both directions. The seam should be at the *action dispatch point* — the boundary between "an input has been decoded into an Action" and "the Action is executed on a target".

---

### Friction Point 5: Speed control seam placement

`setSpeed`, `adjustSpeed`, and `resetSpeed` all live on `ActionHandler` and directly mutate `video.playbackRate` and `config.settings.lastSpeed`, then call `config.save()`. They also call `this.eventManager.refreshCoolDown()`.

`ActionHandler` is named for dispatching actions. The actual playback-rate mutation — clamping, per-video speed storage (`config.settings.speeds`), `forceLastSavedSpeed` CustomEvent dispatch — is not dispatch logic; it is playback state management.

**Deletion test on `setSpeed`**: If `setSpeed` were deleted from `ActionHandler` and moved to a `PlaybackRateController` module, would complexity concentrate or spread?

**Result: concentrate.** `setSpeed` is called from `executeAction` (the video switch-case), `adjustSpeed`, and `resetSpeed` — all on `ActionHandler`. Moving it creates one new seam. The logic it contains (two-decimal rounding, `forceLastSavedSpeed` branch, speed indicator update, per-video cache, `config.save`) is cohesive: it is all "what happens when we commit a new Playback Rate." That is a distinct concern from action dispatch. Extraction would deepen `ActionHandler` by narrowing what it needs to know.

However, the `refreshCoolDown()` call inside `setSpeed` would need to move with it or be injected — the Cool Down is logically tied to the moment of rate commitment, not to the event subscription layer.

**Conclusion**: `setSpeed` is at a seam that is currently smeared across `ActionHandler` and `EventManager` (via `refreshCoolDown`). This is a candidate for deepening, but it is downstream of the target-resolution problem.

---

## Depth Assessment

### Is `runAction` deep or shallow?

`runAction` has the following interface surface: `(action: string, value: any, e: Event|undefined) => void`. That is a narrow, three-argument call. Behind it: element enumeration, target resolution (three sources, one precedence rule, one exclusion set), `vsc-cancelled` guard, `showController` side-effect, `executeAction` dispatch, and the entire parallel GIF path via `runGifAction`. This is a **deep module**: large behaviour behind a small interface. The interface is the test surface.

**The depth is obscured by the duplicate.** Because target resolution is duplicated in `runGifAction`, the *effective* interface surface of the cluster is: `runAction` + any caller who replicates the targeting rule. That is shallower than it appears, because the rule is only enforced by code convention (copy-paste), not by a single callable method.

### Where is the seam between input events and action dispatch?

The natural seam is `actionHandler.runAction(action, value, e)`. That is where `handleKeydown` hands off to the dispatch layer. The problem is that the seam is not clean: `runAction` calls back into `eventManager.showController`, and `updateSpeedFromEvent` calls back into `actionHandler.runAction('blink')`. The seam leaks in both directions.

A clean seam would have `EventManager` call `actionHandler.runAction(action, value, e)` and nothing else flow back. The `showController` side-effect and the `blink` dispatch should either be owned by `ActionHandler` (controller visibility is an action concern) or by a third module that neither side calls into.

---

## Deepening Candidates

### Candidate 1 — `TargetResolver` (Strong)

**Files involved**: `action-handler.js` (both `runAction` and `runGifAction`)

**Problem**: The three-source target-resolution rule — click-derived > hover-derived > broadcast, with the `mark`/`jump` hover exclusion — is duplicated verbatim in two methods. The rule is policy; it encodes ADR-0010. Any caller who needs to resolve a target must know the rule or copy it.

**Solution**: Extract a `_resolveTarget(action, e)` private method on `ActionHandler` that returns the resolved controller element (or `null` for broadcast). Both `runAction` and `runGifAction` call it. The hover-excluded action set becomes a module-level constant `HOVER_EXCLUDED_ACTIONS`.

**Interface sketch**:
```
_resolveTarget(action: string, e: Event | undefined) -> HTMLElement | null
```
`null` return means broadcast. Non-null return means route exclusively to that controller.

**Depth gain**: The method has a small interface (two arguments, one return) behind the full three-source resolution logic including the exclusion set. Callers go from 3 lines of inline policy to 1 method call.

**Locality gain**: ADR-0010 policy lives in one place. Adding `bookmark` to the hover-excluded set is a one-line change to `HOVER_EXCLUDED_ACTIONS`, automatically honoured by both paths.

**Dependency category (DEEPENING.md)**: In-process. Pure computation over `this._hoverTargetController`, `action`, and `e`. No I/O. Always deepenable; no adapter needed.

**Seam discipline**: This is an internal seam — `_resolveTarget` is private. The external seam of `ActionHandler` does not change. The interface is the test surface: tests of `runAction` already exercise the resolution rule; tests of `_resolveTarget` become the new unit tests for the policy.

**Recommendation strength**: Strong. Zero risk: pure extraction of duplicated, in-process logic. The main barrier is the currently-duplicated `runGifAction` needing to call the same method as `runAction`.

---

### Candidate 2 — Clean the EventManager / ActionHandler seam (Worth Exploring)

**Files involved**: `event-manager.js`, `action-handler.js`

**Problem**: The circular dependency (Friction Point 4) means neither module is independently testable. `EventManager.showController` is a controller-visibility concern that does not belong in the input-event subscription module. `updateSpeedFromEvent` dispatching `actionHandler.runAction('blink')` means `EventManager` constructs an Action internally and dispatches it — blurring who owns the dispatch decision.

**Solution**: Move `showController` to `ActionHandler` (or a small `ControllerVisibility` helper owned by `ActionHandler`). Make the seam between EventManager and ActionHandler unidirectional: `EventManager` calls `actionHandler.runAction(...)` only; `ActionHandler` never calls back into `EventManager` except through `refreshCoolDown` (which is about playback-rate commitment, not event subscription).

Alternatively, `refreshCoolDown` could be extracted to a `CoolDown` module injected into both, breaking the cycle entirely.

**Depth gain for EventManager**: After removing `showController`, `EventManager`'s concerns are: keyboard listener registration, keydown decode-and-dispatch, ratechange listener registration, ratechange handling, Cool Down management, and cleanup. That is one concern: *input event wiring*. The module becomes deep and narrow.

**Depth gain for ActionHandler**: Owning `showController` means ActionHandler is fully responsible for what happens to a controller during action dispatch. The caller (`runAction`) and the side-effect (`showController`) are in the same module.

**Dependency category**: In-process. No new adapters required. The seam adjustment is about moving method ownership, not introducing ports.

**Seam discipline**: The seam between EventManager and ActionHandler would become unidirectional: EventManager → ActionHandler. One direction, no return calls. This is a real seam improvement: today it is two adapters pointing at each other (a cycle), which is not a seam at all.

**ADR note**: ADR-0008 records that hover state lives on ActionHandler, not config, for locality reasons. Moving `showController` to ActionHandler is consistent with this decision: controller visibility is an action-dispatch concern, and ActionHandler is the locus of action dispatch.

**Recommendation strength**: Worth Exploring. It requires moving `showController` and auditing all callers; the `updateSpeedFromEvent` → `runAction('blink')` call path needs explicit consideration (the blink on ratechange is correct behaviour; the question is only which module owns the dispatch).

---

### Candidate 3 — `HOVER_EXCLUDED_ACTIONS` as a declared constant (Speculative, but free)

**Files involved**: `action-handler.js`

**Problem**: `isMarkOrJump` is a local boolean that encodes a set membership check. The set is documented in ADR-0010 as an open category.

**Solution**: Replace the inline expression with a module-level constant:

```js
const HOVER_EXCLUDED_ACTIONS = new Set(['mark', 'jump']);
```

This is not a deepening in the full codebase-design sense — it does not change the module's interface or depth. It is a representation upgrade: from a primitive ad hoc expression to a named, maintainable data structure. The consequence is that the ADR's own guidance ("any action that operates on per-element persistent state should be evaluated for the same exclusion") becomes mechanically enforceable by a single edit.

**Recommendation strength**: Speculative as a deepening candidate, but the change is two lines and zero risk. It should accompany Candidate 1 (TargetResolver extraction) rather than standing alone.

---

## Top Recommendation

**Extract `_resolveTarget(action, e)` on `ActionHandler`, backed by a `HOVER_EXCLUDED_ACTIONS` constant.**

This is Candidate 1 plus Candidate 3. It:

- Eliminates the only duplicated logic in the cluster
- Gives the ADR-0010 policy a single home
- Makes the hover-excluded set a named data structure rather than an inline expression
- Does not change any external interface
- Requires no new seams, no new adapters, no dependency injection changes
- Has in-process-only dependencies (pure computation)
- Is trivially testable: `_resolveTarget` can be called directly with a mock event and any action string

**Second priority**: Clean the EventManager / ActionHandler seam (Candidate 2). This is a larger change with real testability payoff — an `EventManager` that does not call back into `ActionHandler` is independently testable — but it requires deciding where `showController` and the blink-on-ratechange path live. That decision warrants a `/grill-with-docs` session before implementation.

---

## Recommendation: mark/jump Exclusion — Data Structure vs Imperative Check

**Recommendation: data structure (`Set` constant), not imperative check.**

The current imperative check (`action === 'mark' || action === 'jump'`) is not wrong, but it is the wrong representation for an open category. ADR-0010 explicitly says future stateful actions should be evaluated for the same exclusion. That sentence describes a set with a growth model. A `Set` named `HOVER_EXCLUDED_ACTIONS` at module scope:

1. Is self-documenting: the name states the rule, not the members
2. Is a single edit point when new actions are added (one `Set.add` call)
3. Can be exported and tested independently: `HOVER_EXCLUDED_ACTIONS.has('mark')` is a verifiable assertion
4. Eliminates the need to update two inline expressions across `runAction` and `runGifAction` (once `_resolveTarget` is extracted, there is only one place, but the constant is still cleaner than an inline boolean expression)

The imperative check should be replaced. The replacement is a two-line change and should accompany the `_resolveTarget` extraction, not precede it.

---

## Glossary Alignment

All terms in this document use GLOSSARY.md vocabulary where applicable:

- **Action**: the unit of dispatch (`mark`, `jump`, `faster`, etc.)
- **Hover Target** (`_hoverTargetController`): the Controller designated as the exclusive keyboard hotkey target
- **Controller**: the Shadow DOM host div tracked as `video.vsc.div`
- **Cool Down**: the 1000 ms protection window managed by `EventManager.refreshCoolDown()`
- **Key Binding**: the user-configured mapping from keyCode to Action and value
- **Marker**: the `video.vsc.mark` timestamp written by `mark` and read by `jump`

Architectural terms use codebase-design vocabulary: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**, **deletion test**.
