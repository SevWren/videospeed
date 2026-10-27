---
team: J4
role: Build-Step Designer
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
lens: Introduce a bundler build step; src/ uses ES module imports; dist/ ships to Chrome; source maps satisfy ADR-0001 debuggability concern
status: complete
---

# J4 Design: Build Step with ES Modules + Source Maps

## Preamble

This is the most invasive design in the J-series. It replaces the current
sequential DOM-injection + `window.VSC` global namespace pattern with a
proper ES module graph compiled by a bundler. Every other J design is
additive or reorganizational. This design is a runtime code migration.

**Regression safety is a hard constraint.** The charter's ZERO-DIFF surface
(`src/**`, `manifest.json`, etc.) means this design CANNOT be executed on the
current branch. The entire design is expressed as a migration plan. The actual
migration requires human approval and a dedicated branch.

Team I's finding is the permission slip: ADR-0001's "no-bundler" choice is an
engineering preference, not a hard MV3 constraint. This design accepts that
finding and proposes a path forward.

---

## 1. Hypotheses

**H1 (falsifiable):** A bundler (esbuild) can produce a single `dist/content-bundle.js`
that reproduces all 14 protected behaviors byte-for-byte in Chrome, with the
`window.VSC` global namespace replaced by native ES module scope, without
changing any observable user-facing behavior. Falsification: any of P1-P14
breaks in a real-Chrome regression test after migration.

**H2 (falsifiable):** Inline source maps embedded in `dist/content-bundle.js`
cause Chrome DevTools to show the original `src/` file names in the Sources
panel and in stack traces, satisfying ADR-0001's stated debuggability concern.
Falsification: after migration, a developer sets a breakpoint in DevTools and
sees only the bundled output, not the original source file name and content.

**H3 (falsifiable):** The `gif-file-fetcher.html` iframe-proxy pattern (P13/P14,
`file://` origin bypass) can survive the migration because it operates
independently of the main content-script bundle; it is an HTML page loaded at
`chrome-extension://` origin and does not participate in the ES module graph.
Falsification: the fetcher stops receiving GIF bytes after migration because
its `postMessage` origin check fails or its WAR entry is broken.

---

## 2. Proposed Build Architecture

### 2.1 Tool Choice: esbuild

**Selected tool: esbuild** (pure Node ESM script, no framework).

Rationale:
- Already in the JS ecosystem; no framework lock-in (CRXJS, WXT, Plasmo all
  add abstraction layers inappropriate for a 33-file extension).
- Fastest incremental build; single binary; zero configuration DSL.
- Produces inline source maps (`--sourcemap=inline`) or external
  (`--sourcemap=linked`) with a single flag.
- Compatible with `package.json` `"type": "module"` (C-18).
- Does not require `webpack.config.js` or `vite.config.ts`; the build script
  is a plain Node ESM `.mjs` file checked into the repo.
- esbuild can target multiple entry points, enabling separate bundles for the
  content script, background service worker, popup, and options page.

**Not selected:**
- Rollup: valid, but slower and more config-heavy for this use case.
- Vite/CRXJS: adds a dev server and HMR layer; overkill; DevTools shows files
  under Vite virtual origin, not `chrome-extension://`.
- WXT/Plasmo: full framework; imposes directory conventions that conflict with
  existing `src/` layout; migration cost doubles.
- Webpack: heavier config; CommonJS-first; conflicts with `"type": "module"`.

### 2.2 How src/ Uses ES Module Imports

After migration, every file in `src/` uses standard ES module syntax:

```js
// Before (current): window.VSC global registration
if (!window.VSC) window.VSC = {};
window.VSC.GifController = class GifController { ... };

// After: ES module export
export class GifController { ... }
```

```js
// Before: consumer reads from window.VSC
const gc = new window.VSC.GifController(...);

// After: consumer imports directly
import { GifController } from '../core/gif-controller.js';
const gc = new GifController(...);
```

The entry point for the content script bundle becomes a single file
`src/content/main.js` (new file) that imports from all modules and kicks off
the initialization sequence that `injector.js` currently orchestrates via
sequential `injectScript()` calls.

`src/content/injector.js` is retired. Its load-order contract is replaced by
the static import graph (esbuild resolves and validates import order at build
time — a static analysis guarantee rather than a runtime ordering convention).

`src/lib/gifuct-js.min.js` (C-11: untouchable) is handled as an esbuild
external or as a pre-bundled vendor chunk. Because it sets
`window.__VSC_gifuct` itself, it can be loaded as a separate `<script>` tag
before the main bundle, preserving its existing behavior without modifying it.

### 2.3 What dist/ Looks Like

```
dist/
  content-bundle.js          # All src/content + src/core + src/observers
                              # + src/site-handlers + src/ui + src/utils,
                              # bundled into one IIFE. ~300-400 KB unminified.
  content-bundle.js.map      # External source map (if not inline) — NOT in WAR
  background.js              # esbuild pass-through or minimal bundle
  ui/
    popup/popup.js           # Bundled popup entry
    options/options.js       # Bundled options entry
  lib/
    gifuct-js.min.js         # Copied verbatim (no bundling; C-11 compliance)
  gif-file-fetcher.js        # Bundled fetcher (or verbatim copy)
```

`manifest.json` in the migration changes:
- `content_scripts[0].js`: `["dist/content-bundle.js"]` (one file, not 23).
- `web_accessible_resources`: reduced to `["dist/lib/gifuct-js.min.js",
  "dist/gif-file-fetcher.js", "dist/gif-file-fetcher.html"]` — dramatically
  smaller attack surface (C-1 concern addressed, not worsened).
- `background.service_worker`: `"dist/background.js"`.

### 2.4 Source Maps: Generation and WAR Policy

**Generation**: esbuild `--sourcemap=inline` embeds the source map as a
`//# sourceMappingURL=data:application/json;base64,...` comment at the end of
`dist/content-bundle.js`. No separate `.map` file is created.

**Why inline**: No extra file to declare in WAR. The bundle already contains
the map data. DevTools picks it up automatically.

**WAR policy**: Inline source maps are not a separate web-accessible resource.
They are embedded in the already-loaded bundle. C-2 ("no source maps in WAR")
is satisfied because there is no `.map` file to list in WAR.

**Security note**: Inline source maps do expose original source code to any
page-world script that can read `document.currentScript.src` or inspect the
injected `<script>` tag. This is a mild information-disclosure risk (original
variable names, comments, and logic become visible). For a production build,
`--sourcemap=external` produces a `.map` file that is NOT listed in WAR and is
not web-accessible; DevTools can still use it if the browser has access to the
build output (local dev only). Production distribution uses no source maps.

**Recommended policy**: Two build modes:
- `npm run build:dev` — inline source maps for local development
- `npm run build:prod` — no source maps for Chrome Web Store distribution

### 2.5 window.VSC Global Namespace After Migration

After migration, `window.VSC` **does not exist** in the bundled output. All
inter-module communication uses native ES module scope (imported references).
The bundle is wrapped in an IIFE by esbuild, so no symbols leak to `window`.

The double-load guard (`if (!window.VSC.ClassName)`) is replaced by esbuild's
module deduplication: the bundler ensures each module is included exactly once
in the output, regardless of how many import paths reference it.

`window.__VSC_gifuct` continues to exist as set by `gifuct-js.min.js` (loaded
as a separate `<script>` before the bundle), because that file is not modified.
The bundle's `gif-controller.js` reads `window.__VSC_gifuct` by name, same
as today.

---

## 3. How This Addresses ADR-0001's Concerns

ADR-0001 states two concerns:

**Concern A**: "Chrome Manifest V3 prohibits sharing ES module scope across
dynamically injected scripts."

Resolution: With a bundler, there are no dynamically injected scripts. There
is one script (`dist/content-bundle.js`) loaded by the content script
declaration in manifest.json. There is no runtime DOM injection. The MV3
constraint Team I identified (scope isolation between independently injected
module scripts) is irrelevant when all modules are compiled into a single IIFE.
ADR-0001's stated constraint is dissolved, not worked around.

**Concern B**: "Keep individual source files directly debuggable in DevTools
without source maps."

Resolution (direct answer): YES. With source maps enabled, a developer CAN
click a stack frame in DevTools and see the original source file. Chrome
DevTools has natively supported source maps since Chrome 19. When
`content-bundle.js` is loaded and contains an inline source map (or a linked
external map accessible to the browser), the Sources panel shows a virtual
`webpack://` or `esbuild://` tree with the original file names (e.g.,
`src/core/gif-controller.js`). Clicking a stack frame navigates to the
original file and line. Breakpoints set on original source lines work.

The only scenario where this fails is external `.map` files that are not
web-accessible (production build, no source maps). In that case, DevTools shows
the bundled output — which is the same experience as debugging a minified file.
For development builds (inline source maps), debuggability is fully preserved.

ADR-0001's "no source maps" preference was an engineering choice to avoid build
tooling complexity. This design accepts that complexity in exchange for a
cleaner module architecture, a smaller WAR surface, and static import
validation.

---

## 4. What Moves and What Stays (Plan Only)

This migration requires the following runtime code changes (NONE executed on
this branch; each becomes a migration ticket):

**Files retired (deleted after migration):**
- `src/content/injector.js` — replaced by static import graph + esbuild entry
- `src/module-loader.js` — dead code today (OBS-09); confirmed dead before deletion

**Files converted (import/export added; window.VSC registration removed):**
- `src/utils/constants.js`
- `src/utils/debug-helper.js`
- `src/utils/dom-utils.js`
- `src/utils/event-manager.js`
- `src/utils/logger.js`
- `src/core/settings.js`
- `src/core/storage-manager.js`
- `src/core/action-handler.js`
- `src/core/video-controller.js`
- `src/core/gif-frame-engine.js`
- `src/core/gif-controller.js`
- `src/observers/media-observer.js`
- `src/observers/mutation-observer.js`
- `src/observers/gif-observer.js`
- `src/site-handlers/base-handler.js`
- `src/site-handlers/youtube-handler.js`
- `src/site-handlers/netflix-handler.js`
- `src/site-handlers/amazon-handler.js`
- `src/site-handlers/apple-handler.js`
- `src/site-handlers/facebook-handler.js`
- `src/site-handlers/index.js`
- `src/ui/shadow-dom.js`
- `src/ui/controls.js`
- `src/ui/drag-handler.js`
- `src/background.js` (minor: may already be isolated; verify)
- `src/content/inject.js`

**Files NOT touched:**
- `src/lib/gifuct-js.min.js` (C-11: untouchable; vendored as-is)
- `src/gif-file-fetcher.js` (independent; may be bundled separately or copied verbatim)
- `src/ui/popup/popup.js`, `src/ui/options/options.js` (separate entry points;
  bundled independently; may not need `window.VSC` at all if already isolated)

**New files added:**
- `scripts/build.mjs` — esbuild build script (Node ESM)
- `src/content/main.js` — new bundle entry point
- `dist/` — build output directory (git-ignored)

**manifest.json changes:**
- `content_scripts[0].js`: `["dist/content-bundle.js"]`
- `web_accessible_resources`: updated to `dist/` paths
- `background.service_worker`: `"dist/background.js"`

**Acknowledgment**: This is the largest migration in the J-series. It touches
every src/ file except `gifuct-js.min.js`. It is not a one-ticket change. See
Section 8 for the migration path.

---

## 5. Protected Behavior Impact (P1–P14)

| PB | Description | Impact | Risk |
|----|-------------|--------|------|
| P1 | Speed persistence via chrome.storage.sync | LOW — `StorageManager` module converts cleanly to ES export; storage API calls unchanged | LOW |
| P2 | Module load order contract | **CHANGES** — static import graph replaces runtime injection order. esbuild guarantees topological sort. But the _contract itself_ (documented in injector.js) must be re-expressed as import dependency ordering. If any module has a side effect that assumes another is already loaded (via `window.VSC`), that assumption must be made explicit as an import. | HIGH during migration |
| P3 | Double-load guard (`if (!window.VSC.ClassName)`) | **REMOVED** — bundler module deduplication replaces this. Risk: any iframe scenario that genuinely re-injects the content script will now get a second IIFE execution, not a no-op guard. Must verify iframe handling before removing guards. | MEDIUM |
| P4 | `loopCount = null` → infinite GIF loop | LOW — logic is internal to `gif-controller.js`; not affected by import style | LOW |
| P5 | `disposal=2` bgColor fill / clearRect | LOW — same; internal canvas logic | LOW |
| P6 | `_patchCanvas` composite with `drawImage` | LOW — same; internal | LOW |
| P7 | Pixel-level color accuracy (P7 untestable in JSDOM) | LOW — no change to canvas operations | LOW |
| P8 | GIF memory budget enforcement | LOW — internal to `gif-controller.js` | LOW |
| P9 | `img.vscGifIgnore` + `img._vscTeardownSrc` | LOW — DOM property writes are unchanged; esbuild does not rename property accesses | LOW |
| P10 | Sentinel pattern `{pending:true,_cancelled:false}` | LOW — internal property; unaffected | LOW |
| P11 | `VSC_SAVE_SETTINGS` CustomEvent handler | MEDIUM — the handler currently relies on modules loaded in order; with bundled IIFE, handler registration order is determined by import graph. Must verify handler is registered before the event can fire. | MEDIUM |
| P12 | `VSC_GIF_BYTES_RESPONSE` / `VSC_GIF_FETCHER_READY` | MEDIUM — same concern as P11; postMessage handlers must be registered at the right time relative to bundle initialization | MEDIUM |
| P13 | `gif-file-fetcher.html` iframe proxy | LOW — independent HTML page at chrome-extension:// origin; not in the content bundle; postMessage interface unchanged | LOW |
| P14 | `file://` GIF fetch via iframe proxy | LOW — same as P13 | LOW |

**P2 is the highest-risk protected behavior.** The current load order is an
explicit runtime contract enforced by injector.js. In the bundled world, it
becomes an implicit contract enforced by import graph topology. Before
migration, every dependency assumption in every module must be made explicit
as an ES import. This requires careful module-by-module analysis.

**Regression safety flag**: P2, P3, P11, P12 require characterization tests
that pass on master BEFORE migration begins. These tests must capture the
observable behavior (not the implementation) so they can validate the migrated
version.

---

## 6. Permission / WAR / CSP Impact

This design has the **largest manifest.json delta of any J design**. It is also
the one that most improves the security posture.

**web_accessible_resources (current):** 23+ JS files declared, with glob
patterns like `src/core/*.js` that auto-expose every future file in `src/core/`
(OBS-05, C-1).

**web_accessible_resources (after migration):**
```json
[{
  "resources": [
    "dist/lib/gifuct-js.min.js",
    "dist/gif-file-fetcher.js"
  ],
  "matches": ["http://*/*", "https://*/*", "file:///*"]
}]
```
Only 2 files remain web-accessible (plus `gif-file-fetcher.html` for the
iframe proxy). The attack surface shrinks dramatically. The wildcard glob
vulnerability (C-1) is eliminated entirely — there are no globs in the new WAR.

**CSP impact:** MV3 default CSP prohibits `eval` and inline scripts. esbuild
output is a static IIFE with no `eval` calls. No CSP changes are required.
Inline source maps are data URIs embedded as comments, not `<script>` tags;
they do not trigger CSP.

**chrome.runtime.getURL() calls:** Currently called for each of the 23+
injected files. After migration, `injector.js` is gone; `getURL()` is still
used for `gif-file-fetcher.html` and `gifuct-js.min.js`. All call sites must
be updated atomically with the WAR change (C-2).

**Atomicity requirement (C-2):** The WAR entry update, the `getURL()` call
updates, and the manifest `content_scripts` update must all land in the same
commit. A partial migration (some files still at `src/`, some at `dist/`) will
break the extension entirely.

---

## 7. AI-Navigability Impact

**Build step helps navigation:**
- 23 files in `web_accessible_resources` → 2 files. An agent reading
  `manifest.json` has a much simpler load model to understand.
- Static import graph is machine-readable. An agent can trace `import` chains
  to answer "what does gif-controller.js depend on?" without reading injector.js.
- No `window.VSC` namespace to track. Dependencies are explicit in code.
- esbuild errors at build time if an import is missing or circular — the agent
  gets a build failure instead of a silent runtime error.

**Build step hurts navigation:**
- There is now a `dist/` layer between source and runtime. An agent asked to
  debug a runtime crash must understand that `dist/content-bundle.js` was
  generated from `src/`. If the build is stale, the running code does not match
  the source — a class of confusion that does not exist today.
- The build step must be documented in CLAUDE.md and AGENTS.md: "after editing
  src/, run `npm run build:dev` before testing in Chrome."
- Source map paths in stack traces show `src/` file names, but the actual
  loaded file is `dist/content-bundle.js`. An agent that does not understand
  source maps may be confused about which file to edit.
- `scripts/build.mjs` is a new file an agent must understand before modifying
  the build output.

**Net assessment:** Marginally positive for experienced agents; potentially
confusing for naive agents that do not understand bundlers. Mitigated by good
CLAUDE.md documentation.

---

## 8. Migration Path

This migration is large. It cannot be executed in a single PR safely. Minimum
viable ticket breakdown (each ticket is independently reviewable and
reverifiable by `npm test` at the end):

| Ticket | Description | Risk | Precondition |
|--------|-------------|------|--------------|
| M1 | Write characterization tests for P2 (load order), P3 (double-load guard), P11 (VSC_SAVE_SETTINGS timing), P12 (postMessage timing). These tests must pass on master before migration begins. | LOW | None |
| M2 | Audit every `window.VSC` read/write in all 25 src files; produce a dependency matrix. Identify any circular dependencies that would block bundling. | LOW | None |
| M3 | Add esbuild to devDependencies; write `scripts/build.mjs`; verify it produces a valid bundle from current files (even without removing window.VSC — just bundle as-is). CI smoke-test. | LOW | None |
| M4 | Convert `src/utils/*.js` and `src/core/constants.js` to ES export. These have no window.VSC reads (they are leaf dependencies). Update any importers. | MEDIUM | M1, M2 |
| M5 | Convert `src/core/*.js` (settings, storage-manager, action-handler, video-controller, gif-frame-engine, gif-controller) to ES export/import. This is the highest-value and highest-risk step. | HIGH | M4 |
| M6 | Convert `src/observers/*.js` and `src/site-handlers/*.js`. | MEDIUM | M5 |
| M7 | Convert `src/ui/*.js`. | MEDIUM | M5 |
| M8 | Write `src/content/main.js` as bundle entry point; retire `src/content/injector.js`; verify bundle loads correctly in real Chrome. | HIGH | M4-M7 |
| M9 | Update `manifest.json`: `content_scripts`, `web_accessible_resources`, `background`. Update all `getURL()` calls atomically (C-2). | HIGH | M8 |
| M10 | Delete `src/module-loader.js` (confirmed dead code, OBS-09). | LOW | M9 |
| M11 | Update CLAUDE.md, AGENTS.md, all module cards to reflect new structure. | LOW | M9 |

**Total: 11 tickets. Riskiest steps: M5, M8, M9.**

The riskiest single action is M9 (atomic manifest + WAR + getURL update). If
any of the three parts is incomplete, the extension silently fails to load or
GIF fetching breaks entirely.

---

## 9. Cost and Reversibility

**This is the least reversible design in the J-series.**

Reversibility assessment:
- To revert after M9 (manifest update), all 23 `web_accessible_resources`
  entries must be restored, the content script must go back to injector.js,
  and all `window.VSC` registrations must be re-added to every converted file.
  This is effectively re-doing the migration in reverse — equivalent effort.
- To revert after M4-M7 (conversions) but before M9, revert is a large git
  reset. The characterization tests (M1) still pass on master, so the revert
  baseline is known. Feasible but painful.
- To revert before M4 (after only M1-M3), revert is trivial: remove esbuild
  from devDependencies and delete `scripts/build.mjs`.

**Cost estimate:**
- M1-M3: ~1-2 days (infra + tests)
- M4-M7: ~2-3 days (mechanical but requires care)
- M8-M9: ~1-2 days (integration + real-Chrome testing)
- M10-M11: ~0.5 days
- Total: **4-8 days** of focused engineering (not AI-agent time)

**Ongoing cost:**
- Every developer must run `npm run build:dev` after editing `src/`. Without
  it, Chrome runs stale code. This is a common source of confusion in bundled
  extension workflows. Watch mode (`esbuild --watch`) mitigates this for active
  development.
- Source map staleness: if `dist/` is committed (not git-ignored) and `src/`
  changes without a rebuild, the committed bundle is stale. Recommendation:
  commit `src/` only; `.gitignore` `dist/`; CI builds from source.

---

## 10. Scorecard

Weights are frozen per charter §3.

| Criterion | Weight | Score (0-10) | Weighted |
|-----------|--------|-------------|---------|
| AI localization efficiency | 25 | 7 | 175 |
| Change locality for common change types | 20 | 8 | 160 |
| Enforceability by tests/checks | 15 | 9 | 135 |
| Migration cost and reversibility | 15 | 2 | 30 |
| Human legibility | 10 | 7 | 70 |
| Fit with MV3 runtime and package hygiene | 10 | 9 | 90 |
| Tool portability | 5 | 6 | 30 |
| **Total** | **100** | | **690** |

**Regression safety gate:** CONDITIONAL PASS. The design itself does not
violate ZERO-DIFF — no migration is executed on this branch. As a migration
plan, it requires M1 (characterization tests) before any runtime change. If
executed without M1, it FAILS the hard constraint. **Flag**: M5, M8, M9 each
touch protected-behavior surface. They must be individually gated by the M1
tests passing.

**Score notes:**
- AI localization (7/10): Static import graph is a navigation win; build layer
  is a confusion source. Net moderate positive.
- Change locality (8/10): Adding a new module is one file + one import line.
  Today it is one file + injector.js edit + manifest.json edit + WAR entry.
  Significant improvement.
- Enforceability (9/10): Build-time import resolution is stronger enforcement
  than runtime injection order. Static analysis tools work on ES modules.
- Migration cost (2/10): Honest assessment. This is the most expensive and
  least reversible design. The score reflects that.
- MV3 fit (9/10): Single content script, minimal WAR, no eval, no dynamic
  injection — this is the architecturally cleanest MV3 approach.

---

## 11. Risks and Gaps

This section is written with deliberate honesty. J4 is the riskiest design.

### Failure Modes

**F1: Silent regression in iframe double-load scenario (P3)**
The `window.VSC` double-load guard exists because injector.js can run twice
in some iframe configurations. The bundled IIFE has no equivalent guard. If
the content script is injected twice (e.g., by Chrome in a complex iframe
tree), the IIFE runs twice, and all event listeners, observers, and
controllers are registered twice. This produces duplicate GIF controllers,
duplicate playback speed changes, and potential memory leaks. Mitigated by M1
characterization test; but the real-Chrome iframe scenario may not be testable
in JSDOM. **This is the highest-probability silent regression.**

**F2: Module initialization order assumption breaks (P2)**
If any module has a side effect that assumes another class is already on
`window.VSC` at initialization time (not at call time), the static import
order may not reproduce the same initialization sequence. esbuild resolves
modules in import-declaration order, but circular dependencies can produce
undefined references at initialization time. The M2 audit is mandatory before
M4. Circular dependencies, if found, require architectural changes beyond
mechanical conversion.

**F3: gifuct-js.min.js timing gap**
`gifuct-js.min.js` sets `window.__VSC_gifuct` synchronously when loaded. The
bundle's `gif-controller.js` reads it. If the bundle loads before
`gifuct-js.min.js` (load order in manifest), `window.__VSC_gifuct` is
undefined at the time `GifController` class body is parsed. Today, injector.js
loads gifuct before gif-controller explicitly. In the manifest-based approach,
load order is the `content_scripts.js` array order. The manifest must list
`dist/lib/gifuct-js.min.js` before `dist/content-bundle.js`, OR
`gif-controller.js` must lazy-read `window.__VSC_gifuct` (checked at call
time, not at import time). Architectural decision required.

**F4: WAR atomic update failure**
M9 requires updating `manifest.json`, all `getURL()` calls, and the WAR list
atomically. If a developer applies only a partial update (e.g., updates
manifest but misses a `getURL()` call for `gif-file-fetcher.html`), the GIF
iframe proxy breaks with no error in the content script. This is a hard-to-
diagnose failure. Mitigated by a `check:structure` script that validates all
`getURL()` call sites against the WAR list.

**F5: Source map exposes proprietary logic**
If this extension ever contains logic the maintainer considers proprietary,
inline source maps in a published extension expose it. For an MIT-licensed
open-source extension this is not a concern. Noted for completeness.

**F6: Build staleness in contributor workflow**
Contributors who edit `src/` and test by reloading the Chrome extension
without rebuilding will see stale behavior. This is a common point of
confusion. Mitigated by watch mode documentation and an optional CI step that
verifies the committed `dist/` matches the source (if `dist/` is committed).

### When NOT to Recommend This Design

Recommend against J4 if:
- The team has fewer than 4 days of focused engineering time before the next
  release. The migration is not safe to rush.
- The M1 characterization tests (P2, P3 in particular) cannot be expressed in
  JSDOM and there is no real-Chrome automated testing infrastructure. Without
  regression coverage, M5-M9 are too risky to execute.
- Any of the 25 modules has a circular dependency discovered in M2. Circular
  dependency resolution requires architectural decisions beyond mechanical
  conversion, and should be treated as a separate initiative.
- The maintainer prioritizes zero-build-step contributor experience over module
  architecture cleanliness. The current no-bundler approach is already MV3-
  compliant and debuggable. J4's benefits are architectural, not functional.

### Comparison with Status Quo

The current architecture (no bundler, `window.VSC`) is not broken. It
correctly implements all 14 protected behaviors. Its costs are:
- 23 web-accessible files (larger attack surface)
- Runtime load-order contract that is fragile and hard to verify statically
- `window.VSC` global namespace that any page script on an injected site can
  read (information disclosure, not an exploitable vulnerability)
- Difficult static analysis (no imports to trace)

J4 eliminates all four costs at the price of migration effort and build step
overhead. Whether that trade is worthwhile is a product/engineering judgment
call, not a technical constraint.

---

## Summary

J4 proposes an esbuild-based build step that compiles `src/` ES modules to a
single `dist/content-bundle.js`. The `window.VSC` global namespace is replaced
by native ES module scope. Source maps (inline for dev, absent for prod) cause
DevTools to show original `src/` file names in stack traces and the Sources
panel, directly resolving ADR-0001's debuggability concern.

ADR-0001 resolution: The no-bundler preference was an engineering choice. With
inline source maps, a developer can click any stack frame and see the original
source file — the stated debuggability concern is fully satisfied. The MV3
constraint (scope sharing across dynamically injected scripts) is dissolved
entirely because the bundled approach uses a single injected script, not
dynamic injection.

Migration scope: 11 tickets, 4-8 days of engineering. 25 src/ files converted
to ES export/import. manifest.json updated in one atomic commit (M9). Least
reversible design in the J-series. Requires M1 characterization tests as a
hard precondition before any runtime changes.

Self-score: 690/1000. Strong on enforceability, MV3 hygiene, and change
locality. Weak on migration cost and reversibility. Regression safety is
conditional on M1 tests being written and passing before M4-M9 execute.
