---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# gif-frame-engine.seam.md

**File**: `src/core/gif-frame-engine.js`
**World**: page-main (injected at position 23 in load order, before `gif-observer.js` and `gif-controller.js`)
**window.VSC registration**: `window.VSC.GifFrameCache` (object, line 10), `window.VSC.GifFrameEngine` (class, line 47)
**LOC**: 48

---

## window.VSC Depends On

| Global | Used for |
|--------|----------|
| `window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES` | 200 MB global cap enforced by `GifFrameCache.tryAllocate()` |

---

## Exposes

### `window.VSC.GifFrameCache` (object — memory budget tracker)

| Method | Called by | Behavior |
|--------|-----------|----------|
| `tryAllocate(bytes)` | `gif-controller.js:140,151,159` | Atomically checks and reserves `bytes` against `GIF_GLOBAL_MEMORY_BUDGET_BYTES`. Returns `true` on success, `false` on overflow. Allocation is immediate — there is no separate `confirmAllocation()`. |
| `releaseAllocation(bytes)` | `gif-controller.js:285,333,763` | Subtracts `bytes` from `_allocated`, floored at 0. Must be called on every `remove()` and failure path or the global budget leaks. |
| `confirmAllocation(_bytes)` | (legacy call sites) | No-op. Kept for API compatibility; does nothing. |
| `requestAllocation(bytes)` | (legacy alias) | Delegates to `tryAllocate(bytes)`. |

### `window.VSC.GifFrameEngine` (class — frame timing)

| Method | Called by | Behavior |
|--------|-----------|----------|
| `GifFrameEngine.effectiveDelay(rawDelayMs, speed)` | `gif-controller.js:526` (`_tick()`) | Calculates speed-adjusted frame delay in ms. Enforces a 10 ms floor on both the raw delay and the result. Formula: `max(10, round(max(10, rawDelayMs) / speed))`. Speed ≤ 0 is clamped to 1.0. |

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P8 | Per-GIF and global memory checked via `GifFrameCache.tryAllocate()` before allocating frame data | `gif-controller.js:135–159` (consumer); `gif-frame-engine.js:13–21` (implementation) |
| P9 | `effectiveDelay` enforces a 10 ms floor on raw delay AND result — prevents zero-delay tight loops at high speed | `gif-frame-engine.js:40–44` |

---

## Common Tasks

- **D4: Change GIF speed behavior** — `effectiveDelay` is the only place raw delay is converted to wall-clock time; edit here to change the speed-to-delay mapping globally
- **D4: GIF freezes or runs too fast** — check `effectiveDelay` floor logic; a raw delay of 0 ms from the decoder is clamped to 10 ms before division

---

## Gotchas

- **`tryAllocate()` is atomic — no confirm step.** Calling `tryAllocate()` immediately reserves the memory. Any code path that calls `tryAllocate()` and then fails before completing must call `releaseAllocation()`. Missing releases cause the 200 MB global cap to silently shrink over a session. (HANDOFF.md §GIF memory model)

- **`confirmAllocation` is a no-op.** Any historical call to `confirmAllocation()` does nothing. The two-phase allocate/confirm model was abandoned; only `tryAllocate` + `releaseAllocation` are live.

- **10 ms floor applies twice.** The raw frame delay from the GIF decoder is clamped to 10 ms, then the result of division is also clamped to 10 ms. This means a 5 ms raw delay at 1x speed yields 10 ms (not 5 ms), and a 10 ms raw delay at 100x speed yields 10 ms (not 0.1 ms). Both floors are intentional and load-bearing (P9).
