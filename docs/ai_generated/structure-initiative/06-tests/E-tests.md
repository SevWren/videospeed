---
team: E
role: Test & Verification Architecture
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: COMPLETE
vocab: CONTEXT.md domain terms; seam, module, interface, depth, adapter
---

# E-tests.md — Test & Verification Architecture

## E1: Coverage Table

### Test Files — LOC and Covered src Module

| Test File | LOC | Layer | src Module(s) Covered |
|---|---|---|---|
| unit/core/settings.test.js | 98 | unit | src/core/settings.js |
| unit/core/action-handler.test.js | 359 | unit | src/core/action-handler.js |
| unit/core/action-handler-gif.test.js | 51 | unit | src/core/action-handler.js (GIF path) |
| unit/core/video-controller.test.js | 178 | unit | src/core/video-controller.js |
| unit/core/icon-integration.test.js | 225 | unit | src/background.js (icon logic via action-handler) |
| unit/core/keyboard-shortcuts-saving.test.js | 203 | unit | src/core/settings.js, storage-manager.js |
| unit/core/f-keys.test.js | 187 | unit | src/core/action-handler.js (F-key bindings) |
| unit/core/gif-frame-engine.test.js | 92 | unit | src/core/gif-frame-engine.js |
| unit/core/gif-controller.test.js | 185 | unit | src/core/gif-controller.js |
| unit/observers/mutation-observer.test.js | 225 | unit | src/observers/mutation-observer.js |
| unit/observers/audio-size-handling.test.js | 232 | unit | src/observers/media-observer.js (partial) |
| unit/observers/gif-observer.test.js | 101 | unit | src/observers/gif-observer.js |
| unit/content/inject.test.js | 207 | unit | src/content/inject.js |
| unit/utils/blacklist-regex.test.js | 130 | unit | src/utils/constants.js (blacklist patterns) |
| unit/utils/recursive-shadow-dom.test.js | 323 | unit | src/utils/dom-utils.js |
| integration/module-integration.test.js | 161 | integration | src/module-loader.js, cross-module wiring |
| integration/gif-integration.test.js | 100 | integration | src/core/gif-controller.js, gif-frame-engine.js, gif-observer.js |

**OBSERVED:** No test file exists at `tests/unit/` or `tests/integration/` that covers any of the following src modules:

| src Module | Coverage |
|---|---|
| src/background.js | NO (INFERRED: icon-integration.test.js exercises the action-handler badge path but not the service worker message loop itself) |
| src/content/injector.js | NO |
| src/gif-file-fetcher.js | NO (the iframe-proxy page script has zero unit coverage; bridge protocol tested only indirectly via gif-controller.test.js `_fetchGifBytes` tests) |
| src/module-loader.js | PARTIAL (module-integration.test.js checks globals land correctly; sequence enforcement not tested) |
| src/ui/controls.js | NO |
| src/ui/drag-handler.js | NO |
| src/ui/shadow-dom.js | NO |
| src/ui/popup/popup.js | NO |
| src/ui/options/options.js | NO |
| src/utils/debug-helper.js | NO |
| src/utils/logger.js | NO (imported by loadCoreModules but no assertions against its behavior) |
| src/utils/event-manager.js | NO (imported by loadCoreModules but no direct assertions) |
| src/core/storage-manager.js | PARTIAL (chrome-mock stubs its seam; no direct unit tests for error paths or quota behavior) |
| src/observers/media-observer.js | PARTIAL (audio-size-handling.test.js covers one edge case) |
| src/site-handlers/*.js | NO (all five site-handler adapters: youtube, netflix, amazon, apple, facebook — zero dedicated test files) |

**Coverage ratio — OBSERVED:**
- Total src JS files (excluding lib/): 32
- Files with at least one test referencing them: ~13
- Files with zero test coverage: ~19
- **Approximate coverage: 41% of src files have some test coverage; 59% have none**

### Test Pyramid Distribution

| Layer | Files | LOC |
|---|---|---|
| unit | 15 | 2,796 |
| integration | 2 | 261 |
| e2e (Puppeteer) | 4 (basic, display-toggle, settings-injection, youtube) | 1,021 |

**INFERRED:** The suite is heavily unit-weighted. Integration coverage is thin (2 files, both GIF-domain). E2E tests exercise the real Chrome extension runtime and cover UI/injection behaviors that unit tests cannot reach, but they require Puppeteer and are not run by `npm test`.

---

## E2: Mock Fidelity Audit

### What chrome-mock.js Mocks

| Chrome API | Mocked? | Fidelity |
|---|---|---|
| chrome.storage.sync.get | YES | OBSERVED: async via `setTimeout(10ms)`. Returns full `mockStorage` object; does not enforce per-key defaults or quota. |
| chrome.storage.sync.set | YES | OBSERVED: persists to module-level `mockStorage` object. |
| chrome.storage.sync.remove | YES | OBSERVED |
| chrome.storage.sync.clear | YES | OBSERVED |
| chrome.storage.onChanged.addListener | YES (no-op stub) | OBSERVED: registered listeners are never fired — no test exercises change-notification paths |
| chrome.runtime.getURL | YES | Returns `chrome-extension://test-extension/<path>` |
| chrome.runtime.id | YES | Static string |
| chrome.runtime.onMessage.addListener | YES (no-op stub) | OBSERVED: listeners registered but never invoked; background service worker message loop is effectively untestable here |
| chrome.tabs.query | YES | Returns a single hardcoded YouTube tab |
| chrome.tabs.sendMessage | YES | No-op with empty callback |
| chrome.action.setIcon | YES | No-op |

### What Is NOT Mocked (real Chrome has these; JSDOM/Node does not)

| Missing Chrome API / Behavior | Impact |
|---|---|
| chrome.storage.local | UNVERIFIED: no src code uses it currently, but any future migration from sync→local would silently break |
| chrome.storage.sync quota enforcement (102,400 bytes total; 8,192 per item) | UNVERIFIED: mock never rejects over-quota writes; storage-manager error paths are untested |
| chrome.storage.onChanged firing on actual writes | OBSERVED: no-op listener means any reactive settings logic dependent on onChanged is never exercised |
| chrome.runtime.lastError | PARTIAL: mock does not set lastError; background.js reads it after setIcon — that error-recovery path is untested |
| chrome.scripting (MV3 executeScript) | NO mock; not used in src currently |
| chrome.webRequest / declarativeNetRequest | NO mock; not used in src currently |
| Real isolated world / content-script context separation | Cannot be simulated in JSDOM; `window.VSC` globals in tests are the same window as the "page" — no isolation boundary |
| chrome.runtime.connect / long-lived ports | NO mock |

### What JSDOM Does Not Support

| Missing JSDOM Feature | Impact on Tests |
|---|---|
| Real Canvas 2D context | OBSERVED: run-tests.js installs a stub `getContext` that no-ops all draw calls. Compositing correctness (P5 _patchCanvas, P7 disposal=2 fillRect) cannot be pixel-verified. |
| IntersectionObserver | OBSERVED: stub installed in run-tests.js; observe/unobserve/disconnect are no-ops. Real visibility-gating of GIF playback cannot be tested. |
| requestAnimationFrame with real timing | OBSERVED: manual `_drainRaf` queue installed. Real frame-timing behavior under CPU pressure is not testable. |
| Real Shadow DOM (attachShadow) | OBSERVED: run-tests.js installs a DIV-backed polyfill. CSS containment, slot projection, and `::part` selectors are not exercised. |
| Real isolated content-script world | INFERRED: `window.VSC` globals are shared between "page script" and "content script" in the same JSDOM window. Cross-world postMessage protocol (gif-file-fetcher bridge) is simulated, not real. |
| Video/Audio element playback | JSDOM creates the element but `.play()` is a no-op; `playbackRate` assignment does not actually change playback speed. |
| CSS loading / layout | INFERRED: `inject.css` and `shadow.css` are never loaded in JSDOM; style-dependent layout tests would fail. |

### What Can ONLY Be Tested with Real Chrome (Puppeteer e2e)

- Actual `playbackRate` effect on media playback
- Extension popup opening and rendering
- Content script injection sequence and timing
- `gif-file-fetcher.html` iframe running at `chrome-extension://` origin and successfully fetching `file://` GIFs
- `chrome.storage.onChanged` triggering settings re-read in the content script
- Shadow DOM rendering and CSS variables
- Drag behavior on the floating controller overlay
- Site-specific handlers activating on YouTube, Netflix, etc.
- Background service worker icon badge state changes

---

## E3: Protected Behavior Test Coverage

The HANDOFF.md §16 lists 10 gotchas (not 14 as referenced in the mission briefing). The 8 behavior IDs P1–P8 are mapped from those gotchas below.

| PB-ID | Behavior | Test Exists? | Test File | Gap Description |
|---|---|---|---|---|
| P1 | file:// iframe proxy: GIF bytes fetched via `gif-file-fetcher.html` at chrome-extension:// origin, NOT direct XHR | PARTIAL | unit/core/gif-controller.test.js | OBSERVED: `_fetchGifBytes` bridge protocol tested (success, blocked, timeout, empty, wrong requestId). The actual iframe creation in `injector.js` and the `gif-file-fetcher.js` page script are NOT tested — if the iframe is never injected or the `src/gif-file-fetcher.html` page removed, these tests still pass. |
| P2 | Module injection order: `window.VSC.*` globals must be loaded in sequence by `injector.js` | NO | — | OBSERVED: `module-loader.js` helper loads in order but no test asserts that out-of-order load fails or that globals are absent before their module fires. The seam between `injector.js` and `module-loader.js` ordering is entirely untested. |
| P3 | `vscGifIgnore` + `_vscTeardownSrc` interaction: re-attaches on src change after teardown | NO | — | OBSERVED: Zero grep hits for `vscGifIgnore` or `_vscTeardownSrc` in tests/. This two-property invariant that prevents double-attach while allowing re-attach on src change is entirely unverified. |
| P4 | Sentinel pattern: `img.gifController = { pending: true, _cancelled: false }` blocks double-attach and signals in-flight abort | NO | — | OBSERVED: Zero grep hits for `_cancelled` or `sentinel` in tests/. The race-condition guard during `GifController.create()` async window is untested. |
| P5 | `_patchCanvas` drawImage indirection: direct `putImageData` onto composite canvas causes black artifacts | PARTIAL | unit/core/gif-controller.test.js | INFERRED: Test verifies `_fetchGifBytes` behavior but does not assert that `_drawFrame` routes through `_patchCanvas`. Canvas calls are all no-ops in JSDOM. Pixel-correctness cannot be verified without real Canvas. |
| P6 | `loopCount = 0` means infinite: `gifuct` returns `null`/`undefined` when extension absent; must default to 0, not 1 | NO | — | OBSERVED: `module-loader.js` stub hardcodes `loopCount: 0` but no test asserts the guard `(parsed.loopCount == null) ? 0 : parsed.loopCount` or that a `null` response from the decoder defaults to infinite playback. |
| P7 | `disposal=2` must `fillRect` with `_bgColor`, NOT `clearRect` | NO | — | OBSERVED: `disposalType: 2` appears in the fixture data in module-loader.js, but no test asserts that `fillRect` is called (vs `clearRect`). Canvas is a no-op stub; the distinction is invisible to tests. |
| P8 | Mutation observer teardown: `GifController.remove()` disconnects the observer before GC | NO | — | OBSERVED: `mutation-observer.test.js` tests `VideoMutationObserver` construction and message routing but does not test that `.disconnect()` is called during teardown or that re-entrant `remove()` calls during async `create()` are safely handled. |

**Summary:**
- P1: PARTIAL (bridge protocol tested; iframe creation and gif-file-fetcher.js page script untested)
- P2, P3, P4, P6, P7, P8: NO test coverage
- P5: PARTIAL (structure exists; pixel correctness impossible in JSDOM)

---

## E4: Gate Quality Assessment

### Build Script Analysis

**OBSERVED** from `package.json`:
```
"build": "npm run lint:fix && npm run format && npm run test"
```

- `lint:fix` runs ESLint with `--fix` — this **mutates** source files before testing. A file that lints clean after auto-fix may differ from the committed version. This is a gate that modifies the artifact it is supposed to validate.
- `format` runs Prettier with `--write` — same concern: formatter mutates files.
- `npm test` (unit + integration via JSDOM) runs after mutation.

**There is no non-mutating gate.** No `check:` script exists (e.g., `lint` without `--fix`, `prettier --check`). The gate cannot be safely run in CI without risking unexpected commits.

### Missing Architecture Enforcement Tests

The following fitness-function tests are absent:

| Gap | Risk |
|---|---|
| No test asserts that `window.VSC` namespace only exports expected keys (namespace pollution guard) | INFERRED: A new module exporting to a conflicting key would not be caught |
| No test asserts module load order is deterministic (e.g., `GifController` unavailable before `gif-frame-engine` loads) | INFERRED: Reordering `injector.js` would silently break the extension |
| No test asserts that `src/gif-file-fetcher.js` is listed in `manifest.json` `web_accessible_resources` | VERIFIED: the file exists and is listed, but no test would catch if it were removed |
| No test asserts that `src/lib/gifuct-js.min.js` is web-accessible and present | Same as above |
| No `prettier --check` or `eslint` (non-fix) gate in CI mode | OBSERVED: `build` mutates; a pure lint-check script does not exist |
| No snapshot or size-budget test for the extension zip | INFERRED: unbounded asset growth would not be detected |

---

## E5: Determinism Audit

### Timing Primitives in Test Files

**OBSERVED** via grep (excluding `run-tests.js` and helpers):

```
tests/unit/core/gif-controller.test.js:70  setTimeout(() => { ... }, 0)   — bridge simulation
tests/unit/core/gif-controller.test.js:84  setTimeout(() => { ... }, 0)   — bridge simulation
tests/unit/core/gif-controller.test.js:96  setTimeout(() => { ... }, 0)   — bridge simulation
tests/unit/core/gif-controller.test.js:108 setTimeout(() => { ... }, 0)   — bridge simulation
tests/unit/core/gif-controller.test.js:123 setTimeout(() => { ... }, 0)   — bridge simulation
tests/unit/core/gif-controller.test.js:176 Date.now() + 60000              — cache TTL calculation
```

All `setTimeout(..., 0)` calls in `gif-controller.test.js` are structural: they simulate the async postMessage bridge. They do not introduce real timing dependencies because the bridge tests `await` the returned promise. These are **low risk**.

The single `Date.now()` use (line 176) computes an expected cache TTL and is not asserted against — the test only checks that `cache.has(null)` is false. **No timing risk.**

### Shared Global State Between Tests

**OBSERVED:**

- `chrome-mock.js` exports a module-level `mockStorage` object. Calls to `chromeMock.storage.sync.set()` mutate this shared object. If tests run in the same Node process with ES module caching (they do — the runner uses `import()`), a test that calls `set()` **will pollute subsequent tests unless `resetMockStorage()` is called in `afterEach`.**
  - INFERRED: Tests that use `installChromeMock` + `cleanupChromeMock` (e.g., `mutation-observer.test.js`) do call `afterEach(cleanupChromeMock)`, but `cleanupChromeMock` only deletes `globalThis.chrome` — it does NOT call `resetMockStorage()`. The shared `mockStorage` state is never reset between test suites.
- `window.VSC` is populated by module imports that are cached by the ES module loader. GIF module state (e.g., `GifFrameCache._allocated`) is reset manually in individual tests using `saved`/`restore` patterns, which is fragile.
- `global.fetch` is temporarily replaced in one gif-controller test and restored via `finally`. This is correct.
- `global._drainRaf` queue is module-level in `run-tests.js`; not reset between test files.

**INFERRED:** Tests are reported to be stable (3× identical results per A2). The shared `mockStorage` concern would only manifest if test order changed or a test failed to clean up. Current test order in the runner is deterministic (explicit list), so this is a latent risk rather than an active failure.

---

## Ranked List of Untested Protected Behaviors (Most Risky First)

| Rank | PB-ID | Behavior | Risk if Broken |
|---|---|---|---|
| 1 | P3 | `vscGifIgnore` + `_vscTeardownSrc` interaction | Permanent GIF suppression after src change; GIF speed control silently stops working on lazy-loaded GIFs with src mutations |
| 2 | P4 | Sentinel pattern during `GifController.create()` async window | Double-attach race condition; memory leak; late `remove()` calls do not abort in-flight create — crash or duplicate canvas overlay |
| 3 | P2 | Module injection order in `injector.js` | Out-of-order load causes `window.VSC.*` references to be undefined at use time; entire extension silently broken |
| 4 | P6 | `loopCount = 0` means infinite | GIF stops after first loop if `null`/`undefined` is not guarded; any refactor of the default would break infinite-loop GIFs |
| 5 | P7 | `disposal=2` must `fillRect` with `_bgColor`, not `clearRect` | Black rectangles appear in GIF frames that rely on background color compositing; visually broken output |
| 6 | P8 | Mutation observer teardown on `GifController.remove()` | Observer not disconnected → memory leak; re-entrant remove() during async create() could trigger assertion failures or double-teardown |
| 7 | P1 (iframe side) | `gif-file-fetcher.js` page script and iframe injection in `injector.js` | file:// GIF support silently breaks if the page script is removed or the iframe injection removed from injector.js |
| 8 | P5 | `_patchCanvas` drawImage indirection | Black artifacts in GIF compositing; no pixel test can catch this in JSDOM |
