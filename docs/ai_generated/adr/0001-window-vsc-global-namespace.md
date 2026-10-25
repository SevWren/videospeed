# Use window.VSC global namespace instead of ES modules for inter-module communication

The extension injects modules as separate `<script>` files via `web_accessible_resources` into the host page's JavaScript context. Chrome Manifest V3 prohibits sharing ES module scope across dynamically injected scripts, so a shared global namespace (`window.VSC`) is the only viable way for modules like `ActionHandler`, `VideoSpeedConfig`, `StorageManager`, `GifController`, `GifFrameEngine`, `GifObserver`, and `GifFrameCache` to reference each other at runtime. All public classes and singletons are registered on `window.VSC` at load time; modules read from it rather than importing.

## Considered options

- **ES module imports** — not available: MV3 content scripts and page-injected scripts cannot import each other as ES modules.
- **Bundler (webpack/rollup)** — would bundle all modules into a single file, eliminating the injection pattern entirely. Deferred due to build-chain complexity and the desire to keep individual source files directly debuggable in DevTools without source maps.

## Consequences

All module code must guard against double-loading (`if (!window.VSC.ClassName)`) since scripts can be injected more than once in some iframe scenarios. New modules must register on `window.VSC` and may not use top-level `export`.

## Deviation: window.__VSC_gifuct

`window.__VSC_gifuct` is a deliberate deviation from the `window.VSC` prefix convention. It holds the bundled gifuct-js third-party GIF decoder library. The separate key was chosen for three reasons:

- **Vendor isolation**: keeping the vendor bundle separate from VSC-owned classes makes the ownership boundary explicit and prevents accidental coupling.
- **Collision avoidance**: a future `window.VSC.Gifuct` entry (e.g., a VSC wrapper class) would conflict if the library itself lived at that path.
- **Contributor clarity**: the double-underscore prefix and non-VSC name make the vendor origin immediately obvious to anyone reading the source.

The same double-load guard applies, but uses the form `if (!window.__VSC_gifuct)` rather than the standard `if (!window.VSC.ClassName)` pattern used for VSC-owned modules.
