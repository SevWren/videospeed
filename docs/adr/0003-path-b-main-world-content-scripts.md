# Use content_scripts with world:MAIN (Path B) instead of chrome.scripting injection (Path A)

All 26 VSC core, UI, and handler modules are declared directly in `manifest.json` under `content_scripts[1]` with `"world": "MAIN"`. Chrome injects them natively at `document_end`, bypassing the host page's Content Security Policy entirely. No `chrome.scripting.executeScript` call is made at runtime.

## Considered options

- **Path A — `chrome.scripting.executeScript` at runtime**: The previous architecture. Required the `scripting` permission, triggered CSP violations on sites with strict policies, and required dynamic load-order management. Abandoned.
- **Path B — `content_scripts` + `"world": "MAIN"` declaration (chosen)**: Chrome handles injection natively. CSP is never consulted for manifest-declared scripts. Each source file is independently debuggable in DevTools without source maps.
- **Bundler (webpack/rollup)**: Would eliminate the injection problem entirely by producing a single file. Deferred due to build-chain complexity; noted in ADR-0001 as a future option.

## Consequences

All modules must register themselves on `window.VSC` (guarded against double-load) and may not use top-level `export`. Load order is controlled by the `content_scripts` array order in `manifest.json`. Adding a new module requires updating `manifest.json` explicitly.
