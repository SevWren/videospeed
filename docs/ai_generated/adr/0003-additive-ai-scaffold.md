# Use window.VSC Seam-Map + Assertion Mesh as the primary AI-navigation scaffold (additive-only, no runtime moves)

**Date**: 2026-10-27
**Base SHA**: e904370863d69a2b5d853af62745141953c4860d
**Status**: Proposed
**Deciders**: Team J (J9 Hybrid Builder + ADR Author); ratification by Team K after cold-start trials

---

## Decision

Adopt the J9 Hybrid scaffold ("Seam-Map + Assertion Mesh with Additive Guardrails") as the AI-navigation structure for this repository. This scaffold is **additive-only**: it adds SEAM-INDEX.md as the machine-parseable canonical module list, per-module seam cards, ADRs, a PB registry, contract tests, and six check scripts — without moving, renaming, or modifying any file in `src/`, `manifest.json`, `LICENSE`, `PRIVACY.md`, or any existing `tests/**` file.

The core insight this decision encodes: **enforced invariants** (check:seams exiting non-zero, verify-citations.mjs validating function names) outperform **documented invariants** (prose in HANDOFF.md) for AI navigability and regression prevention. A check script that fails CI is infinitely more reliable than a document an agent must choose to read.

---

## Context

### The problem

This codebase has 17 source modules communicating through a `window.VSC` global namespace (ADR-0001) with a load-order contract enforced only by `injector.js` and `manifest.json`. There are no machine-readable module boundaries, no per-module invariant declarations, and no CI gate that validates the three-way consistency of injector.js, manifest.json, and the module list.

The consequence for AI agents: a cold agent with no prior context must read 5–8 source files before it can correctly localize a GIF rendering bug (baseline D3: 5–8 reads). The same agent has no systematic way to discover which protected behaviors cross the `gif-controller.js` boundary before proposing a refactor (D12 baseline: 6–10 reads).

Specific findings that motivate this decision:

- **F-D-001 (OBSERVED)**: Teams D and H found median distance-3 localization for P2–P8, meaning agents must read 3+ additional files after reaching the target file to discover relevant invariants. The invariants are documented only in HANDOFF.md prose (OBS-01, OBS-02).
- **F-E-001 (OBSERVED)**: Team E found zero test assertions for PBs P2, P3, P4, P6, P7, P8. These six behaviors have code locations but no CI verification (OBS-03, R-01, R-03).
- **F-B-001 (OBSERVED)**: Teams B and G found three independent representations of the module list: `injector.js` script tags, `manifest.json` WAR entries, and HANDOFF.md prose. No check validates their consistency (OBS-05, R-04, RCC-02).
- **F-G-001 (OBSERVED)**: Team G found `VSC_SAVE_SETTINGS` lacks payload validation (C-4) and `VSC_GIF_BYTES_RESPONSE` lacks origin checks (C-5). These are pre-existing defects that the scaffold must not replicate.

### Why the existing documentation is insufficient

HANDOFF.md documents the protected behaviors in prose. CONTEXT.md provides a terminology glossary. CLAUDE.md provides project overview. These documents require an agent to: (a) discover them via CLAUDE.md, (b) search HANDOFF.md for the relevant section, (c) search source files to verify what HANDOFF.md says is still accurate. This is a 3–6 hop process for every task. More critically, **none of it is machine-verified**: HANDOFF.md can drift from code without any CI signal.

The winning insight is that the gap between documented invariants and enforced invariants is not a documentation quality problem — it is a structural problem. Adding more documentation without adding check scripts that fail CI produces a better-written version of the same unverified system.

### What this decision must not touch

Per charter §3 (R-09) and the ZERO-DIFF constraint:

- `src/**` (including `src/lib/gifuct-js.min.js` — C-11)
- `manifest.json`
- `LICENSE`
- `PRIVACY.md` (C-8: cache claim correction is deferred to MT-002, human-gated)
- All existing `tests/**` files
- Version fields (C-19: the 0.9.1/0.8.0 discrepancy is pre-existing; not fixed here)

---

## Scorecard

J8 independent scoring (see full rationale in `docs/ai_generated/structure-initiative/10-design-lab/J8-scoring.md`).

Weighted scores out of 100 × 10 = 1000 max. Weights: AI localization 25, change locality 20, enforceability 15, migration cost 15, human legibility 10, MV3 fit 10, tool portability 5.

| Criterion (weight) | J1 | J2 | J3 | J4 | J5 | J6 | **J9 (hybrid)** |
|---|---|---|---|---|---|---|---|
| AI localization (25) | 8 | 6 | 7 | 5 | 5 | 9 | ~9 |
| Change locality (20) | 6 | 7 | 8 | 7 | 6 | 8 | ~8 |
| Enforceability (15) | 8 | 4 | 5 | 7 | 5 | 9 | ~9 |
| Migration cost (15) | 10 | 7 | 5 | 2 | 4 | 9 | ~9 |
| Human legibility (10) | 7 | 8 | 8 | 6 | 5 | 8 | ~8 |
| MV3 fit (10) | 9 | 8 | 6 | 7 | 6 | 9 | ~9 |
| Tool portability (5) | 7 | 7 | 7 | 5 | 6 | 8 | ~8 |
| **TOTAL** | **785** | **650** | **660** | **555** | **520** | **865** | **~905** |
| Regression safety | PASS | PASS | PASS | PASS* | PASS* | PASS | **PASS** |

J9 projected score ~905 assumes J1's implemented contract tests (+20 over J6 on enforceability) combine with J6's seam-graph spine without score dilution. The two designs share no files; gains are additive.

---

## Rejected alternatives

**J2 (Runtime-World Layering, 650).** Phase 0 deliverables (world-map annotations) achieve only 0–2 file median reduction — the smallest gain of any design. Full localization benefit requires Phases 1–6 which move every `src/` file into `worlds/` subdirectories, violating the additive-only constraint for this initiative. Filed as MT-004 for a follow-on.

**J3 (Feature-Sliced, 660).** Near-J6 localization gain (-68% median) but requires characterization tests for 12 untested modules before Wave 1 can move any file. The gating condition is part of J9's own scope; J3 cannot proceed until J9 contract tests are green. Filed as MT-004.

**J4 (Build Step / esbuild, 555).** Converts all 25 source modules to ESM bundles; introduces dist/ artifact layer that harms AI navigation (agents may read stale built output). P3 (double-load guard removal) carries an unverifiable regression risk in JSDOM. Lowest reversibility score (2/10). Filed as MT-004, gated on J3.

**J5 (GIF Engine Package, 520).** GIF-domain gains only; neutral for 7 of 12 D-tasks. Phase 2 (extension consumes the package) is J4-contingent. Does not satisfy R-01 or R-04 in Phase 1 alone. Filed as MT-004, J4-contingent.

**J6 alone (Seam-Map + Assertion Mesh, 865).** Would have been selected if J1 had not been designed. Rejected as the sole design only because J1's ADR suite and implemented contract tests are available at zero additional regression risk. The J6 spine (SEAM-INDEX, seam cards, check:seams) is adopted wholesale into J9.

**J1 alone (Additive Guardrails, 785).** Strong ADR suite and only design with fully implemented (not stubbed) contract tests for P2–P6. Not selected as primary because J6's SEAM-INDEX provides a superior single source of truth for the module list (eliminates RCC-02 more completely than J1's module registry document). Adopted into J9 for its ADR and test contributions.

---

## Considered Options

### Option 1: J1 — Additive Guardrails (score 785, J8 independent)

Adds PB registry, ADRs, REPO_MAP, module registry, check:structure, check:docs, check:citations, 5 contract tests, AGENTS.md, 2 agent role definitions. 26 new files.

**Assessment.** Strongest ADR suite and the only design with fully implemented contract tests (not stubs) for P2–P6. Module registry (docs/ai_generated/modules/registry.md) provides a human-readable module table. Primary gap: module registry is a separate document from the check:structure source of truth — a two-document truth chain that reintroduces a smaller version of RCC-02. Cold-agent localization achieves ~3.1 files median (51% reduction), competitive but behind J6 on GIF-domain tasks. **Not selected as primary design; its ADR suite and implemented tests are adopted into J9 hybrid.**

### Option 2: J2 — Runtime-World Layering (score 650, J8 independent)

Adds worlds/ taxonomy (isolated, page, worker, extension-pages) aligned with Chrome MV3 process boundaries. Phase 0 provides docs + CLAUDE.md annotations; Phases 1–6 require src/ migration.

**Assessment.** Phase 0 alone achieves ~3.8 files median (40% reduction) — the smallest gain of any design. Full benefit requires Phases 1–6, which touch every src/ file, putting this design outside charter §3 scope. Enforceability score 4/10 (J8): check scripts can only validate world boundaries after files are at world-directory paths. The worlds taxonomy is architecturally correct as an organizing principle, but its navigability gains are migration-contingent. **Not selected; filed as a Phase 2 migration ticket (MT-004).**

### Option 3: J3 — Feature-Sliced (score 660, J8 independent)

Groups files by feature slice (video-control, gif-control, settings, infrastructure). Achieves near-J6 navigability at ~2.0 files median (68% reduction) but requires four migration waves touching every src/ file.

**Assessment.** Violates R-09 (additive-only) as a scaffold design. J3 requires characterization tests for 12 currently untested modules before Wave 1 can proceed — a gating condition that is itself part of J9's scope (the contract tests). Load-order tension (H2) requires four mitigations that add maintenance overhead J6 avoids by design. **Not selected for this initiative; viable as a follow-on after J9 contract tests are green. Filed as MT-004.**

### Option 4: J4 — Build Step / esbuild (score 555, J8 independent)

Converts page-world modules to ES modules, bundles to dist/ via esbuild, reduces WAR surface from 23+ files to 2.

**Assessment.** Least reversible design (migration cost 2/10, J8). Touches all 25 source files except gifuct-js.min.js. Introduces a build artifact layer that actively harms AI navigation: an agent unfamiliar with bundler workflows may read stale dist/ output and draw incorrect architectural conclusions. P3 (double-load guard removal) creates a real-Chrome regression risk untestable in JSDOM. **Not selected; migration risk too high relative to navigability gain for scaffold purposes. Filed as MT-004, gated on J3 completion.**

### Option 5: J5 — GIF Engine as Standalone Package (score 520, J8 independent)

Extracts gif-controller.js, gif-frame-engine.js, and gif-observer.js into packages/gif-engine/ as a testable npm workspace package.

**Assessment.** Delivers significant gains only for GIF-domain tasks (D3, D4, D8); neutral for 7 of 12 D-tasks. Phase 2 (extension consumes the package) is J4-contingent. Phase 1 alone does not satisfy R-01 (no check scripts that verify PBs) or R-04 (no module registry enforcement). **Not selected; filed as MT-004 Phase 2, J4-contingent.**

### Option 6: J6 — Seam-Map + Assertion Mesh alone (score 865, J8 independent)

Adds SEAM-INDEX, 8 seam cards, 3 check scripts, 6 contract stubs, 3 agent definitions, AGENTS.md. 28 new files.

**Assessment.** Highest individual design score. Best cold-agent localization (-70% median files read, J7). The key structural contribution is SEAM-INDEX as the single machine-parseable canonical module list. Primary gap relative to hybrid: J6 lacks ADRs (agents reading seam cards cannot answer "why" questions about architectural decisions) and uses loudly-failing contract stubs rather than implemented behavioral assertions. **Not selected as sole design; its core enforcement layer is adopted as the spine of J9.**

### Option 7: J9 Hybrid (J1 + J6) — THIS DECISION

Combines J6's seam-graph enforcement with J1's ADR suite and implemented contract tests. 47 new files, all additive. Projected score ~905.

**Assessment.** The two designs have no overlapping files. J6 provides enforcement (SEAM-INDEX, seam cards, check:seams). J1 provides documentation depth (ADRs, PB registry, migration tickets) and real test coverage (5 implemented tests for P2–P6). The combination eliminates both J8 pre-mortem failure modes: check:seams exiting non-zero prevents seam card staleness; verify-citations.mjs checking function names prevents PB registry line-number drift. **Selected.**

---

## Consequences

### What this design adds

- **Single source of truth for the module list**: SEAM-INDEX.md (YAML front matter), read by check:structure. R-04 satisfied.
- **1–2 hop localization** for 10 of 12 D-tasks via per-module seam cards. R-02 satisfied.
- **Machine-verifiable protected behaviors**: 5 implemented tests (P2–P6) + 2 stubs (P07, P08) + explicit untestable declaration for P07. R-01, R-03 satisfied.
- **Six check scripts** enforcing module list consistency, seam card existence, doc path existence, citation function names, lint, and format. R-05, R-06 satisfied.
- **ADR suite** (ADR-0001 through ADR-0005) answering architectural "why" questions that seam cards reference but do not replace.
- **Migration tickets** (MT-001 through MT-004) explicitly deferring all ZERO-DIFF work with prerequisite checklists.

### What this design cannot do

- **Reduce source file size.** `gif-controller.js` (~8k tokens), `inject.js` (~5k tokens) remain monolithic. An agent fixing a GIF rendering bug still reads the full gif-controller.js after using the seam card to localize to it. Source file splitting is MT-004 (J3 follow-on, gated on J9 contract tests being green).
- **Fix pre-existing security defects.** `VSC_SAVE_SETTINGS` payload validation (C-4) and `VSC_GIF_BYTES_RESPONSE` origin checks (C-5) require src/ edits. Documented in MT-001.
- **Remove dead code.** `src/module-loader.js` remains web-accessible. MT-003.
- **Correct PRIVACY.md.** The `cache: force-cache` → `cache: 'default'` correction is human-gated before the next Web Store submission. MT-002.
- **Enforce world boundaries.** J2's world-crossing check scripts require files to be at world-directory paths. This is J3/J4 migration territory, not scaffold territory.

### What must be deferred to a follow-on initiative

All items in MT-001 through MT-004. The prerequisite ordering for follow-on work is:

1. J9 contract tests reach green (all P2–P8 covered, P07 JSDOM limitation documented).
2. J3 Feature-Sliced migration (gated on Step 1 + characterization tests for 12 untested modules).
3. J2 Runtime-World Layering (can proceed in parallel with J3 or after; world taxonomy adds value even post-J3).
4. J4 Build Step (gated on J3 completion; esbuild consolidation makes sense once slices are stable).
5. J5 GIF Engine Package Phase 2 (gated on J4 completion).

The scaffold introduced here is designed to remain valid through Steps 2–5: SEAM-INDEX and seam cards survive a feature-slice migration by moving to the new directory structure; the check scripts remain correct as long as SEAM-INDEX is updated.

---

## Pre-mortem Mitigations

### Risk 1: Seam cards go stale as new modules are added (J6 failure mode, J8 §4)

**Mechanism**: Developers add new modules to injector.js without authoring seam cards. check:seams was originally specified to warn (not error). Over months, seam card count falls behind module count. Cold agents receive an incomplete picture.

**Mitigations in this design**:
1. `check:seams` is hardened to **exit non-zero** when any module listed in SEAM-INDEX lacks a corresponding `.seam.md` file. This is a CI gate failure, not a warning (see J9-hybrid.md §8).
2. SEAM-INDEX YAML front matter includes a `module-count` field; `check:structure` cross-validates it against injector.js array length.
3. `.claude/agents/implement.md` pre-conditions include seam card authorship for new module additions.

### Risk 2: PB registry line citations drift from code, misleading agents (J1 failure mode, J8 §4)

**Mechanism**: A refactor moves a function without updating the PB registry line-number citation. check:citations verifies file existence but not line accuracy. An agent follows the stale pointer, reaches unrelated code, draws incorrect structural conclusions, and introduces a PB violation.

**Mitigations in this design**:
1. `scripts/verify-citations.mjs` validates **function names** in cited files, not line numbers. PB registry rows cite `gif-controller.js::_drawFrame` rather than `gif-controller.js:184`. A function rename is caught; a line-number shift is transparent.
2. PB registry prose explicitly notes: "Line numbers are secondary hints and may drift; function name is the canonical locator."
3. `.claude/agents/implement.md` requires running `npm test` (full suite) before proposing any src/ change — not just check scripts. Contract tests are the safety net; they catch violations if citation verification is insufficient.
