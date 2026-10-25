# Render the controller inside a Shadow DOM to isolate it from host-page styles

**Scope: this ADR covers HTML media element controllers (video and audio) only.** GIF controllers use canvas replacement instead of Shadow DOM and are out of scope for this decision.

Host pages apply aggressive CSS resets, z-index stacking, and font overrides that break injected UI. Mounting the controller as a Shadow DOM host (`element.attachShadow({ mode: 'open' })`) with its own stylesheet (`shadow.css`) prevents host styles from leaking in and prevents controller styles from leaking out. An iframe would give stronger isolation but would require cross-frame messaging for every user interaction and cannot be positioned relative to a `<video>` element reliably across sites.

## Why GIF controllers use canvas replacement instead of Shadow DOM

GIF playback is handled by replacing the original `<img>` element in-place with a `<canvas>` element that occupies the exact same DOM position. This approach is incompatible with and does not benefit from Shadow DOM for several reasons:

- A `<canvas>` element renders pixels directly from decoded frame data. It has no child DOM or injected stylesheet, so style isolation is irrelevant — there is nothing for host-page styles to bleed into.
- Attaching a shadow root to a canvas element would add architectural complexity with no practical benefit.
- GIF frame timing is driven by a `requestAnimationFrame` loop managed by `GifFrameEngine`. This rAF-based control model has no equivalent in a Shadow DOM setup, which is purely a style-isolation mechanism.
- Memory tradeoff: canvas replacement pre-decodes all GIF frames into memory upfront, managed by `GifFrameCache` (200 MB global budget, 50 MB per-GIF limit). A Shadow DOM host node, by contrast, carries no pre-computed frame data and has negligible memory overhead.

## GIF detection path vs. video/audio detection

GIF detection is handled by `GifObserver`, which uses a `MutationObserver` that watches both `childList` mutations and `src` attribute changes on `<img>` elements. Watching `src` attribute changes is necessary to catch lazy-loaded GIFs that are inserted into the DOM with a placeholder `src` and later swapped to the real GIF URL.

Video and audio detection watches `childList` mutations only. It does not need to monitor attribute changes because `<video>` and `<audio>` elements are typically present in the DOM with their final `src` (or `<source>` children) at insertion time.
