---
agent: H-agent-config
role: Team-H
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: complete
---

# H — Agent Configuration Layer

**Mission**: Design the layer that tells AI agents how to work in this repo. Inventory the CLAUDE/ skills tree, assess its relevance to Chrome extension development, and design the optimal entry-point and drift-prevention strategy.

---

## H1: CLAUDE/ Skills Classification

**Evidence method**: VERIFIED — `find CLAUDE/ -type f | sort` and `wc -l` on all files.

There is no `.claude/` directory (VERIFIED: `ls -la .claude/` returns nothing). The skills tree lives entirely under `CLAUDE/` at the repo root — a non-standard location that Claude Code tooling does not auto-load. Skills are accessible only when explicitly read by the operator or invoked by name.

### File inventory (65 files, 4,114 LOC total)

| Path | LOC | Category | Relevant to extension? |
|---|---|---|---|
| CLAUDE/engineering/README.md | 29 | generic-engineering | yes — index |
| CLAUDE/engineering/ask-matt/SKILL.md | 76 | generic-engineering | yes — router |
| CLAUDE/engineering/code-review/SKILL.md | 89 | generic-engineering | yes |
| CLAUDE/engineering/codebase-design/SKILL.md | 114 | generic-engineering | yes — seam/module vocabulary |
| CLAUDE/engineering/codebase-design/DEEPENING.md | — | generic-engineering | yes |
| CLAUDE/engineering/codebase-design/DESIGN-IT-TWICE.md | 44 | generic-engineering | yes |
| CLAUDE/engineering/diagnosing-bugs/SKILL.md | 134 | generic-engineering | yes — gif-controller.js is top bug-fix file |
| CLAUDE/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh | 41 | generic-engineering | yes |
| CLAUDE/engineering/domain-modeling/SKILL.md | 74 | generic-engineering | yes |
| CLAUDE/engineering/domain-modeling/ADR-FORMAT.md | 47 | generic-engineering | yes |
| CLAUDE/engineering/domain-modeling/CONTEXT-FORMAT.md | 60 | generic-engineering | yes |
| CLAUDE/engineering/grill-with-docs/SKILL.md | — | generic-engineering | yes |
| CLAUDE/engineering/implement/SKILL.md | — | generic-engineering | yes |
| CLAUDE/engineering/improve-codebase-architecture/SKILL.md | 66 | generic-engineering | yes |
| CLAUDE/engineering/improve-codebase-architecture/HTML-REPORT.md | 123 | generic-engineering | yes |
| CLAUDE/engineering/prototype/SKILL.md | — | generic-engineering | yes |
| CLAUDE/engineering/prototype/LOGIC.md | 79 | generic-engineering | yes |
| CLAUDE/engineering/prototype/UI.md | 112 | generic-engineering | yes |
| CLAUDE/engineering/research/SKILL.md | — | generic-engineering | yes — pip-research already used this |
| CLAUDE/engineering/resolving-merge-conflicts/SKILL.md | — | generic-engineering | yes |
| CLAUDE/engineering/setup-matt-pocock-skills/SKILL.md | 127 | generic-engineering | partial — one-shot setup |
| CLAUDE/engineering/setup-matt-pocock-skills/domain.md | 51 | generic-engineering | yes |
| CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-github.md | 45 | generic-engineering | yes |
| CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md | 46 | generic-engineering | no |
| CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-local.md | — | generic-engineering | partial |
| CLAUDE/engineering/setup-matt-pocock-skills/triage-labels.md | — | generic-engineering | yes |
| CLAUDE/engineering/tdd/SKILL.md | — | generic-engineering | yes |
| CLAUDE/engineering/tdd/mocking.md | 59 | generic-engineering | yes |
| CLAUDE/engineering/tdd/tests.md | 77 | generic-engineering | yes |
| CLAUDE/engineering/to-spec/SKILL.md | 75 | generic-engineering | yes |
| CLAUDE/engineering/to-tickets/SKILL.md | 114 | generic-engineering | yes |
| CLAUDE/engineering/triage/SKILL.md | 112 | generic-engineering | yes |
| CLAUDE/engineering/triage/AGENT-BRIEF.md | 207 | generic-engineering | yes |
| CLAUDE/engineering/triage/OUT-OF-SCOPE.md | 105 | generic-engineering | yes |
| CLAUDE/engineering/wayfinder/SKILL.md | 127 | generic-engineering | yes — large multi-session work |
| CLAUDE/in-progress/README.md | 10 | in-progress/stale | no |
| CLAUDE/in-progress/claude-handoff/SKILL.md | — | in-progress/stale | partial |
| CLAUDE/in-progress/loop-me/SKILL.md | — | in-progress/stale | no |
| CLAUDE/in-progress/wizard/SKILL.md | 45 | in-progress/stale | no |
| CLAUDE/in-progress/wizard/template.sh | 211 | in-progress/stale | no |
| CLAUDE/in-progress/writing-beats/SKILL.md | 67 | in-progress/stale | no |
| CLAUDE/in-progress/writing-fragments/SKILL.md | 79 | in-progress/stale | no |
| CLAUDE/in-progress/writing-shape/SKILL.md | 79 | in-progress/stale | no |
| CLAUDE/misc/README.md | 8 | generic-engineering | no |
| CLAUDE/misc/git-guardrails-claude-code/SKILL.md | 95 | generic-engineering | yes — dangerous-git blocking |
| CLAUDE/misc/git-guardrails-claude-code/scripts/block-dangerous-git.sh | — | generic-engineering | yes |
| CLAUDE/misc/migrate-to-shoehorn/SKILL.md | 118 | generic-engineering | no — TypeScript-specific |
| CLAUDE/misc/scaffold-exercises/SKILL.md | 106 | generic-engineering | no |
| CLAUDE/misc/setup-pre-commit/SKILL.md | 91 | generic-engineering | yes — pre-commit already present |
| CLAUDE/personal/README.md | 6 | personal/unrelated | no |
| CLAUDE/personal/edit-article/SKILL.md | — | personal/unrelated | no |
| CLAUDE/personal/obsidian-vault/SKILL.md | 59 | personal/unrelated | no — hardcoded `/mnt/d/Obsidian Vault/` path |
| CLAUDE/productivity/README.md | 18 | generic-engineering | partial |
| CLAUDE/productivity/grill-me/SKILL.md | — | generic-engineering | yes |
| CLAUDE/productivity/grilling/SKILL.md | — | generic-engineering | yes |
| CLAUDE/productivity/handoff/SKILL.md | — | generic-engineering | yes |
| CLAUDE/productivity/teach/SKILL.md | 140 | generic-engineering | no |
| CLAUDE/productivity/teach/GLOSSARY-FORMAT.md | — | generic-engineering | no |
| CLAUDE/productivity/teach/LEARNING-RECORD-FORMAT.md | 46 | generic-engineering | no |
| CLAUDE/productivity/teach/MISSION-FORMAT.md | — | generic-engineering | no |
| CLAUDE/productivity/teach/RESOURCES-FORMAT.md | — | generic-engineering | no |
| CLAUDE/productivity/writing-great-skills/SKILL.md | 83 | generic-engineering | yes — for skill authoring |
| CLAUDE/productivity/writing-great-skills/GLOSSARY.md | 201 | generic-engineering | yes — for skill authoring |

**Summary by category**:

| Category | Count | Key observation |
|---|---|---|
| generic-engineering (repo-relevant) | ~38 files | All engineering/ skills apply to Chrome extension work |
| generic-engineering (not specific) | ~10 files | migrate-to-shoehorn, scaffold-exercises, teach, etc. |
| personal/unrelated | 3 files | obsidian-vault hardcodes a personal filesystem path |
| in-progress/stale | 8 files | Writing skills and wizard have no extension relevance |

### disable-model-invocation flags

VERIFIED: 22 files carry `disable-model-invocation: true`. This flag prevents Claude Code from auto-activating those skills — they only fire when explicitly named by the operator. The flag is concentrated in all user-invoked engineering skills (ask-matt, grill-with-docs, implement, improve-codebase-architecture, setup-matt-pocock-skills, to-spec, to-tickets, triage, wayfinder), all in-progress skills, all personal skills, and all user-invoked productivity skills. Model-invoked skills (tdd, research, diagnosing-bugs, codebase-design, code-review, prototype, domain-modeling, grilling) have no flag and carry rich trigger-phrasing descriptions.

### Discoverability gap

VERIFIED: Claude Code auto-loads `CLAUDE.md` at the repo root and any `CLAUDE.md` files in parent directories. It also auto-loads `.claude/agents/*.md` subagent definitions. It does NOT auto-scan or auto-load files under `CLAUDE/` — that directory name is not a recognized Claude Code convention (the recognized paths are `CLAUDE.md` and `.claude/`). Skills under `CLAUDE/` are therefore only usable when the operator explicitly reads and invokes them by name. This is the intended design: the `disable-model-invocation` flag and README structure confirm these are pull-loaded, not push-loaded.

Current `CLAUDE.md` does not reference `CLAUDE/` at all (VERIFIED: `grep -n "CLAUDE/" CLAUDE.md` returns nothing; `grep -n "skills\|SKILL" CLAUDE.md` returns nothing). The skills tree is invisible to an agent that only reads `CLAUDE.md`.

---

## H2: Tool Conventions

**Evidence method**: VERIFIED — file presence checks; OBSERVED — Claude Code documentation behavior; INFERRED — from `.gitignore` entries and CLAUDE/ README structure.

| File/Path | When loaded | By what tool | Notes |
|---|---|---|---|
| `CLAUDE.md` (root) | Every session, automatically | Claude Code | 4,897 chars; always in context |
| `CLAUDE.md` (parent dirs) | Every session, if present | Claude Code | No parent CLAUDE.md exists here |
| `.claude/agents/*.md` | When subagent invoked | Claude Code | `.claude/` does not exist; `.gitignore` excludes `.claude/` — INFERRED this is intentional |
| `.claude/settings.json` | On startup | Claude Code | Does not exist |
| `AGENTS.md` (root) | Every session, automatically | Codex / OpenCode agents | Does not exist; charter §5 explicitly allows creating it |
| `CLAUDE/*/SKILL.md` | Only when explicitly read | Human or agent, on demand | Not auto-loaded by any tool; ~4,114 LOC total |
| `CONTEXT.md` | On demand (pointer in CLAUDE.md) | Human or agent | Referenced in CLAUDE.md §Agent Skills |
| `docs/ai_generated/domain.md` | On demand | Human or agent | Pointer in CLAUDE.md §Agent Skills |
| `docs/ai_generated/adr/` | On demand | Human or agent | Pointer in CLAUDE.md §Agent Skills |

**Key finding**: The `.gitignore` explicitly excludes `.claude/` (VERIFIED: A2-baseline §3). This means any `.claude/agents/` files would be untracked by git — a deliberate choice to keep agent definitions local and not versioned. The charter §5 explicitly allows writing to `.claude/**`, overriding the `.gitignore` for program purposes. Subagent definitions created here will not persist across a fresh clone unless `.gitignore` is updated or they are committed with `git add --force`.

---

## H3: Entry-Point Design

### Current state

`CLAUDE.md` is 4,897 characters (VERIFIED). It covers: project overview, module structure, build/test/dev commands, coding style, naming conventions, testing guidelines, commit/PR guidelines, and three agent-skills pointers (issue tracker, triage labels, domain docs). It contains no reference to `CLAUDE/` skills and no subagent or runbook pointers.

**Assessment**: The file is already well-structured but slightly over the ~4,000-char target. The "Project Structure" section largely restates what `package.json` scripts and the directory layout already convey. The module-by-module listing (lines describing each `src/` file) costs significant characters but provides real localization value for a cold-start agent.

### Proposed design

**Principle**: CLAUDE.md is the always-loaded layer. Keep it to orientation and command facts an agent cannot derive from package.json or directory listing alone. Move pointers to depth, not depth itself.

**Length budget**: ≤ 4,000 chars (≤ ~1,000 tokens). Current file is 4,897 — trim ~900 chars.

**Proposed content outline for CLAUDE.md** (ordered by token-value-per-char):

1. **One-sentence identity** — Chrome MV3 WebExtension, JS ES modules, controls video/audio and GIF playback speed. (Keep.)
2. **Non-obvious facts** — GIF support uses canvas replacement + rAF loop, not HTMLMediaElement. Version discrepancy (manifest 0.9.1 vs package.json 0.8.0 — do not change). These cannot be derived from directory layout. (Keep.)
3. **Module map** — one line per top-level `src/` subdirectory, not per file. Per-file detail belongs in module cards (P6 scaffold). (Trim: remove per-file listings, keep subdirectory descriptions.)
4. **Commands** — the `npm run` scripts that matter most: `build`, `test`, `lint`, `zip`. Package.json already defines them; CLAUDE.md's value is flagging which ones run the full gate (`build` = lint:fix + format + test) and which are partial. (Keep, compress.)
5. **Style facts not in config files** — prefix unused args with `_`, domain-based filenames, keep tests mirrored by feature path. ESLint and Prettier config are in package.json; do not restate rules. (Trim: remove rule restatements, keep the `_` prefix convention and test-mirroring convention.)
6. **Commit/PR conventions** — imperative prefixes, `npm run build` before PR, screenshot requirement for UI changes. (Keep, compress.)
7. **Agent-layer pointers** — one block pointing to: CONTEXT.md (domain vocabulary), docs/ai_generated/domain.md (how to use docs), docs/ai_generated/adr/ (ADRs), AGENTS.md (subagent/runbook index when it exists), CLAUDE/ (skills tree index). (Expand: add CLAUDE/ pointer and planned AGENTS.md pointer.)

**What belongs in AGENTS.md vs CLAUDE.md**:

| Content | CLAUDE.md | AGENTS.md |
|---|---|---|
| Project identity, non-obvious facts | yes | no — CLAUDE.md covers it |
| Module map (directory level) | yes | no |
| npm scripts | yes | no |
| Style conventions | yes | no |
| Subagent role definitions | pointer only | full definition |
| Runbook outlines | pointer only | full runbooks |
| Protected behaviors (zero-diff surface) | brief warning | full registry pointer |
| Skills tree pointer | yes | yes — duplicate for Codex compat |

AGENTS.md is the entry point for non-Claude Code agents (Codex, OpenCode). It should duplicate the essential orientation (project identity, commands, protected surface warning) and add the subagent/runbook index. Do not make it a copy of CLAUDE.md — keep shared orientation minimal, add what those agents need that Claude Code gets from CLAUDE.md auto-load.

---

## H4: Subagent and Runbook Design

### Recurring development tasks

| Task | Steps outline | Complexity driver |
|---|---|---|
| **Add a new Site Handler** | 1. Create `src/site-handlers/{name}-handler.js` extending `base-handler.js`. 2. Register in `src/site-handlers/index.js`. 3. Add host-match pattern to `manifest.json` `content_scripts.matches`. 4. Add unit test in `tests/unit/` mirroring the handler file. 5. Run `npm run build`. | manifest.json edit is easy to miss; index.js registration is second miss point |
| **Add a new Action** | 1. Add constant to `src/utils/constants.js`. 2. Add dispatch case in `src/core/action-handler.js`. 3. Add key-binding entry in `src/core/settings.js` defaults. 4. Update options UI in `src/ui/options/options.js` and `options.html`. 5. Update GIF action subset check in `src/core/gif-controller.js` if applicable. 6. Add tests for all touched modules. 7. Update CONTEXT.md Action vocabulary entry. | 6 files across 4 directories; GIF subset is frequently missed |
| **Add a persisted setting** | 1. Add key and default to `src/core/settings.js`. 2. Add storage read/write in `src/core/storage-manager.js`. 3. Add options-page UI in `src/ui/options/options.html` + `options.js`. 4. Wire bridge message if content script needs it at runtime. 5. Add unit test covering storage round-trip. | Bridge wiring from `src/background.js` to content script is the hard step |
| **Change GIF behavior** | 1. Identify which of the three GIF modules owns the behavior: `gif-frame-engine.js` (delay/timing), `gif-controller.js` (canvas, rAF, memory), `gif-observer.js` (detection). 2. Edit target module. 3. Check whether the GIF action subset in `action-handler.js` is affected. 4. Verify memory budget constants in `GifFrameCache`. 5. Run `npm run test:gif`. 6. Confirm CONTEXT.md glossary terms still accurate. | gif-controller.js is the top bug-fix file (14/23 fix: commits); changes here carry highest regression risk |
| **Cut a release** | 1. Reconcile version in `manifest.json` (0.9.1) and `package.json` (0.8.0) — decide which to bump, bump both consistently. 2. Run `npm run build` (full gate). 3. Run `npm run test:e2e`. 4. Run `npm run zip` → `dist/videospeed.zip`. 5. Verify zip contains only `manifest.json`, `src/`, and `*.md`. 6. Upload to Chrome Web Store. | Version discrepancy is a pre-existing debt; must be resolved before any release |

### Subagent role definitions needed

The following roles warrant `.claude/agents/*.md` definitions (to be created in P6):

| Role file | Purpose | Trigger |
|---|---|---|
| `.claude/agents/triage.md` | Move GitHub issues through the triage state machine (needs-triage → categorized → agent-brief written) | Human asks to triage, or issue count in needs-triage > 0 |
| `.claude/agents/implement.md` | Implement a spec or ticket set: reads ticket, plans seams, applies TDD, runs build gate, self-reviews | Human provides ticket or spec reference |
| `.claude/agents/research.md` | Investigate a question against primary sources (Chrome docs, MV3 spec, Web APIs), write findings to `docs/ai_generated/` | Human asks a factual question about APIs, browser behavior, or compatibility |
| `.claude/agents/code-review.md` | Two-axis review (standards + spec) of a diff since a base SHA | Human asks for review of a branch or PR |
| `.claude/agents/release.md` | Cut a release: version reconciliation, build gate, zip, pre-flight checklist | Human says "cut a release" or "prepare zip" |

Note: `.claude/` is in `.gitignore` (VERIFIED). Any files written there will be untracked. If these definitions need to persist, either commit with `git add --force` or update `.gitignore` to allow `.claude/agents/`.

---

## H5: Drift Prevention

### Current hook coverage

The pre-commit hook (`.pre-commit-config.yaml`, VERIFIED) enforces:
- `trailing-whitespace` — whitespace hygiene
- `end-of-file-fixer` — EOF newlines
- `check-yaml` — YAML syntax
- `check-added-large-files` — binary size guard
- `prettier` — JS formatting

**What it does NOT enforce**: glossary sync, doc-code consistency, path citation validity, module registry agreement, or protected-behavior coverage. There are no existing hooks that verify docs sync with code.

### Drift risk surface (ranked by severity)

| Risk | Mechanism | Current protection |
|---|---|---|
| CONTEXT.md glossary drifts from code terms | New code adds domain concepts without glossary update | None |
| CLAUDE.md module map becomes stale | Files renamed or moved in src/ | None |
| ADR premises become false | Code changes invalidate an ADR's stated rationale | None |
| Citation paths in docs point to deleted files | Refactors move files | None — check:citations script planned but not built |
| Protected-behavior registry missing new behaviors | New GIF or controller behavior added without registry entry | None |
| Injector load order in docs diverges from manifest.json | manifest.json content_scripts order changed | None |

### Proposed check scripts (to build in P6)

These scripts are designed as `npm run check:*` entries in package.json, exiting non-zero on failure. They run in CI and are callable by agents as `npm run check:<name>`.

**check:citations** — verify every file path cited in `docs/ai_generated/**/*.md` resolves to an existing file in the repo. Implementation: extract `path:line@sha` patterns and bare paths, run `git ls-files --error-unmatch` on each. Catches stale doc references after refactors.

**check:structure** — verify three-way agreement: (a) `src/site-handlers/index.js` export list, (b) `manifest.json` content_scripts matches list, (c) `docs/ai_generated/structure-initiative/` module registry (when written). Implementation: parse index.js exports, parse manifest.json matches, diff against registry. Catches handler additions that miss one registration point.

**check:docs** — verify every protected behavior in the registry (to be created in P6) has at least one code pointer and one test pointer that resolve. Implementation: read registry rows, resolve cited paths with `git ls-files`. Catches behaviors documented but no longer covered by tests.

**check:glossary** — scan `src/**/*.js` for domain terms defined in CONTEXT.md and flag new capitalized compound words or jargon that do not appear in the glossary. Implementation: extract noun phrases from JSDoc comments and variable names against glossary term list. Heuristic only — flags candidates for human review. Does not exit non-zero automatically.

**Pre-commit integration**: `check:citations` and `check:structure` are candidates for pre-commit hooks (fast, deterministic). `check:docs` depends on the registry existing (P6). `check:glossary` is advisory only — too noisy for a blocking hook.

---

## Ranked Design Recommendations

| Rank | Recommendation | Impact | Cost | Evidence class |
|---|---|---|---|---|
| 1 | **Add CLAUDE/ pointer to CLAUDE.md** — one line pointing agents to `CLAUDE/engineering/README.md` as the skills index. Zero-cost, eliminates the complete invisibility of the skills tree to agents reading only CLAUDE.md. | High — unlocks all 35+ engineering skills for model discovery | ~50 chars added | OBSERVED: CLAUDE.md has no reference to CLAUDE/ |
| 2 | **Create AGENTS.md at root** — orientation + command facts + protected surface warning + subagent/runbook index. Required by the charter (§5 explicitly allows it). Codex and OpenCode agents cannot read CLAUDE.md; they get no orientation today. | High — enables multi-agent program operation | ~2,000 chars | OBSERVED: no AGENTS.md exists |
| 3 | **Trim CLAUDE.md per-file listings** — replace per-file module descriptions with per-directory descriptions. Reclaims ~900 chars, brings file under 4,000-char budget, reducing cold-start context load. | Medium — every session pays the cost | 30 min edit | VERIFIED: file is 4,897 chars |
| 4 | **Write .claude/agents/triage.md and implement.md** — the two highest-frequency operational roles. Subagent definitions enable one-shot invocation without the operator manually loading skills. | Medium — operational leverage | ~500 chars each | INFERRED from task frequency |
| 5 | **Add check:citations to package.json and pre-commit** — prevents stale path citations in docs from becoming hallucination fuel for agents. This program alone is generating dozens of doc files with path citations. | Medium — grows in value as doc corpus grows | ~100 LOC script | INFERRED: no citation check exists |
| 6 | **Add check:structure to package.json** — three-way agreement check between site-handler index, manifest.json matches, and module registry. The "Add a new Site Handler" runbook has two known miss points; this check makes both detectable. | Medium — catches the most common handler-addition mistake | ~80 LOC script | OBSERVED: A3 co-change data shows manifest.json is rank-2 churn file |
| 7 | **Resolve .claude/ gitignore conflict** — either update `.gitignore` to `!.claude/agents/` or commit agent definitions with `git add --force`. Any subagent definitions written will be lost on fresh clone otherwise. | Low-now, High-later — only matters after agent definitions are written | 1 line gitignore edit | VERIFIED: .gitignore line `.claude/` confirmed in A2-baseline |
| 8 | **Move personal/ and in-progress/ skills out of the repo** — `personal/obsidian-vault` hardcodes `/mnt/d/Obsidian Vault/` and will confuse agents reading the skills index. Writing-* skills have no extension relevance. | Low — skills are not auto-loaded, so confusion is bounded | Move to personal dotfiles | OBSERVED: obsidian-vault path is hardcoded |

---

## Summary

**CLAUDE/ tree**: 65 files, 4,114 LOC across 5 top-level buckets. The `engineering/` bucket (~38 files) is broadly applicable to Chrome extension development. `personal/` (3 files, including an Obsidian skill with a hardcoded personal path) and `in-progress/` (8 writing-focused skills) are irrelevant to this repo. No `.claude/` directory exists; the skills tree is not auto-discovered by any tool — it is entirely invisible unless the operator reads `CLAUDE/engineering/README.md` explicitly, and CLAUDE.md contains no pointer to it.

**Key entry-point findings**: CLAUDE.md is well-structured but 900 chars over budget, contains no skills pointer, and no AGENTS.md exists for non-Claude-Code agents. The `.gitignore` excludes `.claude/`, so any subagent definitions written there will not survive a fresh clone.

**Top drift risks**: (1) CLAUDE.md module map goes stale when files are renamed. (2) ADR citations point to deleted paths after refactors. (3) The planned protected-behavior registry has no enforcement mechanism until `check:docs` is built.

**Output file**: `/home/vercel-sandbox/videospeed/docs/ai_generated/structure-initiative/11-agent-config/H-agent-config.md`
