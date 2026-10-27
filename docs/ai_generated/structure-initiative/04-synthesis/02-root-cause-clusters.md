---
team: Orchestrator (P4 Synthesis)
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
confidence: high
---

# Root-Cause Clusters

Common roots behind multiple findings. Teams J and L address root causes, not symptoms.

---

## RCC-01: "The invariant registry lives in prose, not code"

**Feeds into**: D3, E3, obstacle rankings #1 and #2

The 14 protected behaviors (Appendix A) exist only in HANDOFF.md §16 prose and two ADRs. There is no machine-readable registry that a tool can check. There is no test that fails when a protected behavior is violated (P2, P3, P4, P6, P7, P8 all have distance score 3 — documented but untested).

**Evidence**: Team D found PBs P2-P6 at distance score 3. Team E found 59% of src files uncovered, and specifically P3, P4, P2, P6, P7, P8 have zero test assertions for their invariants.

**Root cause**: No structured registry format was established when the behaviors were discovered. Each was written as a "gotcha for the next LLM" in HANDOFF.md rather than as a verifiable contract.

**Fix direction**: L3 (protected-behavior registry) + E3 contract tests → check:docs script.

---

## RCC-02: "The module list is encoded in N places without a single source of truth"

**Feeds into**: B2, F4, obstacle ranking #5

Four places independently declare the module list: `src/content/injector.js` (load order), `manifest.json web_accessible_resources` (WAR globs), `src/module-loader.js` (dead, but present), and `tests/helpers/module-loader.js` (test helper). Each can drift independently. WAR uses glob patterns (`src/core/*.js`) that auto-include new files without any manifest change — a silent security expansion.

**Evidence**: Team B verified all four encodings. Team G flagged WAR glob wildcards as C-list constraint C-1. Team F confirmed module-loader.js ships in the zip.

**Root cause**: No enforcement mechanism ties the four encodings together. The injector load order is handwritten and relies on developer knowledge.

**Fix direction**: L4 check:structure script (injector order ⇔ manifest.json ⇔ registry). Migration ticket to remove module-loader.js dead code.

---

## RCC-03: "Agent instructions are invisible or always-unloaded"

**Feeds into**: D1, D2, H1, H2, obstacle ranking #4

CLAUDE.md (4,897 chars) has zero pointers to the 65-file `CLAUDE/` skills tree. HANDOFF.md (~35k chars, ~8,800 tokens) is the de-facto invariant registry but is never auto-loaded by Claude Code and has no pointer from CLAUDE.md. No `AGENTS.md` exists for Codex/OpenCode compatibility. `.claude/` is excluded from `.gitignore`, so any agent definitions written there do not survive a fresh clone.

**Evidence**: Team H confirmed no .claude/ dir, .gitignore conflict, skills invisible. Team D found HANDOFF.md unlinked. Team I found AGENTS.md is missing.

**Root cause**: The agent-configuration layer was never designed as a system — it grew incrementally, and each addition was never integrated into a coherent entry-point design.

**Fix direction**: H3 entry-point redesign → L2 (slim CLAUDE.md + AGENTS.md + module cards) + L5 (.claude/agents/ role definitions). Fix .gitignore to unblock .claude/.

---

## RCC-04: "The toolchain is mutating and non-reproducible"

**Feeds into**: F2, F4, E4, obstacle ranking #6

`npm run build` runs `lint:fix` → `format` → `test` — it rewrites source files before running the test gate it is supposed to judge. `npm run test:gif` claims GIF-only scope but runs all 133 tests. `npm run zip` ships CLAUDE.md, CONTEXT.md, and HANDOFF.md inside the extension package. ESLint has two conflicting configs (package.json silently dead). No `npm run check` command exists for non-mutating verification.

**Evidence**: Team A2 confirmed test:gif = 133. Team F confirmed root .md files in zip, dead eslintConfig, mutating build. Team E confirmed build unfit for CI.

**Root cause**: Scripts were written for developer convenience, not CI correctness. Each script accreted behavior without a governing "mutation vs check" principle.

**Fix direction**: L4 check:* scripts + F5 CI proposal. Package.json: add `check:lint`, `check:format` entries. Migration ticket for zip exclusions.

---

## RCC-05: "Security inputs have no validation layer"

**Feeds into**: G2, G3

`VSC_SAVE_SETTINGS` writes whatever payload a page script dispatches to `chrome.storage.sync`, with no key allowlist, no type check, no size limit check. WAR glob wildcards auto-expose new files. PRIVACY.md contains a false cache claim in a published policy document.

**Evidence**: Team G found VSC_SAVE_SETTINGS validation absent at injector.js:148. PRIVACY.md:17 false claim verified by Team C and G against gif-controller.js:405.

**Root cause**: The message-channel trust model was designed for functionality, not adversarial input. The false PRIVACY.md claim is a copy-paste error from an earlier implementation that used `force-cache`.

**Fix direction**: G C-list constraints C-3 and C-4 are binding for Teams J and L. PRIVACY.md correction is a migration ticket (not blocked on structure work).
