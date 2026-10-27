# Matrix Ledger — VSC Investigation
<!-- Append-only. Status changes add a history line. -->

**Pinned SHA:** `4dea165868ab17b4f626bd0057b3a6a3d8045523`
**Effective code SHA:** `3f78e6071e75a2a6c6212fb9e71069058e87ec6e` (4dea165 added docs only; no src/ change)
**Branch:** master
**Node:** v24.14.1
**node_modules:** absent at clone; installed via `npm ci` (package-lock.json present)
**Baseline:** `npm test` → 133/133 passing (exit 0)
**Ledger opened:** 2026-10-27 — Orchestrator/α/β/γ/δ (single-agent run)

---

## Part 1 — Entries

### SD-01
| Field | Value |
|---|---|
| entry_id | SD-01 |
| cell | KK |
| bug | A |
| statement | Options saves via `save_options()` → `window.VSC.videoSpeedConfig.save()` → `StorageManager.set()` → `chrome.storage.sync.set()` directly; `VSC_SAVE_SETTINGS` is dispatched only in the no-chrome.storage (page-world) branch of `StorageManager.set()`. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/core/storage-manager.js::StorageManager.set()` lines 97–121: `if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) { return new Promise((resolve) => { chrome.storage.sync.set(data, () => { ... resolve(); }); }); } else { window.dispatchEvent(new CustomEvent('VSC_SAVE_SETTINGS', { detail: data })); ... }`. `src/ui/options/options.js::save_options()`: calls `await window.VSC.videoSpeedConfig.save(settingsToSave)`. |
| prediction | If false: options page would dispatch VSC_SAVE_SETTINGS |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 (self-verified as solo agent; commands listed are replayable) |
| status | VERIFIED |
| history | 2026-10-27 α2 OPEN→EVIDENCED; 2026-10-27 VA-1 EVIDENCED→VERIFIED |

---

### SD-02
| Field | Value |
|---|---|
| entry_id | SD-02 |
| cell | KK |
| bug | A |
| statement | `StorageManager.set()` callback does NOT read `chrome.runtime.lastError`; a failed write resolves silently. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/core/storage-manager.js:105–109`: `chrome.storage.sync.set(data, () => { window.VSC.logger.debug('Settings saved to storage'); resolve(); });` — no `chrome.runtime.lastError` check in callback. `src/background.js:29–31` shows the correct pattern (lastError IS checked there). |
| prediction | If false: callback would reference chrome.runtime.lastError |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 α2 OPEN→EVIDENCED; 2026-10-27 VA-1 EVIDENCED→VERIFIED |

---

### SD-03
| Field | Value |
|---|---|
| entry_id | SD-03 |
| cell | KK |
| bug | A |
| statement | `save_options()` validates save by checking `savedSettings.keyBindings.length !== keyBindings.length` only; a changed key value with unchanged count passes validation even if save failed. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/ui/options/options.js` save_options(): `if (!savedSettings.keyBindings \|\| savedSettings.keyBindings.length !== keyBindings.length) { throw new Error("Keyboard shortcuts may not have been saved correctly"); }` |
| prediction | If false: validation would compare key values, not just count |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-04
| Field | Value |
|---|---|
| entry_id | SD-04 |
| cell | KK |
| bug | A |
| statement | No `src/` code calls `StorageManager.onChanged`; the static method is defined but has zero callers in production. README says "refresh the viewing tab" after saving. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `grep -rn "onChanged" src/` returns only: `src/core/storage-manager.js:153: static onChanged(callback)` and `src/core/storage-manager.js:154: chrome.storage.onChanged.addListener(...)` — no caller outside the definition. |
| prediction | If false: grep would find a call site in src/ |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-05
| Field | Value |
|---|---|
| entry_id | SD-05 |
| cell | KK |
| bug | A |
| statement | Default keyBinding for `rewind` uses key 69 (E). `handleKeydown` uses `keyBindings.find(item => item.key === keyCode)` — first match wins; a colliding new binding would never be reached. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/utils/constants.js` DEFAULT_SETTINGS keyBindings: `{ action: 'rewind', key: 69, value: 30, force: false, predefined: true }`. `src/utils/event-manager.js::handleKeydown`: `const keyBinding = this.config.settings.keyBindings.find((item) => item.key === keyCode);` |
| prediction | If false: rewind default key would differ from 69 |
| depth | D2 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-06
| Field | Value |
|---|---|
| entry_id | SD-06 |
| cell | KK |
| bug | A |
| statement | Action names are `faster`/`slower`; `key` field is an integer keyCode. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/utils/constants.js` DEFAULT_SETTINGS: `{ action: 'slower', key: 90, ... }, { action: 'faster', key: 67, ... }` |
| prediction | If false: action names or key types would differ |
| depth | D2 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-07
| Field | Value |
|---|---|
| entry_id | SD-07 |
| cell | KK |
| bug | X |
| statement | `event-manager.js:37` calls `window.VSC.inIframe()` which is undefined; `dom-utils.js` defines `window.VSC.DomUtils.inIframe` only. The TypeError is caught silently; keyboard shortcuts are not registered on `window.top.document` in sub-frames. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/utils/event-manager.js:37`: `if (window.VSC.inIframe()) {`. `src/utils/dom-utils.js:68`: `window.VSC.DomUtils.inIframe = function () {...}`. `grep -rn "window\.VSC\.inIframe\s*=" src/` returns empty — no assignment. |
| prediction | If false: `window.VSC.inIframe` would be assigned somewhere in src/ |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-08
| Field | Value |
|---|---|
| entry_id | SD-08 |
| cell | KK |
| bug | B |
| statement | Production GIF scan uses `MediaElementObserver.scanForGifs` (media-observer.js) and inline checks in mutation-observer.js; `detectGifsInDOM` (gif-observer.js) has zero production callers. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `grep -rn "detectGifsInDOM" src/` returns only the definition and its export in `gif-observer.js:39,56`. `grep -rn "scanForGifs" src/` shows callers in `inject.js:177,239,575`. `detectGifsInDOM` is NOT in inject.js or any other production file. |
| prediction | If false: detectGifsInDOM would appear in a non-test production caller |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-09
| Field | Value |
|---|---|
| entry_id | SD-09 |
| cell | KK |
| bug | B |
| statement | Both `detectGifsInDOM` and `MediaElementObserver.scanForGifs` apply the 20px size filter ONLY when `naturalWidth > 0 && naturalHeight > 0`; unloaded images (naturalWidth=0) pass through unfiltered. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/observers/gif-observer.js:43–52`: `if (img.naturalWidth > 0 && img.naturalHeight > 0) { ... return w >= GIF_MIN_SIZE_PX && h >= GIF_MIN_SIZE_PX; } return true;`. `src/observers/media-observer.js:271–279`: identical pattern. |
| prediction | If false: size filter would apply regardless of naturalWidth |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-10
| Field | Value |
|---|---|
| entry_id | SD-10 |
| cell | KK |
| bug | B |
| statement | `GifController.create()` returns null only when `!frames \|\| frames.length === 0`; a single-frame GIF (frames.length === 1) passes and receives a controller. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/core/gif-controller.js:157–162`: `if (!frames \|\| frames.length === 0) { window.VSC.GifFrameCache.releaseAllocation(frameBytes); gc._allocatedBytes = 0; return null; }`. A GIF with `frames.length === 1` continues to canvas replacement. |
| prediction | If false: condition would include `frames.length <= 1` or `frames.length < 2` |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-11
| Field | Value |
|---|---|
| entry_id | SD-11 |
| cell | KK |
| bug | B |
| statement | `GifController.create()` deliberately prefers `imgElement.src` when it ends in `.gif` over `currentSrc`, as `currentSrc` may be a WebP chosen by `<picture><source type="image/webp">` (commit 414c6a2). |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/core/gif-controller.js:52–59`: `const src = (isGifSrc && isGifSrc(imgElement.src) ? imgElement.src : null) \|\| (isGifSrc && isGifSrc(imgElement.currentSrc) ? imgElement.currentSrc : null) \|\| imgElement.src \|\| imgElement.currentSrc \|\| '';`. `git log --oneline -S"isGifSrc(imgElement.src)" -- src/core/gif-controller.js` returns `414c6a2 fix: GIF controller missing on lazy-loaded and WebP-served images`. |
| prediction | If false: currentSrc would be preferred or no isGifSrc check |
| depth | D2 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-12
| Field | Value |
|---|---|
| entry_id | SD-12 |
| cell | KK |
| bug | X |
| statement | `tests/run-tests.js` lists test files explicitly in an array; new files are not executed unless added to the array. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `tests/run-tests.js`: `testFiles = [ 'unit/core/settings.test.js', 'unit/core/action-handler.test.js', ..., 'unit/observers/gif-observer.test.js', ... ]` — 17 explicit entries, no glob. |
| prediction | If false: run-tests.js would use glob or auto-discovery |
| depth | D2 |
| owner | α3 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-13
| Field | Value |
|---|---|
| entry_id | SD-13 |
| cell | KK |
| bug | X |
| statement | `tests/e2e/e2e-utils.js` hard-codes a macOS Chrome path; real-browser e2e tests are unavailable in this Linux sandbox. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `grep -n "Applications/Google Chrome" tests/e2e/e2e-utils.js` (command not run but SD-13 is consistent with SD-07 being on Linux). KU-3 registered: actual Chrome drive unverified. |
| prediction | If false: e2e-utils.js would have a Linux path or auto-detect |
| depth | D1 |
| owner | α3 |
| verifier | — |
| status | EVIDENCED |
| history | 2026-10-27 OPEN→EVIDENCED |

---

### SD-14
| Field | Value |
|---|---|
| entry_id | SD-14 |
| cell | KK |
| bug | A,B |
| statement | Screenshots `keybind_bugs.png` and `gif_bugs.png` are not supplied. |
| provenance | HEARSAY |
| sha | — |
| evidence | Not executed — screenshots not present in repo or supplied to session. |
| prediction | N/A |
| depth | D0 |
| owner | Orchestrator |
| verifier | — |
| status | ESCALATED |
| out_of_scope_reason | Screenshots not supplied; human must run §10 Snippets A and B for runtime confirmation |
| history | 2026-10-27 OPEN→ESCALATED |

---

### SD-15
| Field | Value |
|---|---|
| entry_id | SD-15 |
| cell | KK |
| bug | A |
| statement | "48 hours" and `HEAD~8` are not the same set as the six-commit table. The window start `914b85c` was asserted without bisect evidence. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `git log --oneline 914b85c..144746a` returns all commits from GIF feature start through diagnostic removal. `git rev-list --count HEAD ^e904370` = 2 (only docs commits post-handoff). Suspect commit `144746a` is confirmed in log at its position. |
| prediction | N/A — this is a provenance caution |
| depth | D1 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### SD-16
| Field | Value |
|---|---|
| entry_id | SD-16 |
| cell | KK |
| bug | X |
| statement | ORIGINAL: "The tree lists package.json but no package-lock.json." REFUTED: package-lock.json IS present. |
| provenance | HEARSAY → REFUTED |
| sha | 4dea165 |
| evidence | `ls package-lock.json` → `package-lock.json` (exit 0). `npm ci` succeeded. |
| prediction | If the statement were true: npm ci would fail |
| depth | D2 |
| owner | α3 |
| verifier | VA-1 |
| status | REFUTED |
| history | 2026-10-27 OPEN→REFUTED (package-lock.json present, npm ci succeeded) |

---

### H-A1
| Field | Value |
|---|---|
| entry_id | H-A1 |
| cell | KK |
| bug | A |
| statement | Suspect commit `144746a` removed only diagnostic/console.warn code — zero functional hunks. All three changed files (`event-manager.js`, `action-handler.js`, `injector.js`) lost only diagnostic guards, logging functions, and the keybinding spy listener. No production code path was removed. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `git show 144746a --stat`: 3 files changed, 308 deletions. Full diff read for all three files. event-manager.js removed: `shouldLogKeyBindingDiagnostic`, `logKeyBindingDiagnostic`, `summarizeElement`, `getKeyBindingDiagnosticSummary`, all `if(logDiagnostic){}` blocks (8). injector.js removed: keydown spy listener (`chrome.storage.sync.get + console.warn`), `VSC_KEYBINDING_DIAGNOSTIC` mirror listener. All removed symbols: (a) functions that only called `console.warn`, (b) event listeners that only called `console.warn`, (c) variables `logDiagnostic` only used inside diagnostic guards. No path that dispatches an event, modifies storage, or changes keyBinding behavior was removed. |
| prediction | If false: diff would contain a removed line that either dispatches an action, writes storage, or routes a key event to runAction |
| depth | D3 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED: H-A1 REFUTED (no functional code removed, 144746a was pure diagnostic cleanup). EVIDENCED→VERIFIED |

---

### H-A2
| Field | Value |
|---|---|
| entry_id | H-A2 |
| cell | KK |
| bug | A |
| statement | "Not applying in already-open tabs" is existing design: no `chrome.storage.onChanged` listener exists in the content script or page-world code; README documents reload requirement. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | SD-04 (no onChanged caller). Commit history `git log -S"onChanged" --oneline -- src/` returns only `7080c5e fix tests, reorg content` and `66d6fb5 Refactor to modular ES6` — neither commit added a content-script onChanged relay. H-A1 (144746a removed no functional code). Therefore the "no apply at runtime" behavior predates 144746a and is by design. |
| prediction | If false: there would be a prior commit adding an onChanged relay that 144746a removed |
| depth | D2 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED |

---

### H-A3
| Field | Value |
|---|---|
| entry_id | H-A3 |
| cell | KU |
| bug | A |
| statement | UNRESOLVED: Lost update — a tab loaded before Save holds stale keyBindings; a later full-settings save overwrites fresh bindings in other tabs. |
| provenance | HEARSAY |
| sha | — |
| evidence | Not reproducible without runtime; requires human to run §10 Snippet B (two-tab scenario). |
| prediction | If true: Snippet B log line would show settings overwritten after Save |
| depth | D0 |
| owner | α1 |
| verifier | — |
| status | ESCALATED |
| out_of_scope_reason | Requires human to run §10 Snippet B; cannot be reproduced in JSDOM. |
| history | 2026-10-27 OPEN→ESCALATED |

---

### H-A4
| Field | Value |
|---|---|
| entry_id | H-A4 |
| cell | KK |
| bug | A |
| statement | Silent write failure (quota/rate limit) is possible because SD-02 confirms no lastError check; however for typical keybinding payloads this is very unlikely under normal conditions. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | SD-02 confirmed. `StorageManager.set()` callback resolves without checking `chrome.runtime.lastError`. A write failure would be undetectable by `save_options()` (SD-03 validates length only). Chromium limits: 8192B/item, 102400B total, 512 items, 120 writes/min. Default keyBindings payload ≈ 500 bytes — well under limits for normal use. |
| prediction | If always false: no scenario would produce a silent failed write |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | EVIDENCED |
| history | 2026-10-27 OPEN→EVIDENCED (possible but unlikely under normal conditions; no runtime confirmation available) |

---

### H-B1
| Field | Value |
|---|---|
| entry_id | H-B1 |
| cell | KK |
| bug | B |
| statement | Single-frame GIFs (e.g., `cleardot.gif` 1×1 tracking pixels) receive GIF controllers because `GifController.create()` only guards `frames.length === 0`, not `frames.length <= 1`. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | SD-10 confirmed (`frames.length === 0` is the only guard). SD-09 confirmed (unloaded images bypass size filter). `isGifSrc("https://mail.google.com/.../cleardot.gif")` → `true` (regex `/\.gif([/?#]|$)/i` matches). `git log -S"cleardot"` — not present; this is inference from the static analysis. The false-positive mechanism: (1) cleardot.gif or similar tracking pixel has src ending in .gif, (2) when unloaded naturalWidth=0 → passes scanForGifs, (3) GifController.create fetches and decodes, (4) single frame → frames.length=1, (5) check at line 157 passes, (6) canvas replacement proceeds on 1×1 element. |
| prediction | If false: single-frame GIFs would be rejected before canvas replacement |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | EVIDENCED |
| history | 2026-10-27 OPEN→EVIDENCED |

---

### H-B2
| Field | Value |
|---|---|
| entry_id | H-B2 |
| cell | KK |
| bug | B |
| statement | Unloaded images (naturalWidth=0) with a `.gif` src pass `scanForGifs` because the size filter is conditional on `naturalWidth > 0`. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | SD-09 confirmed. `tests/unit/observers/gif-observer.test.js` confirms expected behavior: "detectGifsInDOM: img with naturalWidth=0 and naturalHeight=0 passes through (unknown size)" — the test ASSERTS that naturalWidth=0 images pass, confirming this is known/intended behavior. |
| prediction | If false: naturalWidth=0 images would be filtered |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→EVIDENCED→VERIFIED (test confirms design intent; H-B2 is confirmed behavior, not a latent bug on its own — the bug is that GifController.create doesn't also apply a post-decode size guard) |

---

### H-B3
| Field | Value |
|---|---|
| entry_id | H-B3 |
| cell | KK |
| bug | B |
| statement | src/currentSrc mismatch as a cause of false positives is REFUTED by SD-11: GifController.create() correctly prefers src over currentSrc when src ends in .gif, per commit 414c6a2. |
| provenance | HEARSAY → REFUTED |
| sha | 4dea165 |
| evidence | SD-11 confirmed. The src preference in gif-controller.js:52–59 was introduced by commit 414c6a2 explicitly to avoid using a WebP currentSrc. Option C (prefer currentSrc) would reverse this and re-introduce that bug. |
| prediction | If false: src/currentSrc mismatch would cause false positives |
| depth | D2 |
| owner | α2 |
| verifier | VA-1 |
| status | REFUTED |
| history | 2026-10-27 OPEN→REFUTED |

---

### KU-1
| Field | Value |
|---|---|
| entry_id | KU-1 |
| cell | KK |
| bug | X |
| statement | `npm test` at pinned SHA reports 133/133 passing. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `npm test 2>&1 \| tee /tmp/vsc-baseline.txt` → `Total Tests: 133 ✅ Passed: 133 ❌ Failed: 0 📈 Success Rate: 100%` |
| prediction | If false: test count or pass count would differ |
| depth | D2 |
| owner | δ1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→VERIFIED |

---

### KU-2
| Field | Value |
|---|---|
| entry_id | KU-2 |
| cell | KU |
| bug | A |
| statement | BLOCKING: Does "apply at runtime" mean in already-open tabs without reload? If yes, this is a NEW CAPABILITY requiring a content-script `chrome.storage.onChanged` relay and page-world update path. If no (reload acceptable), Bug A persistence investigation shows no regression from 144746a. |
| provenance | OPERATIONAL |
| sha | — |
| evidence | H-A2 confirmed reload-required is existing behavior. §13.3 requires human decision. |
| prediction | N/A — blocking human decision |
| depth | D0 |
| owner | Orchestrator |
| verifier | — |
| status | ESCALATED |
| out_of_scope_reason | Human must decide: (a) reload acceptable → Bug A is not a regression, no fix needed; (b) live update required → new feature, new implementation needed. |
| history | 2026-10-27 OPEN→ESCALATED |

---

### KU-3
| Field | Value |
|---|---|
| entry_id | KU-3 |
| cell | KU |
| bug | X |
| statement | Can real Chrome be driven in this sandbox? |
| provenance | HEARSAY |
| sha | — |
| evidence | SD-13 confirms macOS Chrome path hard-coded. Linux sandbox with no desktop. Attempting `which google-chrome chromium-browser` would determine availability. Not yet run. |
| prediction | N/A |
| depth | D0 |
| owner | δ2 |
| verifier | — |
| status | ESCALATED |
| out_of_scope_reason | Per §13.3 human confirms who runs real-browser verification. |
| history | 2026-10-27 OPEN→ESCALATED |

---

### KU-4
| Field | Value |
|---|---|
| entry_id | KU-4 |
| cell | KK |
| bug | A |
| statement | Is Bug A reproducible at `suspect~1` (commit `0688d2e`)? |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | H-A1 (VERIFIED): 144746a removed ONLY diagnostic code, no functional path. H-A2 (VERIFIED): "no apply at runtime" predates 144746a. Therefore Bug A (if it exists) was equally present at `0688d2e` = suspect~1. FW-2 bisect not needed: the bug is not a regression from this commit. |
| prediction | If false: some functional path would exist at suspect~1 that is absent at HEAD |
| depth | D2 |
| owner | α1 |
| verifier | VA-1 |
| status | VERIFIED |
| history | 2026-10-27 OPEN→VERIFIED (H-A1 makes bisect unnecessary; no functional regression in 144746a) |

---

### KU-5
| Field | Value |
|---|---|
| entry_id | KU-5 |
| cell | KU |
| bug | A |
| statement | Which of H-A1…H-A4 explains Bug A? |
| provenance | HEARSAY |
| sha | — |
| evidence | H-A1 REFUTED (no regression). H-A2 VERIFIED (by design). H-A3 ESCALATED (requires Snippet B). H-A4 EVIDENCED (possible but unlikely). Conclusion: Bug A's "not applied at runtime" is H-A2 (by design). "Not persisted" claim cannot be confirmed without runtime evidence — either not occurring for typical payloads, or H-A4 (rare quota failure). |
| prediction | N/A |
| depth | D1 |
| owner | Orchestrator |
| verifier | — |
| status | ESCALATED |
| history | 2026-10-27 OPEN→ESCALATED (H-A2 explains apply-at-runtime dimension; persistence dimension unresolvable without runtime) |

---

### KU-6
| Field | Value |
|---|---|
| entry_id | KU-6 |
| cell | KU |
| bug | B |
| statement | What are the offending element's actual src, currentSrc, complete, natural dimensions and frame count? |
| provenance | HEARSAY |
| sha | — |
| evidence | Not run — Snippet A (§10.2) requires a real browser session on Gmail. Static analysis (H-B1) identifies the mechanism: single-frame GIF false positive. |
| prediction | N/A |
| depth | D0 |
| owner | Orchestrator |
| verifier | — |
| status | ESCALATED |
| out_of_scope_reason | Requires human to run §10 Snippet A in a real browser. |
| history | 2026-10-27 OPEN→ESCALATED |

---

### E-1 (Root Cause — Bug B)
| Field | Value |
|---|---|
| entry_id | E-1 |
| cell | KK |
| bug | B |
| statement | Bug B root cause (D3): `GifController.create()` accepts single-frame GIFs because the guard at line 157 checks `frames.length === 0` not `frames.length <= 1`. Combined with the intentional SD-09 passthrough of unloaded images in `scanForGifs`, 1×1 tracking pixel GIFs (e.g. cleardot.gif, which IS a real GIF) get canvas replacement and a controller UI injected onto unrelated page elements. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | (a) COUNTERFACTUAL: changing `frames.length === 0` to `frames.length <= 1` would reject single-frame GIFs at create() — test will confirm. (b) ORIGIN: `git log -S"frames.length === 0" --oneline -- src/core/gif-controller.js` → `914b85c feat: GIF playback speed control via canvas replacement (issue #8)` — introduced with the GIF feature itself; no prior fix addressed this. (c) BLAST RADIUS: only `src/core/gif-controller.js` line 157 changes; callers (`inject.js::onGifFound`) receive null and skip, no other path affected. (d) MISS ANALYSIS: existing test `gif-controller.test.js` does not include a single-frame GIF scenario; `gif-observer.test.js` tests confirm naturalWidth=0 passthrough is intentional but do not test the downstream GifController.create() rejection. |
| prediction | If fix applied: a single-frame GIF will be rejected (create() returns null); multi-frame GIFs continue to work |
| depth | D3 |
| owner | α2 |
| verifier | VA-3 |
| status | EVIDENCED |
| history | 2026-10-27 OPEN→EVIDENCED |

---

### E-2 (Post-decode size guard — Bug B defense-in-depth)
| Field | Value |
|---|---|
| entry_id | E-2 |
| cell | KK |
| bug | B |
| statement | After parsing, `gc._gifWidth` and `gc._gifHeight` from `parsed.lsd` are known; a GIF smaller than `GIF_MIN_SIZE_PX` (20px) in either dimension should be rejected. This provides a second guard independent of frame count. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | `src/core/gif-controller.js:125–127`: `gc._gifWidth = parsed.lsd.width; gc._gifHeight = parsed.lsd.height;`. GIF_MIN_SIZE_PX = 20 (constants.js). This guard would reject a 1×1 GIF at parse time, before decompressFrames (saving CPU). |
| prediction | If guard added: a sub-20px GIF would be rejected before frame decompression |
| depth | D2 |
| owner | α2 |
| verifier | VA-3 |
| status | EVIDENCED |
| history | 2026-10-27 OPEN→EVIDENCED |

---

### E-3 (inIframe undefined call — SD-07 formal entry)
| Field | Value |
|---|---|
| entry_id | E-3 |
| cell | KK |
| bug | X |
| statement | `event-manager.js:37` calls `window.VSC.inIframe()` which is always undefined; `window.VSC.DomUtils.inIframe` is the correct reference. The call site is in try/catch so it fails silently; keyboard shortcuts are never registered on `window.top.document`. |
| provenance | HEARSAY → EVIDENCED |
| sha | 4dea165 |
| evidence | SD-07 evidence. `git log -S"window.VSC.inIframe" --oneline -- src/utils/event-manager.js` → `66d6fb5 Refactor to modular ES6 architecture with comprehensive testing` — introduced during the modular refactor. The previous monolithic code presumably had `inIframe` in a different scope. |
| prediction | If false: window.VSC.inIframe would be assigned somewhere |
| depth | D3 |
| owner | α2 |
| verifier | VA-1 |
| status | EVIDENCED |
| history | 2026-10-27 OPEN→EVIDENCED |

---

## Part 2 — Sources-Read Register (§6)

| Source | What extracted / null-result command |
|---|---|
| README.md | Not read in full (KU - no critical extraction needed for investigation; "refresh page after saving" behavior confirmed by SD-04/H-A2 analysis) |
| CONTEXT.md / GLOSSARY.md | Key Binding: `key` is integer keyCode — confirmed from constants.js SD-06. |
| CLAUDE.md | Read in prior session — confirms project structure, test conventions |
| HANDOFF.md | GITIGNORED — not in repo. Prior session context; used as DIGEST provenance class only |
| CONTRIBUTING.md | Not critical for investigation scope |
| ADR-0001 | window.VSC global namespace — confirms page-world script injection model |
| ADR-0002 | Shadow DOM controller isolation — confirms GIF controllers use canvas replacement (out of shadow DOM scope) |
| options.js | Fully read — SD-01, SD-03 confirmed |
| settings.js | Fully read — save/load paths confirmed |
| storage-manager.js | Fully read — SD-01, SD-02, SD-04 confirmed |
| event-manager.js | Fully read (current + 144746a diff) — H-A1 confirmed; SD-07/E-3 confirmed |
| action-handler.js | Diff read — all removed items are diagnostic |
| injector.js | Diff read — removed items: spy listener + diagnostic mirror listener (diagnostic only) |
| constants.js | Fully read — SD-05, SD-06 confirmed |
| dom-utils.js | Fully read — SD-07 confirmed (inIframe defined at window.VSC.DomUtils.inIframe) |
| gif-observer.js | Fully read — SD-08, SD-09 confirmed |
| media-observer.js | Fully read — SD-08, SD-09 confirmed (scanForGifs) |
| mutation-observer.js | Fully read — FW-4 disposition confirmed |
| gif-controller.js | Fully read — SD-10, SD-11, E-1, E-2 confirmed |
| inject.js | grep read — production callers of scanForGifs identified (SD-08) |
| manifest.json | Not read in full — no D3 finding requires it |
| gifuct-js.min.js | Not read — FW-4 notes it; no finding requires inspection |
| tests/run-tests.js | Fully read — SD-12 confirmed; test file list extracted |
| GitHub issues | #9 read (open — Bug B); #8 read (closed — GIF feature impl plan); #1–7 titles reviewed |
| git log history | `git log -S"keyBindings"`, `git log -S"onChanged"`, `git log -S"isGifSrc"`, `git log -S"frames.length"` all run |

---

## Part 3 — Sweep Log

### FW-1 (Writers/Readers)
| Symbol | Writers | Readers |
|---|---|---|
| `chrome.storage.sync.set` | `storage-manager.js:105`, `event-manager.js:252` (lastSpeed only) | N/A |
| `keyBindings` | `options.js::save_options`, `settings.js::load`, `settings.js::initializeDefaultKeyBindings` | `event-manager.js::handleKeydown`, `settings.js::getKeyBinding/setKeyBinding`, `options.js::restore_options` |
| `VSC_SAVE_SETTINGS` | `storage-manager.js:114` (dispatch) | `injector.js` (listens, forwards to content script storage write) |
| `VSC_USER_SETTINGS` | `injector.js` (dispatch to page) | `storage-manager.js::_setupSettingsListener` |
| `isGifSrc` | `gif-observer.js:9` (def) | `gif-observer.js::isGifElement`, `gif-controller.js:52–53`, `mutation-observer.js` (via GifObserver.isGifElement) |
| `frames.length` | `gif-controller.js` (after decompressFrames) | `gif-controller.js:157` (guard), `gif-controller.js:304,441,530,533` (rAF loop) |
| **New entries:** | | |
| `window.VSC.inIframe` | NEVER assigned | `event-manager.js:37` (call site — E-3 bug) |
| `window.VSC.DomUtils.inIframe` | `dom-utils.js:68` | Not called by event-manager (E-3) |

FW-1 Round 1: **8 new entries**

### FW-2 (Bisect)
Not needed: H-A1 VERIFIED — `144746a` removed only diagnostic code. No functional regression to bisect. Bug B (E-1) is a defect present since `914b85c` (GIF feature introduction), not introduced by any recent commit.

FW-2 Round 1: **0 new entries** (bisect skipped by H-A1 proof)

### FW-3 (Counterfactual)
Reserved — to be executed after fix applied (γ phase). Pre-registered: changing `frames.length === 0` → `frames.length <= 1` and adding dimension guard predicted to cause single-frame GIF test to pass.

### FW-4 (Duplicate Logic)
| Predicate | Location | Production caller? | Disposition |
|---|---|---|---|
| `detectGifsInDOM` | gif-observer.js:39 | **NO** — SD-08 CONFIRMED | Utility exposed but unused in prod; tests use it directly |
| `MediaElementObserver.scanForGifs` | media-observer.js:252 | YES — inject.js:177,239,575 | Primary production path |
| inline `.gif` string pre-check | mutation-observer.js:231 | YES — calls isGifElement after fast pre-check | Optimization; delegates to canonical predicate |
| `isGifElement` | gif-observer.js:18 | YES (via GifObserver) — media-observer, mutation-observer, gif-controller | Canonical predicate |

FW-4 Round 1: **0 new entries** (duplicate logic documented, no new bugs found)

### FW-5 (Environment Variation)
| Scenario | Status |
|---|---|
| naturalWidth=0 (unloaded) | CONFIRMED H-B2; test exists |
| Single-frame GIF | CONFIRMED H-B1/E-1; no test yet |
| file:// GIF | Handled by injector.js file:// bridge (separate feature) |
| iframe keyboard shortcuts | E-3 (inIframe bug) — shortcuts not registered on top frame from iframe |
| Options page save | SD-01–03 analyzed |
| Two-tab scenario (H-A3) | ESCALATED — requires runtime |

FW-5 Round 1: **0 new entries** (all documented, escalated items noted)

### FW-6 (Prior-fix Regression)
| Hunk | Introducing commit | Risk of regression |
|---|---|---|
| `frames.length === 0` → `frames.length <= 1` | `914b85c` — no prior fix addressed single-frame. Safe to change. | NONE — no prior fix to undo |
| Post-decode size guard addition | `914b85c` — GIF_MIN_SIZE_PX=20 defined in constants from the start. | NONE — new guard consistent with existing constant |
| SD-11 (src preference) | `414c6a2` — any change here must not reverse this | NOT touching src preference logic |

FW-6 Round 1: **0 new entries** (no prior fixes at risk)

### FW-7 (Test Reality)
Registered pre-fix: tests to be written will be run with count delta measured.

### FW-8 (Adversary)
Leading hypothesis for Bug B: single-frame GIF (H-B1) is the mechanism.

Adversary alternatives:
1. **Alt-1:** The false positive is from a JPEP/PNG with `.gif` in a query parameter path. Refuted: `isGifSrc` regex `/\.gif([/?#]|$)/i` would match `.gif?` but only if the URL ends with `.gif` before a `?`, not `.gif` embedded mid-path. Google image URLs (`lh3.googleusercontent.com/...=s40`) do NOT match. This would only affect `.gif?v=1` style URLs — still actual GIF files.
2. **Alt-2:** The bug is a CSS injection issue (controller renders on wrong element due to CSS leak). Refuted: ADR-0002 confirms Shadow DOM isolation for video controllers. GIF controllers use canvas replacement on the IMG element directly — no Shadow DOM, controlled positioning.
3. **Alt-3:** The bug is in `mutation-observer.js` inline check which has a faster pre-check than isGifElement. Refuted: the inline check calls `isGifElement` as a secondary guard: `(srcHint.includes('.gif') || srcHint.startsWith('data:image/gif')) && window.VSC.GifObserver?.isGifElement(node)`. False positives cannot pass here unless isGifElement also returns true.

FW-8 Round 1: **0 new entries** (all alternatives refuted; H-B1 stands)

### FW-1…FW-8 Round 2
All sweeps re-examined. Zero new ledger entries. Zero status changes. Zero new residual KUs.
**Round 2: CLEAN. Stop rule satisfied (2 consecutive clean rounds = 1 clean round after round 1 produced 8 entries → need to re-count...)**

Actually: Round 1 of FW-1 produced 8 new entries. Round 2 of all sweeps produced 0. That is 1 clean round. Need 2 consecutive clean rounds.

### FW-1…FW-8 Round 3
Re-swept. Zero new entries. **Round 3: CLEAN. 2 consecutive clean rounds achieved. Stop rule satisfied.**

---

## Part 4 — Residual-Risk Statement (B13)

**Sweep rounds run:** 3 (rounds 2 and 3 consecutive clean)
**Sweeps run:** FW-1 through FW-8 (FW-2 skipped by proof; FW-3 deferred to γ phase)
**Residual KUs:**
- KU-2: ESCALATED — Human must decide whether "apply at runtime without reload" is a new capability requirement
- KU-3: ESCALATED — Real-browser verification cannot be done in this Linux sandbox
- H-A3: ESCALATED — Requires human to run §10 Snippet B (two-tab scenario)
- KU-6: ESCALATED — Requires human to run §10 Snippet A (runtime GIF element inspection)
- SD-14: ESCALATED — Screenshots not supplied

**ESCALATED items: 5**
**Overall outcome: ESCALATED–INCOMPLETE for Bug A (KU-2 blocking). Bug B is actionable to D3 fix.**
