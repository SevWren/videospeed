---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# gif-controller.seam.md

**File**: `src/core/gif-controller.js`
**World**: page-main (injected via `<script>` tag by `injector.js`)
**window.VSC registration**: `window.VSC.GifController` (line 804@e904370)
**LOC**: 806

---

## window.VSC Depends On

Reads these globals at call time (not at parse time — all lazy):

| Global | Used for |
|--------|----------|
| `window.VSC.GifObserver.isGifSrc` | Resolve which src (`.src` vs `.currentSrc`) points to a .gif |
| `window.VSC.gifFetchFailCache` | Per-origin failure cache; skip already-failed origins |
| `window.VSC.Constants.GIF_FRAME_CACHE_LIMIT_BYTES` | 50 MB per-GIF frame memory cap |
| `window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES` | 200 MB global budget (via GifFrameCache) |
| `window.VSC.Constants.GIF_SPEED_SAVE_DEBOUNCE_MS` | 500 ms debounce for speed saves |
| `window.VSC.GifFrameCache` | `tryAllocate(bytes)` / `releaseAllocation(bytes)` — memory budget tracker |
| `window.VSC.GifFrameEngine.effectiveDelay` | Frame timing calculation (speed-adjusted) |
| `window.VSC.ControlsManager` | Creates Shadow DOM speed-control overlay |
| `window.VSC.ShadowDOMManager` | Attaches Shadow DOM to canvas |
| `window.VSC.logger` | Structured logging |
| `window.__VSC_gifuct` | `parseGIF()`, `decompressFrames()` — GIF decoder |

---

## Exposes

Public API consumed by other modules:

| Function/Method | Called by | Purpose |
|-----------------|-----------|---------|
| `GifController.create(img, parent, config, actionHandler)` | `inject.js:onGifFound` (line 370) | Static async factory; fetch → decode → DOM-replace → start RAF; returns `GifController` or `null` |
| `gc.remove()` | `inject.js:onGifRemoved` (line 396+); `mutation-observer.js` (line 252) | Full teardown; 13 ordered steps; sets `vscGifIgnore`, `_vscTeardownSrc`, re-inserts `<img>`, releases memory |
| `gc.setSpeed(newSpeed)` | `action-handler.js` | Changes `_speed`; triggers debounced settings save |
| `gc._canvas` | `mutation-observer.js:250–251` | Checked to determine if canvas-replacement is in progress (skip teardown guard) |

### Expando Properties Written on `<img>`

| Property | Set at | Meaning |
|----------|--------|---------|
| `img.gifController` | `inject.js:369` (sentinel); `gif-controller.js:277` (real) | Sentinel `{pending:true}` then real instance; deleted on `remove()` |
| `img.vscGifIgnore` | `gif-controller.js:767` (`remove()`) | Suppresses re-attach after teardown |
| `img._vscTeardownSrc` | `gif-controller.js:766` (`remove()`) | Records `img.src` at teardown; lets `onGifFound` bypass `vscGifIgnore` if src changed |
| `img.vscGifFailed` | `inject.js:376` | Set when `create()` returns null; blocks retries |
| `canvas.vsc` | `gif-controller.js:293` | `{ div: gc.div }` — DragHandler compatibility shim |

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P2 | `vscGifIgnore = true` set in `remove()` before `<img>` re-insertion | `remove()` lines 766–767 |
| P3 | `disposal=2` fills composite with `_bgColor` via `fillRect`, not `clearRect` | `_drawFrame()` lines 444–453 |
| P5 | `loopCount == null` defaults to `0` (infinite) | `create()` line 120 |
| P6 | `remove()` executes all 13 teardown steps in order | `remove()` lines 727–797 |
| P7 | Patches routed through `_patchCanvas` + `drawImage()` (source-over); never `putImageData()` directly to composite | `_drawFrame()` lines 493–505 |
| P8 | Per-GIF and global memory checked via `GifFrameCache.tryAllocate()` before allocating | `create()` lines 135–159 |
| P13 | `VSC_GIF_BYTES_RESPONSE` handler validates `requestId` match | `_fetchGifBytes()` lines 364–398 (partial — no `event.origin` check; MT-001) |

---

## Common Tasks

Tasks that primarily land in this module:

- **D3: Fix a GIF rendering artifact** — look at `_drawFrame()` (disposal types, `_patchCanvas`, `_bgColor`)
- **D4: Change GIF speed behavior** — look at `_tick()` (RAF loop, overshoot cap) and `setSpeed()`
- **D8: Replace gifuct decoder** — look at `create()` lines 108–165 (parse + decompress + frame extraction); check `_drawFrame()` for disposal type assumptions

---

## Gotchas

- **Do not replace `_patchCanvas` + `drawImage()` with `putImageData()` directly on the composite.** `putImageData()` ignores `globalCompositeOperation`; transparent pixels in patch frames erase underlying composite pixels → black artifacts. This is P7 and the indirection is not accidental. (HANDOFF.md §16.4)

- **`vscGifIgnore` and `_vscTeardownSrc` work together.** `vscGifIgnore` alone permanently suppresses re-attach. `_vscTeardownSrc` lets a new src bypass the ignore flag. Both are set in `remove()` and both are checked in `inject.js:onGifFound`. Breaking either interaction causes double-attach or dead GIFs after src changes. (HANDOFF.md §16.2)

- **`loopCount = 0` means infinite.** gifuct returns `null`/`undefined` when no Netscape extension is present; the correct default is `0` (infinite), not `1`. Using `1` makes most real-world GIFs stop after one cycle. (HANDOFF.md §16.5)

- **Memory budget `tryAllocate()` is atomic.** There is no separate `confirmAllocation()`; `tryAllocate()` allocates immediately. Every code path that calls `tryAllocate()` must call `releaseAllocation()` on all failure and teardown paths or the budget leaks.

- **The RAF loop overshoot cap** (`_tick()`) clamps catch-up to at most one `effectiveDelay` period to prevent burst-rendering after a tab returns from background. Removing this cap causes visual stuttering when switching tabs.
