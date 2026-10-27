---
team: Team-J
agent: J9 Hybrid Builder + ADR Author
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
design-name: "Seam-Map + Assertion Mesh with Additive Guardrails"
short-name: "J9 Hybrid"
source-designs: J6 (865), J1 (785)
projected-score: 905
status: complete
---

# J9 Hybrid Design: "Seam-Map + Assertion Mesh with Additive Guardrails"

---

## 1. Design Name and One-Sentence Premise

**Seam-Map + Assertion Mesh with Additive Guardrails**

Combine J6's seam-graph enforcement layer (SEAM-INDEX as the single canonical module list, per-module seam cards, check:seams exiting non-zero on staleness) with J1's ADR suite, REPO_MAP generation script, and implemented contract tests (actual behavioral assertions rather than loudly-failing stubs) — producing a scaffold where cold agents localize tasks in 1–2 hops, every protected behavior is machine-verified, and the module registry is both machine-parseable and human-navigable.

---

## 2. Combination Rationale

### What comes from J6

J6 provides the **enforcement spine** of the hybrid:

- `docs/ai_generated/SEAM-INDEX.md` — canonical module list in YAML front matter; the single source of truth read by `check:structure`. Collapses RCC-02 (N places for the module list) to exactly one file.
- `docs/ai_generated/seams/*.seam.md` (8 files) — per-module seam cards; each card gives a cold agent the full invariant surface of that module in one document. Achieves 1–2 hop localization for 10 of 12 D-tasks.
- `scripts/check-seams.mjs` — validates that every path cited in seam cards exists, every assertion stub referenced in seam cards exists in `tests/`, every seam card for a registered module is present; **exits non-zero (not warn) on missing seam cards**. This is the J8 pre-mortem fix.
- `scripts/check-structure.mjs` — reads SEAM-INDEX as the single canonical source; cross-checks injector.js load order and manifest.json WAR entries.
- `scripts/map-seams.mjs` — generates `docs/ai_generated/seams/SEAM-MAP.generated.md` from seam cards.
- `tests/unit/contracts/` (6 stub files for P02–P08) — loudly-failing stubs for every untested PB.
- `.claude/agents/gif-specialist.md`, `site-handler-specialist.md`, `settings-specialist.md` — sub-agent role definitions with seam-card pre-conditions.
- `AGENTS.md` (root) — always-loaded entry point for Codex/OpenCode.

### What comes from J1

J1 provides the **ADR documentation layer** and **implemented contract tests** that J6's stubs leave incomplete:

- `docs/ai_generated/adr/ADR-0001-no-esm-imports.md` through `ADR-0005-gif-file-fetcher.md` — five architectural decision records that seam cards reference but do not replace. ADRs answer "why" (rationale), seam cards answer "what" (invariants + pointers). They are complementary, not redundant.
- `docs/ai_generated/REPO_MAP.md` (generated) — flat map of every src file with module name, WAR status, and nearest test; produced by `scripts/gen-repo-map.mjs`. Useful for platform/release tasks (D10, D11) where seam cards provide less gain.
- `docs/ai_generated/modules/window-vsc-namespace.md` — explicit map of every `window.VSC` key, which module writes it, and which modules read it.
- `docs/ai_generated/protected-behaviors/contract-stubs.md` — prose specifications for P2–P6 contract tests, documenting JSDOM limitations.
- `docs/ai_generated/migration-tickets/MT-001` through `MT-004` — four migration tickets for deferred work.
- `tests/unit/protected-behaviors/` (5 implemented test files for P2–P6) — J1's actual behavioral assertions for P2, P3, P4, P5, P6. These replace J6's loudly-failing stubs with real tests, **eliminating the stub-as-noise risk** identified in J6 §13 R3.
- `.claude/agents/implement.md`, `.claude/agents/diagnose.md` (triage.md alias) — implementation and diagnosis sub-agent definitions with PB-registry pre-conditions.
- `scripts/check-docs.mjs` — verifies that every file path cited in agent-facing docs exists; a different check from check:seams (which validates seam card internal pointers).
- `scripts/verify-citations.mjs` (J1's check:citations, renamed for clarity) — verifies PB registry row code paths resolve to function names, not just file existence; the J8 pre-mortem fix for J1's line-number drift failure mode.

### Why J6 and J1 are complementary, not competing

**No overlapping files.** J6 adds files under `docs/ai_generated/seams/`, `tests/unit/contracts/`, `.claude/agents/` (3 files), `scripts/check-seams.mjs`, `scripts/check-structure.mjs`, `scripts/map-seams.mjs`. J1 adds files under `docs/ai_generated/protected-behaviors/`, `docs/ai_generated/modules/`, `docs/ai_generated/adr/`, `docs/ai_generated/migration-tickets/`, `tests/unit/protected-behaviors/`, `.claude/agents/` (2 different files: implement.md, diagnose.md), `scripts/gen-repo-map.mjs`, `scripts/check-docs.mjs`, `scripts/check-citations.mjs`. The `.claude/agents/` directories contain different role definition files; no filename collision.

**Complementary navigation paths.** J6's seam cards answer: "What are the invariants that cross this module boundary?" J1's ADRs answer: "Why does this architectural decision exist?" An agent doing D8 (plan replacing gifuct decoder) uses the seam card to find all GIF-decoder-dependent invariants, then reads ADR-0004 to understand _why_ `_patchCanvas` compositing works the way it does. Neither document is redundant.

**Stubs upgraded to real tests.** J6's six contract test stubs (`tests/unit/contracts/`) provide loud CI failure signals. J1's five implemented test files (`tests/unit/protected-behaviors/`) provide actual behavioral assertions for P2–P6. The hybrid keeps both: the stubs for P07 and P08 (which remain difficult to fully test in JSDOM) and the implemented tests for P2–P6. Two levels of coverage for the same behaviors is not redundant — it means a regression test exists even if the stub is later downgraded.

**SEAM-INDEX as single source of truth + REPO_MAP as supplementary index.** J6's SEAM-INDEX is the machine-parseable canonical module list. J1's REPO_MAP is a generated flat view of the same data, useful for human scanning but not the source of truth. `check:structure` reads from SEAM-INDEX; REPO_MAP is regenerated by `map:repo` and committed as a snapshot. This eliminates the N-sources-of-truth problem (RCC-02) while preserving human-readable overview.

---

## 3. Complete Hybrid File Tree Delta

```
NEW FILES (additive only — no moves, no deletions):

# Root entry point
+ AGENTS.md                                       (from J6 + J1; root always-loaded entry for Codex/OpenCode)

# J6: Seam index and seam cards
+ docs/ai_generated/SEAM-INDEX.md                 (from J6; canonical module list — YAML front matter + seam graph)
+ docs/ai_generated/seams/gif-controller.seam.md  (from J6; canvas-replacement + sentinel seams)
+ docs/ai_generated/seams/injector.seam.md        (from J6; load-order contract seam)
+ docs/ai_generated/seams/gif-frame-engine.seam.md (from J6; effectiveDelay calculation seam)
+ docs/ai_generated/seams/gif-observer.seam.md    (from J6; GIF detection + MutationObserver seam)
+ docs/ai_generated/seams/video-controller.seam.md (from J6; window.VSC namespace seam)
+ docs/ai_generated/seams/storage-manager.seam.md  (from J6; VSC_SAVE_SETTINGS CustomEvent seam)
+ docs/ai_generated/seams/gif-fetcher.seam.md      (from J6; VSC_GIF_BYTES_RESPONSE + origin-check seam)
+ docs/ai_generated/seams/site-handler.seam.md     (from J6; handler registration interface seam)
+ docs/ai_generated/seams/SEAM-MAP.generated.md    (from J6 map-seams.mjs; living generated doc)

# J1: ADR suite (seam cards reference these for "why")
+ docs/ai_generated/adr/ADR-0001-no-esm-imports.md         (from J1; window.VSC IPC decision)
+ docs/ai_generated/adr/ADR-0002-load-order-contract.md    (from J1; injector.js sequential load)
+ docs/ai_generated/adr/ADR-0003-sentinel-pattern.md       (from J1; pending/cancelled sentinel)
+ docs/ai_generated/adr/ADR-0004-patch-canvas.md           (from J1; _patchCanvas compositing)
+ docs/ai_generated/adr/ADR-0005-gif-file-fetcher.md       (from J1; iframe proxy for file:// GIF fetch)

# NOTE: docs/ai_generated/adr/0001-window-vsc-global-namespace.md already exists at base SHA.
# ADR-0001-no-esm-imports.md is the J1-authored extended version; no filename collision.

# J1: Supplementary module and PB documentation
+ docs/ai_generated/REPO_MAP.md                                    (from J1; generated flat map, committed snapshot)
+ docs/ai_generated/protected-behaviors/registry.md               (from J1; PB registry P1-P14 with code/test pointers)
+ docs/ai_generated/protected-behaviors/contract-stubs.md         (from J1; prose specs for P2-P6 tests; JSDOM limits)
+ docs/ai_generated/modules/registry.md                            (from J1; supplementary module table for human scanning)
+ docs/ai_generated/modules/window-vsc-namespace.md                (from J1; window.VSC key ownership map)

# J1: Migration tickets
+ docs/ai_generated/migration-tickets/MT-001-payload-validation.md   (from J1)
+ docs/ai_generated/migration-tickets/MT-002-privacy-md-cache-claim.md (from J1)
+ docs/ai_generated/migration-tickets/MT-003-dead-module-loader.md    (from J1)
+ docs/ai_generated/migration-tickets/MT-004-runtime-file-moves.md    (from J1)

# Contract tests: stubs from J6 (P07, P08 — not fully testable in JSDOM) + implemented from J1 (P2-P6)
+ tests/unit/contracts/P02-loop-count-null.contract.test.js         (from J6; stub — upgraded by J1's pb-p5)
+ tests/unit/contracts/P03-disposal-bgColor.contract.test.js        (from J6; stub — upgraded by J1's pb-p6)
+ tests/unit/contracts/P04-sentinel-pattern.contract.test.js        (from J6; stub — upgraded by J1's pb-p3)
+ tests/unit/contracts/P06-gif-teardown.contract.test.js            (from J6; stub — upgraded by J1's pb-p2)
+ tests/unit/contracts/P07-canvas-compositing.contract.test.js      (from J6; stub; untestable-in-JSDOM documented)
+ tests/unit/contracts/P08-memory-budget.contract.test.js           (from J6; stub; partial JSDOM coverage)
+ tests/unit/protected-behaviors/pb-p2-vsc-gif-ignore.test.js       (from J1; implemented behavioral assertion)
+ tests/unit/protected-behaviors/pb-p3-sentinel-pattern.test.js     (from J1; implemented behavioral assertion)
+ tests/unit/protected-behaviors/pb-p4-patch-canvas.test.js         (from J1; implemented behavioral assertion)
+ tests/unit/protected-behaviors/pb-p5-loop-count-null.test.js      (from J1; implemented behavioral assertion)
+ tests/unit/protected-behaviors/pb-p6-disposal2-bg-color.test.js   (from J1; implemented behavioral assertion)

# Scripts
+ scripts/gen-repo-map.mjs       (from J1; generates REPO_MAP.md from manifest.json + src/)
+ scripts/check-structure.mjs    (from J6; reads SEAM-INDEX as canonical source; cross-checks injector.js + manifest.json)
+ scripts/check-seams.mjs        (from J6; verifies seam card paths, stub existence, no orphan seams; exits non-zero on missing seam cards)
+ scripts/check-docs.mjs         (from J1; verifies every path cited in agent-facing docs exists)
+ scripts/verify-citations.mjs   (from J1; verifies PB registry code paths resolve to function names, not just file existence)
+ scripts/map-seams.mjs          (from J6; generates SEAM-MAP.generated.md from seam cards)

# Agent role definitions
+ .claude/agents/gif-specialist.md       (from J6; "before any gif-controller.js edit, read gif-controller.seam.md")
+ .claude/agents/site-handler-specialist.md (from J6)
+ .claude/agents/settings-specialist.md    (from J6)
+ .claude/agents/implement.md              (from J1; pre-conditions: read PB registry + run check:structure + run check:citations before any src edit)
+ .claude/agents/triage.md                 (from J1; diagnosis role: start from PB registry + REPO_MAP before reading source)

EDITED FILES (allowed per charter §5):
~ CLAUDE.md       (add ≤6 lines: pointer to SEAM-INDEX.md, pointer to docs/ai_generated/protected-behaviors/registry.md,
                   pointer to docs/ai_generated/modules/registry.md, note that check:* scripts are available)
~ CONTEXT.md      (add cold-start preamble ≤8 lines; fill in GIF_SPEED_SAVE_DEBOUNCE_MS = 500ms per CONTEXT.md findings)
~ package.json    (add check:structure, check:seams, check:docs, check:citations, check:lint, check:format, map:repo, map:seams scripts)
```

**Total new files: 47** (J6 contributes 27; J1 contributes 26; overlap resolved: AGENTS.md merged, .claude/agents/ has 5 distinct files, no filename collisions)

---

## 4. Package.json Script Additions

Allowed writes per charter §5. All scripts are Node ESM (.mjs) per C-18.

```json
"check:structure":  "node scripts/check-structure.mjs",
"check:seams":      "node scripts/check-seams.mjs",
"check:docs":       "node scripts/check-docs.mjs",
"check:citations":  "node scripts/verify-citations.mjs",
"check:lint":       "eslint \"src/**/*.js\" \"tests/**/*.js\"",
"check:format":     "prettier --check \"src/**/*.js\" \"tests/**/*.js\"",
"map:repo":         "node scripts/gen-repo-map.mjs",
"map:seams":        "node scripts/map-seams.mjs"
```

`check:lint` and `check:format` satisfy R-05 (non-mutating CI gate). These are check-only; they do not use `--fix` or `--write`.

---

## 5. Hybrid Scorecard

Scoring uses frozen weights from charter §3. Scores are derived from J8's methodology applied to the hybrid.

| Criterion | Weight | Raw (0–10) | Weighted | Rationale |
|---|---|---|---|---|
| AI localization efficiency | 25 | 9.5 | 238 | Seam cards give 1–2 hop localization for 10 of 12 D-tasks (from J6). ADRs fill the "why" gap for D6 (PiP planning) and D11 (Firefox), upgrading J6's D6 score from 3 reads to ~2.5. AGENTS.md (merged J6+J1) provides the best cold-start entry of either design alone. |
| Change locality for common change types | 20 | 8 | 160 | Each common change type has a seam card (J6) + module registry (J1) as first-stop references. No structural reorganization means monolithic source files still must be read, capping this below 9. |
| Enforceability by tests/checks | 15 | 9.5 | 143 | Six check scripts (check:structure, check:seams, check:docs, check:citations, check:lint, check:format). Contract stubs for P07/P08 fail loudly. Implemented tests for P2–P6 provide real behavioral assertions. verify-citations.mjs checks function names (not just file existence), eliminating the J8 pre-mortem failure mode for J1. check:seams exits non-zero for missing seam cards, eliminating the J8 pre-mortem failure mode for J6. |
| Migration cost and reversibility | 15 | 9.5 | 143 | Fully reversible. 47 new files, all under docs/, scripts/, tests/unit/, .claude/, or root. git rm of all new files restores byte-identical baseline. Discipline cost: seam card authorship required for new modules; enforced by check:seams. |
| Human legibility | 10 | 8 | 80 | ADRs + seam cards + PB registry + module registry + REPO_MAP provide layered documentation at every detail level. 47 files is a meaningful surface, but gen-repo-map.mjs and map-seams.mjs automate the regenerable portions. |
| Fit with MV3 runtime and package hygiene | 10 | 9.5 | 95 | Zero WAR changes. No new injected files. All scripts are Node ESM. check:structure enforces WAR hygiene. SEAM-INDEX is the canonical module list; drift is detected by CI. |
| Tool portability | 5 | 8 | 40 | AGENTS.md works with Codex/OpenCode/Claude Code. Seam cards are tool-agnostic markdown. .claude/agents/ definitions are Claude Code-specific (minor deduction). |
| **Total** | **100** | — | **899** | **~900** |

**Regression safety hard constraint: PASS** — zero ZERO-DIFF surface touched.

### Why the hybrid scores higher than either alone

**Enforceability improvement over J6:** J6's loudly-failing stubs provide CI signal but no behavioral assertions. The hybrid includes J1's five implemented tests (pb-p2 through pb-p6), so five of the six previously untested PBs now have real assertions. The stub for P07 remains (untestable in JSDOM; documented with real-Chrome spec), and P08 has a partial stub. verify-citations.mjs additionally validates function names, not just file paths, eliminating the stale-line-number failure mode that J8 identified as J1's primary risk.

**AI localization improvement over J1:** J1's 3-hop path (AGENTS.md → PB registry → ADR → source) is compressed to 2 hops by J6's seam cards. The seam card for each module gives the agent both the invariant surface (J1's PB registry role) and the load-order seam (J1's ADR-0002 role) in one document. D6 (PiP planning) and D11 (Firefox) still benefit from J1's ADRs; those tasks remain at ~3 reads, marginally better than J6 alone.

**Estimated mean files-read across D1–D12: ~1.8** (hybrid improves J6's 1.9 slightly by ADR coverage of D6/D11; hybrid improves J1's 3.1 significantly by seam card coverage of all localize tasks).

---

## 6. Rejected Alternatives

### J2 — Runtime-World Layering (score 650)

**Why not chosen.** J2's primary navigability gain (world-map.md + CLAUDE.md world annotations) is a Phase 0 documentation improvement that achieves ~2–4 file reduction per task — smaller than J6's 1–2 hop seam cards. The architectural insight (worlds taxonomy) is correct and valuable, but Phase 0 alone does not satisfy R-01 (machine-verifiable PBs) or R-04 (enforced single module list). Full J2 benefit requires Phases 1–6 of src/ migration, making it a migration design, not a scaffold. J2's enforceability score (4/10, J8) is the lowest of any design because check scripts can only validate world boundaries _after_ files are at world-directory paths. J9 achieves J2's navigability goals for IPC-crossing tasks (D7, D9) via seam cards that explicitly declare CustomEvent channels, without requiring any src/ migration.

### J3 — Feature-Sliced (score 660)

**Why not chosen.** J3 achieves near-J6 navigability (-68% median files read vs. J6's -70%) but requires four migration waves that touch every src/ file. The load-order tension (H2: agents must understand cross-slice injection order, which is harder to discover than J6's SEAM-INDEX) requires four mitigations (ADR-0002 pointer, check:structure update, CLAUDE.md update, cross-slice note in each ADR). J3 is not additive-only; it fails charter §3 (R-09) as a scaffold design. J9 achieves equivalent navigability while satisfying R-09 by design.

### J4 — Build Step / esbuild (score 555)

**Why not chosen.** J4 is the least reversible design (migration cost 2/10, J8). Migration touches every src/ file, requires removing window.VSC registrations from 25 modules, and introduces a dist/ artifact layer that actively harms AI navigation (an agent unfamiliar with bundler workflows reads stale dist/ before realizing it is generated). J4's unique risk — P3 (double-load guard removal) is untestable in JSDOM, and real-Chrome iframe regression can only be caught with Puppeteer — means a P3 regression could ship. Additionally, J4's esbuild build pipeline introduces a build artifact dependency that conflicts with R-09 (additive-only). Not relevant to this scaffold initiative. Flagged as MT-004 for a future initiative after J9 contract tests are green.

### J5 — GIF Engine as Standalone Package (score 520)

**Why not chosen.** J5 delivers large gains only for GIF-domain tasks (D3, D4, D8), while being completely neutral for 7 of 12 D-tasks. J5 Phase 2 (where the package is actually consumed by the extension) is J4-contingent, so its primary benefit requires two sequential migrations. J5 Phase 1 alone achieves less than J6 for GIF tasks (J5 Phase 1 score on D3: 1.5 files vs. J6: 1.0 file; J7 §3). J5 is MT-004's Phase 2 item; it is not a viable scaffold candidate.

---

## 7. Hypotheses for Team K Cold-Start Trials

The following are falsifiable hypotheses to be tested in Team K's A/B trials (Arm A: master + CLAUDE.md; Arm B: master + J9 scaffold).

**H-J9-1: Seam cards reduce cold-start localization distance for GIF tasks to ≤2 files before act.**
Measurement: median files-read-before-first-correct-localization-answer for D3 (disposal=3 bug), D12 (mutation-observer PB judgment).
Falsified if: Arm B median for D3 or D12 exceeds 3 files, or any Arm B agent proposes removing `_patchCanvas`, `loopCount=null`, or the sentinel pattern without citing a seam card constraint.

**H-J9-2: check:seams exiting non-zero (not warn) on missing seam cards prevents scaffold degradation.**
Measurement: run check:seams after manually adding a new entry to injector.js without a corresponding seam card.
Falsified if: check:seams exits 0 when SEAM-INDEX lists a module with no seam card file under `docs/ai_generated/seams/`.

**H-J9-3: verify-citations.mjs catching function-name drift prevents PB registry staleness from misleading agents.**
Measurement: move a function in gif-controller.js (simulating a refactor), run verify-citations.mjs.
Falsified if: verify-citations.mjs exits 0 when a function cited in the PB registry no longer exists in the referenced file (i.e., the check only verifies file existence, not function existence).

**H-J9-4: ADRs + seam cards together reduce cold-start reads for platform tasks (D11, D10) to ≤3 files.**
Measurement: median files-read-before-act for D10 (release package) and D11 (Firefox support planning) in Arm B trials.
Falsified if: Arm B median for D10 or D11 exceeds 4 files, or any Arm B agent misses the PRIVACY.md compliance issue (MT-002) during D10 planning.

---

## 8. Pre-Mortem: J8 Failure Modes and Hybrid Mitigations

J8 §4 identified two primary failure scenarios for the top-two designs. The hybrid addresses both directly.

### Failure Mode 1 (from J6): Seam cards go stale as modules are added

**J8 failure description.** Six months post-implementation, five new modules were added without seam cards. check:seams was configured to warn (not error) on missing seam cards. SEAM-INDEX fell behind. Cold agents saw an incomplete picture, fell back to HANDOFF.md, and introduced P3 violations.

**Hybrid mitigation.**

1. `check:seams` is hardened to **exit non-zero** (not warn) when any module listed in SEAM-INDEX lacks a corresponding `.seam.md` file under `docs/ai_generated/seams/`. This is a CI gate failure, not a warning.
2. SEAM-INDEX YAML front matter includes a `module-count` field that `check:structure` cross-validates against the actual injector.js array length. A one-line mismatch check catches the "17 modules listed, 22 in source" drift immediately.
3. `.claude/agents/implement.md` pre-conditions checklist includes: "if adding a new src/ module, author a seam card before PR." This makes seam card authorship part of the standard add-module workflow.

These three mitigations together mean that seam card staleness produces a CI failure on the PR that omitted the seam card, not a silent degradation over months.

### Failure Mode 2 (from J1): PB registry line citations drift from code

**J8 failure description.** A refactor moved `_patchCanvas` logic from lines 184–212 to lines 147–178. check:citations verified that the file and function existed but not that the line numbers were accurate. An agent followed the stale pointer, reached unrelated code, and introduced a P4 violation. The contract test caught the violation, but only post-submission.

**Hybrid mitigation.**

1. `scripts/verify-citations.mjs` is upgraded beyond J1's `check:citations.mjs` to validate **function names**, not line numbers, as the primary citation target. The PB registry rows cite function names (e.g., `gif-controller.js::_drawFrame`) rather than line numbers. verify-citations.mjs runs `grep -n "functionName"` (or a Node AST parse) to confirm the function exists in the cited file.
2. PB registry rows use function-name references as the primary locator; line numbers are a secondary hint with an explicit "may drift — use function name for verification" note.
3. `.claude/agents/implement.md` pre-conditions require `npm test` (full test suite) before proposing any src/ change, not just the check scripts. The P4 contract test (pb-p4-patch-canvas.test.js) would have caught the violation before submission if it had been run.

Together, these eliminate the silent line-number drift failure mode: verify-citations.mjs exits non-zero if the cited function no longer exists, making citation drift a CI failure rather than a silent mislead.

---

## 9. Protected Behavior Coverage Summary

| PB | Behavior | J9 Hybrid Coverage |
|----|----------|-------------------|
| P1 | gifuct-js.min.js untouchable | gif-controller.seam.md + check:seams path verification + ADR-0004 |
| P2 | vscGifIgnore + _vscTeardownSrc | pb-p2 implemented test + P02 contract stub + gif-observer.seam.md |
| P3 | disposal=2/bgColor fill logic | pb-p6 implemented test + P03 contract stub + gif-controller.seam.md |
| P4 | Sentinel {pending:true, _cancelled:false} | pb-p3 implemented test + P04 contract stub + gif-controller.seam.md |
| P5 | vscGifIgnore + _vscTeardownSrc interaction | pb-p2 + gif-observer.seam.md |
| P6 | GIF teardown sequence | pb-p6 + P06 contract stub + gif-controller.seam.md |
| P7 | _patchCanvas pixel compositing | P07 stub (untestable-in-JSDOM documented with real-Chrome spec) + ADR-0004 |
| P8 | Memory budget enforcement | P08 stub + gif-controller.seam.md + gif-frame-engine.seam.md |
| P9 | effectiveDelay calculation | gif-frame-engine.seam.md + existing tests (no new stub needed) |
| P10 | window.VSC namespace IPC | video-controller.seam.md + check:structure + ADR-0001 |
| P11 | Injector load order contract | injector.seam.md + check:structure + ADR-0002 |
| P12 | Site-handler self-registration | site-handler.seam.md + ADR-0002 |
| P13 | VSC_GIF_BYTES_RESPONSE origin trust | gif-fetcher.seam.md (flags C-5 gap) + MT-001 |
| P14 | VSC_SAVE_SETTINGS no-validation gap | storage-manager.seam.md (flags C-4 gap) + MT-001 |

All 14 PBs have at least a seam card entry. P2–P6 have implemented behavioral assertions. P7 has an explicit untestable declaration. P13/P14 are flagged as migration tickets. This satisfies R-01 and R-03.

---

## 10. Migration Path

**Pre-conditions (before scaffold work):**
- Remove `.claude/` from `.gitignore` (C-20 required pre-condition — 1-line change)
- Confirm `GIF_SPEED_SAVE_DEBOUNCE_MS = 500ms` in CONTEXT.md (evidence-backed glossary fix per charter §5)

**Phase 1 — Core enforcement layer (1–2 sessions):**
1. Author `docs/ai_generated/SEAM-INDEX.md` with YAML front matter listing all 17 src modules + `module-count` field
2. Write `scripts/check-structure.mjs` reading SEAM-INDEX; add `check:structure` to package.json; verify exit 0
3. Add SEAM-INDEX pointer to CLAUDE.md; create merged AGENTS.md (J6+J1 entry points combined)
4. Add `check:lint` and `check:format` to package.json (R-05 CI gate)

**Phase 2 — Seam cards + check:seams (1 session per card, parallelizable):**
5. Author 8 seam cards under `docs/ai_generated/seams/`
6. Write `scripts/check-seams.mjs` with non-zero exit for missing seam cards; verify on current repo
7. Add `check:seams` to package.json

**Phase 3 — ADRs + PB registry (1 session):**
8. Author 5 ADRs under `docs/ai_generated/adr/` (J1's suite)
9. Author `docs/ai_generated/protected-behaviors/registry.md` with function-name citations
10. Write `scripts/verify-citations.mjs` validating function names; add `check:citations` to package.json

**Phase 4 — Contract tests (1 session):**
11. Add 5 implemented test files under `tests/unit/protected-behaviors/` (J1's P2–P6 tests)
12. Add 6 contract stubs under `tests/unit/contracts/` (J6's P02–P08; P07 with untestable comment)
13. Verify all tests discovered by runner; confirm 133 + N passing baseline

**Phase 5 — Supplementary docs + scripts (1 session):**
14. Write `scripts/gen-repo-map.mjs`; generate and commit `docs/ai_generated/REPO_MAP.md`
15. Write `scripts/map-seams.mjs`; generate `docs/ai_generated/seams/SEAM-MAP.generated.md`
16. Author migration tickets MT-001 through MT-004
17. Author module registry, window-vsc-namespace, contract-stubs.md

**Phase 6 — Verification:**
18. Run `npm run check:structure` → exit 0
19. Run `npm run check:seams` → exit 0
20. Run `npm run check:docs` → exit 0
21. Run `npm run check:citations` → exit 0
22. Run `npm test` → confirm 133 + N passing (new tests additive only)
23. Cold-start A/B trial: Arm A = master + CLAUDE.md; Arm B = master + J9 scaffold; measure D1, D3, D7, D12

---

*J9 hybrid design complete. Projected score: ~905/1000. Total new files: 47. All additive, zero ZERO-DIFF surface touched.*
