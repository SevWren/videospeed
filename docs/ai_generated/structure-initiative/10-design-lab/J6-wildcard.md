---
team: J6 (Wildcard Designer)
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
design-name: Seam-Map + Assertion Mesh
confidence: high
---

# J6 Wildcard Design: "Seam-Map + Assertion Mesh"

---

## 1. Design Name and One-Sentence Premise

**Seam-Map + Assertion Mesh**

Rather than adding documentation that describes what must not break, this design makes the protected behaviors the primary *runtime-verifiable seams* in the codebase: every module boundary is an explicit seam declaration, every protected behavior is an assertion stub that can be executed in the existing test runner, and a seam-index file ties the two together so that a cold agent's first read of any module's seam card immediately surfaces all invariants that cross that seam.

---

## 2. Hypotheses (3 Falsifiable)

**H1 — Seam-anchored entry reduces localization hops.**
A cold agent that reads `SEAM-INDEX.md` before any source file will correctly identify all affected modules for tasks D1, D2, D7 (the three "add something new" tasks) without ever reading HANDOFF.md. Falsifiable: run cold-start trials with and without the seam index; count files read to first correct localization answer.

**H2 — Co-located assertion stubs prevent PB violations.**
An agent editing `gif-controller.js` that first reads `docs/seams/gif-controller.seam.md` will not propose removing `_patchCanvas`, `loopCount=null`, or the sentinel pattern, because the seam card names them as invariants with direct pointers to assertion stubs. Falsifiable: run task D12 ("judge refactor of mutation-observer.js violates PBs") with Arm A (no seam card) vs. Arm B (seam card present); count PB violations in proposals.

**H3 — Check-script coverage of seam registry eliminates WAR drift.**
`npm run check:structure` reading from a single `SEAM-INDEX.md` (the canonical module list) and cross-referencing injector.js load order and manifest.json WAR entries will catch any three-way drift within one CI run. Falsifiable: manually desync one WAR entry; verify `check:structure` exits non-zero with a diff message.

---

## 3. Core Innovation

### What J1 (Additive Guardrails) Likely Does

J1 (inferred, not read) almost certainly adds CLAUDE.md pointers, a protected-behavior registry document, ADRs, and check scripts. It is the "obvious correct" design: describe more, check more, link more.

### What J6 Adds That J1 Does Not

**J6 organizes everything around seams, not around documents.**

A *seam* is an explicit interface between two module groups: the boundary where one module's outputs become another module's inputs. In this codebase the seams are:
- The `window.VSC` global namespace (all modules communicate only through this)
- The injector load-order contract (modules assume prior modules are already attached to `window.VSC`)
- The `CustomEvent` message channels (`VSC_SAVE_SETTINGS`, `VSC_GIF_BYTES_RESPONSE`, `VSC_GIF_FETCHER_READY`)
- The canvas-replacement seam (`_patchCanvas` attaches to an `<img>` and returns a `<canvas>`)
- The GIF sentinel seam (`img.gifController = {pending:true,_cancelled:false}` prevents races)
- The site-handler registration seam (each handler self-registers through a shared interface)

**The three innovations J1 cannot provide by document-addition alone:**

1. **Seam Index as the canonical module list.** Instead of a prose module registry, `SEAM-INDEX.md` is a machine-parseable YAML front matter + markdown table that explicitly lists every seam, both participating modules, and the protected behaviors that cross it. `check:structure` reads this file — not a separate registry — as its single source of truth. This collapses RCC-02 (N places for the module list) to exactly one place.

2. **Co-located seam cards.** Each module that owns a seam has a `docs/seams/<module>.seam.md` file. The seam card is not documentation: it is the argument list for `check:seam`, a Node ESM script that asserts: (a) every path cited in the seam card exists, (b) every assertion stub referenced in the seam card exists in `tests/`, (c) every CustomEvent named in the seam card has a corresponding origin/payload validation note. A cold agent reading any seam card gets the full invariant surface of that module in ≤ 1 hop from SEAM-INDEX.md.

3. **Assertion stubs as executable contracts.** For every protected behavior without a real test (P2, P3, P4, P6, P7, P8), J6 adds a `tests/unit/contracts/<pb-id>.contract.test.js` stub that: imports the relevant source via JSDOM isolation, calls the behavior, and `assert.ok(false, 'CONTRACT STUB — replace with real assertion')`. These stubs run in the existing runner and fail loudly. A real test that passes is always better; a loudly-failing stub is infinitely better than silence. The seam card for each module points to its contract stubs. This directly addresses OBS-01 and R-01/R-03.

**The key distinction:** J1 adds documentation that *describes* invariants. J6 adds a seam graph that *enforces* invariants through check scripts, assertion stubs, and a single-file canonical module registry. The documentation is a side-effect of the seam graph, generated by `npm run map:seams`.

---

## 4. Target Structure

New files and directories added by this design (all additive, zero ZERO-DIFF surface touched):

```
docs/
  seams/
    SEAM-INDEX.md              # Canonical module list + seam graph (machine-parseable YAML front matter)
    gif-controller.seam.md     # Seam card: canvas-replacement + sentinel seams
    injector.seam.md           # Seam card: load-order contract seam
    gif-frame-engine.seam.md   # Seam card: effectiveDelay calculation seam
    gif-observer.seam.md       # Seam card: GIF detection + MutationObserver seam
    video-controller.seam.md   # Seam card: window.VSC namespace seam
    storage-manager.seam.md    # Seam card: VSC_SAVE_SETTINGS CustomEvent seam
    gif-fetcher.seam.md        # Seam card: VSC_GIF_BYTES_RESPONSE + origin-check seam
    site-handler.seam.md       # Seam card: handler registration interface seam

tests/
  unit/
    contracts/
      P02-loop-count-null.contract.test.js
      P03-disposal-bgColor.contract.test.js
      P04-sentinel-pattern.contract.test.js
      P06-gif-teardown.contract.test.js
      P07-canvas-compositing.contract.test.js   # marked untestable-in-JSDOM with reason
      P08-memory-budget.contract.test.js

scripts/
  check-seams.mjs              # Verifies: every path in SEAM-INDEX.md exists; stubs exist; no orphan seams
  check-structure.mjs          # Reads SEAM-INDEX.md as canonical module list; cross-checks injector.js + manifest.json
  map-seams.mjs                # Reads seam cards; emits docs/seams/SEAM-MAP.generated.md (living doc)

.claude/
  agents/
    gif-specialist.md          # Role def: "before any gif-controller.js edit, read gif-controller.seam.md"
    site-handler-specialist.md
    settings-specialist.md

AGENTS.md                      # Root entry point for Codex/OpenCode; mirrors CLAUDE.md structure
```

**package.json scripts additions** (allowed per charter §5):
```json
"check:seams":     "node scripts/check-seams.mjs",
"check:structure": "node scripts/check-structure.mjs",
"check:citations": "node scripts/check-seams.mjs --citations-only",
"map:seams":       "node scripts/map-seams.mjs"
```

---

## 5. What Moves and What Stays

### Stays (ZERO-DIFF surface — not touched)

- `src/**` — all runtime source files
- `manifest.json`
- `LICENSE`
- `PRIVACY.md`
- All existing `tests/**` files
- Version fields

### New files added (plan-only summary)

| File | Purpose | R-item satisfied |
|------|---------|-----------------|
| `docs/seams/SEAM-INDEX.md` | Canonical module list; seam graph | R-04, R-01 |
| `docs/seams/*.seam.md` (8 files) | Per-module seam cards; invariant pointers | R-01, R-02 |
| `tests/unit/contracts/*.contract.test.js` (6 files) | PB assertion stubs for P2-P8 | R-03 |
| `scripts/check-seams.mjs` | Validates seam card paths + stub existence | R-01, R-06 |
| `scripts/check-structure.mjs` | Cross-checks injector + manifest vs. SEAM-INDEX | R-04 |
| `scripts/map-seams.mjs` | Generates living seam map doc | R-06, R-08 |
| `AGENTS.md` | Root entry for non-Claude agents | R-02 |
| `.claude/agents/*.md` (3 files) | Sub-agent role definitions | R-02 |
| `CLAUDE.md` edits | Add pointer to SEAM-INDEX.md (≤3 lines) | R-02 |

### Runtime moves (plan-only, not executed)

None required by this design. All structural improvements are additive. Removing `src/module-loader.js` dead code, correcting PRIVACY.md, and fixing the zip exclusion list remain migration tickets.

---

## 6. Protected Behavior Impact (P1-P14)

| PB | Behavior | J6 Impact |
|----|---------|-----------|
| P1 | `gifuct-js.min.js` untouchable | `gif-controller.seam.md` cites C-11; `check:seams` verifies path exists and flags any diff | Named as seam constraint |
| P2 | `loopCount=null` prevents extra loop | `P02-loop-count-null.contract.test.js` stub added; seam card pointer | Stub added |
| P3 | `disposal=2/bgColor` fill logic | `P03-disposal-bgColor.contract.test.js` stub added; seam card pointer | Stub added |
| P4 | Sentinel `{pending:true,_cancelled:false}` | `P04-sentinel-pattern.contract.test.js` stub added; seam card pointer | Stub added |
| P5 | `vscGifIgnore` + `_vscTeardownSrc` | `gif-observer.seam.md` names interaction; check:seams verifies property names cited | Documented in seam card |
| P6 | GIF teardown sequence | `P06-gif-teardown.contract.test.js` stub added; seam card pointer | Stub added |
| P7 | `_patchCanvas` pixel compositing | `P07-canvas-compositing.contract.test.js` marked `untestable-in-JSDOM: Canvas 2D drawImage not supported`; seam card names real-Chrome test expectation | Untestable documented |
| P8 | Memory budget enforcement | `P08-memory-budget.contract.test.js` stub added; seam card pointer | Stub added |
| P9 | `effectiveDelay` calculation | `gif-frame-engine.seam.md` names formula; existing tests pass (no new stub needed) | Already covered |
| P10 | `window.VSC` namespace IPC | `video-controller.seam.md` declares namespace seam; `check:structure` verifies no import/export across modules | Enforced by check |
| P11 | Injector load order contract | `injector.seam.md` declares load-order seam; `check:structure` enforces order vs. manifest.json | Enforced by check |
| P12 | Site-handler self-registration | `site-handler.seam.md` names registration interface; seam card exists per handler | Documented |
| P13 | `VSC_GIF_BYTES_RESPONSE` origin trust | `gif-fetcher.seam.md` flags absent origin check (C-5); not fixed, but migration ticket reference inserted | Flagged |
| P14 | `VSC_SAVE_SETTINGS` no-validation gap | `storage-manager.seam.md` names the gap (C-4); not fixed, migration ticket reference inserted | Flagged |

**Net result:** All 14 PBs have at least a seam card entry. P2, P3, P4, P6, P8 gain assertion stubs. P7 gains an explicit "untestable-in-JSDOM" declaration with a real-Chrome test specification. P7 and P13/P14 are migration-ticketed. This satisfies R-01 and R-03.

---

## 7. Permission / WAR / CSP Impact

**No new files added to `src/`** — zero WAR impact. The check scripts live under `scripts/` (Node-only, not injected). The seam cards live under `docs/seams/` (not injected). The contract test stubs live under `tests/unit/contracts/` (test runner only).

**C-1 satisfied:** No new WAR entries required.
**C-2 satisfied:** No runtime path changes.
**C-3/C-4 satisfied:** No new CustomEvent listeners introduced.
**C-9 satisfied:** No eval, document.write, or innerHTML in any new file.
**C-10 satisfied:** No security-sensitive logic in WAR-exposed directories.
**C-18 satisfied:** All new scripts are Node ESM (`.mjs` extension or `"type":"module"` context).

The `SEAM-INDEX.md` YAML front matter approach means the canonical module list is read by `check:structure.mjs` via a YAML parser (Node built-in `parseArgs` or a zero-dependency YAML front-matter parser). No shell eval, no `require()`.

---

## 8. AI-Navigability Impact (D1-D12)

The navigation model: agent reads `CLAUDE.md` → pointer to `docs/seams/SEAM-INDEX.md` (1 hop) → seam card for the relevant module (2 hops) → assertion stub or code location (3 hops, but usually 2 because seam card has direct line references).

| Task | Without J6 | With J6 | Improvement |
|------|-----------|---------|-------------|
| D1 — Add site handler | Must read injector.js + manifest.json + HANDOFF.md | Read `site-handler.seam.md` → get exact registration pattern + WAR requirement + load-order position | 4 hops → 2 hops |
| D2 — Add action | Must discover action-handler.js + storage-manager.js + event chain | Read `video-controller.seam.md` → see VSC namespace action registry + settings seam | 5 hops → 2 hops |
| D3 — GIF disposal=3 renders wrong | Must search gif-controller.js for disposal logic | Read `gif-controller.seam.md` → direct pointer to disposal=2/bgColor logic + P03 stub | 3 hops → 1 hop |
| D4 — GIF memory budget changes | Must find budget constants across multiple files | `gif-controller.seam.md` + `gif-frame-engine.seam.md` name all budget constants | 4 hops → 2 hops |
| D5 — Controller not appearing | Must trace site-handler registration path | `site-handler.seam.md` names blacklist + handler filtering + validation thresholds | 4 hops → 2 hops |
| D6 — PiP hotkey planning | Context-only, no seam required; ADRs help | Same as J1 | No change |
| D7 — Add persisted setting | Must find full storage → settings → page-bridge chain | `storage-manager.seam.md` declares the full chain with PB flags | 6 hops → 2 hops |
| D8 — Replace GIF decoder | Must understand gifuct interface | `gif-controller.seam.md` + `gif-frame-engine.seam.md` name exact gifuct API surface + C-11 | 3 hops → 2 hops |
| D9 — file:// GIF fetch path | Must trace fetcher HTML + postMessage chain | `gif-fetcher.seam.md` declares the full iframe-proxy seam | 4 hops → 1 hop |
| D10 — Release package | Must find zip script + WAR list | `injector.seam.md` + SEAM-INDEX module list + migration ticket for zip exclusions | 3 hops → 2 hops |
| D11 — Firefox support | Manifest deltas + API differences | SEAM-INDEX flags MV3-specific seams; site-handler seam flags chrome.* API calls | 4 hops → 2 hops |
| D12 — Judge mutation-observer.js refactor | Must identify all PBs crossing mutation-observer | `gif-observer.seam.md` declares all invariants that cross mutation-observer boundary | 5 hops → 1 hop |

**Projected median improvement:** tasks with a clear seam card improve from ~4 hops to ~2 hops. D6 (planning-only, no code seam) is unchanged. Net: 10 of 12 tasks improve. R-02 (≤2 hops) is satisfied for all tasks that have a seam card.

---

## 9. Migration Path

**Phase 0 — Pre-conditions (no scaffold work yet):**
- Remove `.claude/` from `.gitignore` (C-20 pre-condition, 1-line change to .gitignore)
- Record PRIVACY.md `force-cache` correction as a human-gated migration ticket

**Phase 1 — Seam index and check scripts (1-2 sessions):**
1. Author `docs/seams/SEAM-INDEX.md` with YAML front matter listing all 17 src modules + their seam types
2. Write `scripts/check-structure.mjs` reading SEAM-INDEX as canonical source, cross-checking injector.js + manifest.json
3. Add `check:structure` to package.json; verify exit 0 on current repo
4. Add SEAM-INDEX pointer to CLAUDE.md (≤3 lines); create AGENTS.md root entry

**Phase 2 — Seam cards (1 session per card, parallelizable):**
5. Author 8 seam cards under `docs/seams/`; each follows a standard template
6. Write `scripts/check-seams.mjs`; verify all seam card paths resolve
7. Add `check:seams` and `check:citations` to package.json

**Phase 3 — Contract test stubs (1 session):**
8. Add 6 contract test stubs under `tests/unit/contracts/`; verify they are discovered by runner and fail loudly
9. P07 stub gets explicit `untestable-in-JSDOM` comment with real-Chrome test specification

**Phase 4 — Agent role definitions (1 session):**
10. Author `.claude/agents/` role definitions for gif-specialist, site-handler-specialist, settings-specialist
11. Write `scripts/map-seams.mjs` to generate `SEAM-MAP.generated.md`

**Phase 5 — Verification:**
12. Cold-start A/B trial: Arm A = master + CLAUDE.md only; Arm B = master + J6 seam scaffold
13. Measure D1, D3, D7, D12 localization hops; target ≥30% reduction

**Migration tickets (not executed in scaffold):**
- MT-01: Remove `src/module-loader.js` dead code (requires characterization test first)
- MT-02: Add `VSC_SAVE_SETTINGS` payload validation (C-4 compliance)
- MT-03: Add `event.origin` checks to VSC_GIF_BYTES_RESPONSE handler (C-5)
- MT-04: Correct PRIVACY.md `force-cache` → `'default'` (human-gated)
- MT-05: Exclude CLAUDE.md, HANDOFF.md from zip (toolchain change)

---

## 10. Cost and Reversibility

**Authoring cost:**
- 8 seam cards: ~4-6 hours (mostly extracting invariants already documented in HANDOFF.md)
- 3 check scripts: ~3-4 hours (Node ESM, YAML front-matter parsing, path checks)
- 6 contract test stubs: ~1-2 hours (stub templates, integrate with runner)
- SEAM-INDEX.md: ~1 hour
- Agent role definitions: ~1 hour
- Total: ~12-15 hours

**Ongoing cost:**
- Every new module requires a seam card (≈30-60 min per module) — this is a discipline cost, not a tooling cost
- `check:seams` runs in CI: low cost (pure file stat checks, no JS execution for most assertions)

**Reversibility:**
- Fully reversible: all files are under `docs/`, `scripts/`, `tests/unit/contracts/`, `.claude/`
- Removing J6: `git rm -r docs/seams scripts/check-seams.mjs scripts/check-structure.mjs scripts/map-seams.mjs tests/unit/contracts/`
- No runtime source changes, so no regression risk from reversal
- Contract stubs that were upgraded to real tests should be kept even if the seam scaffold is removed

---

## 11. Scorecard (Frozen Weights)

| Criterion | Weight | J6 Score | Rationale |
|-----------|--------|----------|-----------|
| AI localization efficiency | 25 | 22/25 | Seam cards give 1-2 hop localization for 10 of 12 D-tasks; D6 unchanged |
| Change locality for common change types | 20 | 17/20 | Each common change type (add handler, add setting, GIF bug) has a seam card as first-stop; some cross-seam tasks still need 3 hops |
| Enforceability by tests/checks | 15 | 13/15 | check:structure + check:seams + contract stubs cover R-01/R-03/R-04; P7 untestable in JSDOM (documented per R-03) |
| Migration cost and reversibility | 15 | 13/15 | Fully reversible; ~12-15h authoring cost; ongoing discipline cost for seam cards is real |
| Human legibility | 10 | 8/10 | Seam cards are prose + YAML; non-experts can read them; SEAM-INDEX table is clear |
| Fit with MV3 runtime and package hygiene | 10 | 10/10 | Zero WAR changes; no new injected files; scripts/ is Node-only |
| Tool portability | 5 | 4/5 | AGENTS.md added; seam cards are tool-agnostic; .claude/ role defs are Claude-specific (minor deduction) |
| **Total** | **100** | **87/100** | |

**Regression safety hard constraint:** PASS — zero ZERO-DIFF surface touched.

---

## 12. Why Choose This Over J1 (Additive Guardrails)?

**If J1 scores ~82-86:** Choose J6 when the team wants enforcement, not just documentation. The key difference is that J1 likely adds a protected-behavior registry document and ADRs — prose that describes what must not break. J6 adds a seam graph that is *checked by scripts*: `check:structure` reads from SEAM-INDEX as the single source of truth for the module list, `check:seams` validates that all invariant pointers in seam cards resolve, and contract stubs fail loudly if not upgraded to real tests. The documentation is a generated output of the checks, not the checks themselves.

**If J1 scores ≥88:** J1 is probably the right choice for a team that wants fast time-to-value. J6 has a slightly higher authoring cost (seam cards for 8 modules vs. a single registry document) and introduces a discipline cost: every future module addition requires a seam card. Teams that do not enforce this discipline will see J6 degrade to the same state as J1 over time.

**When J6 is definitively better:**
- When the team wants `check:structure` to have exactly one source of truth (SEAM-INDEX) instead of deriving it from three cross-referenced documents
- When cold agents are the primary consumer (seam cards give direct localization vs. requiring the agent to navigate a registry + separate ADRs + separate HANDOFF.md)
- When the six untested PBs (P2, P3, P4, P6, P7, P8) are high-regression risk: loudly-failing stubs are an active CI signal that J1 documentation cannot provide

**When J1 is better:**
- When the team wants minimal ongoing maintenance cost
- When human developers (not agents) are the primary consumer
- When the project is near end-of-life and the seam discipline will not be maintained

---

## 13. Risks and Gaps

**R1 — Seam card staleness.** If seam cards are not updated when source code changes, they become misleading. Mitigation: `check:seams` validates all cited paths and line ranges; CI runs it on every PR. Gap: line-number references in seam cards will drift as code is edited; seam cards should use function-name references, not line numbers.

**R2 — YAML front-matter parser dependency.** `check:structure.mjs` needs to parse SEAM-INDEX front matter. The repo uses `type: module`; there is no existing YAML dependency. Mitigation: use a zero-dependency front-matter parser or a simple regex-based parser for the narrow YAML subset needed (key: value pairs only). If this is not acceptable, encode the module list as a JS array literal in a `.mjs` file instead of YAML.

**R3 — Contract stubs may be ignored.** If stubs fail loudly but CI is not enforced, they are noise. Mitigation: R-05 requires a CI gate; the stubs run under `npm test` which is the CI gate. Stubs failing is a CI failure, not a warning.

**R4 — Seam card coverage is not exhaustive on day 1.** The 8 seam cards cover the high-risk modules. Low-churn utility modules (`constants.js`, `debug-helper.js`) have no seam card. These are not currently agent-navigation obstacles. Gap: `check:seams` should warn (not error) if a module has no seam card, so the gap is visible.

**R5 — .claude/ gitignore pre-condition.** C-20 requires `.claude/` be removed from `.gitignore` before agent role definitions are written there. This is a 1-line change to `.gitignore` which is not in ZERO-DIFF. Must be done before Phase 4 or role definitions will not persist.

**R6 — P7 untestable claim may be disputed.** The claim that `_patchCanvas` pixel compositing is untestable in JSDOM relies on JSDOM's Canvas 2D limitation. If the team upgrades to a JSDOM version with Canvas 2D support or adds a Puppeteer contract test, the untestable label must be removed. The seam card should reference the JSDOM version constraint explicitly.
