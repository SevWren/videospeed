# Use requestAnimationFrame loop for GIF animation timing

GIF frame advancement is driven by a `requestAnimationFrame` loop (`GifController._tick`). On each rAF callback, the elapsed time since the last frame is compared against the effective frame delay (from `GifFrameEngine.effectiveDelay()`); if enough time has passed, the next frame is drawn and the timestamp is advanced.

## Why this is surprising

GIFs have their own per-frame timing (declared delays in the file, commonly 10–100 ms). A naive implementation would use `setTimeout` or `setInterval` to fire exactly at those delays. rAF ties frame checks to the browser's display refresh rate (~60 Hz / 16 ms), which means the actual frame-advance check runs at most every 16 ms. At high speed multipliers where the effective delay drops below 16 ms, multiple frames may be skipped per rAF tick to compensate.

## Trade-offs

- **`requestAnimationFrame` (chosen)**: Synchronized with the browser's paint cycle (no tearing, battery-friendly). Automatically pauses when the tab is hidden or backgrounded (browser throttles rAF in hidden tabs), which aligns with the Visibility Pause mechanism. No CPU cost when the tab is not visible.
- **`setTimeout`/`setInterval`**: More precise timing at sub-16 ms effective delays. However, Chrome throttles timers in hidden tabs to ≥1000 ms, which would cause the GIF to continue burning CPU and potentially accumulate a large timer backlog when the tab becomes visible again.
- **Web Worker + `OffscreenCanvas`**: Would allow accurate timing isolated from the main thread, but requires moving all frame-draw logic into a transferable canvas pipeline — a significant architectural rework. Gains no benefit from the Visibility Pause mechanism.

## Consequences

The minimum observable frame rate is limited by the display refresh rate. At effective delays shorter than one rAF interval (~16 ms), the loop compensates by advancing multiple frames per tick, which may cause stuttering at very high speeds. This is an accepted trade-off for the tab-throttle alignment benefit.
