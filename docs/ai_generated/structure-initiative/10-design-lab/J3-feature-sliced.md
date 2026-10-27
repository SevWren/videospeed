---
designer: J3
lens: Feature Cohesion (vertical slices)
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: design-only — RUNTIME_CODE_MOVES = plan-only
confidence: high
provenance: ai-generated; do not treat as ground truth without verification
---

# J3 Design: Feature-Sliced Structure

## Organizing Principle

A developer working on GIF speed control should find every GIF-related file in one place. A developer working on video speed should find every video-related file together. This design organizes `src/` into vertical feature slices — each slice owns its observers, controllers, UI, and any vendored dependency specific to that feature. Infrastructure shared across slices lives in a single `infrastructure/` slice.

---

## 1. Hypotheses

**H1 (Change locality):** Grouping all GIF-related files (`gif-controller.js`, `gif-frame-engine.js`, `gif-observer.js`, `media-observer.js`, `mutation-observer.js`, `gif-file-fetcher.*`, `gifuct-js.min.js`) into one `gif-control/` slice will reduce the median files-read-to-localize for tasks D3, D4, D8, D9 by at least 30% compared to the current structure.
*Falsifiable by*: cold-start trial measuring files-read per task, before and after migration.

**H2 (Load-order obscurity):** The `window.VSC` load-order contract (currently visible in `injector.js` as a linear list) will be harder for a cold agent to discover when modules are spread across feature-slice subdirectories, because the agent must first understand the slice layout before it can trace the sequence.
*Falsifiable by*: cold-start trial measuring time-to-correctly-state-load-order for a fresh agent given only the post-slice CLAUDE.md entry point.

**H3 (WAR surface reduction):** Collapsing files from the current wildcard-exposed `src/core/*.js` glob into narrower per-feature subdirectories will not automatically narrow WAR exposure — WAR glob entries must be manually updated. Unless every slice gets an explicit WAR entry replacing the current wildcard, the move increases WAR surface or breaks the extension.
*Falsifiable by*: compare `manifest.json` WAR entries before and after migration; run the `check:structure` script (R-04) against each state.

---

## 2. Target Directory Structure

This tree is a design plan only. No files move on this branch (charter §3, R-09, ZERO-DIFF constraint).

```
src/
  features/
    video-control/
      video-controller.js          ← from src/core/
      action-handler.js            ← from src/core/
      event-manager.js             ← from src/utils/ (video-control owns key event dispatch)
      site-handlers/
        base-handler.js            ← from src/site-handlers/
        youtube-handler.js         ← from src/site-handlers/
        netflix-handler.js         ← from src/site-handlers/
        amazon-handler.js          ← from src/site-handlers/
        apple-handler.js           ← from src/site-handlers/
        facebook-handler.js        ← from src/site-handlers/
        index.js                   ← from src/site-handlers/
        scripts/                   ← from src/site-handlers/scripts/
      ui/
        controls.js                ← from src/ui/
        shadow-dom.js              ← from src/ui/
        drag-handler.js            ← from src/ui/

    gif-control/
      gif-controller.js            ← from src/core/
      gif-frame-engine.js          ← from src/core/
      gif-observer.js              ← from src/observers/
      media-observer.js            ← from src/observers/
      mutation-observer.js         ← from src/observers/
      gif-file-fetcher.html        ← from src/ (root)
      gif-file-fetcher.js          ← from src/ (root)
      lib/
        gifuct-js.min.js           ← from src/lib/ (C-11: untouchable; stays bit-identical)

    settings/
      settings.js                  ← from src/core/
      storage-manager.js           ← from src/core/
      options/                     ← from src/ui/options/
      popup/                       ← from src/ui/popup/

    infrastructure/
      inject.js                    ← from src/content/
      injector.js                  ← from src/content/ (load-order contract lives here)
      background.js                ← from src/ (root)
      module-loader.js             ← from src/ (root; dead code — migrate to removal ticket)
      constants.js                 ← from src/utils/
      debug-helper.js              ← from src/utils/
      dom-utils.js                 ← from src/utils/
      logger.js                    ← from src/utils/

  styles/                          ← unchanged; no slice owns CSS exclusively
  assets/                          ← unchanged
```

### Files without a clear single-slice owner

| File | Current location | Tension | Resolution |
|---|---|---|---|
| `event-manager.js` | `src/utils/` | Used by video-control for key events but conceivably by GIF too | Assign to `video-control/`; expose via `window.VSC` as today |
| `mutation-observer.js` | `src/observers/` | Watches DOM for both video and GIF elements | Assign to `gif-control/` (primary consumer is GIF detection); document in video-control slice README |
| `media-observer.js` | `src/observers/` | Detects HTMLMediaElement — video primary, but GIF path also uses it | Assign to `gif-control/`; GIF detection triggers canvas replacement |
| `module-loader.js` | `src/` root | Dead code (OBS-09) | Assign to `infrastructure/`; open removal ticket |

---

## 3. What Moves and What Stays

**Plan-only. No files change on this branch.**

### Files that move (migration tickets required)

| Current path | Proposed path | Prerequisite |
|---|---|---|
| `src/core/video-controller.js` | `src/features/video-control/video-controller.js` | Characterization test for video-controller (OBS-03) |
| `src/core/action-handler.js` | `src/features/video-control/action-handler.js` | Characterization test for action-handler |
| `src/core/gif-controller.js` | `src/features/gif-control/gif-controller.js` | All P2-P8 contract tests passing (R-03) |
| `src/core/gif-frame-engine.js` | `src/features/gif-control/gif-frame-engine.js` | Existing unit tests updated to new path |
| `src/core/settings.js` | `src/features/settings/settings.js` | Characterization test for settings |
| `src/core/storage-manager.js` | `src/features/settings/storage-manager.js` | Characterization test for storage-manager |
| `src/observers/gif-observer.js` | `src/features/gif-control/gif-observer.js` | Characterization test for gif-observer |
| `src/observers/media-observer.js` | `src/features/gif-control/media-observer.js` | Characterization test for media-observer |
| `src/observers/mutation-observer.js` | `src/features/gif-control/mutation-observer.js` | Characterization test for mutation-observer; D12 judgment documented |
| `src/content/inject.js` | `src/features/infrastructure/inject.js` | Load-order contract tests pass |
| `src/content/injector.js` | `src/features/infrastructure/injector.js` | Load-order contract tests pass; check:structure exits 0 |
| `src/background.js` | `src/features/infrastructure/background.js` | Characterization test for background |
| `src/module-loader.js` | `src/features/infrastructure/module-loader.js` | Dead-code characterization test; then removal ticket |
| `src/utils/constants.js` | `src/features/infrastructure/constants.js` | All dependent tests updated |
| `src/utils/debug-helper.js` | `src/features/infrastructure/debug-helper.js` | Dependent test paths updated |
| `src/utils/dom-utils.js` | `src/features/infrastructure/dom-utils.js` | Dependent test paths updated |
| `src/utils/logger.js` | `src/features/infrastructure/logger.js` | Dependent test paths updated |
| `src/utils/event-manager.js` | `src/features/video-control/event-manager.js` | Dependent test paths updated |
| `src/site-handlers/**` | `src/features/video-control/site-handlers/**` | Site-handler characterization tests (OBS-03) |
| `src/ui/controls.js` | `src/features/video-control/ui/controls.js` | UI characterization test |
| `src/ui/shadow-dom.js` | `src/features/video-control/ui/shadow-dom.js` | UI characterization test |
| `src/ui/drag-handler.js` | `src/features/video-control/ui/drag-handler.js` | UI characterization test |
| `src/ui/options/` | `src/features/settings/options/` | Options page characterization test |
| `src/ui/popup/` | `src/features/settings/popup/` | Options/popup characterization test |
| `src/gif-file-fetcher.html` | `src/features/gif-control/gif-file-fetcher.html` | C-7: all `chrome.runtime.getURL()` calls updated atomically |
| `src/gif-file-fetcher.js` | `src/features/gif-control/gif-file-fetcher.js` | Same as above |
| `src/lib/gifuct-js.min.js` | `src/features/gif-control/lib/gifuct-js.min.js` | C-11: byte-identical, WAR entry updated |

### Files that do not move

| File | Reason |
|---|---|
| `src/styles/inject.css`, `src/styles/shadow.css` | No single-feature owner; shared presentation |
| `src/assets/icons/**` | Extension packaging asset; no feature affinity |

---

## 4. Key Question: Does Feature-Slicing Help or Hurt the window.VSC Contract?

**This is the primary tension in the J3 design.**

### The contract

The `window.VSC` namespace is the IPC mechanism between all page-world modules (C-13). Modules must not use ES `import/export` — they communicate only via `window.VSC`. The load order is encoded in `src/content/injector.js` as a specific sequence of script injection calls. `manifest.json` `web_accessible_resources` must list every injected file. These three must agree (R-04).

### How feature-slicing creates tension

1. **Load order becomes physically non-obvious.** In the current structure, all modules are one level deep from `src/`. A cold agent reading `injector.js` sees a flat list and can mentally map each entry to a nearby file. After slicing, the same list in `injector.js` references paths like `src/features/gif-control/gif-controller.js`, `src/features/video-control/video-controller.js`, `src/features/infrastructure/constants.js`. The load-order sequence now crosses four directories. The sequence is still in one file (`injector.js`) but the mental model requires knowing the slice layout first.

2. **WAR glob wildcards break silently.** Current manifest entries include `src/core/*.js`. After migration, `core/` no longer exists. Unless all WAR entries are updated atomically and the `check:structure` script is updated to verify the new paths, moving files produces a broken extension with no immediate error — it silently stops injecting modules.

3. **Circular feature dependency risk.** If `gif-control/mutation-observer.js` needs `infrastructure/constants.js` and `video-control/event-manager.js` also needs `infrastructure/constants.js`, those files must still be loaded via `injector.js` in order. The feature-slice layout implies independence but `window.VSC` forces a runtime ordering that the directory structure does not express.

### Assessment

Feature-slicing does **not** fragment the load-order contract in terms of correctness — the contract remains in `injector.js`, which stays in `infrastructure/`. However, it **increases navigability risk** for load-order discovery: a cold agent starting from `CLAUDE.md` must make a detour through the slice layout before understanding that load order crosses slices. This partially undermines R-02 (critical invariants within 2 hops).

**Mitigation (plan-only):**
- `infrastructure/injector.js` must have an inline comment header listing the load-order sequence with slice paths, making the cross-slice dependency explicit.
- `docs/ai_generated/adr/ADR-0002-load-order-contract.md` should be drafted documenting the cross-slice load order as an ADR.
- The `check:structure` script (R-04) must be updated to verify `injector.js` paths against the new `src/features/**` layout.
- CLAUDE.md entry point must link directly to both `infrastructure/injector.js` (load order) and the ADR (within 2 hops, satisfying R-02).

---

## 5. Protected Behavior Impact (P1-P14)

| PBID | Behavior | Slice after migration | Risk |
|---|---|---|---|
| P1 | Speed range clamped 0.07–16 | `video-control/video-controller.js` | LOW — file moves, logic unchanged |
| P2 | GIF canvas replacement (no HTMLMediaElement) | `gif-control/gif-controller.js` | MEDIUM — must update WAR entry; characterization test required pre-move |
| P3 | GIF rAF loop accuracy | `gif-control/gif-controller.js` + `gif-frame-engine.js` | MEDIUM — both files in same slice; internal reference intact |
| P4 | loopCount=null infinite loop | `gif-control/gif-controller.js` | MEDIUM — same as P2 |
| P5 | disposal=2 bgColor fill | `gif-control/gif-controller.js` | MEDIUM — same as P2 |
| P6 | Sentinel pattern on img.gifController | `gif-control/gif-controller.js` | MEDIUM — same as P2 |
| P7 | _patchCanvas pixel compositing | `gif-control/gif-controller.js` | MEDIUM — same as P2 |
| P8 | Memory budget (maxTotalBytes) | `gif-control/gif-controller.js` | MEDIUM — same as P2 |
| P9 | vscGifIgnore + _vscTeardownSrc | `gif-control/gif-controller.js` + `gif-observer.js` | LOW — both in same gif-control slice |
| P10 | GIF iframe proxy (gif-file-fetcher) | `gif-control/gif-file-fetcher.*` | HIGH — C-7 requires getURL() calls updated atomically; must update WAR |
| P11 | Module load order | `infrastructure/injector.js` | HIGH — see Section 4; requires explicit cross-slice load-order documentation |
| P12 | window.VSC namespace | All slices (no change to mechanism) | MEDIUM — slicing does not change runtime IPC; risk is agent confusion |
| P13 | Site handler filtering | `video-control/site-handlers/` | LOW — all handlers co-located in slice |
| P14 | Settings persistence | `settings/settings.js` + `storage-manager.js` | LOW — both in same settings slice |

---

## 6. Permission / WAR / CSP Impact

**Manifest delta — plan only. manifest.json must not change on this branch (ZERO-DIFF).**

Current WAR entries that would need updating in a migration:

```jsonc
// CURRENT (must not change on this branch):
"web_accessible_resources": [
  {
    "resources": [
      "src/core/*.js",        // ← wildcard; exposes any future file in core/
      "src/lib/*.js",
      "src/utils/constants.js",
      "src/content/inject.js",
      "src/content/injector.js",
      "src/observers/*.js",
      "src/site-handlers/*.js",
      "src/site-handlers/scripts/*.js",
      "src/ui/controls.js",
      "src/gif-file-fetcher.js",
      "src/gif-file-fetcher.html"
      // ... (full list may vary; this is representative)
    ]
  }
]

// POST-MIGRATION would require (migration ticket only):
"web_accessible_resources": [
  {
    "resources": [
      "src/features/video-control/*.js",
      "src/features/video-control/site-handlers/*.js",
      "src/features/video-control/site-handlers/scripts/*.js",
      "src/features/video-control/ui/*.js",
      "src/features/gif-control/*.js",
      "src/features/gif-control/lib/*.js",
      "src/features/settings/*.js",
      "src/features/infrastructure/*.js"
    ]
  }
]
```

**C-1 / C-2 implications:**
- The wildcard-per-slice pattern still auto-exposes every future file added to a slice directory. This is not worse than current, but it is not better either. A strict explicit-file WAR list would be safer.
- C-7: `gif-file-fetcher.html` path change requires all `chrome.runtime.getURL('src/gif-file-fetcher.html')` call sites to be updated atomically in the same migration ticket.
- C-2: No `dist/` paths are introduced in this design (no build step).
- CSP: No new `eval`, `document.write`, or inline scripts added; CSP impact is zero.

---

## 7. AI-Navigability Impact (D1-D12 Task Suite)

| Task | Current hops | Slice hops | Delta | Notes |
|---|---|---|---|---|
| D1: Add site handler | 2 (site-handlers/, injector.js) | 2 (video-control/site-handlers/, infrastructure/injector.js) | 0 | Same effort; handler and its home are in one slice |
| D2: Add new action | 3 (action-handler.js, controls.js, injector.js) | 2 (video-control/action-handler.js + ui/controls.js in same slice) | -1 | Action and UI co-located |
| D3: GIF disposal=3 render bug | 3 (gif-controller, observers, frame-engine across two dirs) | 1 (all in gif-control/) | -2 | Large gain; entire GIF stack in one directory |
| D4: Change GIF memory budgets | 3 (gif-controller.js, gif-frame-engine.js, tests) | 1-2 (gif-control/ + tests) | -1 | gif-control/ surfaces both relevant files immediately |
| D5: Controller not appearing | 3 (site-handlers, media-observer, video-controller) | 2 (video-control/site-handlers + video-controller; media-observer in gif-control — cross-slice lookup) | 0/-1 | media-observer in gif-control may add 1 hop for video debug |
| D6: Picture-in-Picture hotkey | 2 (action-handler, event-manager) | 1 (both in video-control/) | -1 | Co-located in same slice |
| D7: Add persisted setting end-to-end | 4 (options/, storage, settings, inject bridge) | 2 (settings/ slice + infrastructure/ bridge) | -2 | settings slice owns full chain |
| D8: Replace GIF decoder | 2 (gif-controller, lib/) | 1 (gif-control/lib/ co-located) | -1 | Vendor and consumer in same slice |
| D9: Trace file:// GIF fetch path | 3 (gif-file-fetcher, gif-controller, observers) | 1 (all in gif-control/) | -2 | Large gain |
| D10: Prepare release package | 2 (manifest, zip script) | 2 (unchanged; packaging is infrastructure concern) | 0 | No change |
| D11: Firefox support | 3 (manifest, background, content) | 2 (infrastructure/ groups background + inject) | -1 | Infrastructure slice surfaces platform files |
| D12: Refactor mutation-observer | 2 (observers/, PB registry) | 1 (gif-control/ + PB registry) | -1 | mutation-observer in gif-control makes P-impact discoverable sooner |

**Net navigability gain: 10 of 12 tasks at same or fewer hops; 0 tasks worse (D5 is neutral).**

The one cross-slice lookup risk (D5: media-observer in gif-control when debugging a video-only issue) is real but low-frequency. The annotation in `infrastructure/injector.js` load-order comment and in CLAUDE.md can surface this edge case.

---

## 8. Migration Path

**All steps below are migration tickets only. Nothing executes on this branch.**

### Prerequisites (must complete before any file moves)

| # | Action | R-item | Risk |
|---|---|---|---|
| M-PRE-1 | Write characterization tests for all 12 currently untested modules (OBS-03) | R-03 | HIGH if skipped — moves become blind |
| M-PRE-2 | Write contract test stubs for P2-P8 (R-03) | R-01, R-03 | HIGH |
| M-PRE-3 | Implement `check:structure` script verifying injector.js = manifest.json WAR = module registry | R-04 | BLOCKER — detects silent WAR breakage |
| M-PRE-4 | Draft ADR-0002 (load-order contract) documenting cross-slice dependency order | R-02 | HIGH |
| M-PRE-5 | Update CLAUDE.md to point to load-order ADR and PB registry | R-02 | MEDIUM |

### Wave 1 — Lowest risk (no WAR changes, no getURL changes)

| # | Move | Risk | Prerequisite |
|---|---|---|---|
| M1-1 | `src/utils/constants.js` → `infrastructure/constants.js` | LOW | M-PRE-1, M-PRE-3 |
| M1-2 | `src/utils/debug-helper.js`, `logger.js`, `dom-utils.js` → `infrastructure/` | LOW | M-PRE-1, M-PRE-3 |
| M1-3 | `src/core/settings.js`, `storage-manager.js` → `settings/` | LOW | M-PRE-1, M-PRE-3 |
| M1-4 | `src/ui/options/`, `popup/` → `settings/` | LOW | M-PRE-1 |

### Wave 2 — Moderate risk (WAR entry changes required)

| # | Move | Risk | Prerequisite |
|---|---|---|---|
| M2-1 | `src/core/video-controller.js`, `action-handler.js` → `video-control/` | MEDIUM | M-PRE-1, M-PRE-3, Wave 1 green |
| M2-2 | `src/utils/event-manager.js` → `video-control/` | MEDIUM | M-PRE-1 |
| M2-3 | `src/site-handlers/**` → `video-control/site-handlers/` | MEDIUM | M-PRE-1, M-PRE-3 |
| M2-4 | `src/ui/controls.js`, `shadow-dom.js`, `drag-handler.js` → `video-control/ui/` | MEDIUM | M-PRE-1 |

### Wave 3 — Higher risk (GIF stack; P10 getURL atomicity)

| # | Move | Risk | Prerequisite |
|---|---|---|---|
| M3-1 | `src/observers/gif-observer.js`, `media-observer.js`, `mutation-observer.js` → `gif-control/` | MEDIUM | M-PRE-2 passing, M-PRE-3, Wave 2 green |
| M3-2 | `src/core/gif-frame-engine.js` → `gif-control/` | MEDIUM | M-PRE-2, M-PRE-3 |
| M3-3 | `src/core/gif-controller.js` → `gif-control/` | HIGH | M-PRE-2 all P2-P8 passing, M-PRE-3, M3-1, M3-2 |
| M3-4 | `src/gif-file-fetcher.html`, `gif-file-fetcher.js` → `gif-control/` + update all `getURL()` calls atomically | HIGH (C-7) | M3-3, WAR entry update, getURL audit |
| M3-5 | `src/lib/gifuct-js.min.js` → `gif-control/lib/` (bit-identical, C-11) | HIGH | M3-4, WAR entry update verified |

### Wave 4 — Infrastructure (load-order contract files last)

| # | Move | Risk | Prerequisite |
|---|---|---|---|
| M4-1 | `src/content/inject.js`, `injector.js` → `infrastructure/` | HIGH | All Waves 1-3 green, check:structure exits 0, ADR-0002 published |
| M4-2 | `src/background.js` → `infrastructure/` | MEDIUM | M4-1 |
| M4-3 | `src/module-loader.js` → `infrastructure/` then open dead-code removal ticket (OBS-09) | LOW | M4-2 |

---

## 9. Cost and Reversibility

### Cost

| Category | Estimate |
|---|---|
| Prerequisite characterization tests (M-PRE-1, M-PRE-2) | HIGH — these are the dominant cost; 12 untested modules |
| check:structure script (M-PRE-3) | LOW |
| ADR-0002 + CLAUDE.md updates (M-PRE-4, M-PRE-5) | LOW |
| Wave 1 moves + WAR updates | LOW |
| Wave 2 moves + WAR updates | MEDIUM |
| Wave 3 (GIF stack) + getURL atomicity | HIGH |
| Wave 4 (infrastructure) | MEDIUM |
| **Total** | **HIGH (dominated by test prerequisite)** |

### Reversibility

Feature-slicing is **fully reversible** at any wave boundary before Wave 4. Because `window.VSC` and `injector.js` are the actual runtime contracts (not directory structure), reverting a file move requires:
1. Moving the file back to its original path.
2. Updating `injector.js` load list (already maintained as the single source of truth).
3. Updating `manifest.json` WAR entries.
4. Running `check:structure` to verify.

No runtime logic changes in any wave — all moves are path changes only. The prerequisite tests (M-PRE-1, M-PRE-2) are additive and remain useful even after a rollback.

**Reversibility rating: HIGH** — any individual wave can be reverted independently.

---

## 10. Scorecard

Frozen weights from charter §3.

| Criterion | Weight | J3 Raw (0-10) | Weighted |
|---|---|---|---|
| AI localization efficiency | 25 | 8 | 200 |
| Change locality for common change types | 20 | 9 | 180 |
| Enforceability by tests/checks | 15 | 6 | 90 |
| Migration cost and reversibility | 15 | 6 | 90 |
| Human legibility | 10 | 8 | 80 |
| Fit with MV3 runtime and package hygiene | 10 | 6 | 60 |
| Tool portability | 5 | 7 | 35 |
| **Total** | **100** | — | **735 / 1000** |

### Score rationale

- **AI localization (8/10):** Tasks D3, D7, D9 show 2-hop reductions. The cross-slice load-order lookup (D5) and the added complexity for cold-start load-order discovery (H2) prevent a 9 or 10.
- **Change locality (9/10):** GIF changes, settings changes, and video-action changes each stay within a single slice. Highest benefit of the feature-slice approach.
- **Enforceability (6/10):** Enforceability depends on the `check:structure` script (R-04) being updated to verify cross-slice paths. Until that script exists, the slice layout is just convention. Score reflects design potential, not current state.
- **Migration cost (6/10):** The dominant cost is writing characterization tests for 12 currently untested modules — a prerequisite that cannot be bypassed. The moves themselves are mechanical once tests exist.
- **Human legibility (8/10):** The four-slice layout maps cleanly to the four capability areas developers think about. Slice names are self-explaining.
- **MV3 runtime fit (6/10):** No changes to the runtime model; WAR updates are mechanical but require discipline. The wildcard-per-slice WAR pattern is acceptable but not ideal (C-1 concern).
- **Tool portability (7/10):** Standard directory layout; any editor or grep tool navigates it well.

**Regression safety: PASS** — this design makes zero changes to `src/**`, `manifest.json`, `LICENSE`, or `PRIVACY.md` on this branch. All moves are plan-only.

---

## 11. Risks and Gaps

### Primary Risk: Feature-Slicing Fragments the Load-Order Contract (H2)

**This is the central risk for J3.**

The load-order contract exists in exactly one file: `src/content/injector.js`. After migration it lives at `src/features/infrastructure/injector.js`. The contract itself is unchanged — but a cold agent navigating the repo post-slice will encounter four top-level directories under `src/features/` and must understand that load order is a cross-slice concern before it can reason correctly about module dependencies.

In the current flat structure, a cold agent scanning `src/core/`, `src/observers/`, `src/utils/` can read `injector.js` and immediately recognize which files are loaded and in what order. In the slice layout, the agent may first read `gif-control/` in isolation and mistakenly assume GIF modules are self-contained — missing the dependency on `infrastructure/constants.js` being loaded first.

**Mitigation chain (plan-only):**
1. `infrastructure/injector.js` gets an explicit header block: `// LOAD ORDER CONTRACT — see docs/ai_generated/adr/ADR-0002-load-order-contract.md`.
2. CLAUDE.md entry point links to `infrastructure/injector.js` as the load-order source of truth (satisfying R-02's 2-hop requirement).
3. `check:structure` script enforces that every path in `injector.js` exists at the slice location and matches the WAR list.
4. Each slice's directory-level comment (in the module registry, not in source code) notes which infrastructure dependencies must load before it.

Without items 1-4, feature-slicing actively hurts load-order navigability. With all four, the risk is contained.

### Secondary Risks

| Risk | Severity | Mitigation |
|---|---|---|
| WAR wildcard per slice auto-exposes future files (C-1) | MEDIUM | Prefer explicit file lists over globs in new WAR entries; `check:structure` validates |
| gif-file-fetcher.html path change breaks GIF proxy (C-7, P10) | HIGH | getURL() call audit must be atomic with the file move (Wave 3) |
| gifuct-js.min.js move violates C-11 if any byte changes | HIGH | Use `md5sum` verification in migration ticket; move must be copy-only |
| media-observer.js in gif-control/ surprises video debugging (D5) | LOW | Document in CLAUDE.md module map; add cross-reference in video-control slice |
| module-loader.js dead code (OBS-09) still ships in new WAR | LOW | Migration ticket opens removal after characterization test |
| VSC_SAVE_SETTINGS payload validation gap not fixed by this design (OBS-08) | MEDIUM | Out of scope (requires runtime code change); migration ticket; do not replicate pattern (C-4) |

### Gaps

- This design does not address OBS-06 (non-mutating CI gate). That is R-05 scope (additive `check:lint`, `check:format` scripts), orthogonal to the slice layout.
- This design does not address OBS-07 (PRIVACY.md false claim). That is a human-gated action (C-8), out of ZERO-DIFF scope.
- `src/styles/` has no clear feature home. Assigning it to `video-control/` or keeping it at the top level are both defensible; this design leaves it at the top level to avoid making a cross-feature judgment.

---

*End of J3 Feature-Sliced Design.*
*Output path: `docs/ai_generated/structure-initiative/10-design-lab/J3-feature-sliced.md`*
*This document is design-only. No files in `src/**`, `manifest.json`, `LICENSE`, or `PRIVACY.md` were modified.*
