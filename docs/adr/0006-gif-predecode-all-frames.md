# Pre-decode all GIF frames upfront at GifController.create() time

When `GifController.create()` runs, it calls `decompressFrames(parsed, true)` immediately, expanding every frame's pixels into a full RGBA patch and storing the complete set as `_frames`. No frames are decoded lazily during playback.

## Why this is surprising

Most video and GIF players decode frames on demand — only the next frame (or a small lookahead window) is decoded at any given time, keeping memory usage proportional to the lookahead size rather than total frame count. Pre-decoding a 300-frame GIF at page load causes a one-time memory spike that a reader familiar with standard decoder patterns will not expect.

## Trade-offs

- **Upfront decode (chosen)**: Zero per-frame CPU during playback (all RGBA patches are ready in memory), instant seek to any frame index, predictable memory usage trackable by `GifFrameCache`. The `requestAnimationFrame` loop becomes a pure memory read — no decode latency at any speed.
- **Lazy per-frame decode**: Reduces peak memory but adds per-frame decode latency at playback time, complicates seek (any frame that hasn't been decoded yet must be decoded on demand), and makes the `GifFrameCache` atomic allocation model impractical (you cannot know total frame cost before decoding).

## Consequences

The entire memory budget model (`GifFrameCache`, `GIF_GLOBAL_MEMORY_BUDGET_BYTES`, `GIF_FRAME_CACHE_LIMIT_BYTES`) is built on the assumption that all frames are decoded upfront and their total byte cost is known before the rAF loop starts. Switching to lazy decoding would require replacing the atomic allocation model with incremental per-frame tracking and would break Memory Eviction / Re-decode semantics.
