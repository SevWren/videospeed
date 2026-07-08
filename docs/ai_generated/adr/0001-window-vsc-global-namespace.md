# Use window.VSC global namespace instead of ES modules for inter-module communication

The extension injects modules as separate `<script>` files via `web_accessible_resources` into the host page's JavaScript context. Chrome Manifest V3 prohibits sharing ES module scope across dynamically injected scripts, so a shared global namespace (`window.VSC`) is the only viable way for modules like `ActionHandler`, `VideoSpeedConfig`, and `StorageManager` to reference each other at runtime. All public classes and singletons are registered on `window.VSC` at load time; modules read from it rather than importing.

## Considered options

- **ES module imports** — not available: MV3 content scripts and page-injected scripts cannot import each other as ES modules.
- **Bundler (webpack/rollup)** — would bundle all modules into a single file, eliminating the injection pattern entirely. Deferred due to build-chain complexity and the desire to keep individual source files directly debuggable in DevTools without source maps.

## Consequences

All module code must guard against double-loading (`if (!window.VSC.ClassName)`) since scripts can be injected more than once in some iframe scenarios. New modules must register on `window.VSC` and may not use top-level `export`.
