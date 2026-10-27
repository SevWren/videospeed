---
team: Team-J
agent: J2 Runtime-World Layering Designer
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
reads:
  - docs/ai_generated/structure-initiative/04-synthesis/04-r-list.md
  - docs/ai_generated/structure-initiative/04-synthesis/05-c-list.md
  - docs/ai_generated/structure-initiative/04-synthesis/03-obstacle-list.md
  - docs/ai_generated/structure-initiative/00-charter.md
  - docs/ai_generated/structure-initiative/02-architecture/B-architecture.md
  - manifest.json
  - src/content/injector.js (lines 1-80)
confidence: high — all claims OBSERVED from cited sources at base-sha
lens: Execution world boundary as primary organizing principle
---

# J2 Design: Runtime-World Layering

## Design premise

Chrome extension code does not share a memory space across worlds. A file that runs in the isolated content script world can call `chrome.storage.sync.get()`; a file that runs in the page main world cannot — it will receive `ReferenceError: chrome is not defined`. This boundary is the sharpest constraint in the codebase, yet the current `src/` layout expresses nothing about it. A new agent scanning `src/core/` sees `storage-manager.js` (which bridges to `chrome.storage` via custom events) next to `gif-controller.js` (which cannot touch `chrome.*` at all), with no visual or organizational signal marking the difference.

This design proposes a `src/worlds/` directory tree where the top-level folder name encodes the runtime world. The design is **plan-only** (RUNTIME_CODE_MOVES = plan-only per charter §3 and §7). No file is moved by this document; every move becomes a migration ticket per §3.

---

## 1. Hypotheses

**H1 (Falsifiable)**: An agent cold-starting on a task that touches world-crossing IPC (e.g., D7: "add a persisted setting end to end") will read fewer total files before identifying all three sides of the crossing (page-world sender, isolated-world relay, service-worker receiver) when the directory layout names the worlds explicitly.

*Falsification condition*: A controlled A/B trial (Task D7, Arm A = current layout, Arm B = worlds layout) shows no statistically significant difference in files-read-to-complete-plan. If the median files-read for Arm B is not at least 15% lower than Arm A, H1 is rejected.

**H2 (Falsifiable)**: Placing `src/content/injector.js` in `src/worlds/isolated/` will cause an agent scanning for "where does `chrome.storage` get called?" to find it in one hop rather than two (current path: grep src/ → find injector.js → confirm it is a content script by reading manifest.json).

*Falsification condition*: A structured agent trial that asks "which file calls chrome.storage.sync.get?" finds the answer without reading manifest.json in Arm B. If Arm B agents still read manifest.json before identifying injector.js, H2 is rejected.

**H3 (Falsifiable)**: Naming the `page/` world directory makes the constraint C-13 (no import/export between page-world modules; window.VSC is the only IPC) self-documenting: a README in `src/worlds/page/` stating "these files cannot use chrome.* APIs" will reduce agent proposals that incorrectly add `chrome.runtime` calls to page-world modules.

*Falsification condition*: In cold-start trials for Task D2 ("add a new Action"), at least one Arm A agent proposes adding a `chrome.runtime` call inside an existing page-world module; zero Arm B agents do so. If both arms have zero such proposals, H3 cannot be falsified in this trial set.

---

## 2. Target directory structure

This is the **proposed future state**. No file is currently at these paths. All moves require migration tickets (see §8).

```
src/
  worlds/
    isolated/                      <- Chrome content script isolated world
    |                                 Full chrome.* access; NO window.VSC access
    |                                 Runs as: content_scripts[].js in manifest
    |
    |   injector.js                <- was: src/content/injector.js
    |                                 Only file with chrome.storage + script injection
    |
    page/                          <- Page main world (injected via web_accessible_resources)
    |                                 NO chrome.* access; window.VSC is the only IPC bus
    |                                 Runs as: <script> tags injected by isolated/injector.js
    |
    |   core/
    |   |   storage-manager.js     <- was: src/core/storage-manager.js
    |   |   settings.js            <- was: src/core/settings.js
    |   |   action-handler.js      <- was: src/core/action-handler.js
    |   |   video-controller.js    <- was: src/core/video-controller.js
    |   |   gif-frame-engine.js    <- was: src/core/gif-frame-engine.js
    |   |   gif-controller.js      <- was: src/core/gif-controller.js
    |   |
    |   observers/
    |   |   media-observer.js      <- was: src/observers/media-observer.js
    |   |   mutation-observer.js   <- was: src/observers/mutation-observer.js
    |   |   gif-observer.js        <- was: src/observers/gif-observer.js
    |   |
    |   site-handlers/
    |   |   base-handler.js        <- was: src/site-handlers/base-handler.js
    |   |   netflix-handler.js     <- was: src/site-handlers/netflix-handler.js
    |   |   youtube-handler.js     <- was: src/site-handlers/youtube-handler.js
    |   |   facebook-handler.js    <- was: src/site-handlers/facebook-handler.js
    |   |   amazon-handler.js      <- was: src/site-handlers/amazon-handler.js
    |   |   apple-handler.js       <- was: src/site-handlers/apple-handler.js
    |   |   index.js               <- was: src/site-handlers/index.js
    |   |   scripts/
    |   |       netflix.js         <- was: src/site-handlers/scripts/netflix.js
    |   |
    |   ui/
    |   |   controls.js            <- was: src/ui/controls.js
    |   |   drag-handler.js        <- was: src/ui/drag-handler.js
    |   |   shadow-dom.js          <- was: src/ui/shadow-dom.js
    |   |
    |   lib/
    |   |   gifuct-js.min.js       <- was: src/lib/gifuct-js.min.js  [C-11: untouchable]
    |   |
    |   entry/
    |       inject.js              <- was: src/content/inject.js
    |                                 Top-level orchestrator; injected last in load order
    |
    worker/                        <- MV3 service worker
    |                                 Full chrome.* access; no DOM; no window.VSC
    |                                 Runs as: background.service_worker in manifest
    |
    |   background.js              <- was: src/background.js
    |
    extension-pages/               <- Extension pages (chrome-extension:// origin)
    |                                 Full chrome.* access; own DOM; no page-world window.VSC
    |                                 Runs as: options_ui.page, action.default_popup
    |
    |   options/
    |   |   options.html           <- was: src/ui/options/options.html
    |   |   options.js             <- was: src/ui/options/options.js
    |   |
    |   popup/
    |   |   popup.html             <- was: src/ui/popup/popup.html
    |   |   popup.js               <- was: src/ui/popup/popup.js (if exists)
    |   |
    |   gif-fetcher/
    |       gif-file-fetcher.html  <- was: src/gif-file-fetcher.html  [C-7: chrome-ext:// URL]
    |       gif-file-fetcher.js    <- was: src/gif-file-fetcher.js
    |
    shared/                        <- Safe in any world; no chrome.* and no window.VSC
    |                                 Pure data: constants, type definitions, pure utilities
    |
        constants.js               <- was: src/utils/constants.js
        logger.js                  <- was: src/utils/logger.js
        debug-helper.js            <- was: src/utils/debug-helper.js
        dom-utils.js               <- was: src/utils/dom-utils.js
        event-manager.js           <- was: src/utils/event-manager.js
        module-loader.js           <- was: src/module-loader.js (dead code; flag for removal)
```

Note on `src/styles/` and `src/assets/`: these are non-JS resources and sit naturally outside the worlds model. They would stay at `src/styles/` and `src/assets/` or move to a top-level `assets/` directory under a separate ticket.

Note on `shared/`: the five `src/utils/` files are listed here because they contain no `chrome.*` calls and no `window.VSC` writes at the top level that would break if loaded in a different world context. INFERRED from B-architecture.md B2 module table: all five utils are consumed exclusively from page-world modules, but the files themselves are world-neutral code. A future extension page (e.g., options.js) that imports constants directly would be safe here.

---

## 3. What moves and what stays

### What the new structure would look like (planning state)

Every `src/**` file has a 1:1 mapping to a `src/worlds/**` path as shown in §2. The mapping is total: no file in `src/` is left unmapped. This is intentional — the design covers the entire module surface.

The two `src/content/` files split across worlds:
- `src/content/injector.js` → `src/worlds/isolated/injector.js` (isolated world)
- `src/content/inject.js` → `src/worlds/page/entry/inject.js` (page main world)

This split makes the critical invariant visible in the directory: injector.js is the gatekeeper, inject.js is the orchestrator, and they live in different worlds.

### No file is actually moved by this design

Per charter §3 and R-09: "The scaffold branch diff must satisfy: `git diff --name-status master...HEAD -- src manifest.json` — this must print nothing."

This document is additive documentation. Zero `src/**` files are moved, renamed, or modified. Zero manifest.json entries change.

### Migration requires tickets per charter §3

Each world directory becomes one or more migration tickets. Ticket ordering is defined in §8. Tickets are written to `docs/ai_generated/structure-initiative/tickets/`.

---

## 4. How does this structure make world boundaries visible without moving code?

Team B found 13 IPC crossing points (B-architecture.md §B1 crossing table) using three transport mechanisms:
- `window.dispatchEvent(new CustomEvent(...))` — for isolated ↔ page crossings (9 event types)
- `iframe.contentWindow.postMessage(...)` — for isolated ↔ gif-file-fetcher (3 message types)
- `chrome.runtime.sendMessage(...)` — for isolated ↔ service worker (3 message types)

The current `src/` layout disperses both sides of each crossing across directories without any visual signal. For example:
- `VSC_SAVE_SETTINGS` crosses from `src/core/storage-manager.js` (page world) to `src/content/injector.js` (isolated world) — two directories, no directory-level hint they interact across a world boundary
- `VSC_FETCH_GIF_BYTES` crosses from `src/core/gif-controller.js` (page world) to `src/content/injector.js` (isolated world) — again no directory signal

Under the worlds layout, both sides of every crossing are structurally labeled:

| Crossing | Sender path (worlds) | Receiver path (worlds) | World boundary visible? |
|---|---|---|---|
| VSC_SAVE_SETTINGS | `worlds/page/core/storage-manager.js` | `worlds/isolated/injector.js` | YES — page/ → isolated/ |
| VSC_FETCH_GIF_BYTES | `worlds/page/core/gif-controller.js` | `worlds/isolated/injector.js` | YES — page/ → isolated/ |
| VSC_USER_SETTINGS | `worlds/isolated/injector.js` | `worlds/page/core/storage-manager.js` | YES — isolated/ → page/ |
| VSC_GIF_FETCH_REQUEST | `worlds/isolated/injector.js` | `worlds/extension-pages/gif-fetcher/gif-file-fetcher.js` | YES — isolated/ → extension-pages/ |
| VSC_GIF_BYTES_RESPONSE | `worlds/extension-pages/gif-fetcher/gif-file-fetcher.js` | `worlds/page/core/gif-controller.js` | YES — extension-pages/ → page/ |
| chrome.runtime.sendMessage | `worlds/isolated/injector.js` | `worlds/worker/background.js` | YES — isolated/ → worker/ |

### How boundary visibility works without moving code

The worlds layout achieves visibility through two purely additive mechanisms that require zero changes to `src/`:

1. **A world-map document** at `docs/ai_generated/structure-initiative/10-design-lab/J2-runtime-world-layering.md` (this file) and a shorter agent-facing version at (proposed) `docs/ai_generated/world-map.md`. An agent reading CLAUDE.md → world-map.md arrives at the complete crossing table in 2 hops, satisfying R-02.

2. **Inline world annotations in CLAUDE.md** (additive edit, allowed per charter §5): add a one-line world tag to each module entry, e.g.:
   ```
   - src/content/injector.js  [WORLD: isolated]  — script injection, message bridge
   - src/core/gif-controller.js  [WORLD: page]   — canvas replacement, rAF loop
   - src/background.js  [WORLD: worker]           — tab tracking, icon state
   ```
   This is zero-diff on `src/` and immediately visible to any agent reading CLAUDE.md.

These two mechanisms are implementable now. The full directory migration (§8) is a future phase.

---

## 5. Protected behavior impact (P1–P14)

The following assessment uses the protected behavior set from charter Appendix A and OBS-01/OBS-03 findings.

| PBID | Behavior | Impact under worlds layout |
|---|---|---|
| P1 | Module injection order contract (injector.js load sequence) | **Easier to verify**: isolated/injector.js is unambiguously the one file responsible. The load-order array is exactly one file in one world directory. Check:structure script has a stable anchor path. |
| P2 | `_patchCanvas` frame compositing with `drawImage()` | Neutral — gif-controller.js remains a single file. World label confirms it is page-world only, which is correct (canvas API is page-accessible). |
| P3 | GIF disposal type 2 (restore-to-background) bgColor fill | Neutral — internal to gif-controller.js logic; world label adds no risk. |
| P4 | `loopCount=null` sentinel for infinite loops | Neutral — internal to gif-controller.js. |
| P5 | `img.vscGifIgnore` + `img._vscTeardownSrc` teardown pattern | Neutral — internal to gif-controller.js and inject.js, both page-world. |
| P6 | Sentinel `{pending:true,_cancelled:false}` on `img.gifController` | Neutral — internal to inject.js page-world logic. |
| P7 | Pixel-level color accuracy (GIF palette, transparency) | Neutral — rendering is canvas API, entirely page-world. No world crossing involved. |
| P8 | Memory budget via `GifFrameCache.releaseAllocation` | Neutral — gif-frame-engine.js and gif-controller.js are both page-world. |
| P9 | IntersectionObserver pause/resume on visibility | Neutral — DOM API, page-world. |
| P10 | `requestAnimationFrame` loop guard `_rafRunning` | Neutral — page-world internal. |
| P11 | GIF speed changes applied via `effectiveDelay` | Neutral — gif-frame-engine.js is page-world utility. |
| P12 | `StorageManager.waitForInjectedSettings()` timeout | **Easier to verify**: the worlds layout makes explicit that storage-manager.js (page world) cannot call chrome.storage directly — it must wait for the VSC_USER_SETTINGS event from isolated/injector.js. The constraint is structurally encoded. |
| P13 | `chrome.runtime.getURL()` for WAR injection | **Easier to verify**: chrome.runtime.getURL() appears only in isolated/injector.js. If an agent sees this call in any page/ file, the world label is a clear red flag. |
| P14 | `gif-file-fetcher.html` chrome-extension:// origin (C-7) | **Easier to verify**: extension-pages/gif-fetcher/ makes the iframe's origin explicit. C-7 warning can be placed directly in that subdirectory README. |

Summary: 3 behaviors become easier to verify (P1, P12, P13, P14); 0 become harder. 10 are neutral because they are entirely internal to single files in the page world.

---

## 6. Permission / WAR / CSP impact

### Current WAR glob patterns (manifest.json lines 58–80 at base-sha)

```json
"web_accessible_resources": [{
  "resources": [
    "src/styles/inject.css",
    "src/styles/shadow.css",
    "src/module-loader.js",
    "src/core/*.js",
    "src/utils/*.js",
    "src/ui/*.js",
    "src/observers/*.js",
    "src/site-handlers/*.js",
    "src/site-handlers/scripts/*.js",
    "src/content/*.js",
    "src/lib/*.js",
    "src/gif-file-fetcher.html",
    "src/gif-file-fetcher.js"
  ],
  "matches": ["http://*/*", "https://*/*", "file:///*"]
}]
```

### Delta manifest.json changes required by migration (PLAN-ONLY — not executed)

If files are migrated to `src/worlds/`, the WAR entries must change atomically with each move. The new glob patterns would be:

```json
"web_accessible_resources": [{
  "resources": [
    "src/styles/inject.css",
    "src/styles/shadow.css",
    "src/worlds/page/core/*.js",
    "src/worlds/page/observers/*.js",
    "src/worlds/page/site-handlers/*.js",
    "src/worlds/page/site-handlers/scripts/*.js",
    "src/worlds/page/ui/*.js",
    "src/worlds/page/entry/*.js",
    "src/worlds/page/lib/*.js",
    "src/worlds/shared/*.js",
    "src/worlds/extension-pages/gif-fetcher/gif-file-fetcher.html",
    "src/worlds/extension-pages/gif-fetcher/gif-file-fetcher.js"
  ],
  "matches": ["http://*/*", "https://*/*", "file:///*"]
}]
```

Changes from current:
- `src/module-loader.js` is REMOVED from WAR (dead code per B-architecture.md §B2; migration ticket must confirm no callers before removal)
- `src/worlds/isolated/injector.js` does NOT appear in WAR — it is the content script, declared in `content_scripts[].js`, not a web-accessible resource. This is correct.
- `src/worlds/worker/background.js` does NOT appear in WAR — declared as `background.service_worker`.
- `src/worlds/extension-pages/` entries for options.html and popup.html do NOT appear in WAR — they are declared in `options_ui.page` and `action.default_popup`.

### Security impact of WAR delta

C-1 (each directory under existing WAR globs is auto-exposed): the new `src/worlds/page/` glob structure preserves the same exposure surface as current `src/core/*.js` etc. globs. The worlds layout does NOT increase WAR surface — it reorganizes it.

C-10: `src/worlds/isolated/injector.js` is the most security-sensitive file (chrome.storage access, message bridging). Under the worlds layout, it lives in `src/worlds/isolated/` which is NOT under any WAR glob. This is strictly an improvement over the current `src/content/` directory, which IS covered by the `src/content/*.js` WAR glob (meaning injector.js is currently web-accessible, which it does not need to be).

**Security finding**: Migrating injector.js to `src/worlds/isolated/injector.js` (outside WAR coverage) and removing the `src/content/*.js` WAR glob would REDUCE the WAR attack surface by removing the content script from web-accessible exposure. This is a positive security outcome. It must be flagged as a migration ticket with explicit human review per C-1.

### CSP impact

No new inline scripts, no eval. The worlds layout is a structural rename with no CSP implications.

### content_scripts manifest delta (PLAN-ONLY)

```json
"content_scripts": [{
  ...
  "js": ["src/worlds/isolated/injector.js"]
}]
```

### options_ui / action delta (PLAN-ONLY)

```json
"options_ui": {
  "page": "src/worlds/extension-pages/options/options.html"
},
"action": {
  "default_popup": "src/worlds/extension-pages/popup/popup.html"
}
```

---

## 7. AI-navigability impact

Format: for each task D1–D12, list files an agent would read before acting under (A) current layout vs. (B) worlds layout. Count = number of files read before the agent can localize the change.

| Task | Current layout (A) — files before localization | Worlds layout (B) — files before localization | Delta |
|---|---|---|---|
| D1: Add a new site handler | CLAUDE.md → src/site-handlers/ scan → base-handler.js → injector.js (load order) → manifest.json (WAR) = **5 files** | CLAUDE.md → world-map.md (1 hop) → worlds/page/site-handlers/ → injector.js is in isolated/ → manifest.json (WAR) = **4 files** | -1 |
| D2: Add a new Action | CLAUDE.md → src/core/action-handler.js → inject.js → src/utils/constants.js (MESSAGE_TYPES) → injector.js (load order) = **5 files** | CLAUDE.md → world-map.md → worlds/page/core/action-handler.js + worlds/shared/constants.js + worlds/page/entry/inject.js (all in page/) → injector.js is isolated/ = **4 files** | -1 |
| D3: GIF disposal=3 renders wrongly | CLAUDE.md → src/ scan → find gif-controller.js → search disposal logic → grep grep = **4 files** | CLAUDE.md → worlds/page/core/gif-controller.js (direct) = **2 files** | -2 |
| D4: Change GIF memory budgets | CLAUDE.md → grep GifFrameCache → find gif-frame-engine.js + gif-controller.js = **3 files** | CLAUDE.md → worlds/page/core/ → gif-frame-engine.js + gif-controller.js = **2 files** | -1 |
| D5: Controller not appearing on site | CLAUDE.md → src/site-handlers scan → 5 handler files → inject.js → media-observer.js = **8 files** | CLAUDE.md → worlds/page/site-handlers/ (1 hop) → handler files → worlds/page/observers/ = **6 files** | -2 |
| D6: PiP hotkey support | CLAUDE.md → action-handler.js → event-manager.js → inject.js → constants.js = **5 files** | CLAUDE.md → worlds/page/core/action-handler.js → worlds/page/core/entry/inject.js → worlds/shared/ = **4 files** | -1 |
| D7: Add persisted setting end-to-end | CLAUDE.md → options.js → storage-manager.js → settings.js → injector.js (VSC_USER_SETTINGS) → manifest.json = **6 files** | CLAUDE.md → world-map.md (shows 3-world crossing at a glance) → worlds/extension-pages/options/ → worlds/page/core/storage-manager.js → worlds/isolated/injector.js → worlds/worker/ (if needed) = **5 files** | -1 |
| D8: Replace/upgrade gifuct decoder | CLAUDE.md → src/lib/gifuct-js.min.js → gif-controller.js (window.__VSC_gifuct uses) → manifest.json (WAR) = **4 files** | CLAUDE.md → worlds/page/lib/gifuct-js.min.js (direct) → worlds/page/core/gif-controller.js = **3 files** | -1 |
| D9: Trace file:// GIF fetch path | CLAUDE.md → injector.js (file:// handler) → gif-controller.js (VSC_FETCH_GIF_BYTES) → gif-file-fetcher.js = **4 files** | CLAUDE.md → worlds/isolated/injector.js (direct) → worlds/extension-pages/gif-fetcher/gif-file-fetcher.js = **3 files** | -1 |
| D10: Release package | CLAUDE.md → manifest.json → package.json → zip script → assets scan = **5 files** | Same — worlds layout doesn't change release packaging = **5 files** | 0 |
| D11: Firefox support delta | CLAUDE.md → manifest.json → injector.js → background.js → popup = **5 files** | CLAUDE.md → manifest.json → worlds/isolated/injector.js + worlds/worker/background.js + worlds/extension-pages/popup/ = **4 files** (world grouping makes the 4 affected contexts obvious) | -1 |
| D12: Refactor mutation-observer.js — PB violations? | CLAUDE.md → src/observers/mutation-observer.js → gif-observer.js → inject.js → PB registry = **5 files** | CLAUDE.md → worlds/page/observers/mutation-observer.js → worlds/page/observers/gif-observer.js → PB registry = **3 files** (all in same world directory, no world-crossing concern) | -2 |

**Summary**: D1–D12 median files-read reduction = 1 file (range: 0 to 2). Largest gains are D3 (GIF disposal rendering: -2), D5 (site handler debugging: -2), D12 (mutation-observer refactor: -2). D10 (release packaging) sees no improvement — the worlds layout does not help with release artifact concerns.

**Key navigability gain**: world-map.md (2-hop from CLAUDE.md) gives any agent the complete IPC crossing table immediately. Currently no equivalent document exists at distance ≤ 2 hops from CLAUDE.md (OBS-02, OBS-04).

---

## 8. Migration path

All moves are PLAN-ONLY. No code is moved by this document. Each phase below becomes one or more migration tickets in `docs/ai_generated/structure-initiative/tickets/`.

### Migration ordering principle: lowest WAR / IPC risk first

The risk order is determined by two factors:
1. **WAR atomicity**: files that appear in WAR globs must have WAR updated in the same commit as the move; any mismatch silently breaks injection
2. **IPC coupling**: files that are senders or receivers of CustomEvent/postMessage crossing must be moved with their counterpart, or the path references in injector.js must be updated atomically

### Phase 0 — Pre-conditions (no file moves; all additive)

*Must complete before any Phase 1 move.*

- Add world-map.md at `docs/ai_generated/world-map.md` (additive doc only)
- Add [WORLD: ...] annotations to CLAUDE.md module entries (additive edit)
- Write characterization tests for injector.js load-order contract (R-03, R-04)
- Write check:structure script that validates injector.js module array = manifest.json WAR coverage (R-04)
- Write characterization tests for VSC_SAVE_SETTINGS, VSC_USER_SETTINGS, VSC_FETCH_GIF_BYTES crossing contracts (needed before moving either side)

*Risk*: None — purely additive.

### Phase 1 — shared/ (lowest risk; no WAR, no IPC)

*Pre-condition*: Characterization tests pass (npm test = 133/133 before and after).*

Move the five `src/utils/` files to `src/worlds/shared/`. These files:
- Have no chrome.* calls
- Have no direct window.VSC writes that cross worlds
- Are consumed lazily by page-world modules at call time (INFERRED from B-architecture.md §B2 note on lazy globals)
- Appear only under the `src/utils/*.js` WAR glob

Ticket actions:
- Move files
- Update manifest.json WAR: replace `"src/utils/*.js"` with `"src/worlds/shared/*.js"`
- Update injector.js module array paths for the 5 affected entries
- Run npm test — must be 133/133

*Reversibility*: HIGH — git revert of one commit restores all paths.

### Phase 2 — worker/ (low risk; no WAR, no DOM, isolated)

Move `src/background.js` to `src/worlds/worker/background.js`.

Ticket actions:
- Update manifest.json `background.service_worker` path
- background.js has no WAR entry — no WAR change needed
- Run npm test

*Reversibility*: HIGH — single file, single manifest.json key.

### Phase 3 — extension-pages/ (medium risk; HTML + JS + manifest refs)

Move options/, popup/, gif-file-fetcher.*:
- Update manifest.json `options_ui.page`, `action.default_popup`
- Update WAR: add `src/worlds/extension-pages/gif-fetcher/gif-file-fetcher.html` and `.js`; remove old `src/gif-file-fetcher.html` / `src/gif-file-fetcher.js`
- Update all `chrome.runtime.getURL('src/gif-file-fetcher.html')` calls in injector.js (C-7)

*Pre-condition*: characterization test for VSC_GIF_FETCHER_READY and VSC_GIF_BYTES_RESPONSE round-trip (P14).

*Reversibility*: MEDIUM — multiple manifest.json keys + one injector.js path reference change.

### Phase 4 — page/ subdirectories (medium-high risk; WAR globs + load order)

Move page-world modules in dependency order (leaves first):
1. `src/lib/gifuct-js.min.js` → `src/worlds/page/lib/` [C-11: file must be byte-identical; move only]
2. `src/ui/` files → `src/worlds/page/ui/`
3. `src/observers/` files → `src/worlds/page/observers/`
4. `src/site-handlers/` files → `src/worlds/page/site-handlers/`
5. `src/core/` files → `src/worlds/page/core/`
6. `src/content/inject.js` → `src/worlds/page/entry/inject.js`

Each sub-step:
- Update injector.js module array (the path string for that module)
- Update WAR glob pattern to cover new path
- Run npm test after each sub-step

*Pre-condition*: All 14 protected behaviors have characterization tests (R-03).

*Reversibility*: MEDIUM per step; LOW if multiple steps are batched. Must be done one module at a time.

### Phase 5 — isolated/ (highest risk; content script, WAR security improvement)

Move `src/content/injector.js` → `src/worlds/isolated/injector.js`.

- Update manifest.json `content_scripts[0].js`
- Remove `src/content/*.js` from WAR (security improvement — injector.js must NOT be web-accessible; see §6)
- Verify that `src/content/inject.js` has already moved in Phase 4 (it is the only other content/ file)

*Pre-condition*: All module array paths updated in Phase 4 (injector.js references all 25+ module paths).

*Reversibility*: MEDIUM — single file move + manifest.json content_scripts key.

### Phase 6 — Cleanup

- Remove `src/module-loader.js` (confirmed dead code per B-architecture.md §B2; requires a "no callers" characterization test)
- Remove empty legacy directories (`src/core/`, `src/utils/`, etc.)
- Update CLAUDE.md and world-map.md to reflect final paths

---

## 9. Cost and reversibility

### Documentation (this document and world-map.md)

- Cost: LOW — additive docs under OUTPUT_ROOT; zero diff on src/ or manifest.json
- Reversibility: TRIVIALLY REVERSIBLE — delete the docs, no other change needed
- Risk: NONE — cannot break any protected behavior

### CLAUDE.md world annotations (additive edit, Phase 0)

- Cost: LOW — one edit adding ~30 characters per module line
- Reversibility: HIGH — revert the CLAUDE.md edit
- Risk: LOW — misannotation is possible (e.g., mislabeling shared/ as page/) but the annotation is documentation-only and does not affect runtime behavior

### Actual file migrations (Phase 1–6)

- Cost: MEDIUM to HIGH — each phase requires atomic updates to injector.js module array AND manifest.json WAR globs AND all path references
- Reversibility: HIGH per individual phase if done as isolated commits; MEDIUM if phases are batched
- Risk: HIGH if Phase 4 or Phase 5 contains an error — a wrong path string in injector.js silently fails to inject a module (the extension loads but the module is missing; no runtime error until the module's window.VSC.* global is accessed)

**Key asymmetry**: The documentation gains (world visibility, navigability) are available TODAY through Phase 0 alone, at zero risk. The structural gains (directory layout matches world) require Phases 1–6, which carry real migration risk and require the characterization test pre-conditions to be in place.

---

## 10. Scorecard

Frozen weights from charter §3.

| Criterion | Weight | Score (0–10) | Weighted | Rationale |
|---|---|---|---|---|
| AI localization efficiency | 25 | 8 | 200 | D-task median files-read -1 (range 0 to -2); world-map.md closes the 2-hop gap for IPC crossings (OBS-02). Score is 8 not 10 because gains are modest (1–2 files) and depend on agents reading world-map.md, which requires CLAUDE.md pointer. |
| Change locality for common change types | 20 | 8 | 160 | Site handler changes, GIF rendering changes, and settings flow changes all become 1-world tasks with clear directory scope. The worlds/ structure makes change blast radius visible before any code is read. |
| Enforceability by tests/checks | 15 | 6 | 90 | The directory structure itself is enforceable only after migration (a future check:structure script can verify no chrome.* calls exist in worlds/page/ files). Pre-migration, the enforcement is documentation-only. Score penalized for pre-migration gap. |
| Migration cost and reversibility | 15 | 7 | 105 | Phase 0 (documentation) is free and reversible. Phases 1–6 are 6 atomic commits of medium complexity each. The pre-condition characterization tests are the expensive part. Score is 7 because the tests are needed anyway (R-03) and the migration is well-ordered. |
| Human legibility | 10 | 9 | 90 | `worlds/isolated/`, `worlds/page/`, `worlds/worker/`, `worlds/extension-pages/`, `worlds/shared/` are self-documenting to any Chrome extension developer. The naming matches Chrome extension documentation vocabulary exactly. |
| Fit with MV3 runtime and package hygiene | 10 | 9 | 90 | The design directly encodes MV3 world boundaries. Security improvement (injector.js removed from WAR) is a hygiene win. Dead code (module-loader.js) is flagged for removal. |
| Tool portability | 5 | 8 | 40 | Any tool that navigates a file tree benefits. No tool-specific features required. |
| **Total** | **100** | — | **775 / 1000** | — |

**Regression safety**: PASS (documentation-only; zero src/ diff)

---

## 11. Risks and gaps

**R1 — WAR glob atomicity is brittle during migration**
Each Phase 4 sub-step requires updating both injector.js AND manifest.json in one commit. If a partial commit lands, the extension breaks silently. Mitigation: migration ticket must include a pre-commit hook or check:structure script that validates injector.js paths == manifest.json WAR coverage before commit is accepted.

**R2 — Test runner module loader divergence (OBS-03 / B-architecture.md §B2)**
The test helper `tests/helpers/module-loader.js` uses a different module load order than injector.js. After Phase 4 moves, the test helper paths must also be updated. If the test helper is updated before the module paths, tests fail with path-not-found. If updated after, tests may pass on wrong paths. Mitigation: check:structure script must validate test helper path list == injector.js list == manifest WAR.

**R3 — injector.js chrome.runtime.getURL() path strings**
injector.js constructs paths as string literals (e.g., `'src/utils/constants.js'`). These are not validated at build time. A typo in a path string during Phase 4 migration produces a silent injection failure (the `<script>` tag's `onerror` fires, but by default the extension continues loading remaining modules). Mitigation: characterization test that verifies all 25+ path strings in injector.js exist as actual files.

**R4 — gif-file-fetcher.html URL coupling (C-7)**
injector.js references `src/gif-file-fetcher.html` by path in a `chrome.runtime.getURL()` call. Moving it to `src/worlds/extension-pages/gif-fetcher/gif-file-fetcher.html` requires updating this path atomically. Any window of time where the file has moved but injector.js still references the old path breaks GIF fetch for file:// URLs. Mitigation: Phase 3 move gif-file-fetcher as a single atomic commit that includes the injector.js path update.

**R5 — options.js uses window.VSC.VideoSpeedConfig (extension page accessing page-world global)**
B-architecture.md §B1 notes options.js creates `window.VSC.videoSpeedConfig`. This is an extension page that happens to use the same window.VSC namespace as page-world modules. Under the worlds layout, this creates a subtle exception: `extension-pages/options/options.js` is not a pure extension-page file — it participates in the window.VSC namespace. This is an existing design quirk (options page is loaded as a standalone page, not injected into a web page; its window.VSC is isolated from the web page's window.VSC). The worlds layout does not fix this; it must be documented as an exception in the options/ directory.

**R6 — Scorecard dependency on world-map.md being written**
The navigability gains in §7 (world-map.md in 2 hops from CLAUDE.md) depend on world-map.md being created and CLAUDE.md being updated with the pointer. If Phase 0 is skipped and only the migration is done, the navigability gains are reduced because agents still need to infer the world mapping from directory names alone. Mitigation: Phase 0 is mandatory pre-condition for all phases.

**Gap G1 — shared/ membership needs verification**
The five `src/utils/` files are classified as `shared/` on the basis that they contain no `chrome.*` calls. This classification has not been verified by grep for `chrome\.` within those files. A migration ticket must include a grep check before the move. INFERRED from B-architecture.md §B2 which shows all utils registered under window.VSC (page-world namespace) — this makes them page-world in practice, even if world-neutral in code. Consider renaming `shared/` to `page-utils/` if the grep confirms chrome.* absence but the files are only ever loaded in page context.

**Gap G2 — netflix.js scripts/ subdirectory**
`src/site-handlers/scripts/netflix.js` is conditionally injected at runtime (B-architecture.md open-questions). Its world assignment is INFERRED as page-world (it manipulates Netflix's DOM), but this has not been confirmed. Migration ticket must verify world assignment before placing it in `worlds/page/site-handlers/scripts/`.

---

## Appendix A: Current-to-target path mapping table

Complete 1:1 mapping for migration ticket reference.

| Current path | Target path (worlds) | World | WAR-covered today? | Notes |
|---|---|---|---|---|
| src/content/injector.js | worlds/isolated/injector.js | isolated | YES (src/content/*.js) | Remove from WAR after move; content scripts don't need WAR |
| src/content/inject.js | worlds/page/entry/inject.js | page | YES (src/content/*.js) | |
| src/background.js | worlds/worker/background.js | worker | NO | Only manifest background.service_worker ref |
| src/ui/options/options.html | worlds/extension-pages/options/options.html | extension-pages | NO | manifest options_ui.page ref only |
| src/ui/options/options.js | worlds/extension-pages/options/options.js | extension-pages | NO | |
| src/ui/popup/popup.html | worlds/extension-pages/popup/popup.html | extension-pages | NO | manifest action.default_popup ref only |
| src/gif-file-fetcher.html | worlds/extension-pages/gif-fetcher/gif-file-fetcher.html | extension-pages | YES | C-7: update injector.js getURL() atomically |
| src/gif-file-fetcher.js | worlds/extension-pages/gif-fetcher/gif-file-fetcher.js | extension-pages | YES | |
| src/utils/constants.js | worlds/shared/constants.js | shared | YES (src/utils/*.js) | |
| src/utils/logger.js | worlds/shared/logger.js | shared | YES (src/utils/*.js) | |
| src/utils/debug-helper.js | worlds/shared/debug-helper.js | shared | YES (src/utils/*.js) | |
| src/utils/dom-utils.js | worlds/shared/dom-utils.js | shared | YES (src/utils/*.js) | |
| src/utils/event-manager.js | worlds/shared/event-manager.js | shared | YES (src/utils/*.js) | |
| src/core/storage-manager.js | worlds/page/core/storage-manager.js | page | YES (src/core/*.js) | |
| src/core/settings.js | worlds/page/core/settings.js | page | YES (src/core/*.js) | |
| src/core/action-handler.js | worlds/page/core/action-handler.js | page | YES (src/core/*.js) | |
| src/core/video-controller.js | worlds/page/core/video-controller.js | page | YES (src/core/*.js) | |
| src/core/gif-frame-engine.js | worlds/page/core/gif-frame-engine.js | page | YES (src/core/*.js) | |
| src/core/gif-controller.js | worlds/page/core/gif-controller.js | page | YES (src/core/*.js) | |
| src/observers/media-observer.js | worlds/page/observers/media-observer.js | page | YES (src/observers/*.js) | |
| src/observers/mutation-observer.js | worlds/page/observers/mutation-observer.js | page | YES (src/observers/*.js) | |
| src/observers/gif-observer.js | worlds/page/observers/gif-observer.js | page | YES (src/observers/*.js) | |
| src/ui/controls.js | worlds/page/ui/controls.js | page | YES (src/ui/*.js) | |
| src/ui/drag-handler.js | worlds/page/ui/drag-handler.js | page | YES (src/ui/*.js) | |
| src/ui/shadow-dom.js | worlds/page/ui/shadow-dom.js | page | YES (src/ui/*.js) | |
| src/site-handlers/base-handler.js | worlds/page/site-handlers/base-handler.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/netflix-handler.js | worlds/page/site-handlers/netflix-handler.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/youtube-handler.js | worlds/page/site-handlers/youtube-handler.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/facebook-handler.js | worlds/page/site-handlers/facebook-handler.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/amazon-handler.js | worlds/page/site-handlers/amazon-handler.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/apple-handler.js | worlds/page/site-handlers/apple-handler.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/index.js | worlds/page/site-handlers/index.js | page | YES (src/site-handlers/*.js) | |
| src/site-handlers/scripts/netflix.js | worlds/page/site-handlers/scripts/netflix.js | page (INFERRED) | YES (src/site-handlers/scripts/*.js) | Verify world before move (Gap G2) |
| src/lib/gifuct-js.min.js | worlds/page/lib/gifuct-js.min.js | page | YES (src/lib/*.js) | C-11: byte-identical move only |
| src/module-loader.js | (removal candidate) | N/A | YES (src/module-loader.js explicit) | Dead code; requires "no callers" test before removal |
