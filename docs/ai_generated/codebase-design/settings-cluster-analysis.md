# Settings Cluster Analysis: VideoSpeedConfig + StorageManager + Hover State

**Task**: Improve codebase architecture by deepening the Settings/VideoSpeedConfig cluster.
**Date**: 2026-11-02
**Status**: Surface candidates only — no implementation.

---

## Ask-Matt Routing Log

Goal: "improve the codebase architecture by deepening the Settings/VideoSpeedConfig cluster."

Per `/ask-matt`:

- `/improve-codebase-architecture` is the correct entry point for codebase health work. It surfaces deepening opportunities; picking one generates an idea for the main flow.
- `/codebase-design` (and its `DEEPENING.md`) is the vocabulary layer that `/improve-codebase-architecture` builds on. It provides the terms used throughout this document: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**.

Routing decision: this document executes steps 1 and 2 of `/improve-codebase-architecture` (explore + present candidates) against the Settings/VideoSpeedConfig/hover-state cluster, applying the full `/codebase-design` vocabulary including `DEEPENING.md` dependency categories.

Next step (not executed here): whichever candidate is picked should proceed through `/grill-with-docs` → `/to-spec` → `/to-tickets` before implementation.

---

## Cluster Map

Files examined:

| File | Role |
|---|---|
| `src/core/settings.js` | Defines `VideoSpeedConfig` — the singleton holding settings, media element registry, and GIF element registry |
| `src/core/storage-manager.js` | `StorageManager` — the static class that wraps `chrome.storage.sync` and the cross-world `VSC_USER_SETTINGS` event |
| `src/core/action-handler.js` | `ActionHandler` — dispatches Actions; holds `_hoverTargetController` and drives `config.save()` |
| `src/content/injector.js` | ISOLATED World bridge; owns the `chrome.storage.onChanged` live relay; calls `chrome.storage.sync` directly |
| `src/utils/constants.js` | `DEFAULT_SETTINGS` — the ground truth for every setting key and its default value |

Callers of `VideoSpeedConfig` (via `this.config` or `window.VSC.videoSpeedConfig`):
- `action-handler.js` (heaviest user: reads/writes `config.settings.*` at 20+ call sites)
- `video-controller.js`
- `gif-controller.js`
- `media-observer.js`
- `mutation-observer.js`
- `event-manager.js`
- `controls.js`
- `inject.js`

ADRs consulted: 0001 (window.VSC namespace), 0003 (Path B injection), 0005 (injected-settings race fix), 0008 (hover state on ActionHandler), 0009 (sticky hover).

---

## Friction Points Found

### FP-1: VideoSpeedConfig mixes three unrelated concerns

`VideoSpeedConfig` currently owns:

1. **Persisted settings** — `this.settings`, loaded from / saved to storage
2. **Media element registry** — `this.mediaElements` (runtime array of `<video>`/`<audio>` elements)
3. **GIF element registry** — `this.gifElements` (runtime Set of `<img>` elements)

**Deletion test**: if `VideoSpeedConfig` were deleted, where would the complexity land?

- Settings loading/saving logic would have to move somewhere; it would re-appear as ad-hoc calls to `StorageManager` scattered across `inject.js`, `action-handler.js`, `video-controller.js`, etc. That is concentrated complexity today — it would spread.
- Media and GIF registries are only 12 lines of code total (add/remove/get × 2). If deleted, callers (`runAction`, `runGifAction`, `cleanup`, `isAudioController`, `adjustSpeed`) would need some replacement — but that replacement would be almost as small. The registry methods are thin wrappers with near-zero implementation.

**Verdict**: The settings management concern is earning its keep and passes the deletion test. The registry concern is shallow: its interface (`addMediaElement`, `removeMediaElement`, `getMediaElements`, `addGifElement`, `removeGifElement`, `getGifElements`) is nearly as complex as the implementation (6 one- or two-line methods). It is a **shallow module** co-located with a deeper one.

**Depth assessment of VideoSpeedConfig as a whole**:
The settings portion (load, save, applySettings, getKeyBinding, setKeyBinding, ensureDisplayBinding, initializeDefaultKeyBindings) is moderately deep: a caller calls `config.load()` and gets back a fully normalized, migration-applied settings object without knowing about `StorageManager`, the injected-settings race, key-binding migration, or the `logLevel`-to-logger side effect. That is genuine depth.

The registry portion is shallow: `addMediaElement(el)` does one line of work behind one line of interface.

**Opportunity**: separate the registry into its own module, or merge it into a `MediaRegistry` that does more than a raw array/set.

---

### FP-2: The settings persistence seam is partially exposed

`VideoSpeedConfig.load()` properly delegates to `StorageManager.get()` or `StorageManager.waitForInjectedSettings()` — the caller does not touch `chrome.storage` directly. This is good seam hygiene.

However, `VideoSpeedConfig.load()` exposes the routing condition itself in its body:

```js
const isInjectedContext = typeof chrome === 'undefined' || !chrome.storage;
const storage = isInjectedContext
  ? await window.VSC.StorageManager.waitForInjectedSettings(...)
  : await window.VSC.StorageManager.get(...);
```

The routing question ("am I in the MAIN World or the ISOLATED World?") leaks into `VideoSpeedConfig`. The correct owner of this question is `StorageManager`, which already knows the answer: `StorageManager.get()` has an internal branch for exactly this. The two-entry-point design (`get` vs. `waitForInjectedSettings`) forces callers to know which world they are in and pick the right one.

**Seam placement**: `chrome.storage.sync` is a **true external** dependency (per DEEPENING.md category 4 — a third-party browser API VSC does not control). However, the cross-world delivery mechanism (`VSC_USER_SETTINGS`, `window.__VSC_injectedSettings`) is owned by VSC and is a **remote but owned** channel (category 3). The current code conflates these: `StorageManager` presents two methods where one unified method ("give me the settings, handling the world routing internally") would be deeper.

**Deletion test on StorageManager**: if `StorageManager` were deleted, every caller would need to reproduce the world-detection branch, the `window.__VSC_injectedSettings` race-fix read, the `VSC_USER_SETTINGS` event listener setup, the fallback timeout, and the `VSC_SAVE_SETTINGS` event dispatch. That is real complexity concentrated in one place. It passes.

**Opportunity**: deepen `StorageManager` so `VideoSpeedConfig` calls a single `StorageManager.getSettings(defaults)` that handles world routing internally, removing the `isInjectedContext` branch from `VideoSpeedConfig.load()`.

---

### FP-3: StorageManager.get() vs VideoSpeedConfig.load() — two settings entry points, unclear ownership

`StorageManager.get(defaults)` and `VideoSpeedConfig.load()` are two different paths to "give me the current settings." The distinction is:

- `StorageManager.get()` returns raw storage data, merged with defaults.
- `VideoSpeedConfig.load()` calls `StorageManager.get()`, then applies type coercions, validates GIF speed ranges, handles key-binding migration, calls `ensureDisplayBinding`, and triggers a logger side effect.

The problem is that this boundary is not named or documented — callers have to know which level they want. In practice:

- `inject.js` calls `config.load()` (right — it wants the normalized form).
- `options.js` calls `chrome.storage.sync.get()` directly, bypassing both modules entirely.
- `injector.js` calls `chrome.storage.sync.get(null, ...)` directly to read all settings for the initial relay.

The options page (`options.js`) and `injector.js` crossing the seam to reach `chrome.storage.sync` directly is a sign the seam is not deep enough to pull callers in.

**Depth assessment**:
`StorageManager` is moderately deep (it hides the cross-world delivery complexity). But callers who can reach `chrome.storage.sync` directly often do, because `StorageManager` offers no higher-level interface that would make the raw API unreachable. The seam exists but has low gravity — it does not make bypassing it painful.

**Opportunity**: this is worth noting but is lower priority than FP-1 and FP-2, because `options.js` and `injector.js` run in different worlds and have legitimate reasons to use the API directly. The seam cannot be enforced at the language level (no imports). Note: an ADR does not currently forbid direct `chrome.storage` access in the options page, so surfacing this does not contradict any existing decision.

---

### FP-4: Hover settings are persisted but checked at runtime inline, with no indirection

`hoverActivatesVideoTarget` and `hoverActivatesGifTarget` are persisted settings stored in `chrome.storage.sync` and loaded into `config.settings`. Their consumption:

- `video-controller.js:266`: `if (this.config.settings.hoverActivatesVideoTarget)` — decides whether to register `mouseenter`/`mouseleave` listeners at controller-setup time.
- `gif-controller.js:687`: `if (!this._config.settings.hoverActivatesGifTarget)` — checked inside the `mouseenter` handler at runtime (not at listener-registration time; the GLOSSARY note on `hoverActivatesGifTarget` explicitly says "The check occurs inside the mouseenter handler at runtime rather than at listener-registration time, so toggling the setting takes effect without reloading the page.").

These are **asymmetric**: the video path checks at registration time (meaning a live settings update will not re-register listeners), but the GIF path checks at event time (meaning a live settings update takes effect immediately). This is an undocumented behavioural difference between two settings that appear identical from the outside.

`ActionHandler._hoverTargetController` holds the runtime hover state. ADR-0008 records the decision to keep this on `ActionHandler` rather than `VideoSpeedConfig`, citing locality: only `runAction` and `runGifAction` read it.

**Depth assessment of hover settings**: as persisted settings, they sit correctly in `VideoSpeedConfig`. The asymmetric consumption pattern is the friction — not a module depth problem per se. But this asymmetry is invisible to a caller reading the interface of `VideoSpeedConfig` or `VideoController`; it requires reading both controller files to discover.

**Opportunity**: low priority for deepening; high priority for documentation. The asymmetry should be recorded as an ADR or at minimum a GLOSSARY note. It could become a real bug if someone "fixes" the GIF path to match the video path, or vice versa.

---

### FP-5: ActionHandler directly mutates config.settings as a write channel

In `setSpeed()` and `_saveGifSpeedDebounced()`, `ActionHandler` writes directly into `config.settings`:

```js
this.config.settings.lastSpeed = numericSpeed;       // action-handler.js:405
this.config.settings.lastGifSpeed = speed;           // action-handler.js:207
this.config.settings.speeds[videoSrc] = numericSpeed; // action-handler.js:419
```

Then separately calls `config.save(...)`. The pattern is: mutate in-memory first, then persist. But the mutation bypasses `VideoSpeedConfig`'s own methods — the caller reaches past the module's interface and into its `settings` object directly.

**Deletion test**: if the `config.settings` property were made read-only from outside `VideoSpeedConfig`, callers would have to use a method. That would concentrate the "update this setting and maybe also persist it" logic into `VideoSpeedConfig`, deepening it.

**Depth assessment**: `VideoSpeedConfig` exposes `this.settings` as a plain mutable object. Any caller can write any key to it without going through the module's methods. This is a wide interface — it requires callers to know every key name and its semantics. The methods `save()`, `getKeyBinding()`, `setKeyBinding()`, and `applySettings()` are islands of depth inside a sea of mutable exposure.

**Opportunity**: the deepest refactor in this cluster. If `VideoSpeedConfig` hid `settings` behind named accessors or an `update(patch)` method that handles both in-memory update and persistence atomically, `ActionHandler` would shrink and the invariant "settings writes are always persisted" could be enforced at the module boundary. This is the highest-leverage candidate.

---

## Deepening Candidates

### Candidate A: Unify StorageManager into a single settings-read method (deepens FP-2)

**Current interface** (what callers must know):
- Is this the MAIN World or ISOLATED World?
- If MAIN World, call `StorageManager.waitForInjectedSettings(defaults)`.
- If ISOLATED World (or options page), call `StorageManager.get(defaults)` or `chrome.storage.sync.get()` directly.

**Proposed interface**:
```
StorageManager.getSettings(defaults) → Promise<Object>
```
World routing, the `window.__VSC_injectedSettings` race-fix check, the `_setupSettingsListener()` setup, and the 5-second timeout fallback all move inside. `VideoSpeedConfig.load()` calls `getSettings(defaults)` unconditionally, with no `isInjectedContext` branch.

**Before/after depth comparison**:
- Before: `VideoSpeedConfig.load()` must know about world routing (MAIN vs. ISOLATED), which is an infrastructure concern. Interface of `StorageManager` exposed to `VideoSpeedConfig` includes two methods.
- After: `VideoSpeedConfig.load()` knows nothing about world routing. `StorageManager`'s external interface shrinks by one method (`waitForInjectedSettings` becomes internal).

**Seam placement**: the seam remains at `StorageManager`'s public interface. Internally, `StorageManager` has two adapters: the `chrome.storage.sync` adapter (ISOLATED World) and the `VSC_USER_SETTINGS` / `window.__VSC_injectedSettings` adapter (MAIN World). Both are already present — this deepening makes the routing between them private.

**Dependency category (DEEPENING.md)**:
- `chrome.storage.sync` is a **true external** (category 4 — third-party browser API). In tests, it is already mocked via `tests/helpers/`.
- The `VSC_USER_SETTINGS` / `window.__VSC_injectedSettings` channel is **in-process** for the MAIN World (category 1 — pure in-memory event dispatch and window property reads). No new adapter is needed.

**Does one adapter / two adapters rule apply?** Two adapters already exist (the sync storage adapter in ISOLATED World and the event-property adapter in MAIN World), so the seam is real and the unification is justified.

**DESIGN-IT-TWICE?** Not needed — there is essentially one sensible interface shape here. The only real choice is the method name.

**Recommendation strength**: Worth exploring.

---

### Candidate B: Extract MediaRegistry out of VideoSpeedConfig (deepens FP-1)

**Current interface** (what callers must know to use the registry):
`config.addMediaElement(el)`, `config.removeMediaElement(el)`, `config.getMediaElements()`, `config.addGifElement(el)`, `config.removeGifElement(el)`, `config.getGifElements()`

These 6 methods live on the same object as `load()`, `save()`, `getKeyBinding()`, etc. A caller who only needs to iterate media elements must depend on the full `VideoSpeedConfig`.

**Proposed interface**:
```
MediaRegistry  (new standalone module)
  .addMedia(el)
  .removeMedia(el)
  .getMedia() → HTMLMediaElement[]
  .addGif(el)
  .removeGif(el)
  .getGifs() → HTMLImageElement[]
```

`VideoSpeedConfig` stops owning `mediaElements` and `gifElements`. `ActionHandler`, `inject.js`, and `event-manager.js` receive a `MediaRegistry` instance (or access it via `window.VSC.mediaRegistry`).

**Before/after depth comparison**:
- Before: `VideoSpeedConfig` is a grab-bag — callers who need media iteration must depend on the settings module.
- After: `MediaRegistry` has a clear single responsibility. `VideoSpeedConfig` becomes narrower (settings-only). Callers that only iterate media elements no longer take a transitive dependency on storage logic.

**Seam placement**: new seam at `MediaRegistry`'s interface. The `VideoSpeedConfig` seam becomes narrower.

**Dependency category (DEEPENING.md)**:
Both concerns are **in-process** (category 1). No I/O, no adapters needed. This is a pure decomposition — merge or separate in-process modules.

**Counter-argument**: currently, both settings and the registry are passed together as `config` to every module that needs either. Splitting them creates two pass-sites instead of one, and modules that need both (like `action-handler.js` and `inject.js`) must receive two arguments. The registry methods are so small that the test surface barely changes.

**Deletion test on current registry methods**: deleting them just moves 6 one-liners to the callers (or to `MediaRegistry`). Complexity does NOT concentrate — it just relocates. This is the weak form of the deletion test, suggesting the separation is low-impact either way.

**DESIGN-IT-TWICE?** Not needed — the interface is obvious.

**Recommendation strength**: Worth exploring (low urgency; the registry is not causing bugs, just conceptual noise).

---

### Candidate C: Deepen VideoSpeedConfig by hiding config.settings behind an update interface (deepens FP-5) — TOP RECOMMENDATION

**Current interface** (what callers must know):
Callers read `config.settings.X` (any key) freely. Callers write `config.settings.X = newValue` directly, then separately call `config.save({ X: newValue })` when they want persistence. The two-step pattern is repeated across `action-handler.js` at 5+ sites. Nothing prevents writing to `config.settings` without persisting.

**Proposed interface**:
```
// Read (unchanged — config.settings remains readable):
config.settings.lastSpeed

// Write (new — replaces direct mutation + separate config.save call):
config.update({ lastSpeed: numericSpeed, speeds: ... })
// update() = merge into this.settings AND persist atomically
```

`config.save(patch)` already exists as an external method but does not gate the in-memory state: `save()` does `this.settings = { ...this.settings, ...newSettings }` then calls `StorageManager.set`. So `save()` is already a combined update-and-persist. The problem is that callers bypass it and write to `this.settings` directly before calling `save()`.

The deepening is: rename `save(patch)` to `update(patch)` (or keep `save` but enforce that direct mutation is no longer necessary), and delete all direct `config.settings.X = ...` assignments in callers, replacing them with `config.update({ X: ... })`.

`applySettings(patch)` already exists for the live-relay case (no persistence — settings arrive from the relay and must be applied in-memory only). This method stays as-is: it is the correct no-persist path.

**Before/after depth comparison**:
- Before: `VideoSpeedConfig`'s interface includes everything in `this.settings` (every key, every type, every write path). Callers know 20+ setting keys and must remember to call `save()` after mutating.
- After: callers call `config.update({ key: value })`. The in-memory mutation and the persistence decision are encapsulated. The only public write paths are `update()` (persist) and `applySettings()` (no persist, relay-only). `this.settings` remains readable but its write path is controlled.

**Seam placement**: the seam is `VideoSpeedConfig`'s public interface. The internal `this.settings` object becomes an implementation detail that callers can still read (for efficiency) but should not write to.

**Dependency category (DEEPENING.md)**: `chrome.storage.sync` (via `StorageManager`) is **true external** (category 4). For the purposes of testing `config.update()`, `StorageManager.set()` is already mockable (tests/helpers mock `chrome.storage`). No new seam is needed — the existing test infrastructure is sufficient.

**Impact on ActionHandler**: `setSpeed()` currently has:
```js
this.config.settings.lastSpeed = numericSpeed;
this.config.save({ lastSpeed: ..., speeds: ... });
```
This collapses to:
```js
this.config.update({ lastSpeed: numericSpeed, speeds: ... });
```
The `config.settings.lastSpeed = ...` line above the `save()` call is deleted. 5+ similar pairs in `action-handler.js` collapse similarly.

**Locality gain**: the invariant "any speed write is always persisted" moves from being a convention callers must remember to a property enforced at the `VideoSpeedConfig` interface. A future bug where a speed is updated in memory but not persisted becomes structurally impossible through this path.

**DESIGN-IT-TWICE?** Yes — there is a real choice between two interface shapes:
1. `config.update(patch)` — generic patch object, same shape as existing `save()`. Simple, but callers still need to know key names.
2. Named mutators — `config.setLastSpeed(speed)`, `config.setGifSpeed(speed)` — narrow per-setting methods. More verbose, but each one can enforce its own invariants (e.g., range clamping, debounce logic). This would pull GIF speed debounce logic out of `ActionHandler` and into `VideoSpeedConfig`.

If DESIGN-IT-TWICE is applied, these two alternatives should be designed in parallel sub-agents and compared on depth (how much can each caller drop from its own code), locality (where does range clamping and debounce logic live), and seam clarity.

**Recommendation strength**: Strong.

---

### Candidate D: Document (not refactor) the hover settings asymmetry as an ADR (addresses FP-4)

`hoverActivatesVideoTarget` is checked at listener-registration time (video path); `hoverActivatesGifTarget` is checked at event time (GIF path). This asymmetry is correct and deliberate (the GLOSSARY explains the GIF behaviour), but the video path's behaviour is not documented: a live settings relay update to `hoverActivatesVideoTarget` will NOT re-register listeners on existing video controllers.

This is not a deepening opportunity — it is a documentation gap. The risk is a future "consistency fix" that breaks either the deliberate GIF behaviour or the video path's registration model.

**Proposed action**: record an ADR capturing:
- The video path checks at registration time (result: requires page reload or controller recreation to take effect).
- The GIF path checks at event time (result: takes effect immediately, no reload needed).
- The asymmetry is intentional and should not be "fixed" to match.

**Recommendation strength**: Worth exploring (for the ADR alone, not for a code refactor).

---

## Top Recommendation

**Candidate C** — Deepen `VideoSpeedConfig` by hiding direct `settings` mutation behind `update(patch)`.

**Rationale**:

1. **Highest locality gain**: the "update settings + persist" invariant currently relies on a convention spread across 5+ sites in `action-handler.js` alone. Moving it to `VideoSpeedConfig` makes violations structurally detectable.

2. **Biggest reduction in interface width**: `ActionHandler` currently reads/writes `config.settings.*` at 20+ call sites, exposing the full settings object as part of its effective interface with `VideoSpeedConfig`. After the deepening, `ActionHandler`'s knowledge of `VideoSpeedConfig`'s internals shrinks to: "call `update(patch)` to write, read `config.settings.X` to read."

3. **Direct path to DESIGN-IT-TWICE**: the two interface shapes (`update(patch)` vs. named mutators) represent a genuine design fork. Named mutators would also absorb GIF speed debounce logic from `ActionHandler` into `VideoSpeedConfig`, yielding a second locality win. This fork is worth exploring before committing to an implementation shape.

4. **No ADR conflicts**: no existing ADR touches the `VideoSpeedConfig` write interface. ADR-0008 records hover state placement (unaffected). ADR-0005 records the injected-settings race fix (unaffected — `load()` and `applySettings()` are not changed).

5. **Safe starting point**: `config.settings` remains readable, so this is an additive change — no callers need to change their read paths. Only write paths migrate. The migration can be done call-site by call-site with no flag day.

**Candidates A and B** are valid but secondary. Candidate A (unifying `StorageManager.get` and `waitForInjectedSettings`) is a clean improvement to storage isolation but has no leverage on the callers who bypass `StorageManager` entirely (the options page). Candidate B (extracting `MediaRegistry`) resolves a conceptual impurity but the registry code is so small that the practical test-surface gain is minimal.

---

## Proceed to Next Steps?

This analysis is input for the main flow. Recommended path:

1. **Yes, proceed to `/grill-with-docs`**: sharpen Candidate C's design — specifically the DESIGN-IT-TWICE fork (`update(patch)` vs. named mutators). Grilling should settle: which caller benefits most from named mutators? Does GIF speed debounce belong in `VideoSpeedConfig` or `ActionHandler`? What does `this.settings` access look like post-refactor?

2. **Then `/to-spec`** (multi-session scope: the call-site migration across `action-handler.js`, `video-controller.js`, `event-manager.js` touches many files and warrants a spec).

3. **Then `/to-tickets`** to split by call-site cluster, with Candidate A (StorageManager unification) as a blocking dependency of the `VideoSpeedConfig.load()` change.

Candidate D (hover settings ADR) can be done as a standalone ADR creation, outside the main flow.
