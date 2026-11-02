# GIF Subsystem + UI Cluster — Codebase Design Analysis

**Date**: 2026-11-02
**Scope**: `gif-controller.js`, `gif-frame-engine.js`, `controls.js`, `shadow-dom.js`, `drag-handler.js`
**Skills invoked**: `/improve-codebase-architecture`, `/codebase-design`, vocabulary from `DEEPENING.md`

---

## Ask-Matt Routing Log

The goal is architectural analysis — not a bug, not a new feature, not a foggy greenfield. The correct entry point per ask-matt is `/improve-codebase-architecture`, which surfaces deepening opportunities. Because the work requires designing module shapes (seam placement, interface sizing), `/codebase-design` is the vocabulary layer running beneath it. No grilling loop is run here; this document is the exploration artefact that would precede one.

Route taken:
1. `/improve-codebase-architecture` — Step 1 (Explore): deletion test, depth analysis, seam inspection.
2. `/codebase-design` — vocabulary applied throughout: module, interface, depth, seam, adapter, leverage, locality.

ADRs consulted: ADR-0002 (Shadow DOM isolation), ADR-0006 (pre-decode upfront), ADR-0007 (rAF loop). No candidates below contradict these ADRs.

---

## Deletion Test Results

### 1. GifController

**Delete it — what happens?**

`GifController` is the only caller of:
- `window.__VSC_gifuct.parseGIF` / `decompressFrames` (decode)
- `GifFrameCache.tryAllocate` / `releaseAllocation` (memory budget)
- Canvas + Composite Canvas creation and the Patch Canvas compositing pipeline
- `IntersectionObserver` setup (Visibility Pause + Memory Eviction)
- `MutationObserver` on `<img src>` (Re-decode trigger)
- `document.visibilitychange` listener (tab-visibility rAF restart)
- `ShadowDOMManager.createShadowDOM` + `ControlsManager.setupControlEvents` (controls overlay)
- `VSC_CONTROLLER_CREATED` / `VSC_CONTROLLER_REMOVED` dispatch

Deleting it concentrates enormous complexity back onto callers. It is **not** a pass-through.

**Verdict**: GifController earns its keep. The deletion test passes — it is a deep module behind a small public interface (`create()`, `setSpeed()`, `pause()`, `resume()`, `remove()`). That interface is genuinely small relative to what it hides.

**However, depth is uneven.** `create()` is a 300-line async factory that interleaves five distinct concerns in one sequential flow:

| Phase in `create()` | Concern |
|---|---|
| Lines 54–98 | Failure-cache lookup and URL resolution |
| Lines 100–107 | Byte fetch (`_fetchGifBytes`) |
| Lines 111–186 | gifuct parse + decompress + memory budget check |
| Lines 192–305 | Canvas creation, style mirroring, DOM insertion, Position Wrapper |
| Lines 307–364 | Controls overlay, IntersectionObserver, rAF start, event dispatch |

These phases are not a God object; they are a factory function doing sequential setup. The real question is whether the seams between them are clean enough for independent testing. Currently they are not — all five phases share `gc` mutable state and the test must drive the whole factory to exercise any of them.

**Finding**: GifController is deep from the caller's perspective but has no internal seams. Its implementation is a tightly-coupled sequential factory. The seam between "decode bytes into frames" and "run frames at a rate" is load-bearing but implicit.

---

### 2. GifFrameCache

**Delete it — what happens?**

`GifFrameCache` is accessed at seven distinct call sites inside `GifController.create()`, `_setupIntersectionObserver()`, and `remove()`:

- `tryAllocate(bytes)` — pre-flight guard before decode
- `releaseAllocation(bytes)` — four separate error/cleanup paths in `create()`
- `releaseAllocation(bytes)` — in `_setupIntersectionObserver` (eviction)
- `releaseAllocation(bytes)` — in `remove()`

Deleting it would scatter the 200 MB global budget counter across all of those call sites. Every caller would have to track `_allocated` themselves. Complexity clearly concentrates.

**Verdict**: Deletion test passes. GifFrameCache earns its keep as a global budget tracker.

**But**: it is a **shallow module masquerading as a deep one.** Its interface is:

```
tryAllocate(bytes) → boolean
releaseAllocation(bytes) → void
requestAllocation(bytes) → boolean   // alias of tryAllocate
confirmAllocation(bytes) → void      // no-op stub
```

The no-op `confirmAllocation` and the alias `requestAllocation` are vestigial surface from a previous two-phase allocation design that was collapsed to atomic. They add interface width with zero depth. A caller must know both exist yet must also know `confirmAllocation` does nothing — that is interface complexity that produces no leverage.

**Finding**: GifFrameCache is a **shared mutable object** (a plain object literal on `window.VSC`, not a class). Any caller can read or write `_allocated` directly. There is no encapsulation enforcement beyond convention. The interface is `_allocated + 3 real methods + 2 vestigial methods`. This is a deepening candidate: collapse the interface to `tryAllocate` + `releaseAllocation`, make `_allocated` truly private (class with `#_allocated`), and delete the stubs.

---

### 3. ControlsManager

**Delete it — what happens?**

`ControlsManager` is instantiated in two places:
1. `GifController._initializeControls()` — one instantiation, `setupControlEvents(shadow, canvas, onSpeedChange)` called immediately.
2. `VideoController` (implied by the class being on `window.VSC`) — the standard video path.

Its `setupControlEvents()` coordinates four sub-registrations:
- `setupDragHandler` — mousedown on `.draggable` → `actionHandler.runAction('drag', ...)`
- `setupButtonHandlers` — click on each button → `actionHandler.runAction(action, ...)`
- `setupWheelHandler` — wheel on `#controller` → either `onSpeedChange` callback (GIF) or direct `video.playbackRate` mutation (video)
- `setupClickPrevention` — stopPropagation on click/mousedown

Delete ControlsManager: all four sets of listeners must be registered manually at each call site. Each call site carries 4× the registration logic. Complexity spreads.

**Verdict**: Deletion test passes. But the module is **shallow in one specific dimension**: the `setupWheelHandler` method contains a conditional branch `if (onSpeedChange) { GIF path } else { Video path }`. This leaks the GIF/video distinction into `ControlsManager`. A deep module hides that variance; here it is surfaced as a callback parameter checked at runtime. The caller (GifController) passes a lambda; the video path leaves `onSpeedChange = null` and reads `video.playbackRate` directly.

**Finding**: ControlsManager is a moderately deep module with one shallow joint. The `onSpeedChange` callback is an implicit seam between "event wiring" and "speed mutation logic." It is a real seam (two adapters: the GIF callback and the null/video-direct path), which means the seam is justified by actual variance. The seam shape could be sharpened by inverting the conditional: push the video-path speed logic into a default callback rather than a null-check. But this is a polish item, not a structural problem.

---

### 4. DragHandler

**Delete it — what happens?**

`DragHandler.handleDrag(video, e)` is called from exactly one place: `ActionHandler.runAction` when `action === 'drag'`. The chain is:

```
ControlsManager.setupDragHandler
  → mousedown on .draggable
  → actionHandler.runAction('drag', false, e)
    → ActionHandler.runAction
      → DragHandler.handleDrag(video, e)
```

The implementation:
- Reads `video.vsc.div` to get the controller.
- Reads `controller.shadowRoot.querySelector('#controller')` to get the shadow element.
- Adds/removes `mousemove`, `mouseup`, `mouseleave` listeners on the nearest parent element.
- Mutates `shadowController.style.left` and `shadowController.style.top`.

Delete it: drag logic moves inline into `ActionHandler`. 58 lines disappear from one file and reappear in another. No caller complexity is reduced; it is a pure relocation.

**Verdict**: Deletion test **fails**. DragHandler is a pass-through with shallow depth. Its interface (`handleDrag(video, e)`) is nearly as complex as its implementation — callers must pass the video element (to reach `video.vsc.div`), plus the event. The implementation is a straightforward closure over those two parameters.

**One-adapter seam**: DragHandler is used from exactly one call site, which means the seam between `ActionHandler` and `DragHandler` is **hypothetical** — there is no second adapter and no variation across the seam. Per the `/codebase-design` principle: "one adapter means a hypothetical seam." The extraction buys no leverage.

**Finding**: DragHandler is a **shallow module with a hypothetical seam**. It should be inlined into `ActionHandler.runAction` under the `'drag'` case. The indirection is pure overhead. This is the strongest deletion-test failure in the cluster.

---

## Seam Analysis: gif-decode → gif-animate Boundary

The most significant missing seam in the cluster sits between two distinct concerns that are currently fused inside `GifController`:

**Decode layer** (gifuct-js → raw frames):
- Fetch bytes
- `parseGIF(buffer)` → parsed structure
- `decompressFrames(parsed, true)` → array of `{patch, dims, delay, disposalType}`
- Memory budget allocation

**Animation layer** (frames → pixels on canvas):
- rAF loop (`_tick`, `_startRafLoop`, `_stopRafLoop`)
- `_drawFrame(idx)` — Composite Canvas, Patch Canvas, Disposal Type handling
- Frame index advancement and loop count enforcement
- Visibility Pause / User Pause state
- IntersectionObserver for Memory Eviction and Re-decode

These two layers share state via `this._frames` (the decoded array) and `this._rawBuffer` (for re-decode). They are deeply intertwined in two ways:

1. **Re-decode in `_setupIntersectionObserver`**: the IntersectionObserver callback calls `window.__VSC_gifuct.parseGIF` and `decompressFrames` directly — the decode layer is re-entered from inside the animation layer. This is the clearest signal that the seam does not exist yet.

2. **Frame delay calculation**: `_tick` calls `GifFrameEngine.effectiveDelay(frame.delay, this._speed)`. This is a pure function and works cleanly across an implicit seam, but the `frame.delay` it consumes is a gifuct-js frame object property. The animation layer therefore has direct knowledge of the gifuct frame shape.

**What an `AnimationController` seam would look like**:

An `AnimationController` would take `frames` (an array of already-decoded, gifuct-agnostic frame descriptors) and a canvas context, and manage the rAF loop, Visibility Pause, User Pause, and Memory Eviction entirely behind its own interface:

```
AnimationController.create(frames, visibleCtx, compositeCtx, options)
AnimationController.setSpeed(speed)
AnimationController.pause()
AnimationController.resume()
AnimationController.onEvict(callback)   // memory eviction — caller re-decodes and calls reload()
AnimationController.reload(frames)      // post-re-decode frame swap
AnimationController.destroy()
```

The decode layer becomes a separate concern: `GifDecoder.decode(buffer) → { frames, width, height, loopCount, bgColor }`. GifController becomes the thin coordinator that pipes decoder output into AnimationController.

This seam would be **real** (two adapters are justified: the production rAF adapter and a test adapter with a synchronous clock), and it would give `_drawFrame`, `_tick`, Disposal Type logic, and the compositing pipeline a clean, independently testable home.

---

## gifuct-js Adapter Proposal

`gifuct-js` is consumed via `window.__VSC_gifuct` — a global property written by the vendored script at `src/lib/gifuct-js.min.js`. In ADR terms this is a **global coupling**, not a port: there is no interface definition at the seam, and callers (`GifController.create` and the re-decode path in `_setupIntersectionObserver`) reach through `window.__VSC_gifuct` directly.

The coupling surfaces in three places:
1. `window.__VSC_gifuct.parseGIF(arrayBuffer)` — initial parse
2. `window.__VSC_gifuct.decompressFrames(parsed, true)` — initial decompress
3. Re-decode in IntersectionObserver: `parseGIF` + `decompressFrames` again

A proper adapter would define a port at the seam:

```javascript
// The port (interface contract callers depend on)
// GifDecodeResult: { frames: DecodedFrame[], width, height, loopCount, bgColor }
// DecodedFrame: { patch: Uint8ClampedArray, dims: {left, top, width, height},
//                 delay: number, disposalType: number }

// The production adapter
class GifuctAdapter {
  decode(arrayBuffer) {
    const parsed = window.__VSC_gifuct.parseGIF(arrayBuffer);
    const frames = window.__VSC_gifuct.decompressFrames(parsed, true);
    return {
      frames: frames.map(f => ({ patch: f.patch, dims: f.dims,
                                  delay: f.delay, disposalType: f.disposalType })),
      width: parsed.lsd.width,
      height: parsed.lsd.height,
      loopCount: parsed.loopCount ?? 0,
      bgColor: resolveBgColor(parsed),
    };
  }
}
```

A test adapter would implement the same port with synthetic frames, no global dependency, and no binary GIF data required. This is the two-adapter condition that makes the seam real.

Current state: `window.__VSC_gifuct` is a **port in name only** — it was placed on a named window property intentionally (per `src/lib/` and `manifest.json` `web_accessible_resources`), which shows awareness of the coupling, but no interface contract is defined and no adapter pattern wraps it. It is global coupling with a thin alias, not a port.

---

## Deepening Candidates

### Candidate A — Inline DragHandler into ActionHandler

**Files**: `src/ui/drag-handler.js`, `src/core/action-handler.js`
**Problem**: DragHandler is a shallow module with a hypothetical seam. It is used at exactly one call site (`ActionHandler.runAction` under `action === 'drag'`). The indirection adds a file, a class, and a `window.VSC.DragHandler` global without adding depth, leverage, or locality.
**Solution**: Move the 50 lines of drag logic directly into the `'drag'` branch of `ActionHandler.runAction`. Delete `drag-handler.js`.
**Dependency category**: In-process. No I/O, no adapters needed. Pure relocation.
**Tests**: Any existing DragHandler tests become tests on ActionHandler's drag branch. Replace, don't layer.
**Recommendation strength**: **Strong**. The deletion test fails cleanly; this is unambiguous.

---

### Candidate B — Extract `GifDecoder` module (gifuct-js adapter)

**Files**: `src/core/gif-controller.js`, new `src/core/gif-decoder.js`
**Problem**: `window.__VSC_gifuct` is accessed at two independent locations inside GifController (initial create and re-decode in IntersectionObserver). No interface contract. Cannot be tested without a real GIF binary or by patching `window.__VSC_gifuct` globally.
**Solution**: Extract a `GifDecoder` module that wraps `window.__VSC_gifuct` behind a `decode(arrayBuffer) → GifDecodeResult` port. GifController receives a decoder instance (default: `GifuctAdapter`). Tests inject a `SyntheticGifDecoder` that returns pre-built frame arrays.
**Dependency category**: True external (vendor library). The deepened module takes the library as an injected adapter. Tests use a synthetic adapter.
**Seam**: Real — production adapter (gifuct-js) + test adapter (synthetic frames). Two adapters, justified.
**Tests**: `GifDecoder` tests can run without any binary GIF data. The re-decode path in IntersectionObserver becomes a call to `decoder.decode(this._rawBuffer)` rather than direct `window.__VSC_gifuct` access, closing the internal coupling.
**Recommendation strength**: **Strong**. Closes a raw global coupling, creates a real testable seam, and removes the duplicate parse/decompress logic in the IntersectionObserver callback.

---

### Candidate C — Extract `AnimationController` as the decode/animate seam

**Files**: `src/core/gif-controller.js`, new `src/core/gif-animation-controller.js`
**Problem**: The rAF loop, Disposal Type compositing, Visibility Pause, User Pause, Memory Eviction, and Re-decode are all fused inside GifController. There is no seam between "hold decoded frames" and "advance frames at a rate." The IntersectionObserver re-enters the decode layer directly, coupling the two concerns at the point where they should be most separated.
**Solution**: Extract `AnimationController` behind the interface described in the Seam Analysis section above. GifController coordinates: it calls `GifDecoder.decode`, allocates memory via `GifFrameCache`, then hands decoded frames to `AnimationController`. AnimationController owns `_tick`, `_drawFrame`, Disposal Type logic, and the Composite/Patch Canvas. It emits an `onEvict` callback when memory is released; GifController handles re-decode and calls `controller.reload(frames)`.
**Dependency category**: In-process for AnimationController's own logic. The dependency on `requestAnimationFrame` is local-substitutable in tests (synchronous clock injection via a `rafScheduler` parameter).
**Seam**: Real — production rAF scheduler + test synchronous scheduler.
**Tests**: `AnimationController` tests can exercise Disposal Types, loop count enforcement, and Visibility Pause logic with a synchronous scheduler. No rAF, no DOM fetch, no gifuct.
**Recommendation strength**: **Worth exploring**. This is a larger refactor than A or B, but it addresses the most important architectural gap — the missing seam between decode and animate. It should be designed-twice (per `/codebase-design` DESIGN-IT-TWICE pattern) before committing to the interface.
**Note**: This candidate should not be pursued before Candidate B. If `GifDecoder` is extracted first, the re-decode path in AnimationController becomes a clean `decoder.decode(rawBuffer)` call rather than a raw gifuct invocation, making the AnimationController interface much cleaner.

---

### Candidate D — Collapse GifFrameCache interface

**Files**: `src/core/gif-frame-engine.js`
**Problem**: `requestAllocation` (alias of `tryAllocate`) and `confirmAllocation` (no-op stub) are vestigial interface surface. `_allocated` is a public property on a plain object, making the encapsulation purely conventional.
**Solution**: Convert `GifFrameCache` to a class with a private `#_allocated` field. Delete `requestAllocation` and `confirmAllocation`. The public interface becomes exactly `tryAllocate(bytes) → boolean` and `releaseAllocation(bytes) → void`.
**Dependency category**: In-process.
**Tests**: Tests that call `requestAllocation` or `confirmAllocation` are testing past the interface; delete them.
**Recommendation strength**: **Worth exploring**. Low risk, improves interface clarity, removes confusion about whether `confirmAllocation` is needed. Small change with good locality payoff.

---

### Candidate E — Sharpen the `ControlsManager.setupWheelHandler` seam

**Files**: `src/ui/controls.js`
**Problem**: `setupWheelHandler` uses a null-check on `onSpeedChange` to distinguish the GIF path from the video path. The video path performs direct `video.playbackRate` mutation inside `ControlsManager`, which is a UI module reaching into media element state. This is the wrong direction of knowledge.
**Solution**: Remove the null-check branch. Make `onSpeedChange` required (or provide a default that reads `video.playbackRate` via a getter, keeping mutation outside ControlsManager). Both callers supply a callback; ControlsManager never inspects media state directly.
**Dependency category**: In-process.
**Recommendation strength**: **Worth exploring**. Small but sharpens the seam so `ControlsManager` is purely a UI event-wiring module with no media-layer knowledge.

---

## Top Recommendation

**Candidate A (inline DragHandler)** should be the first change made. It is the clearest deletion-test failure in the cluster. The module has zero depth, a hypothetical seam, and adds overhead without benefit. Inlining it is a mechanical operation with no risk of breaking behaviour, and it removes a `window.VSC` global and a file.

**Candidate B (GifDecoder adapter)** should follow immediately. It closes the only raw global coupling in the GIF subsystem, removes duplicate parse/decompress logic from the IntersectionObserver callback, and creates the real seam (two adapters: gifuct + synthetic) that makes the decode layer independently testable. It also unblocks Candidate C by making the re-decode path clean.

**Candidate C (AnimationController)** is the highest-leverage deepening in the cluster but should be designed-twice before committing to the interface — the `onEvict`/`reload` contract between GifController and AnimationController is non-trivial and the interface shape determines how clean the Memory Eviction/Re-decode cycle becomes.

Candidates D and E are polish items that should follow A and B; they are low-risk and can be picked up opportunistically.
