# Structure Initiative Charter

**Program**: AI-Driven Development Scaffold for Video Speed Controller
**Base SHA**: `e904370863d69a2b5d853af62745141953c4860d`
**Base branch**: `master`
**Work branch**: `ai-structure/initiative`
**Output root**: `docs/ai_generated/structure-initiative/`
**Date**: 2026-10-27
**Orchestrator**: Claude Sonnet 4.6 (1M context)

---

## 1. Scope and Mission

Make this repo the kind of codebase where a fresh AI agent, with no prior conversation, can localize any change in few steps, make it without breaking a protected behavior, and prove it with a command.

**In scope:**
- Analysis of every structural obstacle to AI-driven development
- Design of a target structure (additive only — no runtime code moves)
- Scaffold of agent entry points, module cards, protected-behavior registry, runbooks, check scripts, subagent definitions
- Migration plan as local tickets (not executed in this program)
- Cold-start A/B evidence

**Out of scope:**
- Runtime code moves (planned in tickets, never executed)
- Changes to `src/**`, `manifest.json`, `LICENSE`, `PRIVACY.md`, existing `tests/**`
- Publishing tickets to GitHub without human approval

---

## 2. Success Criteria (G7 Acceptance Checklist)

| # | Criterion | Command/File Proof |
|---|---|---|
| 1 | Zero diff on protected surface; tests additive-only | `git diff --name-status master...HEAD -- src manifest.json LICENSE PRIVACY.md` (must print nothing); tests diff shows only `A` lines |
| 2 | `npm test` equals G1 baseline (133/133) | `13-verification/` transcripts |
| 3 | Every cited path/line resolves | `npm run check:citations` exit 0 |
| 4 | Every protected behavior has registry row + code/test pointer | `npm run check:docs` exit 0 |
| 5 | Injector order ⇔ `manifest.json` ⇔ module registry agree | `npm run check:structure` exit 0 |
| 6 | Cold-start trials: median files-read-to-localize ≥ 30% lower Arm B; correctness ≥ 90%; 0 PB violations; 0 hallucinated paths | `13-verification/trials.md` |
| 7 | Every Blocker/High finding mapped to R-item, ticket, or decision | register cross-reference |
| 8 | Migration tickets for every planned runtime move | `tickets/` |
| 9 | Proposed ADR, scorecard, sensitivity table, rejected alternatives, pre-mortem | `10-design-lab/` |
| 10 | `STATE.md` enables a fresh session to resume | cold-resume trial by Team K |

---

## 3. Decision Weights (FROZEN — do not change after G0)

These weights govern Team J's scoring. They are locked here before any design work.

| Criterion | Weight |
|---|---|
| AI localization efficiency | 25 |
| Change locality for common change types | 20 |
| Enforceability by tests/checks | 15 |
| Migration cost and reversibility | 15 |
| Human legibility | 10 |
| Fit with MV3 runtime and package hygiene | 10 |
| Tool portability | 5 |
| **Total** | **100** |

**Regression safety** is a **hard constraint** (pass/fail), not a weighted score. Any design that requires touching the ZERO-DIFF surface fails unconditionally.

---

## 4. Protected Surface (ZERO-DIFF)

Files that must be byte-identical to `master` at program end:
- `src/**` (including `src/lib/**`)
- `manifest.json`
- `LICENSE`
- `PRIVACY.md`
- All version fields
- Every *existing* file under `tests/**`

Verification command (run at every gate):
```bash
git diff --name-status master...HEAD -- src manifest.json LICENSE PRIVACY.md
git diff --name-status master...HEAD -- tests
```
First must print nothing. Second must show only lines starting with `A`.

---

## 5. Allowed Writes

- `docs/ai_generated/structure-initiative/**` (OUTPUT_ROOT)
- Other new files under `docs/ai_generated/**`
- New root file `AGENTS.md`
- Edits to root `CLAUDE.md` (agent entry point) and evidence-backed glossary fixes to `CONTEXT.md`
- New files under `scripts/**` and `.claude/**`
- **New** files under `tests/unit/**` or `tests/integration/**`
- `package.json`: adding `check:*` / `map:*` scripts entries only

---

## 6. Task Suite (Appendix D — frozen here at P0)

Localization tasks (Team K builds ground truth before trials):

| # | Task | Type |
|---|---|---|
| D1 | Add a new Site Handler: where it goes, what registers it, load-order and manifest changes | plan |
| D2 | Add a new Action: every file, doc, and test that must change | plan |
| D3 | A GIF with `disposal=3` renders wrongly: where is the logic and which PBs apply | localize |
| D4 | Change GIF memory budgets: everything affected, including docs and tests | plan |
| D5 | A Controller does not appear on a given site: trace blacklist, handler filtering, validation thresholds | localize |
| D6 | Plan Picture-in-Picture hotkey support using existing research docs | plan |
| D7 | Add a persisted setting end to end (options UI → storage → settings → page bridge) | plan |
| D8 | Plan replacing/upgrading the vendored GIF decoder: what is at risk | plan |
| D9 | Trace the `file://` GIF fetch path end to end | localize |
| D10 | Prepare a release package: which commands, which files ship, what to verify | plan |
| D11 | Plan Firefox support: manifest and API deltas, structural impact | plan |
| D12 | Judge whether a proposed refactor of `mutation-observer.js` violates any protected behavior | plan |

---

## 7. Operating Parameters

```
REPO_ROOT:           /home/vercel-sandbox/videospeed
BASE_BRANCH:         master
BASE_SHA:            e904370863d69a2b5d853af62745141953c4860d
WORK_BRANCH:         ai-structure/initiative
OUTPUT_ROOT:         docs/ai_generated/structure-initiative/
MODE:                analyze -> design -> scaffold-additive
RUNTIME_CODE_MOVES:  plan-only
TICKETS:             local markdown under OUTPUT_ROOT/tickets/
MAX_PARALLEL_AGENTS: 6
NODE_VERSION:        v24.14.1
NPM_TEST_BASELINE:   133/133 passing
```

---

## 8. Evidence Protocol

Every claim carries one class:
- **VERIFIED**: reproduced by a command; command + output file cited
- **OBSERVED**: read directly in code/docs; cited as `path:line@sha`
- **INFERRED**: reasoned from observations; premises listed
- **UNVERIFIED**: plausible but unchecked; excluded from decisions until upgraded

Cite `path:line@sha` for code, `URL + retrieval date + version` for external.

---

## 9. Secrets Policy

Never include git remote URLs (may contain tokens) in any output file. Redact `.git/config` and `git remote -v` output.

---

*Charter committed at G0 by Orchestrator. Weights are frozen. No design work may begin before this commit.*
