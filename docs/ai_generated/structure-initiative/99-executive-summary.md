# Executive Summary — AI-Driven Development Scaffold

**Program**: Structure Initiative
**Branch**: `ai-structure/initiative`
**Base SHA**: `e904370863d69a2b5d853af62745141953c4860d`
**Completed**: 2026-10-27
**Design chosen**: J9 Hybrid — Seam-Map + Assertion Mesh with Additive Guardrails

---

## What was found (top 10 obstacles)

| # | Obstacle | Severity | Finding |
|---|---|---|---|
| 1 | Protected behaviors live only in unloaded prose | Blocker for cold agents | F-D-002: PBs P2–P8 at invariant-locality distance 3 |
| 2 | HANDOFF.md (~8,800 tokens) never auto-loaded, no entry pointer | High | F-D-001 |
| 3 | 59% of src/ files have zero test coverage | High | F-E-001 |
| 4 | CLAUDE.md has zero pointers to 65-file skills tree; `.claude/` in .gitignore | High | F-H-001, F-H-002 |
| 5 | Module list encoded in 4 places; WAR globs auto-expose new files | High | F-B-002, F-G-002 |
| 6 | `build` script mutates files before testing; no non-mutating CI gate | Medium | F-E-002 |
| 7 | PRIVACY.md FALSE cache claim; root `.md` files ship in extension zip | Blocker (store) | F-C-001, F-F-002 |
| 8 | `VSC_SAVE_SETTINGS` has no payload validation | High (security) | F-G-001 |
| 9 | `src/module-loader.js` is dead code but web-accessible | Medium | F-B-002 |
| 10 | CONTEXT.md lacks cold-start preamble; 5 candidate ADRs undocumented | Medium | F-C-003 |

Full register: `docs/ai_generated/structure-initiative/findings-register.md` (28 findings: 1 Blocker, 15 High, 10 Medium, 2 Low)

---

## What was decided and why

**Decision**: J9 Hybrid (J6 Seam-Map + J1 Additive Guardrails)
**Score**: ~905/1000 (independent J8 scoring with frozen weights)
**Rationale**:

- J6 (Seam-Map + Assertion Mesh) won the Design Lab at 865/1000 — seam cards give 1-hop localization to the 6 highest-risk modules, and enforced invariants (check scripts exit non-zero) outperform documented invariants (prose in HANDOFF.md)
- J1 (Additive Guardrails) added the ADR suite, REPO_MAP generator, and implemented contract test stubs — complementary with no conflicting files
- Ranking was **STABLE** under all ±20% weight perturbations

**Rejected alternatives** (with reasons):
- J2 Runtime-World Layering: pre-migration gain is documentation-only; requires 24-file src/ migration
- J3 Feature-Sliced: load-order tension requires 4 mitigations; not additive-only
- J4 Build-step: irreversible (11 migration tickets, 4–8 days), P3 double-load guard risk
- J5 Packages: J4-contingent for Phase 2; only helps GIF-related tasks

ADR: `docs/ai_generated/adr/0003-additive-ai-scaffold.md`

---

## What was built

**47 new files, zero runtime code changes.**

| Artifact | Location | Purpose |
|---|---|---|
| AGENTS.md | root | 137-line entry file for all agent tools (Codex/OpenCode/Claude) |
| REPO_MAP.md | docs/ai_generated/ | Generated file tree (172 files, 33,700 LOC) — never edit by hand |
| Protected-behavior registry | docs/ai_generated/protected-behaviors/ | 14 rows P1–P14 with code+test locations |
| SEAM-INDEX.md | docs/ai_generated/ | Single canonical module load order + 6 seam card index |
| 6 seam cards | docs/ai_generated/seams/ | gif-controller, inject, injector, settings, gif-observer, mutation-observer |
| 6 module cards | docs/ai_generated/modules/ | core, content, observers, site-handlers, ui, utils |
| ADR-0003 | docs/ai_generated/adr/ | Proposed ADR for scaffold decision |
| 5 check scripts | scripts/ | check-structure, check-seams, check-docs, verify-citations, gen-repo-map |
| 7 package.json scripts | package.json | check:structure, check:seams, check:docs, check:citations, check:lint, check:format, map:repo |
| 5 agent definitions | .claude/agents/ | implement, triage, review, doc-gardener, release-engineer |
| 8 migration tickets | docs/ai_generated/structure-initiative/tickets/ | T01–T08 ordered, verifiable |
| CI proposal | proposals/ci-workflow.yml | Non-mutating GitHub Actions workflow (not enabled) |
| 2 test files | tests/unit/scaffold/ | check-structure (13 tests) + check-seams (14 tests) |

**CLAUDE.md** edited: +3 pointer lines (REPO_MAP, PB registry, SEAM-INDEX)
**.gitignore** edited: `.claude/` entry removed (C-20 pre-condition)

---

## Trial results (Arm A vs Arm B)

| Task | Arm A (without scaffold) | Arm B (with scaffold) | Ratio |
|---|---|---|---|
| D3 GIF disposal=3 logic | ~5 files | 1 file | 5.0× |
| D9 file:// fetch path | ~6 files | 2 files | 3.0× |
| D12 mutation-observer PB | ~5 files | 2 files | 2.5× |
| **Median reduction** | — | **60%** | **threshold: 30% ✓** |

Correctness: 100% (3/3). Protected-behavior violations: 0. Hallucinated paths: 0.

---

## Residual risks

| Risk | Status | Action required |
|---|---|---|
| PRIVACY.md false cache claim (F-C-001) | **OPEN — human decision required** | Fix before Chrome Web Store submission (T01) |
| Root .md files ship in zip (F-F-002) | **OPEN — human decision required** | Fix zip script before next release (T02) |
| VSC_SAVE_SETTINGS no payload validation (F-G-001) | OPEN | T04 (src/ change, human approval) |
| 59% src/ files untested | OPEN | T08 registers scaffold tests; characterization tests needed before T03/T04/T05 |
| Scaffold tests (tests/unit/scaffold/) not in run-tests.js | OPEN | T08 — requires human approval to edit run-tests.js |
| StorageManager.onChanged zero callers | OPEN | T05 — new capability, human scoping decision needed |

---

## Needs a human decision

1. **T01 (BLOCKER for release)**: Approve fix of PRIVACY.md `cache: force-cache` → `cache: 'default'` before Web Store submission
2. **T02 (HIGH)**: Approve zip script change to exclude CLAUDE.md, CONTEXT.md, HANDOFF.md from extension package
3. **T03**: Approve removal of dead `src/module-loader.js` (requires writing characterization test first)
4. **T04**: Approve adding payload validation to VSC_SAVE_SETTINGS (security fix, src/ change)
5. **T05**: Decide whether `StorageManager.onChanged` relay is a desired new capability or out of scope
6. **T08**: Approve editing `tests/run-tests.js` to register scaffold tests

---

## Commands to reproduce the verification

```bash
git checkout ai-structure/initiative

# Gate G5: scaffold integrity
node scripts/check-structure.mjs   # → exit 0
node scripts/check-seams.mjs       # → exit 0
node scripts/check-docs.mjs        # → exit 0
node scripts/verify-citations.mjs  # → exit 0 (3 warnings OK)

# Gate G5: test baseline unchanged
npm test                           # → 133/133

# Gate G5: protected surface
git diff --name-status master...HEAD -- src manifest.json LICENSE PRIVACY.md
# must print nothing

# Regenerate repo map
npm run map:repo

# Non-mutating CI gate
npm run check:lint
npm run check:format
```

---

## Key files to read first (any fresh session)

1. `AGENTS.md` — start here (137 lines, all entry points)
2. `docs/ai_generated/SEAM-INDEX.md` — module load order + seam card index
3. `docs/ai_generated/protected-behaviors/registry.md` — what must not break
4. `docs/ai_generated/structure-initiative/tickets/README.md` — migration backlog
5. `STATE.md` in this directory — resume instructions
