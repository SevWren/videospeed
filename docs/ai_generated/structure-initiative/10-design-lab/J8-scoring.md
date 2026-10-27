---
team: Team-J
agent: J8 Independent Scorer
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
role: independent scoring — scores do not echo designer self-assessments
frozen-weights-source: docs/ai_generated/structure-initiative/00-charter.md §3
---

# J8 Independent Scoring — All 6 Design Candidates

---

## Scoring Methodology

Scores are assigned 0–10 per criterion per design, then multiplied by weight and summed. Scores are independent of designer self-assessments. Where a designer self-assessed, J8 cross-checks the claim against the R-list, C-list, obstacle list, and the design's own stated risks. Inflated self-scores are penalized. Understated self-scores are upgraded where warranted.

**Regression safety** is a hard pass/fail: a design PASSES only if it requires zero changes to `src/**`, `manifest.json`, `LICENSE`, `PRIVACY.md`, or any existing `tests/**` file on the scaffold branch. Plans that describe future migration steps do not fail — only designs that execute changes on this branch fail.

---

## Section 1 — Main Scoring Table

Raw scores (0–10) × weight, summed to total out of 100.

| Criterion | Weight | J1 | J2 | J3 | J4 | J5 | J6 |
|---|---|---|---|---|---|---|---|
| AI localization efficiency | 25 | 8 | 6 | 7 | 5 | 5 | 9 |
| Change locality for common change types | 20 | 6 | 7 | 8 | 7 | 6 | 8 |
| Enforceability by tests/checks | 15 | 8 | 4 | 5 | 7 | 5 | 9 |
| Migration cost and reversibility | 15 | 10 | 7 | 5 | 2 | 4 | 9 |
| Human legibility | 10 | 7 | 8 | 8 | 6 | 5 | 8 |
| Fit with MV3 runtime and package hygiene | 10 | 9 | 8 | 6 | 7 | 6 | 9 |
| Tool portability | 5 | 7 | 7 | 7 | 5 | 6 | 8 |
| **TOTAL** | **100** | **77.5** | **66.5** | **69.5** | **51.5** | **55.0** | **85.5** |
| Regression safety | HARD | PASS | PASS | PASS | PASS* | PASS* | PASS |

*J4 and J5 contain migration plans that touch `src/**` in future tickets. The scaffold-phase design itself does not execute those changes, so they PASS the regression safety hard constraint on this branch. However, J4's regression safety note is flagged CONDITIONAL: if M5–M9 execute without M1 characterization tests, J4 FAILS.

### Weighted totals computed:

| Design | Computation | Total |
|---|---|---|
| J1 | (8×25)+(6×20)+(8×15)+(10×15)+(7×10)+(9×10)+(7×5) = 200+120+120+150+70+90+35 | **785** |
| J2 | (6×25)+(7×20)+(4×15)+(7×15)+(8×10)+(8×10)+(7×5) = 150+140+60+105+80+80+35 | **650** |
| J3 | (7×25)+(8×20)+(5×15)+(5×15)+(8×10)+(6×10)+(7×5) = 175+160+75+75+80+60+35 | **660** |
| J4 | (5×25)+(7×20)+(7×15)+(2×15)+(6×10)+(7×10)+(5×5) = 125+140+105+30+60+70+25 | **555** |
| J5 | (5×25)+(6×20)+(5×15)+(4×15)+(5×10)+(6×10)+(6×5) = 125+120+75+60+50+60+30 | **520** |
| J6 | (9×25)+(8×20)+(9×15)+(9×15)+(8×10)+(9×10)+(8×5) = 225+160+135+135+80+90+40 | **865** |

---

## Section 2 — Scoring Rationale

### J1 — Additive Guardrails

**AI localization efficiency (8/10):** J1's PB registry + ADR suite + AGENTS.md root entry point directly addresses OBS-01 and OBS-02, the two highest-impact obstacles. The navigability table in J1 §7 shows estimated 2–7 file reduction for GIF-domain tasks (D3, D8, D12). The score is 8 not higher because the source files remain monolithic (gif-controller.js at ~8k tokens) — the registry points the agent to the right file but the agent must still read all of it. Self-assessment of 8 is accurate; J8 confirms.

**Change locality (6/10):** J1 does not reorganize source files. Module registry makes add-module and add-handler tasks easier to plan, but the files themselves are unchanged. An agent making a GIF change still needs to understand the entire gif-controller.js file. The designer self-scored 7 here; J8 downgrades to 6 because the absence of any structural reorganization means common changes (adding an action, modifying a behavior) still require reading 5–8k-token source files. The documentation helps with localization, not with bounded-context editing.

**Enforceability (8/10):** Three check scripts (check:structure, check:docs, check:citations) plus five new contract tests (P2–P6) directly fulfill R-01, R-03, R-04. This is a strong result for an additive design. Score is not 9 or 10 because P8 (test runner meta-constraint) is explicitly unenforceable, and P9–P14 contract tests are deferred as SHOULD items. Self-assessment of 8 is accurate; J8 confirms.

**Migration cost and reversibility (10/10):** J1 is entirely file-addition plus three small edits to CLAUDE.md, CONTEXT.md, and package.json scripts. All 26 new files can be deleted to restore baseline. Zero risk to ZERO-DIFF surface. This is the maximum score and the designer's self-assessment of 10 is correct.

**Human legibility (7/10):** 26 new files is a meaningful maintenance surface. ADRs follow standard format; registry tables are clear. The slight downgrade from designer's 8 reflects that 26 files without automation to regenerate them creates a real drift risk (noted as R7 in the design's own risk section). A future maintainer faces a nontrivial set of documents to keep synchronized.

**MV3 fit + package hygiene (9/10):** No WAR changes, no new content scripts, all scripts are Node ESM (.mjs). The check:structure script enforces WAR hygiene going forward. Designer self-scored 9; J8 confirms.

**Tool portability (7/10):** AGENTS.md works with any agent reading root markdown. Check scripts are plain Node ESM. The .claude/agents/ definitions are Claude Code-specific. Self-assessment of 7 is accurate.

---

### J2 — Runtime-World Layering

**AI localization efficiency (6/10):** J2's world-map.md and CLAUDE.md world annotations close the IPC crossing gap (OBS-02). The D-task table shows median files-read reduction of 1 (range 0–2). This is a modest gain compared to J1's 2–5 file reduction on GIF tasks. The key insight (world crossing is the sharpest constraint) is correct, but the navigability improvement per task is small. The designer self-scored 8; J8 downgrades to 6 because: (a) the gains depend heavily on Phase 0 completing (world-map.md and CLAUDE.md annotations), which are not yet executed; (b) the directory reorganization that gives the largest gains is plan-only and requires Phases 1–6 of migration; (c) the immediately available Phase 0 improvements (annotations and world-map.md) achieve a 0–2 file reduction, which is substantially less than J1's 3–7 file reduction for the same GIF-domain tasks.

**Change locality (7/10):** The worlds layout makes world-crossing changes visually obvious — once migrations are complete. In Phase 0 (current branch), change locality is unchanged from baseline. The designer self-scored 8, which reflects the post-migration state. J8 scores 7, crediting the Phase 0 annotation gains while acknowledging that full change locality benefit requires migration. The worlds structure is a good organizing principle that earns change locality gains but only after substantial migration work.

**Enforceability (4/10):** J2's Phase 0 contributions are documentation and CLAUDE.md annotations. Neither is machine-enforceable. The designer acknowledges that enforcement via check:structure is only possible after migration (a world-check script can verify no chrome.* calls in worlds/page/ files only once those files are at those paths). J8 scores 4 — the design does not contribute meaningfully to enforceability in its scaffold form. Designer self-scored 6, which J8 considers overstated for Phase 0 deliverables.

**Migration cost and reversibility (7/10):** Phase 0 (docs + annotations) is cheap and fully reversible. Phases 1–6 are 6 atomic commits of medium complexity each, requiring characterization test prerequisites. The design correctly notes that Phase 0 alone delivers the primary navigability gain, and the full migration is optional. J8 scores 7, agreeing with designer self-assessment.

**Human legibility (8/10):** worlds/isolated/, worlds/page/, worlds/worker/ are self-documenting Chrome extension vocabulary. This is arguably the clearest conceptual organization of any design. Designer self-scored 9; J8 scores 8 because the worlds taxonomy introduces subtleties (e.g., options.js uses window.VSC but lives in extension-pages — an exception that must be documented) that add cognitive overhead.

**MV3 fit + package hygiene (8/10):** The design directly encodes MV3 world boundaries. Removing injector.js from WAR is a security improvement. Designer self-scored 9; J8 scores 8 because in Phase 0 (current deliverable) there is zero structural MV3 improvement — the improvement only manifests after Phases 1–5.

**Tool portability (7/10):** Consistent with other additive designs. J8 agrees with designer's 8; minor downgrade to 7 because the directory reorganization that enables world-based tooling (e.g., a linter rule checking chrome.* calls in worlds/page/) is deferred.

---

### J3 — Feature-Sliced

**AI localization efficiency (7/10):** Feature slices deliver the largest single-task gains (D3 at -2, D7 at -2, D9 at -2). GIF-related tasks benefit significantly from co-location of all GIF files. However, the feature-slice layout fragments the load-order contract discovery path (H2 in J3 §1 explicitly identifies this risk). A cold agent may understand the gif-control/ slice perfectly while missing the cross-slice dependency on infrastructure/constants.js. Designer self-scored 8; J8 scores 7, crediting the co-location gains but penalizing for the H2 load-order fragmentation risk, which is the central tension the designer acknowledges.

**Change locality (8/10):** This is J3's strongest criterion. GIF changes, settings changes, video-action changes each stay within a single slice. Cross-slice changes (D5: media-observer in gif-control/ for a video debug) introduce occasional lookup overhead, but this is a minor exception. Designer self-scored 9; J8 agrees the criterion is near-maximum but scores 8 because the D5 cross-slice case is not negligible for a daily-driver debugging scenario.

**Enforceability (5/10):** Enforceability depends on check:structure being updated for cross-slice paths (§4 mitigation point 3). Without the script, the slice layout is pure convention. The script is described as a prerequisite (M-PRE-3) but is not itself a structural property of the design. Designer self-scored 6; J8 scores 5 because the dependency on a prerequisite script means enforcement is contingent, not intrinsic to the design.

**Migration cost and reversibility (5/10):** J3 requires characterization tests for 12 currently untested modules before any file moves — the dominant cost. Four migration waves (Wave 1–4) are well-ordered but the total effort is HIGH per the designer's own estimate. Designer self-scored 6; J8 scores 5 because the characterization test requirement for 12 untested modules is a substantial investment that gates every other benefit. Without those tests, the design cannot proceed.

**Human legibility (8/10):** Four slices (video-control, gif-control, settings, infrastructure) map cleanly to capability areas. Designer self-scored 8; J8 agrees.

**MV3 fit + package hygiene (6/10):** No runtime changes on this branch. Post-migration, WAR globs would be per-slice wildcards — not worse than current but not better. Designer self-scored 6; J8 agrees. The wildcard-per-slice pattern preserves the C-1 auto-exposure problem for any new file added to a slice.

**Tool portability (7/10):** Standard directory layout. Consistent with other designs.

---

### J4 — Build Step (ES Modules + esbuild)

**AI localization efficiency (5/10):** J4's static import graph is a genuine navigation improvement after migration (agent can trace imports vs. reading injector.js). However, J4 introduces a build layer that does not exist today: agents must understand that dist/ is generated from src/, and that stale dist/ artifacts produce confusing debugging situations. For AI agents unfamiliar with bundler workflows, this is an active navigation obstacle. Designer self-scored 7; J8 scores 5. The build-layer confusion tax is real and documented in J4 §7 ("hurts navigation: dist/ layer between source and runtime"). On net, a naive agent's experience deteriorates.

**Change locality (7/10):** Adding a new module becomes one file + one import line vs. current one file + injector.js edit + manifest.json edit + WAR entry. This is a real improvement. Designer self-scored 8; J8 scores 7, a minor downgrade to account for the ongoing build step required after every src/ edit.

**Enforceability (7/10):** Build-time import resolution is static enforcement — stronger than runtime injection order. esbuild errors on missing or circular imports immediately. The score is not higher because P2 (load order as static import graph), P3 (double-load guard removal), and P11/P12 (event handler registration timing) all require characterization tests before migration, and the design notes these as CONDITIONAL for regression safety. Designer self-scored 9; J8 scores 7 to reflect that enforcement is conditional on M1–M3 being completed first.

**Migration cost and reversibility (2/10):** J4 is the least reversible design. Post-M9, reverting requires re-adding window.VSC registrations to every converted file (25 files) and restoring the full 23-file WAR list. The designer honestly self-scored 2. J8 confirms. This is the correct score for a migration that touches every src/ file except gifuct-js.min.js.

**Human legibility (6/10):** ES modules with explicit imports are more legible than window.VSC globals for developers who know ES modules. However, the build artifact (dist/) adds cognitive overhead, and the two-mode build (dev with source maps vs. prod without) requires understanding the build pipeline. Designer self-scored 7; J8 scores 6.

**MV3 fit + package hygiene (7/10):** WAR surface shrinks from 23+ files to 2 — a significant security improvement. esbuild output is a static IIFE with no eval. The single content-script approach is architecturally the cleanest MV3 design. Designer self-scored 9; J8 scores 7 because the security improvement is plan-only at this stage, and the inline source map in dist/ does expose original source logic to page scripts (noted in J4 §2.4 as a mild information-disclosure risk).

**Tool portability (5/10):** esbuild is a non-trivial dependency. The dist/ layer means any tool that doesn't understand the build pipeline will be confused. Agent definitions must explain "edit src/, then build, then test." Designer self-scored 6; J8 scores 5.

---

### J5 — GIF Engine as Standalone Package

**AI localization efficiency (5/10):** GIF-related tasks (D3, D4, D8) benefit from the package structure. Non-GIF tasks (10 of 12) see no improvement. D10 (release) gets slightly worse due to monorepo complexity. J5 designer used a 1–5 scale internally, self-scoring 4/5 on this criterion. Normalized to 0–10 that is 8/10, which J8 considers overstated — the gain is real but narrow. J8 scores 5/10 because the 10 neutral tasks represent the majority of the work surface, and the GIF gain requires Phase 2 (J4-dependent) to manifest fully.

**Change locality (6/10):** GIF bug fixes touch one package; non-GIF changes are unaffected. This is a genuine improvement for the ~60% of bug-fix commits that touch gif-controller.js (OBS-01 evidence: 61% churn). Designer self-scored 4/5 (= 8/10 normalized); J8 scores 6/10 because the non-GIF change surface (10 of 12 tasks) sees zero improvement.

**Enforceability (5/10):** Standalone package tests can bypass JSDOM injection limits for P4/P6/P8/P10/P11, which is a real testability gain. However, Phase 2 (where the package is actually consumed by the extension) is J4-dependent and high-cost. In Phase 1 alone (package exists, tests pass, but extension still uses original src/ files), enforceability improvement is limited. Designer self-scored 4/5 (= 8/10 normalized); J8 scores 5/10.

**Migration cost and reversibility (4/10):** Phase 1 is reversible (delete packages/gif-engine/). Phase 2 is "not reversible without a significant rewrite of injector.js and manifest.json" per the designer's own §9. J4-dependency makes Phase 2 cost HIGH (16–40 hours). Designer self-scored 2/5 (= 4/10 normalized); J8 agrees — 4/10 is accurate.

**Human legibility (5/10):** Monorepo is familiar to JS developers but adds workspace indirection. The window.VSC shim in Phase 1 (class exports BOTH as ES module and registers on window.VSC) is a confusing dual-registration pattern that the designer explicitly flags as a risk. Designer self-scored 3/5 (= 6/10 normalized); J8 scores 5/10.

**MV3 fit + package hygiene (6/10):** Phase 1 fits well — no WAR changes, no new injected files. Phase 2 requires careful WAR/CSP audit that is J4-dependent. Designer self-scored 3/5 (= 6/10 normalized); J8 agrees.

**Tool portability (6/10):** npm workspaces are universally supported. No exotic tooling in Phase 1. J8 upgrades slightly from designer's 4/5 (= 8/10 normalized) to 6/10, reflecting that Phase 2 requires esbuild (J4 dependency), which adds tooling complexity.

---

### J6 — Seam-Map + Assertion Mesh

**AI localization efficiency (9/10):** J6 achieves 1–2 hop localization for 10 of 12 D-tasks via seam cards. This is the best navigability improvement of any design, including J1. The seam card for each module gives the agent direct pointers to invariants AND assertion stubs AND the load-order seam, all in one document. J1 requires the agent to navigate: AGENTS.md → PB registry → ADR → source file (3 hops). J6 requires: CLAUDE.md → SEAM-INDEX → seam card (2 hops for most tasks). The improvement is real. Designer self-scored 22/25 (= 8.8/10); J8 rounds to 9. The small deduction: D6 (PiP planning) and a few cross-seam tasks still require broader context.

**Change locality (8/10):** Each common change type has a seam card as a first-stop reference. Adding a new site handler: read site-handler.seam.md → get exact registration pattern, WAR requirement, load-order position — all in one document. Adding a setting: read storage-manager.seam.md → full chain declared. Designer self-scored 17/20 (= 8.5/10); J8 scores 8/10. Minor deduction for cross-seam tasks that still require 3 hops.

**Enforceability (9/10):** check:structure + check:seams + 6 contract stubs covers R-01/R-03/R-04. Critically: contract stubs *fail loudly* in CI (not just documentation). SEAM-INDEX is the single source of truth for the module list, read by check:structure — this directly addresses RCC-02 (N sources of truth). J1's check:structure reads from a separate module registry; J6's reads from SEAM-INDEX, eliminating one document from the truth chain. Designer self-scored 13/15 (= 8.7/10); J8 scores 9/10. Small deduction: YAML front-matter parser adds a fragility (R2 risk in J6 §13).

**Migration cost and reversibility (9/10):** ~12–15 hours authoring cost, fully reversible by git rm of docs/seams, scripts/check-seams.mjs, scripts/check-structure.mjs, tests/unit/contracts/. The ongoing discipline cost (seam cards required for new modules) is real but manageable. Designer self-scored 13/15 (= 8.7/10); J8 scores 9/10, the same range.

**Human legibility (8/10):** Seam cards are prose + YAML table; non-experts can read them. SEAM-INDEX table is clear. The "seam" concept requires one explanation paragraph but is self-documenting once understood. Designer self-scored 8/10; J8 agrees.

**MV3 fit + package hygiene (9/10):** Zero WAR changes, no new injected files, scripts/ is Node-only. SEAM-INDEX is the canonical module list that check:structure uses to enforce WAR hygiene. This is a clean design with no side effects on the runtime surface. Designer self-scored 10/10; J8 scores 9/10 — the YAML front-matter parser dependency (R2) introduces a minor fragility that prevents a perfect score.

**Tool portability (8/10):** AGENTS.md added (works with any agent). Seam cards are tool-agnostic markdown. .claude/ role definitions are Claude-specific. Designer self-scored 4/5 (= 8/10); J8 agrees.

---

## Section 3 — ±20% Sensitivity Analysis

### Baseline ranking

1. J6: 865
2. J1: 785
3. J3: 660
4. J2: 650
5. J5: 520
6. J4: 555

*(Note: J5 560 actually beats J4 555 in the raw table above — the final ranking is confirmed below.)*

Full ranking: J6 (865) > J1 (785) > J3 (660) > J2 (650) > J4 (555) > J5 (520)

### Perturbation 1: AI localization efficiency weight 20 (−20%) instead of 25

Recompute by removing 5 × each design's score from that criterion:

| Design | Baseline | −5 × score | Adjusted |
|---|---|---|---|
| J6 | 865 | −5×9 = −45 | **820** |
| J1 | 785 | −5×8 = −40 | **745** |
| J3 | 660 | −5×7 = −35 | **625** |
| J2 | 650 | −5×6 = −30 | **620** |
| J4 | 555 | −5×5 = −25 | **530** |
| J5 | 520 | −5×5 = −25 | **495** |

**Ranking unchanged.** J6 still leads by 75 points over J1.

### Perturbation 2: Migration cost weight 18 (+20%) instead of 15

Recompute by adding 3 × each design's score on that criterion:

| Design | Baseline | +3 × score | Adjusted |
|---|---|---|---|
| J6 | 865 | +3×9 = +27 | **892** |
| J1 | 785 | +3×10 = +30 | **815** |
| J3 | 660 | +3×5 = +15 | **675** |
| J2 | 650 | +3×7 = +21 | **671** |
| J4 | 555 | +3×2 = +6 | **561** |
| J5 | 520 | +3×4 = +12 | **532** |

**Ranking unchanged.** J6 still leads. J1's perfect migration score (10) closes the gap slightly but does not overcome J6's superior localization and enforceability scores. Note J3 and J2 remain very close (675 vs 671) — these two could swap if scoring assumptions shift.

### Perturbation 3: Enforceability weight 18 (+20%) instead of 15

Recompute by adding 3 × each design's score on that criterion:

| Design | Baseline | +3 × score | Adjusted |
|---|---|---|---|
| J6 | 865 | +3×9 = +27 | **892** |
| J1 | 785 | +3×8 = +24 | **809** |
| J3 | 660 | +3×5 = +15 | **675** |
| J2 | 650 | +3×4 = +12 | **662** |
| J4 | 555 | +3×7 = +21 | **576** |
| J5 | 520 | +3×5 = +15 | **535** |

**Ranking unchanged.** J6 still leads. J4's higher enforceability score (7) helps it close slightly on J2/J3 but does not change major ranking positions.

### Sensitivity verdict

**The ranking is STABLE under all three ±20% perturbations.** J6 wins in every scenario. J1 holds second place in every scenario. The J2/J3 positions 3–4 are very close (margin ≤15 points in baseline) and could swap under different scoring assumptions, but neither challenges J1.

**No perturbation tested here flips the winner or the top-2 order.** A perturbation that could flip J1 and J6 would require AI localization efficiency weight to drop from 25 to near 0 while migration cost weight increases dramatically — a scenario outside the ±20% bound.

---

## Section 4 — Pre-mortem: Top-2 Designs

### J6 — Seam-Map + Assertion Mesh (1st place, score 865)

**Failure scenario: It is 6 months after J6 was implemented. The seam scaffold has degraded to dead documentation.**

**What went wrong:**

Three months after implementation, a developer added a new module (`buffering-observer.js`) to src/observers/ to handle video buffering events. They updated injector.js and manifest.json correctly (check:structure caught the WAR drift on the first attempt), but they did not write a seam card for the new module. The check:seams script had been configured to warn (not error) on modules without seam cards — following J6's own §13 R4 suggestion. Over the following two months, four more modules were added with no seam cards. The SEAM-INDEX fell behind: it listed 17 modules while the codebase now had 22.

By month six, cold agents reading SEAM-INDEX saw an incomplete picture. They followed the seam card for gif-controller.seam.md correctly, but when they needed to understand how the new buffering-observer interacted with the GIF teardown path, there was no seam card to consult. They fell back to reading HANDOFF.md — the exact behavior the seam scaffold was built to prevent. Two agents independently introduced the same P3 violation (modifying the sentinel pattern) because the new buffering-observer code was not mentioned in any seam card.

**Warning signs that were ignored:**

- The check:seams script's "warn not error" configuration for missing seam cards was visible in code review but no one escalated it.
- The seam card count remained at 8 while `git log --name-only | grep "src/" | sort -u` showed 22 unique src files in recent commits. A simple `check:seams --count` output divergence was present in every CI run but no one acted on it.
- The SEAM-INDEX YAML front matter last-updated date was 2026-10-27 (initial scaffold date); it never got updated.

**What should have been done differently:**

- The check:seams script should error (not warn) when any module in the injector.js module array lacks a corresponding seam card — making seam card authorship a hard CI requirement, not a soft discipline.
- The SEAM-INDEX YAML front matter should include a `module-count` field that check:structure cross-validates against the actual injector.js array length — a one-line mismatch check that would have caught the 17 vs. 22 drift immediately.
- Seam card authorship should be in the "Add new module" runbook (the ADR-0002 equivalent for J6), so it is part of the standard add-module checklist rather than an afterthought.

---

### J1 — Additive Guardrails (2nd place, score 785)

**Failure scenario: It is 6 months after J1 was implemented. The PB registry has drifted from code and is actively misleading agents.**

**What went wrong:**

J1's protected-behavior registry (docs/ai_generated/protected-behaviors/registry.md) was correct at the time of initial authoring. It cited gif-controller.js lines 184–212 for the `_patchCanvas` compositing behavior (P4). Four months after implementation, a developer fixed a memory leak in gif-controller.js by refactoring the initialization sequence. The refactor moved the `_patchCanvas` attachment logic from lines 184–212 to lines 147–178. The check:citations script verified that the file `src/core/gif-controller.js` existed (it did) and that the function `_drawFrame` existed (it did), but it did not verify that line numbers were still accurate.

A subsequent cold agent, working on task D8 (replacing the gifuct decoder), read the PB registry and saw "P4: _patchCanvas in _drawFrame — no direct putImageData — see gif-controller.js:184". The agent navigated to line 184, found unrelated initialization code, and concluded that the `_patchCanvas` path had changed architecturally. The agent then "fixed" the integration by adding a direct `putImageData` call — a P4 violation — because the registry's stale line pointer led to an incorrect structural conclusion.

The contract test for P4 (pb-p4-patch-canvas.test.js) did catch the violation — but only after the change was submitted for review. The test passed on master but failed after the agent's proposed edit. The agent had not run the tests before proposing the change.

**Warning signs that were ignored:**

- The check:citations script's path-existence check was known to not verify line numbers (noted as R7 in J1's own risks section). This was documented but no one strengthened the check.
- The line numbers in the PB registry diverged from code silently for two months before the D8 incident. A `grep -n "_drawFrame"` on git diff output would have shown the line movement in any commit touching gif-controller.js.
- The contract test for P4 was present and would have caught the violation — but the workflow for cold agents did not require running `npm test` before proposing changes. The subagent definition (`.claude/agents/implement.md`) required running check:structure and check:citations before modifying src/, but not `npm test` itself.

**What should have been done differently:**

- The check:citations script should resolve function names to current line numbers (using a code parser or at minimum a `grep -n "functionName"` verification), not just verify that the file and function exist.
- The `.claude/agents/implement.md` pre-conditions checklist should require `npm test` (full test suite, not just check scripts) before proposing any src/ change. The contract tests are the safety net, but they are only effective if they run.
- The PB registry rows should cite function names (stable) rather than line numbers (fragile) as the primary locator, with line numbers as a secondary hint only.

---

## Section 5 — Recommendation

### Final ranking

| Rank | Design | Score | Regression safety |
|---|---|---|---|
| 1 | **J6** — Seam-Map + Assertion Mesh | **865** | PASS |
| 2 | **J1** — Additive Guardrails | **785** | PASS |
| 3 | J3 — Feature-Sliced | 660 | PASS |
| 4 | J2 — Runtime-World Layering | 650 | PASS |
| 5 | J4 — Build Step (esbuild) | 555 | PASS (conditional) |
| 6 | J5 — GIF Engine Package | 520 | PASS (Phase 1 only) |

### Winner

**J6 wins**, with a score 80 points ahead of second-place J1 (865 vs 785). The margin holds across all ±20% sensitivity perturbations tested.

J6's advantages over J1:
- SEAM-INDEX is a single machine-parseable source of truth for the module list (vs. J1's separate modules/registry.md that check:structure reads). One fewer document in the truth chain.
- Seam cards give 1–2 hop localization for 10 of 12 tasks; J1 achieves similar results but typically via a 3-hop path (AGENTS.md → PB registry → ADR → source).
- Contract stubs fail loudly in CI; J1's registry entries are passive documentation until an agent chooses to consult them.
- Ongoing seam card maintenance is a discipline cost, but check:seams makes violations visible in CI.

### Hybrid consideration

**A J1+J6 hybrid would score higher than either individual design.** The two designs are complementary, not competing:

- J1 contributes: 5 ADRs (ADR-0001 through ADR-0005) that J6 does not include, REPO_MAP.md generated by a script, and the specific contract test implementations (J6 adds stubs, J1 adds actual test code for P2–P6).
- J6 contributes: SEAM-INDEX as the single canonical module list source, per-module seam cards (more granular than J1's registry), check:seams as a second enforcement layer.

Estimated hybrid score: ~900+ (J6's seam enforcement + J1's ADRs + J1's contract test implementations + J6's per-module seam card granularity). The hybrid is feasible because all files are additive and no file added by J1 conflicts with any file added by J6. The recommended implementation path is: implement J6 first (SEAM-INDEX, seam cards, check:seams, contract stubs), then adopt J1's ADRs and REPO_MAP.md generation script as supplementary documents.

**Bottom line:** Implement J6 as the primary design. Adopt J1's ADR suite and REPO_MAP.md generation as supplementary elements of the same scaffold.

---

*End of J8 Independent Scoring.*
*Output path: docs/ai_generated/structure-initiative/10-design-lab/J8-scoring.md*
*Weights source: docs/ai_generated/structure-initiative/00-charter.md §3 (frozen at G0).*
*Scores are independent of designer self-assessments; deviations from self-assessments are explained in §2.*
