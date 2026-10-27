---
team: J5 Packages Designer
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
lens: Testability and isolation of highest-churn code
confidence: high
---

# J5 — GIF Engine as Standalone Package

## Design Summary

Extract `gif-controller.js`, `gif-frame-engine.js`, `gif-observer.js`, and
`src/lib/gifuct-js.min.js` into an independently versioned npm package
(`@videospeed/gif-engine`) inside a Yarn/npm workspace monorepo. The extension
shell (`packages/extension`) depends on the package at a pinned semver. The GIF
engine retains a `window.VSC`-compatible registration shim so the page-world
IPC contract (C-13) is not violated during the migration phase.

This design is a **migration-scope plan only**. No files under `src/**` are
touched in the additive scaffold phase (R-09, Charter §3). Every item below is
either a design document or a migration ticket.

---

## 1. Hypotheses

**H1 (falsifiable):** Unit tests for `gif-controller.js` written against the
standalone package will catch at least 50 % more of the protected behaviors
(P4 disposal logic, P5 sentinel, P6 _patchCanvas compositing, P7 bgColor
pre-fill) than the current JSDOM-based tests can, because the package can be
imported directly into Node without page-world script injection.

_Falsification condition_: If the frame compositing logic (P6) requires a real
Canvas 2D context that JSDOM does not implement, then Node+`canvas` npm package
must be added; if that is unavailable in the test environment this hypothesis
is partially false and the tests revert to mocks.

**H2 (falsifiable):** Pinning the extension to `@videospeed/gif-engine@^1.0.0`
allows GIF-only bug fixes to be released without re-submitting the extension
to the Chrome Web Store, because the extension package.json bump triggers only
a package publish, not an extension manifest change.

_Falsification condition_: If Chrome Web Store policy requires a new submission
for any file change inside the extension zip (even a `node_modules` dependency
update that is bundled), then independent versioning provides zero store-submission
benefit; only developer-experience and test-isolation benefits remain.

**H3 (falsifiable):** Isolating `gif-controller.js` into a package with a
clean ES-module public API (no `window.VSC` dependency inside the package's
logic) reduces the time for a cold agent to localize a GIF rendering bug
(D3: `disposal=3` renders wrongly) by at least 30 %, because the agent can
navigate to `packages/gif-engine/src/` directly rather than scanning all 32
`src/` files.

_Falsification condition_: Measured by the cold-start trial (D rubric, D3
task). If trial results show no statistically significant improvement, H3 is
false.

---

## 2. Package Structure Proposal

### Layout

```
videospeed/                          ← repo root (monorepo)
  package.json                       ← workspace root (workspaces: ["packages/*"])
  packages/
    gif-engine/                      ← NEW: @videospeed/gif-engine
      package.json                   ← name, version, exports, peerDependencies
      src/
        gif-controller.js            ← moved from src/core/ (migration ticket)
        gif-frame-engine.js          ← moved from src/core/ (migration ticket)
        gif-observer.js              ← moved from src/observers/ (migration ticket)
        lib/
          gifuct-js.min.js           ← COPY (not symlink); original stays in
      |                                src/lib/ untouched (C-11, ZERO-DIFF)
      tests/
        unit/
          gif-controller.test.js     ← own test suite, imported directly (no injection)
          gif-frame-engine.test.js
          gif-observer.test.js
        integration/
          gif-integration.test.js
      index.js                       ← public API barrel (ES module)
    extension/                       ← rename of current root's src/ tree (migration ticket)
      src/
        ...                          ← all non-GIF src files remain here
        content/injector.js          ← updated to load from package bundle (migration ticket)
      package.json                   ← depends on @videospeed/gif-engine@^1.0.0
      manifest.json                  ← WAR entries updated atomically (C-2, migration ticket)
```

### Monorepo tooling choice

**Recommendation: npm workspaces** (already using npm; no new toolchain).

```json
// videospeed/package.json (root)
{
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "npm run test --workspaces",
    "check:lint": "eslint packages/gif-engine/src packages/extension/src",
    "check:format": "prettier --check packages/gif-engine/src packages/extension/src"
  }
}
```

**Alternative: Yarn Berry** — rejected. Introduces PnP, `.pnp.cjs`, and
Plug'n'Play resolution that conflicts with the existing custom Node+JSDOM test
runner (C-17). npm workspaces are a strict superset of the current layout and
require no runner changes.

### gifuct-js placement

`src/lib/gifuct-js.min.js` is **never moved or modified** (C-11, ZERO-DIFF).
During migration, `packages/gif-engine/src/lib/gifuct-js.min.js` is a
**file-copy** created by a one-time migration script. The copy is NOT on the
scaffold branch. The original at `src/lib/gifuct-js.min.js` remains
byte-identical to master for all time.

---

## 3. Interface Between gif-engine and Extension

### 3.1 Public API of gif-engine (`packages/gif-engine/index.js`)

```js
// packages/gif-engine/index.js  (migration-phase design; not created now)
export { GifController } from './src/gif-controller.js';
export { GifFrameEngine, GifFrameCache } from './src/gif-frame-engine.js';
export { GifObserver, gifFetchFailCache } from './src/gif-observer.js';
```

The public surface is intentionally minimal:

| Export | Used by extension for |
|---|---|
| `GifController` | `create()`, `setSpeed()`, `pause()`, `resume()`, `remove()` |
| `GifFrameEngine` | `effectiveDelay(rawDelayMs, speed)` |
| `GifFrameCache` | `tryAllocate()`, `releaseAllocation()` (called by inject.js) |
| `GifObserver` | `isGifSrc()`, `isGifElement()`, `detectGifsInDOM()` |
| `gifFetchFailCache` | shared Map for origin-level failure caching |

### 3.2 window.VSC registration — two-phase migration

**Phase 1 (migration shim — initial package release):** The package is built
with a registration shim that reproduces the current `window.VSC` assignments
so the extension's injector.js load order and all existing page-world code
continue to work unchanged:

```js
// packages/gif-engine/src/gif-controller.js  (phase 1 shim header)
window.VSC = window.VSC || {};
if (!window.VSC.GifController) {
  // ... class definition ...
  window.VSC.GifController = GifController;
}
export { GifController };     // also available as ES module export
```

This means the extension can consume the package in two ways simultaneously:
- **Script injection** (current): injector.js still injects the bundled file
  via `injectScript()`; `window.VSC.GifController` is registered exactly as
  today (C-13 preserved).
- **Direct import** (test suite): test files use `import { GifController }
  from '@videospeed/gif-engine'` without JSDOM or script injection — this is
  the primary testability gain.

**Phase 2 (future — out of scope for this program):** Remove the `window.VSC`
shim from the package and have the extension shell register the classes after
importing them. Requires updating inject.js (runtime code move, migration
ticket only).

### 3.3 How the extension passes gifuct to the engine

`window.__VSC_gifuct` is set by `src/lib/gifuct-js.min.js` when injected as a
script tag by injector.js. The GIF engine reads `window.__VSC_gifuct` at
runtime — this interface is not changed in Phase 1.

In the standalone test suite, `window.__VSC_gifuct` is injected via the test
helper (`tests/helpers/module-loader.js`) by evaluating the vendored copy that
was file-copied into `packages/gif-engine/src/lib/`. This is the same pattern
as the current `loadGifModules()` helper.

**C-11 compliance**: The original `src/lib/gifuct-js.min.js` is never touched.
The copy in `packages/gif-engine/src/lib/` is excluded from the scaffold-phase
ZERO-DIFF check because it only exists after the migration ticket is executed.

### 3.4 Events / callbacks bridging the two

The GIF engine fires and listens to three DOM events that the extension shell
must continue to handle:

| Event | Direction | Handler location |
|---|---|---|
| `VSC_FETCH_GIF_BYTES` | engine -> content script | `injector.js` `setupFileGifFetcherProxy()` |
| `VSC_GIF_BYTES_RESPONSE` | iframe -> engine | `window.addEventListener('message')` in `gif-controller.js` |
| `VSC_CONTROLLER_CREATED` / `VSC_CONTROLLER_REMOVED` | engine -> content script | `injector.js` lifecycle listeners |

These event contracts are not changed in Phase 1. They are documented in
`docs/ai_generated/adr/ADR-0002-gif-file-fetcher-bridge.md` (migration ticket
for L3 to draft).

---

## 4. What Moves and What Stays (Plan Only)

### Moves (migration tickets — not executed in this program)

| File | From | To | Notes |
|---|---|---|---|
| `gif-controller.js` | `src/core/` | `packages/gif-engine/src/` | 805 LOC; add ES module exports |
| `gif-frame-engine.js` | `src/core/` | `packages/gif-engine/src/` | ~200 LOC |
| `gif-observer.js` | `src/observers/` | `packages/gif-engine/src/` | 57 LOC |
| `gifuct-js.min.js` | `src/lib/` (copy source) | `packages/gif-engine/src/lib/` (copy dest) | C-11: original stays |

### Stays permanently (never moved)

| File | Reason |
|---|---|
| `src/lib/gifuct-js.min.js` | C-11 — untouchable, ZERO-DIFF |
| `src/content/injector.js` | C-12 — injection order contract |
| `src/utils/constants.js` | GIF constants live here; shared with non-GIF code |
| `src/gif-file-fetcher.js` + `.html` | C-7 — must stay at chrome-extension:// origin |
| All non-GIF `src/**` files | R-09 — additive scaffold only |

### Dependency on constants

`gif-controller.js` and `gif-observer.js` reference `window.VSC.Constants`
(GIF_GLOBAL_MEMORY_BUDGET_BYTES, GIF_FRAME_CACHE_LIMIT_BYTES, GIF_MIN_SIZE_PX,
SPEED_LIMITS). In Phase 1 the package reads these from `window.VSC.Constants`
at runtime (injected before the GIF modules per injector.js load order).
In Phase 2, the constants needed by the engine are extracted into a
`packages/gif-engine/src/gif-constants.js` file and the extension imports
defaults from there.

---

## 5. Protected Behavior Impact

| PB ID | Description | J5 Impact |
|---|---|---|
| P1 | `window.VSC` namespace | Phase 1 shim preserves registration exactly. No impact. |
| P2 | Injection load order | Not changed. `injector.js` load order is migration-phase detail (C-12). |
| P3 | `vscGifIgnore` + `_vscTeardownSrc` flags | Logic stays in `gif-controller.js`; code is not modified (C-14). |
| P4 | `loopCount=null` defaults to 0 (infinite) | In package, same logic. Gain: this can now be unit-tested without injection. |
| P5 | Sentinel pattern `{pending:true,_cancelled:false}` | C-15: not modified. Package design does not touch this. |
| **P6** | `_patchCanvas` / `drawImage()` compositing | C-16: not modified. Primary test-isolation gain: can write unit tests against this in Node+canvas without JSDOM injection limitations. |
| P7 | Pixel-level color rendering (bgColor pre-fill) | Still requires real Canvas 2D (JSDOM has limited Canvas 2D). Documented "untestable in JSDOM: reason". Node `canvas` package can test this in the standalone suite. |
| P8 | Memory budget enforcement via `GifFrameCache` | Directly testable in standalone package (pure arithmetic, no DOM). |
| **P9** | `gifuct-js.min.js` untouchable | The original is never touched. Copy to package is a migration-phase act, not scaffold. Explicit ZERO-DIFF compliance. |
| P10 | `disposal=2` restore to background | Testable standalone. |
| P11 | `disposal=3` save/restore pixels | Testable standalone. |
| P12 | `effectiveDelay` 10ms floor | Already tested in `gif-frame-engine.test.js`; coverage unchanged. |
| P13 | Visibility/intersection pause | Requires DOM; documented as "integration test only". |
| P14 | file:// GIF bridge via iframe | Lives in `injector.js`; not moved. Extension-side test only. |

**Key insight for P9**: The constraint is that `src/lib/gifuct-js.min.js` must
not appear in any diff on the scaffold branch. This design respects that fully.
The copy in `packages/gif-engine/src/lib/` only exists after a separately
approved migration commit, which is tracked as a migration ticket.

---

## 6. Permission / WAR / CSP Impact

### Current WAR entries (from C-1 / C-2 context)

```json
"web_accessible_resources": [
  { "resources": ["src/core/*.js", "src/lib/*.js", "src/observers/*.js", ...], ... }
]
```

### Phase 1 (no change — migration ticket only)

The injector.js in Phase 1 still loads modules from their original `src/`
paths. No WAR changes are needed in Phase 1. The `packages/gif-engine/` tree
is not injected and not web-accessible.

### Phase 2 (migration ticket, not scaffold)

When the extension bundles `@videospeed/gif-engine` into a `dist/` output:
- WAR entries must be updated atomically with the `chrome.runtime.getURL()`
  call changes (C-2).
- If bundled into `dist/gif-engine.js`, only that one path needs a WAR entry
  instead of the three individual source files.
- Source maps must NOT be placed in WAR (C-2: they expose implementation
  details).

### CSP impact

`gif-file-fetcher.html` runs at `chrome-extension://` origin and must stay at
its current path (C-7). The package extraction does not change its URL.

No new `eval` or `innerHTML` is introduced (C-9). The package barrel
`index.js` is a pure re-export.

---

## 7. AI-Navigability Impact (D1–D12)

| Task | Current | With J5 | Delta |
|---|---|---|---|
| D3: disposal=3 renders wrongly | Agent must scan all 32 src/ files, find gif-controller.js | Agent navigates directly to `packages/gif-engine/src/gif-controller.js`; package README names PBs P4, P10, P11 | +++ |
| D4: Change GIF memory budgets | Scattered: constants.js + gif-frame-engine.js + gif-controller.js | `packages/gif-engine/` contains all affected logic in one directory | ++ |
| D8: Replace gifuct decoder | Agent must understand window.__VSC_gifuct, C-11, WAR entries | Package README explicitly documents the decoder interface and C-11 constraint | ++ |
| D9: file:// GIF fetch path | Split across gif-controller.js + injector.js | gif-controller.js side is in package; injector.js side is in extension; boundary is documented in ADR | + |
| D1: Add site handler | No change — site handlers are not in the GIF engine | Neutral | 0 |
| D2: Add action | No change | Neutral | 0 |
| D5: Controller not on a site | No change — involves media-observer, not GIF | Neutral | 0 |
| D6: PiP hotkey | No change | Neutral | 0 |
| D7: Persisted setting | No change | Neutral | 0 |
| D10: Release package | Adds monorepo release step: `npm publish --workspace packages/gif-engine` | Slightly more complex for release runbook | - |
| D11: Firefox support | Package design is browser-agnostic; reduces Firefox porting scope | + |
| D12: Refactor mutation-observer.js | Not in GIF engine; no change | Neutral | 0 |

**Net navigability gain**: Positive for GIF-related tasks (D3, D4, D8, D9).
Neutral for non-GIF tasks. Slight negative for D10 (release complexity).

---

## 8. Migration Path

### Highest-effort design concerns

**Concern 1: Build step for extension to consume the package.**

This is the critical J4 dependency (see section 11). If the extension uses
`injectScript()` to load individual files from `src/core/`, and the GIF engine
is now in `packages/gif-engine/src/`, the injector must either:
- (a) Load from `node_modules/@videospeed/gif-engine/src/` — requires WAR
  entries pointing into node_modules, which is fragile and non-standard; or
- (b) Bundle the package into a `dist/gif-engine.bundle.js` via a build step
  (Rollup/esbuild) and load that from WAR.

Option (b) **requires a build step**, which is what J4 (build pipeline) designs.
**J5 is contingently dependent on J4** for the Phase 2 extension integration
(see section 11). Phase 1 is independent of J4.

**Concern 2: Monorepo tooling cost.**

Setting up npm workspaces requires:
1. Adding `"workspaces": ["packages/*"]` to root `package.json`.
2. Creating `packages/gif-engine/package.json` and `packages/extension/package.json`.
3. Running `npm install` to create the workspace symlinks.

Estimated effort: 2–4 hours for a developer familiar with npm workspaces.

**Concern 3: Test runner migration.**

The current test runner (`tests/run-tests.js`) uses a custom Node+JSDOM setup
with `loadGifModules()` helper that injects script tags. The standalone package
tests bypass this entirely — they use direct ESM imports. This means the
standalone package gets a **simpler, faster test suite** (no JSDOM injection),
while the extension's tests continue to use the existing runner. Two test
environments must be maintained in Phase 2.

### Step-by-step migration (tickets only)

1. **TICKET-J5-01**: Set up npm workspaces root; create `packages/gif-engine/`
   directory with `package.json`, empty `src/` and `tests/` directories.
2. **TICKET-J5-02**: Copy (not move) GIF source files to `packages/gif-engine/src/`.
   Add ES module exports (shim header). All existing `src/` files remain.
3. **TICKET-J5-03**: Write standalone unit tests in `packages/gif-engine/tests/`.
   Verify they pass with `npm test --workspace packages/gif-engine`.
4. **TICKET-J5-04**: (Depends on J4) Bundle package into `dist/gif-engine.bundle.js`.
   Update `injector.js` to load bundle. Update WAR entries atomically.
5. **TICKET-J5-05**: Remove original `src/core/gif-controller.js`,
   `src/core/gif-frame-engine.js`, `src/observers/gif-observer.js` (not
   `src/lib/gifuct-js.min.js` — never removed, C-11).

---

## 9. Cost and Reversibility

### Cost assessment

| Item | Effort | Risk |
|---|---|---|
| npm workspaces setup | Low (2–4 h) | Low |
| File copy + shim headers | Medium (4–8 h) | Medium (must not alter behavior) |
| Standalone test suite | Medium (8–16 h) | Low |
| Build step integration (J4-dependent) | High (16–40 h) | High |
| WAR + injector update (Phase 2) | Medium (4–8 h) | High (security regression risk C-2) |
| **Total Phase 1** | **14–28 h** | Medium |
| **Total Phase 2** | **34–76 h** | High |

### Reversibility

**This is the critical reversibility risk for J5.**

Introducing packages is hard to reverse once Phase 2 is executed (files removed
from `src/`, WAR entries changed, build step mandatory). Once the extension
depends on the bundled output, any developer who doesn't understand the monorepo
structure will break the extension by editing the wrong copy of a file.

Phase 1 (file copy + exports shim, original files still in `src/`) is **fully
reversible** by deleting `packages/gif-engine/`. Phase 2 is **not reversible
without a significant rewrite** of injector.js and manifest.json.

**Recommendation**: Commit to Phase 1 only if the standalone test suite
demonstrates measurable coverage improvement over the current JSDOM tests
(validates H1). Gate Phase 2 on H2 and H3 being confirmed by cold-start trials.

---

## 10. Scorecard (frozen weights)

| Criterion | Weight | Score (1–5) | Weighted | Rationale |
|---|---|---|---|---|
| AI localization efficiency | 25 | 4 | 100 | D3/D4/D8 gain is substantial; GIF subsystem has a dedicated directory |
| Change locality for common change types | 20 | 4 | 80 | GIF bug fixes touch one package; non-GIF changes are unaffected |
| Enforceability by tests/checks | 15 | 4 | 60 | Standalone tests bypass JSDOM limits for P4/P6/P8/P10/P11; P7 still partial |
| Migration cost and reversibility | 15 | 2 | 30 | Phase 2 is high-cost and non-reversible; Phase 1 is fine but J4 dependency makes full value contingent |
| Human legibility | 10 | 3 | 30 | Monorepo is familiar to JS developers but adds workspace indirection |
| Fit with MV3 runtime and package hygiene | 10 | 3 | 30 | Phase 1 fits well; Phase 2 requires careful WAR/CSP audit |
| Tool portability | 5 | 4 | 20 | npm workspaces are universally supported; no exotic tooling |
| **Total** | **100** | — | **350 / 500** | |

**Regression safety (hard constraint):** PASS in Phase 1 (no `src/**` changes).
CONDITIONAL in Phase 2 (requires atomic WAR update per C-2; must pass
`npm test` baseline 133/133 after migration).

**Normalized score: 70 / 100**

---

## 11. Risks and Gaps

### CRITICAL RISK: J4 Dependency

**The full value of J5 (Phase 2) cannot be realized without a build step.**

The extension currently uses `injectScript()` to load individual source files
from `src/` paths listed in the WAR. If the GIF engine moves to
`packages/gif-engine/`, the extension has no way to load it as individual
scripts without:
1. Pointing WAR entries at `node_modules/` (non-standard, fragile, rejected);
   or
2. Bundling the package into a single `dist/` file (requires J4's build
   pipeline).

**If J4 is not adopted, J5 Phase 2 cannot be executed.** Phase 1 (standalone
package with its own test suite, original files remain in `src/`) is
**independent of J4** and delivers the testability gain (H1) without the
extension restructuring.

**Assessment**: J5 should be evaluated as two separable deliverables:
- J5-Phase-1 (J4-independent): standalone package + test suite. Score: 72/100.
- J5-Phase-2 (J4-dependent): extension depends on bundled package. Score:
  conditional on J4 adoption.

### RISK: window.VSC shim complexity

In Phase 1 the package registers on `window.VSC` AND exports as ES modules.
This dual-registration pattern creates two sources of truth for the class
definition. Any future cold agent who reads `packages/gif-engine/src/gif-controller.js`
must understand both the ES module export and the `window.VSC` shim or they
will be confused by the apparent duplication. This must be documented in the
package README (TICKET-J5-01 scope).

### RISK: constants coupling

`gif-observer.js` references `window.VSC.Constants.GIF_MIN_SIZE_PX`. This
constant lives in `src/utils/constants.js`, which is NOT in the GIF engine
package. The standalone package cannot run without `window.VSC.Constants` being
pre-populated. In the standalone test suite, a `constants` fixture must be
injected. This is solvable but is a hidden coupling that must be documented
and tracked (TICKET-J5-02 scope).

### RISK: gifuct copy drift

If `src/lib/gifuct-js.min.js` is ever updated (vendor upgrade), the copy in
`packages/gif-engine/src/lib/` will silently fall behind. A `check:structure`
script addition (R-04) should include a hash comparison between the two files
to detect drift. This is a TICKET-J5-01 scope addition.

### GAP: gif-file-fetcher.js not in package

`src/gif-file-fetcher.js` (the iframe fetch proxy) is not part of the GIF
engine package. It runs at `chrome-extension://` origin and is tightly coupled
to the content script world (C-7). It must remain in the extension. Cold agents
working on D9 (file:// GIF fetch path) must understand the engine/extension
split. The ADR for the file:// bridge (referenced in section 3.4) is the
correct place to document this boundary.

### GAP: No independent versioning strategy defined

H2 assumes the package can be independently versioned. But the GIF engine reads
`window.VSC.Constants` values (memory budgets, speed limits) that are set by
the extension. If a package version requires a new constant, both the package
and the extension must be updated together — defeating independent versioning
for those changes. A formal semver contract for the `window.VSC.Constants`
interface is needed before Phase 2. This is out of scope for the current
program.
