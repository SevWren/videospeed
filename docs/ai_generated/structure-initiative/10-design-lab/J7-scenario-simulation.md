---
team: Team-J
agent: J7 Scenario Simulator
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: complete
reads:
  - docs/ai_generated/structure-initiative/00-charter.md
  - docs/ai_generated/structure-initiative/10-design-lab/J1-additive-guardrails.md
  - docs/ai_generated/structure-initiative/10-design-lab/J2-runtime-world-layering.md
  - docs/ai_generated/structure-initiative/10-design-lab/J3-feature-sliced.md
  - docs/ai_generated/structure-initiative/10-design-lab/J4-build-step.md
  - docs/ai_generated/structure-initiative/10-design-lab/J5-packages.md
  - docs/ai_generated/structure-initiative/10-design-lab/J6-wildcard.md
confidence: INFERRED — estimates derived from per-design navigability tables and explicit hop counts in each design doc; exact counts require running cold-start trials
---

# J7 — Scenario Simulation: All Designs × Full Task Suite

---

## 1. Methodology

**Evidence class:** INFERRED. Each design (J1–J6) contains an explicit AI-navigability section with per-task hop/files-read estimates. J7 consolidates those estimates into a single cross-design table, resolves gaps where a design document did not cover a task, and adds the extra-scenario simulation (E1–E5 × J1, J4, J6 only, per mission brief).

**Cell format:** `reads_before → reads_after (writes, PBs-at-risk)`

- `reads_before`: files a cold agent must READ before acting or planning, UNDER the design's scaffold (post-migration state if a migration-requiring design).
- `reads_after`: same measure after the scaffold is fully operational. For J1/J6 (additive, no migration) this is the same as the post-scaffold state. For J2–J5 (migration-requiring) this is the projected fully-migrated state.
- `writes`: distinct files the agent would write/change to complete the task.
- `PBs-at-risk`: protected behaviors that a cold agent could inadvertently break while completing the task, given the design's guardrails (or lack thereof).

**Baseline (Arm A):** No scaffold. Agent reads CLAUDE.md + navigates src/ by grep/scan. Baseline files-read from J1 §7 table and J2/J3/J6 task analysis sections.

---

## 2. Design Abbreviations and Key Properties

| Design | Name | Migration required? | New files added | Key navigation mechanism |
|--------|------|--------------------|-----------------|-----------------------------|
| J1 | Additive Guardrails | None | 26 | PB registry + ADRs + AGENTS.md + modules/registry.md |
| J2 | Runtime-World Layering | Phases 0–6 (src/ moves) | ~5 additive docs now; ~35 new paths post-migration | world-map.md + CLAUDE.md world annotations + directory structure |
| J3 | Feature-Sliced | Waves 1–4 (src/ moves) | ~10 additive docs now; ~35 new paths post-migration | Feature-slice directory layout + ADR-0002 + check:structure |
| J4 | Build Step (esbuild) | 11 tickets (all src/ converted) | build.mjs + dist/ + CLAUDE.md | Static import graph + dist/ bundle + source maps |
| J5 | GIF Engine Package | Phase 1–2 (partial src/ moves) | packages/ workspace structure | packages/gif-engine/ directory for GIF tasks; neutral for others |
| J6 | Seam-Map + Assertion Mesh | None | ~28 | SEAM-INDEX.md + per-module seam cards + contract stubs + check:seams |

---

## 3. Main Simulation Table: D1–D12 × J1–J6

### Legend for cell notation
`R:N` = reads (files read before acting), `W:N` = writes, `PB:list` = protected behaviors at risk

Baseline reads (no scaffold) from J1 §7 and J6 §8 analysis; J2 §7 table; J3 §7 table.

---

#### D1 — Add a new Site Handler
*Type: plan. Files touched: new handler, base-handler.js, injector.js (load order), manifest.json (WAR), modules/registry.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 6–8 | 3–4 | P7 (load order), P13 (WAR) | Must find injector.js + manifest.json + base-handler.js pattern by traversal |
| **J1** | 3–4 | 3–4 | P7, P13 | modules/registry.md shows registration pattern; AGENTS.md names the WAR add step in 1 hop |
| **J2** | 4 | 3–4 | P7, P13 | world-map.md clarifies which world site handlers live in; injector still needed |
| **J3** | 2 | 3–4 | P7, P13 | video-control/site-handlers/ groups all handlers; ADR-0002 names cross-slice load order; load-order still requires injector.js read |
| **J4** | 2–3 | 2–3 | P7 | Static import graph; adding handler = 1 new file + 1 import in main.js; no injector.js to read; WAR minimal |
| **J5** | 6–8 (neutral) | 3–4 | P7, P13 | Site handlers not in gif-engine package; J5 provides no navigation gain for D1 |
| **J6** | 2 | 3–4 | P7, P13 | site-handler.seam.md gives exact registration pattern + WAR requirement + load-order position in 1 hop from SEAM-INDEX |

---

#### D2 — Add a new Action
*Type: plan. Files touched: action-handler.js, constants.js (new constant), settings.js (if persisted), inject.js or controls.js (wire up).*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–7 | 3–5 | P10 (window.VSC namespace), P11 (load order) | Must find action-handler.js + event dispatch chain by search |
| **J1** | 3–4 | 3–5 | P10, P11 | AGENTS.md surfaces action dispatch pattern; modules/registry shows chain |
| **J2** | 4 | 3–5 | P10, P11 | world-map.md shows actions are page-world; slight reduction vs baseline |
| **J3** | 2 | 3–5 | P10, P11 | video-control/ slice co-locates action-handler + event-manager; both in one directory |
| **J4** | 2 | 2–3 | P10 | Static import graph; new action = new constant + import in action-handler; no WAR change |
| **J5** | 5–7 (neutral) | 3–5 | P10, P11 | Actions not in gif-engine; no gain |
| **J6** | 2 | 3–5 | P10, P11 | video-controller.seam.md declares namespace action registry; storage-manager.seam.md shows settings chain |

---

#### D3 — GIF disposal=3 renders wrongly (localize)
*Type: localize. Target: disposal logic in gif-controller.js (P3/P5 area).*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–8 | 1–2 | P3 (disposal logic), P5 (bgColor fill), P6 (patchCanvas), P8 (sentinel) | Must traverse HANDOFF.md prose + grep gif-controller.js |
| **J1** | 2–3 | 1–2 | P3, P5 | PB registry → P3/P5 rows with code:line; directly to gif-controller.js |
| **J2** | 2 | 1–2 | P3, P5 | worlds/page/core/gif-controller.js at predictable path; -2 hops vs baseline |
| **J3** | 1–2 | 1–2 | P3, P5 | gif-control/ slice has gif-controller.js immediately; -3 hops vs baseline |
| **J4** | 2 | 1–2 | P3, P5 | Static import points directly to gif-controller.js; source map shows correct line |
| **J5** | 1–2 | 1–2 | P3, P5 | packages/gif-engine/src/gif-controller.js with README naming PBs; largest gain for J5 |
| **J6** | 1 | 1–2 | P3, P5 | gif-controller.seam.md has direct pointer to disposal=2/bgColor logic; P03 contract stub named |

---

#### D4 — Change GIF memory budgets
*Type: plan. Files touched: constants.js (budget values), gif-controller.js, gif-frame-engine.js, tests.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 4–6 | 3–4 | P8 (memory budget), P3, P5 | Must find constant locations across constants.js + gif-controller.js + gif-frame-engine.js |
| **J1** | 2–3 | 3–4 | P8 | PB registry P9 (memory budget) row names all three files; AGENTS.md points there |
| **J2** | 2 | 3–4 | P8 | worlds/page/core/ groups gif-controller + gif-frame-engine; constants in worlds/shared/ |
| **J3** | 1–2 | 3–4 | P8 | gif-control/ has gif-controller + gif-frame-engine; constants in infrastructure/ |
| **J4** | 2 | 3–4 | P8 | Static import graph traces constant dependencies; slightly more complex than J3 |
| **J5** | 1–2 | 3–4 | P8 | packages/gif-engine/ has all budget logic; constants coupling documented (gap noted in J5 §11) |
| **J6** | 2 | 3–4 | P8 | gif-controller.seam.md + gif-frame-engine.seam.md name all budget constants and their locations |

---

#### D5 — Controller does not appear on a given site (localize)
*Type: localize. Trace: blacklist check, handler filtering, validation thresholds, media-observer.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–7 | 0–1 | P12 (site handler exclusion), P9 (blacklist) | Must scan site-handlers/ + inject.js + media-observer.js + base-handler.js |
| **J1** | 3–4 | 0–1 | P12, P9 | REPO_MAP names which handler governs each site; modules/registry shows filtering chain |
| **J2** | 6 | 0–1 | P12, P9 | worlds/page/site-handlers/ groups handlers; worlds/page/observers/ groups observers; slight improvement |
| **J3** | 2–3 | 0–1 | P12, P9 | video-control/site-handlers/ has all handlers; BUT media-observer is in gif-control/ (cross-slice lookup adds 1 hop; J3 §11 acknowledged risk) |
| **J4** | 2–3 | 0–1 | P12, P9 | Static import graph traces handler registration path; slightly better than baseline |
| **J5** | 5–7 (neutral) | 0–1 | P12, P9 | Site handlers and media-observer not in gif-engine package; no gain |
| **J6** | 2 | 0–1 | P12, P9 | site-handler.seam.md names blacklist + handler filtering + validation thresholds directly |

---

#### D6 — Plan PiP hotkey support
*Type: plan (research + design). Uses existing research docs in pip-research/.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 6–9 | 0 | P10 (namespace), P11 (load order if new module needed) | Must find ADR gaps, action-handler.js, settings.js, event-manager.js |
| **J1** | 3–5 | 0 | P10, P11 | ADR index surfaces existing architectural constraints; AGENTS.md points to ADRs |
| **J2** | 4 | 0 | P10, P11 | world-map.md helps identify which world PiP must live in; minor gain |
| **J3** | 3 | 0 | P10, P11 | video-control/ co-locates action-handler + event-manager; -2 vs baseline |
| **J4** | 3 | 0 | P10 | Build step clarifies where to add new entry point; source map aids research |
| **J5** | 6–9 (neutral) | 0 | P10, P11 | PiP not related to GIF engine; no gain |
| **J6** | 3 | 0 | P10, P11 | video-controller.seam.md + storage-manager.seam.md give context; D6 is planning-only so seam cards offer modest gain (J6 §8 confirms "no change" for D6) |

---

#### D7 — Add persisted setting end-to-end
*Type: plan. Full chain: options UI → storage → settings.js → page bridge.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–7 | 4–6 | P1 (storage persistence), P10 (namespace), P11 (load order), P14 (VSC_SAVE_SETTINGS) | Must find options.js + storage-manager.js + settings.js + injector.js bridge + inject.js |
| **J1** | 3–4 | 4–6 | P1, P14 | modules/registry shows settings→storage→page-bridge chain explicitly in 1 hop |
| **J2** | 5 | 4–6 | P1, P14 | world-map.md shows 3-world crossing at a glance; slight improvement |
| **J3** | 2 | 4–6 | P1, P14 | settings/ slice owns full settings chain (settings.js + storage-manager.js + options/); -3 hops vs baseline |
| **J4** | 2–3 | 3–5 | P1, P14 | Static import graph traces settings chain; less manual traversal; P14 (VSC_SAVE_SETTINGS timing) still a risk |
| **J5** | 5–7 (neutral) | 4–6 | P1, P14 | Settings not in gif-engine; no gain |
| **J6** | 2 | 4–6 | P1, P14 | storage-manager.seam.md declares full chain with PB flags in 1 hop from SEAM-INDEX (J6 §8: 6→2 hops) |

---

#### D8 — Plan replacing the vendored GIF decoder
*Type: plan. At risk: C-11 (untouchable), P3–P5 (decoder-dependent GIF behaviors), WAR entry.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–8 | 0 | P1 (gifuct untouchable), P3, P5, P6, P8 | Must find all gifuct consumers across src/ + understand C-11 constraint |
| **J1** | 2–3 | 0 | P1, P3, P5 | PB registry rows for P1/P3/P5/P6/P8 surface all decoder constraints immediately |
| **J2** | 3 | 0 | P1, P3, P5 | worlds/page/lib/ makes gifuct location predictable; -2 hops vs baseline |
| **J3** | 1–2 | 0 | P1, P3, P5 | gif-control/lib/ co-locates gifuct + all consumers; C-11 documented there |
| **J4** | 2 | 0 | P1, P3, P5 | Static import shows exactly which modules use window.__VSC_gifuct; much clearer than scanning |
| **J5** | 1–2 | 0 | P1, P3, P5 | packages/gif-engine/ README documents decoder interface + C-11; best coverage for D8 |
| **J6** | 2 | 0 | P1, P3, P5 | gif-controller.seam.md + gif-frame-engine.seam.md name exact gifuct API surface + C-11 (J6 §8: 3→2 hops) |

---

#### D9 — Trace file:// GIF fetch path end to end (localize)
*Type: localize. Chain: gif-controller.js → VSC_FETCH_GIF_BYTES → injector.js → gif-file-fetcher.html → postMessage → response.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–7 | 0 | P1 (iframe proxy), P14 (VSC_GIF_BYTES_RESPONSE) | Must find HANDOFF.md §4.5 + injector.js iframe setup + gif-controller.js + gif-file-fetcher.js |
| **J1** | 2–3 | 0 | P1 | ADR-0005 maps the entire fetch path in one document; 1 hop from AGENTS.md |
| **J2** | 3 | 0 | P1 | worlds/isolated/injector.js + worlds/extension-pages/gif-fetcher/ make the crossing visible; -2 hops |
| **J3** | 1–2 | 0 | P1 | gif-control/ has gif-file-fetcher.* + gif-controller.js together; injector.js still in infrastructure/ (1 extra hop) |
| **J4** | 2 | 0 | P1 | Build step: gif-file-fetcher.js is separately bundled; chain documented in CLAUDE.md (post-migration requirement) |
| **J5** | 2 | 0 | P1 | ADR for file:// bridge documented in J5 §3.4; gif-controller.js side in package; fetcher side in extension (gap: boundary crossing requires 2 reads) |
| **J6** | 1 | 0 | P1 | gif-fetcher.seam.md declares full iframe-proxy seam in 1 hop (J6 §8: 4→1 hops) |

---

#### D10 — Prepare release package
*Type: plan. Files: manifest.json, package.json, zip script, PRIVACY.md issues.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 4–6 | 0 | None (review task) | Must find npm run zip + manifest.json + PRIVACY.md compliance issues |
| **J1** | 2–3 | 0 | None | MT-002 (PRIVACY.md) surfaces the compliance issue; AGENTS.md points to release runbook |
| **J2** | 5 (neutral) | 0 | None | World layout does not help with release packaging (J2 §7: 0 delta for D10) |
| **J3** | 2 | 0 | None | infrastructure/ slice groups background.js + manifest refs; release runbook in ADR |
| **J4** | 3 | 0 | None | Build step adds complexity: agent must understand dist/ + build:prod + no source maps for release; adds 1–2 reads vs J1 |
| **J5** | 5–6 (negative) | 0 | None | Monorepo adds workspace publish step (J5 §7: slight negative for D10) |
| **J6** | 2 | 0 | None | SEAM-INDEX + injector.seam.md + migration tickets for zip exclusions; modest gain |

---

#### D11 — Plan Firefox support
*Type: plan. Manifest MV2 delta, API shims, world model differences.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 5–8 | 0 | P7 (load order), P11 (load order contract), P13 (WAR) | Must find manifest.json + injector.js + background.js + all chrome.* call sites |
| **J1** | 3–5 | 0 | P7, P11 | ADR-0002 (load-order) explicitly states MV3-specific constraints; ADRs surface chrome.runtime usage |
| **J2** | 4 | 0 | P7, P11 | worlds/isolated/ + worlds/worker/ surface which files are platform-sensitive; -1 hop vs baseline |
| **J3** | 2 | 0 | P7, P11 | infrastructure/ groups background.js + inject + injector; platform files obvious |
| **J4** | 3 | 0 | P7 | esbuild can target browser-specific output; static import shows all chrome.* callers; -2 hops |
| **J5** | 5–8 (neutral) | 0 | P7, P11 | GIF engine package is browser-agnostic but extension integration unchanged; minimal gain |
| **J6** | 2 | 0 | P7, P11 | SEAM-INDEX flags MV3-specific seams; injector.seam.md + site-handler.seam.md name chrome.* API calls (J6 §8: 4→2 hops) |

---

#### D12 — Judge whether mutation-observer.js refactor violates a PB
*Type: plan. Must check: P2 (vscGifIgnore), P3 (sentinel), P5 (disposal), and any observer-crossing PBs.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **Baseline** | 6–10 | 0 | P2, P3, P6 (vscGifIgnore + sentinel cross mutation-observer) | Must read mutation-observer.js + inject.js + gif-controller.js + then back-trace each gotcha via HANDOFF.md |
| **J1** | 2–3 | 0 | P2, P3 | PB registry maps P2/P3 directly to mutation-observer.js lines; 1 hop to all PBs; largest J1 win (J1 §7: -4 to -7) |
| **J2** | 3 | 0 | P2, P3 | worlds/page/observers/ groups mutation-observer.js; all in same world directory; no world-crossing concern (-2 hops per J2 §7) |
| **J3** | 1–2 | 0 | P2, P3 | gif-control/ has mutation-observer.js + gif-observer.js together; D12 judgment in migration ticket ADR |
| **J4** | 2–3 | 0 | P2, P3 | Static import traces which modules depend on mutation-observer.js; clearer than grep |
| **J5** | 6–10 (neutral) | 0 | P2, P3 | mutation-observer.js not in gif-engine package (note: J5 §7 confirms neutral); no gain |
| **J6** | 1 | 0 | P2, P3 | gif-observer.seam.md declares ALL invariants crossing mutation-observer boundary; best coverage (J6 §8: 5→1 hops) |

---

### Summary Table: Estimated Mean Files-Read Across D1–D12

The following reads are mid-point estimates from the ranges above (using post-scaffold state).

| Task | Baseline | J1 | J2 | J3 | J4 | J5 | J6 |
|------|----------|----|----|----|----|----|----|
| D1 | 7.0 | 3.5 | 4.0 | 2.0 | 2.5 | 7.0 | 2.0 |
| D2 | 6.0 | 3.5 | 4.0 | 2.0 | 2.0 | 6.0 | 2.0 |
| D3 | 6.5 | 2.5 | 2.0 | 1.5 | 2.0 | 1.5 | 1.0 |
| D4 | 5.0 | 2.5 | 2.0 | 1.5 | 2.0 | 1.5 | 2.0 |
| D5 | 6.0 | 3.5 | 6.0 | 2.5 | 2.5 | 6.0 | 2.0 |
| D6 | 7.5 | 4.0 | 4.0 | 3.0 | 3.0 | 7.5 | 3.0 |
| D7 | 6.0 | 3.5 | 5.0 | 2.0 | 2.5 | 6.0 | 2.0 |
| D8 | 6.5 | 2.5 | 3.0 | 1.5 | 2.0 | 1.5 | 2.0 |
| D9 | 6.0 | 2.5 | 3.0 | 1.5 | 2.0 | 2.0 | 1.0 |
| D10 | 5.0 | 2.5 | 5.0 | 2.0 | 3.5 | 5.5 | 2.0 |
| D11 | 6.5 | 4.0 | 4.0 | 2.0 | 3.0 | 6.5 | 2.0 |
| D12 | 8.0 | 2.5 | 3.0 | 1.5 | 2.5 | 8.0 | 1.0 |
| **Mean** | **6.3** | **3.1** | **3.8** | **2.0** | **2.6** | **5.4** | **1.9** |
| **Reduction vs baseline** | — | **-51%** | **-40%** | **-68%** | **-59%** | **-14%** | **-70%** |

> All estimates are INFERRED from design documents. Exact values require cold-start trial execution per charter §6 criterion 6.

---

## 4. Extra Scenarios: E1–E5 × J1, J4, J6

Only J1, J4, and J6 are evaluated for extra scenarios (representative sample per mission brief).

---

#### E1 — Add Picture-in-Picture hotkey support (using pip-research/ docs)

*New hotkey, new PiP action, wiring through action-handler.js, possibly new setting.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **J1** | 3–4 | 3–5 | P10 (namespace), P11 (load order) | AGENTS.md + ADR index surfaces existing action pattern; modules/registry shows where new action registers; pip-research/ docs would still need reading (2 extra reads) |
| **J4** | 2–3 | 2–4 | P10 | Static import graph: agent reads action-handler.js imports to find pattern; new PiP action = 1 import + 1 file; build step validated by esbuild; pip-research/ docs still required |
| **J6** | 2–3 | 3–5 | P10, P11 | video-controller.seam.md shows action registration seam + settings chain; pip-research/ docs needed separately; seam card makes the integration pattern clear in 1 hop |

---

#### E2 — Support Firefox (manifest delta, API shims)

*MV3 → MV2/3 manifest changes, `browser.*` shims for `chrome.*` calls, background page vs service worker.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **J1** | 4–5 | 3–5 | P7, P11, P13 | ADR-0002 surfaces load-order MV3 constraints; ADR-0001 surfaces no-ESM reasoning (relevant for Firefox MV2); modules/registry shows all chrome.* call sites via WAR; still need manifest.json + injector.js reads |
| **J4** | 3–4 | 5–8 | P2, P11 | Static import graph enumerates all chrome.* callers automatically; esbuild can target different entry points per browser; BUT manifest is NOT in the static graph — still needs explicit read; P2 (load order) is highest risk during manifest.json delta migration |
| **J6** | 3–4 | 3–5 | P7, P11, P13 | SEAM-INDEX flags MV3-specific seams; injector.seam.md names all chrome.* API dependency points; gif-fetcher.seam.md flags origin trust issue which Firefox handles differently; still need manifest.json read |

---

#### E3 — Add a new animated-image format (WebP animation support)

*New observer branch for WebP `<img>`, new controller module parallel to gif-controller.js, possible new WAR entry.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **J1** | 3–5 | 5–7 | P1 (gifuct untouchable — must not use for WebP), P2, P3, P5, P8 | PB registry immediately flags which GIF PBs are gif-specific vs. generic (preventing agent from cargo-culting gif patterns that don't apply to WebP); modules/registry shows where to register; ADRs explain iframe-proxy origin constraint |
| **J4** | 3–4 | 4–6 | P1, P2, P3 | Static import graph shows how gif-controller.js plugs in; agent can mirror that pattern; esbuild validates import graph; risk: P2 (load order side effects) if agent copies window.VSC registration pattern incorrectly without the shim |
| **J6** | 2–3 | 5–7 | P1, P2, P3, P8 | gif-controller.seam.md explicitly declares which seams are GIF-decoder-specific (C-11) vs. canvas-replacement generic; seam card acts as a "what to replicate vs. what to skip" guide; memory-budget seam card (P8) warns that budgets are currently gif-only |

---

#### E4 — Migrate a settings schema (add new field, migrate existing users)

*New setting field in constants.js, migration logic in storage-manager.js (read old → write new), options UI update, settings.js default.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **J1** | 3–4 | 4–6 | P1 (storage persistence), P14 (VSC_SAVE_SETTINGS no-validation — new field must not allow injection) | modules/registry shows settings chain; MT-001 (payload validation) migration ticket warns agent about the unvalidated handler; PB registry P1 row points to storage-manager.js migration pattern |
| **J4** | 2–3 | 3–5 | P1, P14 | Static import traces full settings chain; new field propagation visible via imports; P14 risk is same (unvalidated CustomEvent) but esbuild type system does not catch it; agent still needs to read storage-manager.js for migration pattern |
| **J6** | 2–3 | 4–6 | P1, P14 | storage-manager.seam.md names VSC_SAVE_SETTINGS gap (C-4 flag) explicitly; migration ticket reference in seam card means agent sees the risk in 1 hop; settings chain readable from seam card without traversing source |

---

#### E5 — Upgrade the vendored GIF decoder (gifuct-js.min.js replacement)

*Replace src/lib/gifuct-js.min.js with newer version; must preserve C-11 behavioral compatibility; all GIF PBs at risk.*

| Design | Reads before act | Writes | PBs at risk | Notes |
|--------|-----------------|--------|-------------|-------|
| **J1** | 2–3 | 1 (only gifuct-js.min.js itself) | P1, P3, P4, P5, P6, P7, P8 (all GIF PBs) | PB registry immediately names all 8 GIF PBs and their code:line pointers; ADR-0005 and ADR-0004 surface the behavioral contracts that the new decoder must satisfy; contract stubs for P2–P6 would catch regressions before the upgrade lands |
| **J4** | 2–3 | 2 (gifuct-js.min.js + build.mjs if bundle changes) | P1, P3, P4, P5, P6, P7, P8 | Static import graph shows where window.__VSC_gifuct is read; esbuild handles the vendored file as external (no recompilation needed); BUT: no contract tests for P3/P5 in baseline — agent must know to verify manually. J4 does not add GIF-specific tests; risk is same as J1 minus the registry gain |
| **J6** | 1–2 | 1 | P1, P3, P4, P5, P6, P7, P8 | gif-controller.seam.md names exact gifuct API surface (frame objects, loop count, disposal fields) + C-11; P02–P08 contract stubs are executable; agent can verify each PB via contract test before and after replacement; lowest risk profile of the three designs for E5 |

---

## 5. Summary: Best and Worst Design per Task Category

### By task category

#### Localize tasks (D3, D5, D9, D12)
Best design: **J6** (mean 1.25 files, seam cards give 1-hop localization for all four)
Second best: **J3** (mean 1.5–2 files, feature slices co-locate all related files)
Worst design: **J5** (neutral or no gain for D5/D12; only helps D3/D9)

#### Plan tasks — GIF domain (D4, D6, D8)
Best design: **J6** (seam cards name all affected files; mean 2.3)
Close second: **J3** (gif-control/ slice; mean 2.0) and **J5** (packages/gif-engine/; mean 1.5 for D4/D8)
Worst design: **J5** is actually best for D4/D8 but neutral for D6; **J2** gives modest improvement

#### Plan tasks — Settings/Storage (D7)
Best design: **J3** and **J6** (tie; both 2 reads)
Worst design: **J5** (neutral)

#### Plan tasks — Platform/Release (D10, D11)
Best design: **J6** and **J1** (tie; ADRs + seam cards give best platform insight)
Worst design: **J4** (adds build complexity to D10) and **J5** (negative for D10)

#### Add-new tasks (D1, D2)
Best design: **J6** (seam cards give exact registration pattern in 2 reads)
Second best: **J3** (feature slices co-locate related files; 2 reads)
Worst design: **J5** (neutral; site handlers and actions not in gif-engine)

---

### Overall ranking by mean files-read reduction

| Rank | Design | Mean files-read (D1–D12) | Reduction vs. baseline |
|------|--------|--------------------------|------------------------|
| 1 | **J6** (Seam-Map + Assertion Mesh) | **1.9** | **-70%** |
| 2 | **J3** (Feature-Sliced) | **2.0** | **-68%** |
| 3 | **J4** (Build Step) | **2.6** | **-59%** |
| 4 | **J1** (Additive Guardrails) | **3.1** | **-51%** |
| 5 | **J2** (Runtime-World Layering) | **3.8** | **-40%** |
| 6 | **J5** (GIF Engine Package) | **5.4** | **-14%** |

**Best median files-read improvement: J6**, followed immediately by J3.

**Important caveat**: J3 and J4 require full source migrations. J6 and J1 are additive-only and are executable immediately. When normalized by migration risk, J6 is the clear winner: it achieves near-J3 navigability without any src/ moves.

---

## 6. Tasks Worst Served by Each Design

| Design | Worst task(s) | Reason |
|--------|---------------|--------|
| **J1** | D12 (judge mutation-observer refactor) | Agent still reads full gif-controller.js (8k tokens); PB registry helps but does not eliminate the read |
| **J2** | D5 (controller not appearing), D10 (release) | World layout does not help with handler debugging or release packaging; D5 requires traversing multiple world directories |
| **J3** | D5 (media-observer in gif-control/, cross-slice lookup), D6 (load-order discovery across slices) | Cross-slice penalty for D5; H2 risk (load-order obscurity) affects D6 and D11 |
| **J4** | D10 (release), D6 (PiP planning) | Build step adds complexity to release workflow (dist/ layer, build:prod docs needed); D6 requires understanding build entry points |
| **J5** | D1 (add site handler), D2 (add action), D5 (controller debug), D6 (PiP), D7 (settings), D12 (mutation-observer) | All neutral for any task outside the GIF engine; zero gain for 7 of 12 D-tasks |
| **J6** | D6 (PiP hotkey planning) | D6 is planning-only with no direct code seam; seam cards provide little advantage over baseline for pure design research tasks |

---

## 7. Protected Behaviors Most at Risk in Migration-Requiring Designs (J2–J5)

### J2 (Runtime-World Layering migration, Phases 1–6)

| PB | Risk | Trigger |
|----|------|---------|
| P7 / P11 (load order contract) | **CRITICAL** | Phase 4: each page-world module move requires atomic injector.js + manifest.json WAR update; a partial commit breaks injection silently |
| P1 (gif-file-fetcher iframe proxy) | **HIGH** | Phase 3: gif-file-fetcher.html path change requires atomic getURL() update in injector.js (C-7); any window of mismatch breaks file:// GIF fetch |
| P13 (chrome.runtime.getURL WAR) | **HIGH** | Phase 5: injector.js moves to isolated/; content_scripts manifest key must update atomically |
| P10 / P12 (storage bridge) | **MEDIUM** | Phase 4: storage-manager.js move; if worlds/page/ path reference in injector.js is wrong, settings bridge fails silently |

### J3 (Feature-Sliced migration, Waves 1–4)

| PB | Risk | Trigger |
|----|------|---------|
| P7 / P11 (load order contract) | **CRITICAL** | Wave 4 (infrastructure/ moves): injector.js path list crosses 4 slices; agent confusion about cross-slice load order is the primary J3 risk (H2) |
| P1 (gif-file-fetcher iframe proxy) | **HIGH** | Wave 3: gif-file-fetcher.* move to gif-control/ requires atomic getURL() update + WAR update (C-7) |
| P10 (window.VSC namespace) | **HIGH** | Wave 2–3: any slice move that leaves a module's window.VSC registration out of sync with the injector.js load list silently drops the registration |
| P9 (gifuct-js.min.js untouchable) | **HIGH** | Wave 3, M3-5: gifuct move must be byte-identical (C-11); verification by md5sum required |
| P12 (site handler exclusion) | **MEDIUM** | Wave 2: site-handlers/ move; WAR wildcard updates; new glob must exactly cover the slice directory |

### J4 (Build Step migration, Tickets M1–M11)

| PB | Risk | Trigger |
|----|------|---------|
| P2 (load order → import graph) | **CRITICAL** | M5–M8: window.VSC registration removal replaces runtime load order with static import graph; any module with initialization side effects that assume window.VSC is pre-populated will fail silently (J4 §5 P2 row) |
| P3 (double-load guard) | **HIGH** | M8: IIFE bundle removes window.VSC guard; if content script is injected twice (iframe scenario), all controllers double-register (J4 §11 F1) |
| P11 (VSC_SAVE_SETTINGS timing) | **HIGH** | M5–M8: handler registration must occur before the event can fire; import order determines this, not explicit injector.js sequence; circular dependencies could break this |
| P1 (gif-file-fetcher iframe proxy) | **HIGH** | M9: WAR + getURL() atomic update; F4 in J4 §11 identifies this as the hardest-to-diagnose failure mode |
| P12 (VSC_GIF_BYTES_RESPONSE timing) | **MEDIUM** | M8: postMessage handler registration order in bundle; must verify before/during M9 (J4 §5 P12) |

### J5 (GIF Engine Package, Phase 1–2)

| PB | Risk | Trigger |
|----|------|---------|
| P9 (gifuct-js.min.js untouchable C-11) | **HIGH** | Phase 1: file copy to packages/gif-engine/src/lib/; original must remain byte-identical; copy drift risk if vendor is later updated (J5 §11 "gifuct copy drift") |
| P10 (window.VSC namespace) | **HIGH** | Phase 1 shim: dual registration (ES export + window.VSC) creates two sources of truth; if shim is removed too early (Phase 2 before full migration), injection fails |
| P1–P8 (all GIF behaviors) | **HIGH** | Phase 2: WAR + injector.js update for bundled gif-engine; any mismatch between package.json version and WAR entry silently breaks GIF feature |
| J4-dependency risk | **CRITICAL** | Phase 2 cannot execute without J4 build pipeline; if J4 is adopted but J5 Phase 2 is attempted without verifying gifuct timing (F3 in J4), gif-controller.js reads window.__VSC_gifuct before it is set |

---

## 8. Context Cost Improvement vs. Baseline

Context cost = tokens loaded before the agent can act. Derived from J1 §9 estimates and INFERRED proportionally for other designs.

| Design | Always-loaded addition | Max 2-hop context | Per-task working set | Baseline always-loaded |
|--------|----------------------|-------------------|---------------------|------------------------|
| Baseline | ~1,224 (CLAUDE.md only) | unlimited (no scaffold) | 6.3 files × ~3k tokens avg = ~19k | 1,224 tokens |
| **J1** | +800 (AGENTS.md) | ~4,500 tokens (AGENTS.md + PB registry + modules/registry + 1 ADR) | 3.1 files × ~3k = ~9.3k tokens | 2,024 tokens |
| **J2** | +600 (world-map.md) | ~3,500 tokens | 3.8 files × ~3k = ~11.4k tokens | 1,824 tokens |
| **J3** | +600 (ADR-0002 + CLAUDE.md update) | ~3,000 tokens | 2.0 files × ~3k = ~6k tokens | 1,824 tokens |
| **J4** | +1,000 (build docs + CLAUDE.md) | ~5,000 tokens (includes dist/ explanation) | 2.6 files × ~3k = ~7.8k tokens | 2,224 tokens |
| **J5** | +400 (workspace README) | ~2,500 for GIF tasks; ~6k for others | 5.4 files × ~3k = ~16.2k tokens | 1,624 tokens |
| **J6** | +800 (AGENTS.md + SEAM-INDEX) | ~3,000 tokens (SEAM-INDEX + 1 seam card + 1 contract stub) | 1.9 files × ~3k = ~5.7k tokens | 2,024 tokens |

**Largest context cost improvement per task:** J6 achieves the smallest per-task working set (5.7k tokens average) with a modest always-loaded increase (800 tokens).

---

## 9. Key Findings

1. **Best overall design for median files-read improvement: J6** (Seam-Map + Assertion Mesh) at -70%, narrowly ahead of J3 (-68%). J6 achieves near-J3 navigability without any src/ migration risk.

2. **Best designs by category:**
   - Localize tasks: J6 (1-hop seam cards), then J3 (co-located slices)
   - GIF-domain plan tasks: J5 for D4/D8 specifically, J6 overall
   - Add-new plan tasks: J6 and J3 tie (both 2 reads)
   - Platform/release tasks: J1 and J6 (ADRs + seam cards; J4 hurts D10)

3. **Worst design by breadth: J5** (-14% mean). It delivers large gains for GIF-domain tasks (D3, D4, D8) but is completely neutral for 7 of 12 D-tasks.

4. **Highest-risk protected behaviors during migration:**
   - **P7/P11 (load order contract):** At risk in J2, J3, and J4. Every migration that touches injector.js must update load order atomically with manifest.json WAR.
   - **P1 (gif-file-fetcher iframe proxy, C-7):** At risk in J2, J3, J4. getURL() call must update atomically with file move. J4's F4 failure mode is the hardest to diagnose.
   - **P3 (double-load guard):** At risk only in J4. Bundled IIFE removes the window.VSC guard; real-Chrome iframe regression cannot be caught in JSDOM.
   - **P2 (load order → import graph, J4):** Critical and unique to J4. Every module with initialization side effects must be audited before M5 (J4 M2 audit ticket).

5. **Mean files-read improvement summary:**
   - J1: -51% (3.1 files), additive only, executable now
   - J2: -40% (3.8 files), requires full src/ migration
   - J3: -68% (2.0 files), requires full src/ migration
   - J4: -59% (2.6 files), requires full src/ migration + build toolchain
   - J5: -14% (5.4 files), GIF-domain only; neutral for most tasks
   - J6: -70% (1.9 files), additive only, executable now

6. **Recommended path:** Adopt J6 (or J1 as a lower-maintenance alternative) immediately on the additive branch. Plan J3 migration as a follow-on initiative gated on the J6 contract stubs reaching green. J4 and J5 are contingent on J3 completion and carry the highest migration risk.

---

*End of J7 Scenario Simulation.*
*Output path: `docs/ai_generated/structure-initiative/10-design-lab/J7-scenario-simulation.md`*
*This document is simulation-only. No files in `src/**`, `manifest.json`, `LICENSE`, or `PRIVACY.md` were modified.*
