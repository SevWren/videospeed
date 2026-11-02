# Site-Handlers Cluster Analysis

_Generated: 2026-11-02_
_Goal: deepen the site-handler cluster to eliminate duplication and clarify seams._

---

## Ask-Matt Routing Log

```
User intent: architectural analysis of the site-handler cluster
→ /improve-codebase-architecture  (Step 1: Explore — deletion test, depth analysis)
→ /codebase-design                (vocabulary layer: depth, seam, adapter, locality,
                                   leverage, Refused Bequest, deepening candidates)
```

No prototype needed (no runnable question). No spec yet (analysis phase, not build phase).

---

## Cluster Inventory

| File | Role |
|---|---|
| `src/site-handlers/base-handler.js` | `BaseSiteHandler` class + `window.VSC.BaseSiteHandler` |
| `src/site-handlers/index.js` | `SiteHandlerManager` singleton + `window.VSC.siteHandlerManager` |
| `src/site-handlers/youtube-handler.js` | `YouTubeHandler extends BaseSiteHandler` |
| `src/site-handlers/netflix-handler.js` | `NetflixHandler extends BaseSiteHandler` |
| `src/site-handlers/amazon-handler.js` | `AmazonHandler extends BaseSiteHandler` |
| `src/site-handlers/apple-handler.js` | `AppleHandler extends BaseSiteHandler` |
| `src/site-handlers/facebook-handler.js` | `FacebookHandler extends BaseSiteHandler` |

**Primary callers of `siteHandlerManager`:**

| Call site | Method called |
|---|---|
| `src/content/inject.js:53` | `.initialize(document)` |
| `src/content/inject.js:479` | `.cleanup()` |
| `src/core/video-controller.js:201` | `.getControllerPosition(parent, video, options)` |
| `src/core/action-handler.js:439` | `.handleSeek(video, seekSeconds)` |
| `src/observers/media-observer.js:33` | `.detectSpecialVideos(document)` (via stored ref) |
| `src/observers/media-observer.js:38` | `.shouldIgnoreVideo(media)` (via stored ref) |

`refresh()` is defined in `SiteHandlerManager` (index.js:121) but has **zero call sites** across all of `src/`.

---

## Friction Point 1 — BaseSiteHandler Depth Analysis (Deletion Test)

**The question:** Does `BaseSiteHandler` earn its keep as a base class? If it were deleted, where would complexity land?

### What BaseSiteHandler actually provides

```
Method                      BaseSiteHandler body                 Subclass overrides?
─────────────────────────── ──────────────────────────────────── ────────────────────
static matches()            return false                         ALL 5 override
getControllerPosition()     return { firstChild, parent, parent} ALL 5 override (partial)
handleSeek()                currentTime bounds-checked write     Netflix only
initialize()                logger.debug line only              YouTube, Netflix, Facebook
cleanup()                   logger.debug line only              Facebook only
shouldIgnoreVideo()         return false                         YouTube, Netflix, Amazon, Facebook
getVideoContainerSelectors()return []                            ALL 5 override
detectSpecialVideos()       return []                            YouTube, Apple override
```

**Deletion test result:** If `BaseSiteHandler` were deleted, the complexity that would scatter is:

1. The `handleSeek()` bounds-checked write (`currentTime` clamping) — currently inherited by Amazon, Apple, YouTube, Facebook without re-stating it. This is genuine leverage: one implementation pays for four handlers.
2. The `getControllerPosition()` fallback shape — all five handlers delegate to `super.getControllerPosition()` in their GIF/canvas branches, so the base implementation is actively used at runtime.

**Verdict: BaseSiteHandler earns its keep**, but only for `handleSeek()` and the GIF-path fallback of `getControllerPosition()`. The `initialize()` and `cleanup()` no-ops are pass-throughs (they log one line and return), not implementations. `static matches()` returning `false` is documentation-as-code (prevents accidental instantiation as a named handler) — marginally useful.

**Depth assessment:** `BaseSiteHandler` as a module is **shallow**. Its interface has eight methods; its non-trivial implementation spans perhaps fifteen lines (`handleSeek()` body only). The ratio of interface surface to real behaviour is poor. It is not a deep module; it is a class hierarchy organizer that happens to carry two useful defaults.

---

## Friction Point 2 — Handler Duplication Map

The five subclasses repeat the same structural patterns. This is the duplication map:

### 2a. `getControllerPosition()` — gifMode guard (near-identical across 4 of 5)

Every handler that overrides `getControllerPosition()` opens with the same guard before doing its site-specific work:

```
NetflixHandler:  if (options.gifMode || (video && video.tagName === 'CANVAS'))
                   return super.getControllerPosition(parent, video);
AmazonHandler:   if (options.gifMode || (video && video.tagName === 'CANVAS'))
                   return super.getControllerPosition(parent, video);
FacebookHandler: if (options.gifMode || (video && video.tagName === 'CANVAS'))
                   return super.getControllerPosition(parent, video);
YouTubeHandler:  if (options.gifMode)
                   return super.getControllerPosition(parent, video);
AppleHandler:    if (options.gifMode)
                   return super.getControllerPosition(parent, video);
```

This is a **Data Clump** at the interface level: `gifMode` and the CANVAS tag-name check are always evaluated together as the GIF short-circuit. The guard duplicates across every handler because `BaseSiteHandler.getControllerPosition()` does not absorb it. If BaseSiteHandler applied the guard before delegating to a `_getVideoControllerPosition(parent, video, options)` hook, all five overrides would shrink.

**Inconsistency:** Netflix and Amazon check `video.tagName === 'CANVAS'` in addition to `options.gifMode`; YouTube and Apple do not. This is a latent bug surface: a canvas-tagged element on YouTube or Apple will not hit the short-circuit.

### 2b. `static matches()` — exact-hostname string literal (near-identical across 4 of 5)

```
YouTubeHandler:  return location.hostname === 'www.youtube.com';
NetflixHandler:  return location.hostname === 'www.netflix.com';
AppleHandler:    return location.hostname === 'tv.apple.com';
FacebookHandler: return location.hostname === 'www.facebook.com';
AmazonHandler:   return location.hostname === 'www.amazon.com'
               || location.hostname === 'www.primevideo.com'
               || location.hostname.includes('amazon.')
               || location.hostname.includes('primevideo.');
```

Four of five are single `===` comparisons. Amazon is the outlier with wildcard matching for regional domains. There is no shared helper for hostname matching; each handler re-implements the pattern in its static method. The `includes()` approach for Amazon is also subtly broad (matches `notamazon.com`).

### 2c. `shouldIgnoreVideo()` — null/tag guard repeated in 3 of 4 overrides

```
NetflixHandler:  if (!video || video.tagName !== 'VIDEO') return false;
AmazonHandler:   if (!video || video.tagName !== 'VIDEO') return false;
FacebookHandler: if (!video || video.tagName !== 'VIDEO') return false;
YouTubeHandler:  (no guard — starts with class check directly)
```

The null + tagName guard is defensive boilerplate that could live in `BaseSiteHandler.shouldIgnoreVideo()` itself, delegating to a `_shouldIgnoreVideoImpl(video)` hook only after the guard passes.

### 2d. `getVideoContainerSelectors()` — all five override, base returns `[]`

All five handlers return a static array of CSS strings. The base returns `[]`. This method is never called through the production path traced in the grep output above — no call site in `src/` calls `.getVideoContainerSelectors()` on the manager or a handler. It is a dead interface method: defined, overridden five times, never invoked.

### 2e. `initialize()` — three handlers override, two bodies are effectively no-ops

```
YouTubeHandler.initialize():  calls super + setupYouTubeCSS() which logs one line
NetflixHandler.initialize():  calls super + logs one line
FacebookHandler.initialize(): calls super + setupFacebookObserver(document)
```

YouTube and Netflix overrides add no real behaviour. Facebook's override is substantive (installs a `MutationObserver`).

### Summary duplication table

| Pattern | Handlers affected | Complexity if deleted from base |
|---|---|---|
| `gifMode` + CANVAS guard in `getControllerPosition` | 5/5 (inconsistent) | Scatters into 5 handlers |
| null/tagName guard in `shouldIgnoreVideo` | 3/4 overriders | Scatters into 3 handlers |
| Exact-hostname `matches()` helper | 4/5 handlers | Minor — each is one line |
| `getVideoContainerSelectors()` dead method | 5/5 handlers | Zero — no caller exists |

---

## Friction Point 3 — SiteHandlerManager Seam Analysis

### Current shape

`SiteHandlerManager` is a **proxy object**: every public method it exposes is a one-liner that calls `this.getCurrentHandler()` and then calls the same method on the result. It adds:

1. Lazy detection (`getCurrentHandler()` caches on first call).
2. A handler registry (the `availableHandlers` array).
3. A `refresh()` method for invalidating the cached handler.

**Depth of SiteHandlerManager as a module:** Shallow. Its interface has nine methods (`getCurrentHandler`, `detectHandler`, `initialize`, `getControllerPosition`, `handleSeek`, `shouldIgnoreVideo`, `getVideoContainerSelectors`, `detectSpecialVideos`, `cleanup`, `refresh`). Almost every method is a two-line pass-through. The only real logic is in `detectHandler()` (a linear scan of `availableHandlers` calling `HandlerClass.matches()`).

**Deletion test:** If `SiteHandlerManager` were deleted, callers would need to hold a reference to the active handler directly. The lazy-detection and the caching would scatter into at least two call sites (`video-controller.js` and `action-handler.js`). The registry would either be duplicated or moved into `inject.js`. The complexity is small but real; the manager is not purely a pass-through. The lazy detection seam is its primary contribution.

**Handler registry pattern (current vs. richer):** The current registry is a hardcoded array in the constructor. A richer pattern would decouple registration from construction — handlers register themselves (e.g., `SiteHandlerManager.register(YouTubeHandler)` in each handler file), and the manager discovers them at detect-time. Under the `window.VSC` global pattern and the fixed manifest-controlled load order (ADR-0003), this richer pattern buys nothing: all handlers are always loaded. The current hardcoded array is appropriate.

---

## Friction Point 4 — SPA Navigation Gap (Issue #25)

### What exists

`SiteHandlerManager.refresh()` (index.js:119–124):

```js
refresh() {
  this.cleanup();
  this.currentHandler = null;
}
```

`refresh()` clears `currentHandler`, forcing re-detection on the next `getCurrentHandler()` call.

### What is missing

A search across all of `src/` finds **zero call sites** for `siteHandlerManager.refresh()`. The method is defined but never invoked.

On SPA sites (YouTube, Netflix, Facebook, Amazon), the page URL changes without a full page load. The extension's manifest-declared content scripts (`document_end`) fire only on hard navigations. After a SPA route change:

- `siteHandlerManager.currentHandler` still holds the handler selected at page-load time.
- The handler's `initialize()` (which for Facebook installs a `MutationObserver`) is not re-called.
- The handler's `cleanup()` (which for Facebook disconnects that observer) is not called.
- If the SPA navigates to a URL that would match a different handler (e.g., a Netflix page that embeds an iframe from another domain and then navigates), the stale cached handler is returned.

### Where the wire should go

The natural hook is in `inject.js`. The extension already listens for document-level events (`visibilitychange`). SPA navigation is detectable via `window.addEventListener('popstate', ...)` (back/forward navigation) and by monkey-patching or wrapping `history.pushState`/`replaceState`. YouTube also fires the custom `yt-navigate-finish` event.

The gap is not in `SiteHandlerManager` itself — the method exists. The gap is that `VideoSpeedExtension` in `inject.js` has no navigation listener that calls `siteHandlerManager.refresh()`. If that listener were added, it would also need to decide whether to re-run `initializeDocument()` or just invalidate the handler cache.

**Risk of doing this naively:** `initializeDocument()` is guarded by `this._docInitialized = true` (inject.js:105–108), which prevents re-initialization. That guard would need to be cleared or bypassed for SPA navigation to trigger re-initialization. If `refresh()` is called without clearing that guard, the handler is re-detected but the observers are not restarted and no new media scan runs — which may be the desired behaviour on YouTube (the Video Mutation Observer continues running and picks up new `<video>` elements), but is incorrect if the handler selection actually changes.

**Seam assessment:** The seam exists (`refresh()`) but it is a hypothetical seam by the "one adapter" rule — no caller makes it real yet. The wire belongs in `VideoSpeedExtension.initialize()` in `inject.js`, not in `SiteHandlerManager` itself; adding navigation logic to the manager would turn it into a God object that both selects handlers and drives page lifecycle.

---

## Friction Point 5 — Netflix postMessage Seek (ADR-0004)

### Is the Custom Seek well-isolated?

Yes. The `postMessage` seek lives entirely in `NetflixHandler.handleSeek()`. The call site in `action-handler.js:439` calls `window.VSC.siteHandlerManager.handleSeek(video, seekSeconds)` with no knowledge of the postMessage protocol. The seam is at `handleSeek()` and the protocol does not leak into callers.

One fragility: `NetflixHandler.handleSeek()` has a `catch` block that falls back to `video.currentTime += seekSeconds` — the mechanism that ADR-0004 explicitly records as broken on Netflix. The fallback could silently fail without the caller knowing. This is a minor documentation gap; the isolation of the seek protocol itself is clean.

### Dependency category (per DEEPENING.md)

The postMessage seek is a **True External** dependency (Netflix's internal player, third-party, uncontrolled). The correct treatment is a port at the seam with a mock adapter for testing. Currently there is no port: the `handleSeek()` method _is_ the seam, and `NetflixHandler` is the only adapter. By the "one adapter means a hypothetical seam" principle, the seam is hypothetical until a second adapter (e.g., a test fake, or a different seek mechanism) is needed.

---

## Friction Point 6 — Controller Positioning Object (Data Clump)

### Current state

`getControllerPosition()` returns an object literal every time:

```js
{
  insertionPoint: <DOM node>,
  insertionMethod: 'firstChild' | 'beforeParent' | 'afterParent',
  targetParent: <DOM node>,
}
```

This shape is:
- Not typed (plain object literal, no class, no JSDoc `@typedef`).
- Not named in the GLOSSARY (the term **Controller Positioning** exists and describes _the concept_ but not the shape of the return value — the GLOSSARY entry says "the object returned by `getControllerPosition()`" but does not define the fields as a named type).
- Constructed redundantly in every handler and in `BaseSiteHandler.getControllerPosition()`.

The GLOSSARY term **Controller Positioning** matches this concept exactly. The return object is a **Data Clump**: three fields that always travel together and are always constructed together. It is a candidate for a named concept (`ControllerPositioning`) or at minimum a shared factory.

### Port consideration

Should there be a **port** for the positioning protocol? Under DEEPENING.md seam discipline: the two actual adapters that consume a `ControllerPositioning` object are (a) `VideoController` (which inserts the shadow host into the DOM) and (b) any future test that wants to assert on positioning behaviour. A port here would be a `@typedef` or a validator function — not a class with multiple implementations. The "two adapters" threshold is not met for a runtime seam; a documented shape is the right level.

---

## Codebase-Design Vocabulary Assessment

### Refused Bequest

A Refused Bequest occurs when a subclass ignores or invalidates behaviour it inherits from its parent. In this cluster:

- **`getVideoContainerSelectors()`**: All five subclasses override and return non-empty arrays; `BaseSiteHandler` returns `[]`. No handler calls `super.getVideoContainerSelectors()`. No caller of the manager ever calls this method. This is a Refused Bequest variant where the method is bequest-ed by the parent, overridden by all children, and then bequest-ed again into the void — the entire method is dead code.
- **`initialize()`**: YouTube and Netflix override it but add no real behaviour (one CSS comment log, one initialization log). They accept the bequest but return it empty. Not harmful but wasteful.
- **`detectSpecialVideos()`**: Three handlers (Netflix, Amazon, Facebook) do not override it and return the base `[]`. For Netflix and Amazon this is likely a genuine gap (they probably have special video structures). For Facebook, the `setupFacebookObserver()` in `initialize()` handles new-video detection via `MutationObserver` instead — a different mechanism that bypasses this method entirely. This is a mild Refused Bequest: the intended extension point is ignored and replaced by a side-channel.

### Module Depths

| Module | Interface size | Real behaviour | Depth verdict |
|---|---|---|---|
| `BaseSiteHandler` | 8 methods | `handleSeek()` bounds clamping + GIF fallback | Shallow |
| `SiteHandlerManager` | 10 methods | Lazy detect + cache invalidate | Shallow |
| `YouTubeHandler` | 5 overrides | Positioning walk-up + iframe scan | Shallow–medium |
| `NetflixHandler` | 4 overrides | postMessage seek + positioning escape | Medium (seek is non-trivial) |
| `AmazonHandler` | 3 overrides | Positioning + size-based filter | Shallow |
| `AppleHandler` | 3 overrides | Shadow-root scan + positioning | Shallow |
| `FacebookHandler` | 5 overrides | Positioning traversal + MutationObserver | Medium (observer lifecycle) |

None of the handlers individually reach the "large behaviour behind a small interface" threshold of a genuinely deep module. The cluster as a whole is flat.

### Port for the Positioning Protocol

Per DEEPENING.md: "Define a **port** (interface) at the seam." For Controller Positioning, the relevant seam is between the handlers (which produce a `ControllerPositioning` object) and `VideoController` (which consumes it). Currently there is no port — the object shape is implicit. A JSDoc `@typedef ControllerPositioning` in `base-handler.js` would formalize the port without introducing a runtime abstraction. The "two adapters means a real seam" rule does not require a runtime port here; documentation suffices.

### SPA Navigation Without God Object

The correct place to wire SPA navigation is in `VideoSpeedExtension` (inject.js), not in `SiteHandlerManager`. `VideoSpeedExtension` already owns page lifecycle (initialization, cleanup, visibilitychange). Adding a `history.pushState` wrapper and `popstate` listener in `VideoSpeedExtension.initialize()` that calls `this.siteHandlerManager.refresh()` keeps the manager as a pure handler-selector and gives `VideoSpeedExtension` sole ownership of lifecycle triggers. The manager's interface does not need to grow.

---

## Deepening Candidates

### Candidate A — Push the gifMode guard into BaseSiteHandler.getControllerPosition() (Strong)

**Files:** `base-handler.js`, all five handler files.

**Problem:** The `gifMode`/CANVAS short-circuit is duplicated across five handlers with slight inconsistencies (two miss the CANVAS tag check). BaseSiteHandler does not absorb this guard.

**Solution:** `BaseSiteHandler.getControllerPosition()` applies the guard first; if `options.gifMode` is true or `video.tagName === 'CANVAS'`, it returns the generic `firstChild` positioning immediately. Subclasses override a new `_getVideoControllerPosition(parent, video, options)` hook rather than the public method. The guard runs once, consistently, for all handlers.

**Deepening:** Moves five near-identical guards into one place. Every handler's positioning override shrinks by 3–4 lines. The inconsistency (YouTube/Apple not checking CANVAS) is fixed automatically. Tests for the gif-path can be written against the base once.

**Dependency category:** In-process. No adapter needed. Merge the guards and test through the new interface directly.

**Benefit (locality):** A future `options` change to the GIF path needs to change one place instead of five.

### Candidate B — Absorb the null/tagName guard into BaseSiteHandler.shouldIgnoreVideo() (Worth exploring)

**Files:** `base-handler.js`, `netflix-handler.js`, `amazon-handler.js`, `facebook-handler.js`.

**Problem:** Three of the four `shouldIgnoreVideo()` overrides open with `if (!video || video.tagName !== 'VIDEO') return false;`. BaseSiteHandler returns `false` unconditionally without any guard.

**Solution:** `BaseSiteHandler.shouldIgnoreVideo()` applies the null/tagName guard, then delegates to `_shouldIgnoreVideoImpl(video)` which returns `false` by default. Subclasses override `_shouldIgnoreVideoImpl()`.

**Deepening:** The guard runs once; three handlers lose boilerplate. YouTubeHandler (which skips the guard) is now the anomaly worth investigating — it checks `classList` directly on a potentially null or non-VIDEO element.

**Dependency category:** In-process. No adapter needed.

**Benefit (locality):** A change to the tagName check (e.g., adding `AUDIO` support to video-ignore logic) happens in one place.

### Candidate C — Delete getVideoContainerSelectors() from the interface (Strong)

**Files:** `base-handler.js`, `index.js`, all five handler files.

**Problem:** `getVideoContainerSelectors()` is defined on `BaseSiteHandler`, overridden in all five handlers, proxied through `SiteHandlerManager`, and has zero call sites in the production codebase. It is dead interface — complexity that cannot be deleted because it is defined, but provides no leverage because it is never called.

**Solution:** Apply the deletion test literally. Delete `getVideoContainerSelectors()` from `BaseSiteHandler`, `SiteHandlerManager`, and all five handlers. If a future feature needs container selectors, it can be added back with a caller.

**Deepening:** The cluster interface shrinks by one method (seven methods → six). The five override stubs disappear. The `SiteHandlerManager` proxy for it disappears.

**Dependency category:** In-process (dead code removal). No test adapter needed.

**Benefit (leverage):** Dead interface surface is negative leverage — it must be read, understood, and maintained even though it does nothing. Removing it improves AI-navigability.

**Risk:** If any external caller not visible in `src/` uses this method (e.g., a test harness or a debug helper), deletion would break it. Check `tests/` before deleting.

### Candidate D — Wire SPA navigation to siteHandlerManager.refresh() in VideoSpeedExtension (Worth exploring)

**Files:** `src/content/inject.js`, `src/site-handlers/index.js`.

**Problem:** `SiteHandlerManager.refresh()` exists but has no caller. On SPA navigation the handler cache is never invalidated; the `_docInitialized` guard in `initializeDocument()` also prevents re-initialization.

**Solution:** In `VideoSpeedExtension.initialize()`, add:
- A `popstate` listener that calls `this.siteHandlerManager.refresh()`.
- A `history.pushState`/`replaceState` wrapper (or `yt-navigate-finish` listener for YouTube) that does the same.

The question of whether to also clear `_docInitialized` and re-run `initializeDocument()` must be resolved per-handler: for YouTube, the Video Mutation Observer is already running and picks up new `<video>` elements — `refresh()` alone may suffice. For Facebook, the handler's `MutationObserver` from `initialize()` is also already running. The handler should not need to re-initialize on SPA navigation in most cases; `refresh()` solely affects the cached handler instance for `getControllerPosition()` and `handleSeek()`.

**Dependency category:** True External (browser `history` API, site-specific navigation events). The seam is at the event listener. A test adapter would simulate `popstate`.

**Benefit (locality):** Issue #25 closes. Handler selection stays correct across SPA navigations.

**Constraint:** Do not add navigation detection to `SiteHandlerManager`; keep lifecycle triggers in `VideoSpeedExtension`. The manager is a handler-selector, not a page-lifecycle manager.

### Candidate E — Document the ControllerPositioning shape as a named @typedef (Worth exploring)

**Files:** `src/site-handlers/base-handler.js`.

**Problem:** The `ControllerPositioning` object (`{ insertionPoint, insertionMethod, targetParent }`) is an implicit type constructed in six places (base + five handlers) with no documented shape.

**Solution:** Add a `@typedef {Object} ControllerPositioning` JSDoc in `base-handler.js` with `@property` entries for each field and the allowed values of `insertionMethod`. Update `getControllerPosition()` to declare `@returns {ControllerPositioning}`. No runtime change.

**Deepening:** Formalizes the port between producers (handlers) and consumers (`VideoController`). A future handler author knows exactly what to return without reading all existing handlers. `insertionMethod` allowed values (`'firstChild'`, `'beforeParent'`, `'afterParent'`) are currently implicit.

**Dependency category:** In-process (documentation). No adapter.

---

## Top Recommendation

**Candidate A (push the gifMode guard into BaseSiteHandler) combined with Candidate C (delete the dead `getVideoContainerSelectors()` interface).**

These two can be done together in a single small commit. Together they:

1. Eliminate the most pervasive duplication (5 × near-identical gifMode guards, inconsistent CANVAS check included).
2. Shrink the interface of `BaseSiteHandler` and all five handlers by removing a method that provides zero runtime value.
3. Fix a latent bug (YouTube and Apple missing the CANVAS check in the gifMode guard).
4. Produce immediate locality gains: the gif-path positioning logic is in exactly one place.

Candidate A is entirely in-process, has no external dependencies, requires no new seam, and has a clear before/after shape. Candidate C is deletion — the easiest class of refactor.

**Do Candidate D (SPA navigation wiring) next**, but separately: it touches `inject.js` lifecycle code, requires careful per-site testing, and deserves its own commit with regression coverage for YouTube SPA navigation. It is the highest-impact correctness fix (closes issue #25) but carries the most risk of edge-case regressions.

Candidate B (null/tagName guard) and Candidate E (typedef) are polish; do them opportunistically while working in the handler files for A and C.
