# GIF Domain Analysis

## Terms to update in GLOSSARY.md

### GIF Element
**What to change**: The definition says detection is by `GifObserver` and eligibility is for `<img>` whose `src` ends in `.gif` or is a `data:image/gif` URI. This is incomplete in two ways.

1. Detection also checks `currentSrc` (not just `src`), which matters for `<picture>` elements where the browser may resolve a different source URL. (`gif-observer.js:30` — `if (element.currentSrc && isGifSrc(element.currentSrc))`)
2. The exclusion path is described nowhere in the definition. An `<img>` carrying `img.vscGifIgnore = true` is silently skipped by `detectGifsInDOM` (`gif-observer.js:41`), and `img.gifController` being set means it is already controlled. The current definition implies any qualifying `<img>` is eligible, but two runtime flags can exclude it.
3. The detect/exclude path for size is a two-stage filter: `detectGifsInDOM` checks `naturalWidth`/`naturalHeight` against `GIF_MIN_SIZE_PX` only when the image is loaded (`naturalWidth > 0`); unloaded images pass through to `GifController.create()`, where the post-decode dimension check is the last line of defence (`gif-controller.js:131-136`).

**Proposed update**: Add that `currentSrc` is also checked; note the `vscGifIgnore` exclusion flag; clarify the two-stage size filter.

Evidence: `gif-observer.js:27-36`, `gif-observer.js:41-55`, `gif-controller.js:131-136`

---

### Canvas Replacement
**What to change**: The definition says "the original `<img>` is removed (or hidden for `<picture>` elements)". This is accurate as far as it goes but misses two structural details that matter for understanding the DOM shape:

1. For non-`<picture>` GIFs without a positioned ancestor, a `<span>` position wrapper is inserted around the canvas (`gif-controller.js:298-304`, `gc._positionWrapper`). The definition implies the canvas is inserted directly in place of the `<img>`, which is only true when an offset parent exists.
2. The definition says nothing about the controls overlay `div` (`gc.div`) being inserted adjacent to the canvas (or its wrapper). Canvas Replacement currently implies a one-element DOM change; in reality it produces up to three new nodes (canvas, optional wrapper span, controls div).

**Proposed update**: Note the optional position wrapper span, and that a controls overlay div is inserted alongside the canvas.

Evidence: `gif-controller.js:277-304`, `gif-controller.js:649-651`

---

### GIF Frame Cache
**What to change**: The definition calls it "the global singleton that tracks total decoded-frame memory across all active GIF controllers. Budget: 200 MB global, 50 MB per-GIF."

The comment on the constant in `constants.js:118` reads "50 MB soft per-GIF". The word "soft" is significant: the 50 MB per-GIF value is checked only as a pre-flight estimate before decompression (`gif-controller.js:152`), not enforced dynamically after frames are decoded. The global 200 MB budget is enforced atomically by `tryAllocate`. The per-GIF limit is not re-checked at re-decode time (`gif-controller.js:720-722` does check it, so it is enforced on re-decode too). The "soft" qualifier is present in the source code comment and should be reflected in the glossary.

Additionally, `GifFrameCache` lives in `gif-frame-engine.js`, not its own file. The glossary entry gives it an implicit standalone identity that may mislead a reader looking for its source.

**Proposed update**: Add "soft" qualifier to the per-GIF limit; note that the global budget is atomically enforced while the per-GIF limit is a pre-flight estimate.

Evidence: `gif-frame-engine.js:9-29`, `constants.js:118`, `gif-controller.js:152-157`, `gif-controller.js:720-722`

---

### GIF Frame Engine
**What to change**: The definition says the class "calculates the effective per-frame delay in ms given a raw delay and speed multiplier (with a 10 ms floor)."

The code applies the 10 ms floor to the *raw delay* before dividing, not only to the result:
```js
const base = rawDelayMs < 10 ? 10 : rawDelayMs;
return Math.max(10, Math.round(base / safeSpeed));
```
(`gif-frame-engine.js:42-43`)

So there are two floors: one on the raw input (clamped up to 10 ms before dividing) and one on the output (result never below 10 ms). The glossary says "10 ms floor" without clarifying which quantity is floored. This matters: a GIF with a 0 ms declared frame delay will be treated as if it declared 10 ms before the speed divisor is applied. The current definition implies only the output is clamped.

**Proposed update**: Clarify that the 10 ms floor is applied to the raw delay before division AND to the final result.

Evidence: `gif-frame-engine.js:40-44`

---

### controlGifs setting
**What to change**: The GLOSSARY.md entry uses backtick formatting and a trailing space before "setting" — the heading is `**controlGifs** setting:`. Every other setting entry (e.g., `**gifSpeedStep**`, `**lastGifSpeed**`) is just the bare name in bold. The inconsistency in formatting is minor but the definition itself is fine.

No substantive change needed to the definition; formatting should be aligned with peer entries.

Evidence: `GLOSSARY.md:25-26`

---

### GIF_SPEED_SAVE_DEBOUNCE_MS constant
**What to change**: In the Constants table at the bottom of GLOSSARY.md, the `GIF_SPEED_SAVE_DEBOUNCE_MS` row has an em-dash (`—`) in the Value column instead of the actual value. The constant is defined as `500` ms in `constants.js:120`. This is a factual gap, not merely a formatting issue.

Evidence: `constants.js:120`, `GLOSSARY.md:91`

---

## New terms to add to GLOSSARY.md

### GIF Intersection Observer
A per-`GifController` `IntersectionObserver` that watches the canvas element and triggers visibility-based pause/resume. When the canvas leaves the viewport, the observer starts a 30-second timer. When the canvas returns to the viewport, the observer cancels that timer and resumes animation (re-decoding frames first if they were evicted).
_Avoid_: scroll observer, visibility observer, viewport observer

Evidence: `gif-controller.js:684-756` (`_setupIntersectionObserver`)

---

### Visibility Pause
The state where a `GifController` has suspended its rAF loop because the canvas has been off-screen for 30 seconds. Distinct from User Pause: `_visibilityPaused` is set by the GIF Intersection Observer timer; `_userPaused` is set by explicit user action. The rAF loop does not restart until both flags are clear.
_Avoid_: auto-pause, scroll pause, background pause

Evidence: `gif-controller.js:29` (`_visibilityPaused`), `gif-controller.js:563`, `gif-controller.js:695-704`

---

### User Pause
The state where a `GifController` has suspended its rAF loop because the user explicitly triggered the `pause` action. Distinct from Visibility Pause. Cleared only by the `resume()` method; scroll-back-into-view does not clear it.
_Avoid_: manual pause, explicit pause

Evidence: `gif-controller.js:28` (`_userPaused`), `gif-controller.js:624-632`, `gif-controller.js:744`

---

### Memory Eviction
The act of releasing decoded frame data (`_frames = null`, allocation counter reset to zero) after a GIF has been off-screen for 30 seconds. The raw byte buffer (`_rawBuffer`) is retained so the frames can be re-decoded when the GIF scrolls back into view. Memory eviction happens inside the GIF Intersection Observer's timeout callback; it does not destroy the `GifController` instance.
_Avoid_: frame release, memory release, cache eviction

Evidence: `gif-controller.js:698-704`

---

### Re-decode
The process of re-running `parseGIF` + `decompressFrames` on the retained `_rawBuffer` when a visibility-paused GIF scrolls back into view after Memory Eviction. A new global memory budget allocation is attempted; if the budget is already exhausted the GIF remains paused rather than erroring.
_Avoid_: frame reload, reparse, redecode

Evidence: `gif-controller.js:711-743`

---

### Loop Count
The `loopCount` field decoded from the GIF's Netscape application extension, stored as `_loopCount` on `GifController`. A value of `0` means infinite looping (matching browser convention and the GIF spec default when the extension is absent). A positive integer `N` means the animation plays exactly `N` times; the rAF loop stops after `N * frameCount` frames have been drawn and the final frame remains visible.
_Avoid_: loop iterations, repeat count, animation count

Evidence: `gif-controller.js:120-125`, `gif-controller.js:580-583`

---

### Disposal Type
A per-frame integer flag from the GIF spec that tells the renderer how to handle the composite canvas region occupied by a frame before drawing the next one. Values used in this codebase: `0`/`1` — leave previous pixels in place; `2` — clear the region to background color (or transparent if no background color declared); `3` — restore the region to the pixels that existed before the frame was drawn (using the Patch Canvas save/restore mechanism).
_Avoid_: disposal method, frame disposal, frame type

Evidence: `gif-controller.js:484-516`, `gif-controller.js:519-527`

---

### Patch Canvas
A temporary offscreen `<canvas>` element reused across frames to composite partial GIF frames via `drawImage` (source-over blending) rather than raw `putImageData`. Required because `putImageData` bypasses `globalCompositeOperation`, causing transparent pixels in sub-image patches to erase underlying composite pixels and produce black artifacts. The patch canvas is created lazily on the first `_drawFrame` call and resized as needed.
_Avoid_: temp canvas, offscreen canvas, compositing canvas

Evidence: `gif-controller.js:535-547` (`_patchCanvas`, `_patchCtx`)

---

### Raw Frames / Decompressed Frames
Two distinct representations of GIF frame data produced by gifuct-js. `parseGIF` returns a parsed structure (`_parsed`) with per-frame compressed pixel data. `decompressFrames(parsed, true)` expands each frame's pixels into a full RGBA patch (`frame.patch`) — this is what `_frames` holds. The decompressed representation is what GIF Frame Cache memory budgeting tracks. The `_rawBuffer` (the original GIF file bytes as an `ArrayBuffer`) is a third, more compact representation retained for re-decode.
_Avoid_: parsed frames, frame data

Evidence: `gif-controller.js:111-117`, `gif-controller.js:165-174`, `gif-frame-engine.js` (context for memory units)

---

### GIF Speed Debounce
The 500 ms delay between the last speed-change action and the actual write to `chrome.storage.sync`. Implemented in `ActionHandler._saveGifSpeedDebounced`. Prevents `storage.sync` rate-limit errors when the user holds down the speed-up/speed-down key binding. The constant is `GIF_SPEED_SAVE_DEBOUNCE_MS = 500`.
_Avoid_: speed save delay, debounce timer, persist delay

Evidence: `action-handler.js:179-189`, `constants.js:120`

---

### Position Wrapper
A `<span>` element with `position: relative; display: inline-block` inserted around the canvas during Canvas Replacement when the GIF has no positioned ancestor (i.e., `canvas.offsetParent` resolves to `document.body` or `document.documentElement`). Provides a CSS containing block so the controls overlay div can be positioned relative to the canvas. Not inserted for `<picture>`-hosted GIFs.
_Avoid_: wrapper span, container span, positioning container

Evidence: `gif-controller.js:291-304` (`_positionWrapper`)

---

### Composite Canvas
The offscreen `<canvas>` (`_compositeCanvas`) that accumulates the full GIF frame state across disposal operations. Each frame is blended onto this canvas before the result is copied to the visible canvas. The composite canvas persists for the lifetime of the `GifController` and is never shown directly in the DOM.
_Avoid_: offscreen canvas, backing canvas, accumulation canvas

Evidence: `gif-controller.js:252-256`, `gif-controller.js:549-551`

---

## Fuzzy/overloaded terms

### "GIF Controller" — class name vs. concept
**Problem**: The term is used both as the name of the JavaScript class (`GifController`) and as the domain concept "the per-GIF instance that owns everything." When a reader sees "GIF Controller" in a discussion they cannot tell whether the code is being referenced or the concept. This is not currently ambiguous in the glossary (it correctly defines the concept and uses the class name inline), but any future text that says "the GIF Controller does X" will be read as both.

**Proposed resolution**: The glossary definition is acceptable as-is. When writing prose, distinguish "the `GifController` class" (code reference) from "a GIF controller" (concept instance) using lowercase for the concept. No glossary change needed; document the convention in CLAUDE.md or a code comment.

---

### "Canvas Replacement" — scope ambiguity
**Problem**: The current definition focuses on the `<img>`-to-`<canvas>` DOM swap. But the full operation also produces a controls overlay div and (sometimes) a position wrapper span. A reader who hears "canvas replacement just swaps the img for a canvas" will be surprised to find the three-node DOM footprint. The term is also used in ADR-0002 to describe the entire GIF rendering strategy (including the rAF loop and memory budget), which is a broader scope than the DOM-swap meaning.

**Proposed resolution**: Keep "Canvas Replacement" for the DOM-swap concept but update the definition to explicitly include the controls overlay and position wrapper as part of the operation. Add a note that the term is sometimes used loosely to mean the entire GIF rendering approach (as distinct from Shadow DOM for video/audio).

---

### Frame "disposal" — inconsistent naming
**Problem**: The code uses `frame.disposalType` (a gifuct-js field name) and the new proposed term is "Disposal Type." The ADR-0002 and comments in `gif-controller.js` use the phrase "disposal" freely without ever defining it. A future reader may call the same thing "disposal method" (the GIF spec term), "disposal type" (the gifuct-js field name), or "frame type." None of these are currently in the glossary.

**Proposed resolution**: Canonicalize as "Disposal Type" (matching the gifuct-js field name that appears in the code). List "disposal method" under `_Avoid_`.

---

## ADR candidates

### 1. rAF loop for GIF animation timing (vs. Web Workers or `setTimeout`)
**Meets all 3 criteria**:
- **Hard to reverse**: switching from `requestAnimationFrame` to a Worker-based timer would require moving all frame-draw logic into a transferable canvas pipeline (OffscreenCanvas), a significant architectural rework.
- **Surprising without context**: a future reader might ask "why not use `setInterval` or a Worker for more accurate timing, especially at high speeds?" The rAF loop is not the obvious choice for arbitrary-speed playback; it ties frame advancement to the display refresh rate, which produces frame-rate-quantized speed steps at high multipliers.
- **Real trade-off**: rAF gives synchronization with the browser's paint cycle (no tearing, battery-friendly, auto-pauses in background tabs) at the cost of timing accuracy at speeds where the desired frame delay is shorter than one rAF interval (~16 ms). `setTimeout`/`setInterval` would give more precise timing but at higher CPU cost and no background-tab throttle alignment.

Evidence: `gif-controller.js:554-602` (`_tick`, `_startRafLoop`, `_stopRafLoop`)

---

### 2. Pre-decoding all frames upfront at `GifController.create()` time
**Meets all 3 criteria**:
- **Hard to reverse**: the entire memory budget model (`GifFrameCache`, `GIF_GLOBAL_MEMORY_BUDGET_BYTES`, `GIF_FRAME_CACHE_LIMIT_BYTES`) is built around knowing the full frame byte cost before the rAF loop starts. Switching to lazy per-frame decoding would require replacing the atomic allocation model with incremental tracking.
- **Surprising without context**: most video decoders decode lazily. Pre-decoding a 300-frame GIF at page load is surprising; a reader will wonder why the memory spike is acceptable.
- **Real trade-off**: upfront decoding means zero per-frame CPU during playback (all RGBA patches are ready), predictable memory usage, and instant seek (any frame index is available immediately). Lazy decoding would reduce peak memory but add per-frame decode latency and complicate the memory budget.

Evidence: `gif-controller.js:165-174` (decompressFrames at create time), `gif-frame-engine.js:9-29` (GifFrameCache), `gif-controller.js:148-163` (budget check before allocation)

---

### 3. Hard-coded 200 MB / 50 MB memory budget constants
**Meets all 3 criteria**:
- **Hard to reverse**: these numbers determine whether GIFs on memory-constrained devices are controlled at all. Lowering them later would silently drop GIF control for previously-working GIFs on those devices; raising them risks OOM on low-end Chromebooks. They are baked into two constants referenced in multiple code paths.
- **Surprising without context**: a future reader will wonder "where did 200 MB and 50 MB come from?" They are not derived from any detected device capability or user setting. The comment in `constants.js:118` says "50 MB soft per-GIF" but does not explain the rationale.
- **Real trade-off**: a fixed global cap is simple to implement and reason about but ignores actual device RAM. A device-adaptive cap (e.g., `navigator.deviceMemory`) would be more correct but adds complexity and has its own browser support constraints.

Evidence: `constants.js:117-118`, `gif-frame-engine.js:13`, `gif-controller.js:152`, `gif-controller.js:720`

---

### 4. gifuct-js as the GIF decode library (vendored, exposed as `window.__VSC_gifuct`)
**Meets all 3 criteria**:
- **Hard to reverse**: gifuct-js's output format (the `frame.patch`, `frame.dims`, `frame.disposalType`, `frame.delay` shape) is consumed directly and without abstraction throughout `gif-controller.js`. Replacing the library requires changing every `_drawFrame` call site, the memory estimation formula, and the re-decode path.
- **Surprising without context**: gifuct-js is a small, infrequently-maintained library. A future reader may question why a well-maintained alternative (e.g., `omggif`, a WebAssembly-based decoder) was not chosen, or why decoding is not delegated to the browser via `<canvas>` + frame extraction tricks.
- **Real trade-off**: gifuct-js gives full control over frame data (enabling arbitrary speed), runs in the page context without Workers, and is small enough to vendor. Alternatives would require either losing frame-level control (browser decode) or adding a Worker boundary (WASM decoder).

Evidence: `gif-controller.js:112-116`, `gif-controller.js:165-166`, `gif-controller.js:716-717`, ADR-0001 (gifuct-js namespace deviation)

---

## Terms in GLOSSARY.md that are CORRECT — no change needed

- **Action** (including the GIF-specific note about supported subset) — the note accurately lists the 7 supported GIF actions and explains why the others are unsupported.
- **Blacklist** — unrelated to GIF domain; correct.
- **Cancelled Element** — the note about `img.vscGifIgnore` is accurate; `gif-observer.js:41` and `gif-controller.js:823` both use this flag.
- **Controller** (video/audio) — out of GIF domain scope; correct.
- **gifSpeedStep** — definition is accurate; confirmed at `constants.js:64` and `settings.js:68-69`.
- **Key Binding** — out of GIF domain scope.
- **lastGifSpeed** — definition is accurate; confirmed at `constants.js:63` and `settings.js:60-65`.
- **Marker** — out of GIF domain scope.
- **Media Element** (including the note that GIFs are excluded) — accurate.
- **Playback Rate** (including the GIF note about `effectiveDelay`) — the note that the rate acts as a frame-delay divisor is correct, though the `effectiveDelay` description has the two-floor issue noted under GIF Frame Engine above.
- **Preferred Speed** — out of GIF domain scope.
- **Site Handler** — out of GIF domain scope.
- **Speed Indicator** — out of GIF domain scope.
- **GIF_GLOBAL_MEMORY_BUDGET_BYTES** (200 MB) — correct.
- **GIF_FRAME_CACHE_LIMIT_BYTES** (50 MB) — value correct; "soft" qualifier missing (see update note above).
- **GIF_MIN_SIZE_PX** (20 px) — correct; confirmed at `constants.js:119`.
