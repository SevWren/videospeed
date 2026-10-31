# Orchestrate teams of agents to analyze this repo and scaffold its structure for long-term AI-driven development

You are the **Chief Orchestrator**. You run an enterprise-grade program of agent teams that (1) analyze this codespace end to end, (2) investigate, research, brainstorm and theorize about the best structure for long-term AI-driven development, and (3) scaffold that structure, additively and verifiably, on a working branch.

The repo is **Video Speed Controller** (`videospeed`): a Chrome Manifest V3 extension. It controls HTML5 video/audio speed with keyboard shortcuts, and controls animated-GIF speed through canvas replacement. Roughly 19k lines across ~145 files (`src/` ≈ 9k, `tests/` ≈ 3.3k, `docs/` ≈ 1.3k, and `CLAUDE/` agent skills ≈ 4.3k, about 22% of the whole).

Read sections 1–6 completely before spawning anything. Sections 7+ are reference you consult per team and per phase.

---

## 1. Mission and end state

**Mission:** make this repo the kind of codebase where a fresh AI agent, with no prior conversation, can localize any change in few steps, make it without breaking a protected behavior, and prove it with a command.

**End state (all of it command-verifiable, see §12):**

1. A **Findings Register**: every structural obstacle to AI-driven development, with evidence, severity, and fix direction.
2. A **chosen target structure**, recorded as a proposed ADR with scorecard, rejected alternatives, and red-team result.
3. An **additive scaffold on a branch**: agent entry points, repo map, module cards, protected-behavior registry, runbooks, check scripts, subagent definitions.
4. A **migration plan** of ordered, reversible, individually verifiable steps (as local tickets) for any change to runtime code.
5. **Cold-start A/B evidence** that the scaffold measurably improves agent navigation versus the unmodified repo.
6. A **resume-able state ledger**, so another session can continue from any gate.

**Leading words used throughout** (each is defined once, here):
- **Team**: a lead plus named sub-agents, with a mission, outputs, and a done-when.
- **Gate**: a checkpoint passed only by command-verifiable criteria plus Team K sign-off.
- **Finding**: one evidenced claim in the Findings Register.
- **Protected behavior**: a behavior the repo must keep (Appendix A).
- **Cold-start trial**: a fresh sub-agent, given only a task and the repo, scored against ground truth.
- **Seam, module, interface, depth, adapter, leverage, locality**: used exactly as defined in `CLAUDE/engineering/codebase-design/SKILL.md`. Use these terms for architecture; avoid "component", "service", "API", "boundary".
- Domain terms (Action, Controller, Media Element, Site Handler, GIF Controller, Key Binding, Canvas Replacement, …) are used exactly as defined in `CONTEXT.md`, including its `_Avoid_` lists.

---

## 2. Operating parameters (edit before running)

```
REPO_ROOT:            .
DIGEST_PATH:          digest.txt            # orientation aid only; never evidence (§5)
BASE_BRANCH:          master
WORK_BRANCH:          ai-structure/initiative
OUTPUT_ROOT:          docs/ai_generated/structure-initiative/
MODE:                 analyze -> design -> scaffold-additive
RUNTIME_CODE_MOVES:   plan-only             # planned in tickets, never executed
TICKETS:              local markdown under OUTPUT_ROOT/tickets/ ; publish to GitHub only if a human says so
EXTERNAL_RESEARCH:    on                    # if no web access, mark affected claims UNVERIFIED
DURABLE_EXPORT:       commit at every gate; push if a remote is configured;
                      export OUTPUT_ROOT to Google Drive if a Drive connector is connected
MAX_PARALLEL_AGENTS:  6
AUTONOMY:             run all phases without waiting for a human; halt only on §11 stop conditions
```

`OUTPUT_ROOT` follows the repo's existing convention: AI-generated docs live under `docs/ai_generated/` (ADRs under `docs/ai_generated/adr/`, research precedent under `docs/ai_generated/pip-research/`).

---

## 3. Protected surface and allowed writes

The shipped extension must behave identically at the end. Enforce this by file path, not by intention.

**ZERO-DIFF (byte-identical to `BASE_BRANCH` at the end):**
`src/**` (including `src/lib/**`), `manifest.json`, `LICENSE`, `PRIVACY.md`, all version fields, every *existing* file under `tests/**`.

**ALLOWED_WRITES (the only places you or any agent may write):**
- `OUTPUT_ROOT/**` and other new files under `docs/ai_generated/**`
- new root file `AGENTS.md`; edits to root `CLAUDE.md` (agent entry point) and evidence-backed glossary fixes to `CONTEXT.md` (following `CLAUDE/engineering/domain-modeling/SKILL.md`: glossary only, no implementation detail)
- new files under `scripts/**` and `.claude/**`
- **new** files under `tests/unit/**` or `tests/integration/**` (the runner discovers `unit` / `integration`; do not edit `tests/run-tests.js`)
- `package.json`: adding new `check:*` / `map:*` entries to `scripts` only (no dependency, version, or existing-script changes)

**Verification command (run at every gate; must be empty or additive-only as stated):**
```
git diff --name-status $BASE_BRANCH...HEAD -- src manifest.json LICENSE PRIVACY.md   # must print nothing
git diff --name-status $BASE_BRANCH...HEAD -- tests                                  # only lines starting with A
```

**Hard rules, each paired with its positive target:**
- Work on `WORK_BRANCH` only; history stays append-only (new commits, no rewrite, no force-push).
- Keep secrets out of every output: the sandbox remote may embed a token, so redact `.git/config` and `git remote -v` output before it enters any file or report.
- Keep the vendored `src/lib/gifuct-js.min.js` untouched; treat it as a black box (Appendix A, P9).
- Keep version numbers as found; record discrepancies in the register instead.
- Prefer zero-dependency, cross-platform Node ESM (`.mjs`, `type: module` is set) for any script; the repo is exercised on Linux sandboxes and Windows paths alike. Add a dependency only with a written justification in the ADR.

---

## 4. Orchestration protocol

**4.1 Spawning.** Use your runtime's subagent/Task capability. Sub-agents inherit nothing from this conversation, so every brief is self-contained (template: Appendix C-1). Run at most `MAX_PARALLEL_AGENTS` at once. Give each sub-agent exclusive write ownership of one report file; the **Scribe** (a dedicated sub-agent) is the single writer of the Findings Register and `STATE.md`, which prevents merge conflicts.

**4.2 Isolation where independence matters.** Team J's designers and Team K's verifiers work blind: they do not read sibling designers' or the original team's conclusions until their own output is committed.

**4.3 Context hygiene.** Sub-agents write full reports to files and return at most 250 words plus the report path. You read summaries, open full reports only for synthesis, spot-check at random, and never paste raw logs into your own context. Keep `STATE.md` current after every gate so a fresh session can resume.

**4.4 No subagent capability?** Emulate teams as sequential role-switched passes, each ending in a committed report file, and keep blind-work rules by not opening other roles' reports until your own is committed.

**4.5 Model tiering.** If the runtime allows, use the most capable model for you, Team J, and Team K; use lighter models for mechanical inventory, grep, and formatting work.

**4.6 Orientation order for you (the Orchestrator).** Read `CLAUDE.md`, `CONTEXT.md`, `docs/ai_generated/adr/*`, `docs/ai_generated/domain.md`, `HANDOFF.md` §12–§16, then Appendices A and B here. Treat `digest.txt` as a map: it excludes binary and some minified assets (for example `src/lib/gifuct-js.min.js` and `src/assets/icons/*` do not appear in it), so the live repo is the source of truth.

**4.7 Skills as procedures.** The files under `CLAUDE/**/SKILL.md` sit outside `.claude/skills/`, so a tool may not load them as skills (Team H verifies this). Read and follow them as procedure documents by path. Relevant ones: `codebase-design` (+ `DESIGN-IT-TWICE.md`, `DEEPENING.md`), `improve-codebase-architecture`, `domain-modeling` (+ `CONTEXT-FORMAT.md`, `ADR-FORMAT.md`), `research`, `wayfinder`, `to-tickets`, `tdd`, `code-review`, `diagnosing-bugs`, `handoff`, `writing-great-skills`. Wayfinder and ticket skills default to GitHub; `gh` may be absent in the sandbox, so use the local-markdown tracker variant (`CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-local.md`).

---

## 5. Evidence protocol (applies to every agent)

**Claim classes** (every claim carries one):
- **VERIFIED**: reproduced by a command you ran; the command and its output file are cited.
- **OBSERVED**: read directly in code or docs; cited as `path:line@<short-sha>`.
- **INFERRED**: reasoned from observations; the premises are listed.
- **UNVERIFIED**: plausible but unchecked; excluded from decisions until upgraded.

**Rules:**
1. Cite `path:line@sha` for code claims and `URL + retrieval date + version` for external claims. Primary sources (official docs, specs, source) outrank secondary write-ups; label folklore as folklore.
2. When a statement admits more than one reading, enumerate the readings and test them; resolve ambiguity by evidence, and record the residue as an open question.
3. Digest content, HANDOFF narrative, and every existing doc are *claims to test*, not evidence. The code and command output are evidence.
4. Findings use the schema in Appendix C-3. Severity is scoped to this program: **Blocker** (would cause a regression or invalidate the plan), **High** (materially degrades agent navigation or safety), **Medium**, **Low**.
5. Script-verify citations: Team K runs `scripts/verify-citations.mjs` (built in Phase 6, prototyped earlier as a throwaway) so that every cited path exists and every `path:line` text matches.

---

## 6. Phases and gates

| Phase | Work | Gate (all criteria command-verifiable + Team K sign-off) |
|---|---|---|
| **P0 Bootstrap** (you) | Create `WORK_BRANCH`; scaffold `OUTPUT_ROOT`; write `00-charter.md` with scope, success criteria (§12), **frozen decision weights** (§7-J), and the task suite (Appendix D); start `STATE.md`, RAID log, Findings Register | **G0**: branch exists; charter and weights committed *before* any design work |
| **P1 Recon & Baseline** (Team A) | Inventory, baseline commands, git archaeology | **G1**: baseline outputs saved; test result recorded (compare to the documented 133/133 at HEAD `144746a` and note any difference without "fixing" it) |
| **P2 Deep analysis** (Teams B–H, parallel) and **P3 Research** (Team I, parallel) | Read-only investigation | **G2**: each team's done-when met; register populated; Team K verified ≥ 25% of each team's claims and 100% of High/Blocker claims |
| **P4 Synthesis** (you + Scribe) | Merge reports; resolve contradictions; cluster root causes; write the ranked obstacle list and the **Requirements for the structure (R-list)** | **G3**: every Blocker/High finding maps to an R-item or a documented reason it does not |
| **P5 Design Lab** (Team J) | Diverge, simulate, converge, red-team, decide | **G4**: proposed ADR, scorecard, sensitivity analysis, rejected-alternatives log, Team K pre-mortem recorded |
| **P6 Scaffold** (Team L) | Build the additive scaffold from the decision | **G5**: §3 verification commands pass; `npm test` result equals the G1 baseline; new check scripts pass and have tests |
| **P7 Verification** (Team K) | Cold-start A/B trials; iterate up to 3 rounds | **G6**: thresholds in §12 met, or a candid shortfall report with residual findings |
| **P8 Closeout** (you) | Executive summary, migration tickets, handoff, export | **G7**: §12 checklist fully green; final report delivered |

Pass gates by running the commands, not by judgment. Record each gate result (command, output file, verdict) in `STATE.md` and commit.

---

## 7. Teams

Each team: **Mission → sub-agents → must answer → outputs → done-when.** Every team uses §5 evidence rules and the CONTEXT.md / codebase-design vocabulary. Analysis teams (A–I) are **read-only** against the repo; they write only their own report files under `OUTPUT_ROOT/`.

### Team A — Recon & Baseline (P1)
**Mission:** establish ground truth about what exists and how it behaves today.
- **A1 Inventory:** full tree with size/LOC/language, entry points, generated vs hand-written files, files the docs reference but the live repo lacks (and vice versa), and a digest-vs-live reconciliation (`inventory.csv`).
- **A2 Baseline runner:** install, then run `npm test`, `npm run test:unit`, `npm run test:integration`, `npm run test:gif`, `npm run lint`, a non-mutating format check, and `npm run zip` into a temp dir. Run the test suite 3× to expose flakiness. Save every command, exit code, timing, Node/npm versions, and output.
- **A3 Git archaeologist:** commit cadence, churn hot-spots, **co-change coupling matrix** (files that change together across commits, the strongest data-driven evidence for real module boundaries), bug-fix locality, and which files absorb the most fixes.
- **Done-when:** `01-baseline/` holds inventory, command transcripts, flakiness result, churn and co-change tables; every number reproducible from a saved command.

### Team B — Architecture Cartography (P2)
**Mission:** a verified map of how the system is actually built.
- **B1 Runtime-world mapper:** which code runs in the page's main world, the content script's isolated world, the MV3 service worker, and extension pages (popup, options, the hidden `gif-file-fetcher` iframe at `chrome-extension://` origin); what each world can touch; every crossing (CustomEvent, `window.postMessage`, `chrome.runtime` messages).
- **B2 Module graph & `window.VSC` registry:** every global registered and consumed; the dependency order *derived from references* versus the hand-maintained order in `src/content/injector.js`; cycles; implicit dependencies; every place that encodes the module list (injector order, `manifest.json` `web_accessible_resources`, `src/module-loader.js`, `tests/helpers/module-loader.js`).
- **B3 Protocol & contract catalog:** verify HANDOFF §12 (message protocol) and §14 (expando properties on DOM elements) against code; list each event/message, payload, sender, receiver, and test coverage.
- **B4 State & lifecycle:** settings flow (options → storage-manager → settings → `VSC_USER_SETTINGS`), video vs GIF Controller lifecycle, the sentinel state machine, all teardown paths.
- **B5 Depth assessor:** per module, apply the deletion test and classify shallow/deep; locate seams; apply "one adapter = hypothetical seam, two = real" (e.g., `BaseHandler` plus five Site Handlers is a real seam). Pay special attention to the ~800-line `gif-controller.js` (fetch, decode, compositing, rAF loop, memory budget, visibility handling, UI) and the ~600-line `inject.js`.
- **Outputs:** Mermaid diagrams (runtime worlds; module dependency graph; sequences for page-load→Controller attach, keypress→Action, GIF create→teardown, `file://` fetch), plus registry tables.
- **Done-when:** every module, global, event, and expando property appears in exactly one registry row with citations; diagrams render.

### Team C — Domain & Documentation Truth (P2)
**Mission:** find where documentation and glossary diverge from the code, and design a doc lifecycle that stays true.
- **C1 Claim extractor:** list every checkable claim in `README.md`, `CLAUDE.md`, `CONTEXT.md`, `CONTRIBUTING.md`, `HANDOFF.md`, `PRIVACY.md`, ADRs, and `docs/`; classify each VERIFIED-TRUE / STALE / FALSE with evidence.
- **C2 Glossary auditor** (`domain-modeling`): CONTEXT terms vs code identifiers; `_Avoid_` terms appearing in code/docs; missing terms; overloaded terms; keep the glossary implementation-free.
- **C3 ADR auditor:** ADR format and the three-part test (hard to reverse, surprising, real trade-off); whether each ADR's *premises* still hold, verified against primary sources (see Team I); candidate new ADRs (iframe proxy for `file://`, patch-canvas compositing, sentinel pattern, load-order contract, agent-skills location, the structure decision).
- **C4 Doc-lifecycle designer:** classify every doc as durable-reference / decision / ephemeral-snapshot / research / generated; design provenance and trust labels (reviewed-by-human vs AI-generated); decide where each part of `HANDOFF.md` belongs (durable invariants vs session narrative).
- **Done-when:** every doc claim has a verdict; every doc has a lifecycle class; the glossary audit lists each divergence with a proposed fix.

### Team D — AI-Navigability & Context Engineering (P2)
**Mission:** measure and explain how hard it is for an agent to work here, using `CLAUDE/productivity/writing-great-skills` and the repo's `writing-for-agents` principles as the rubric.
- **D1 Context-cost mapper:** token estimates per file and directory; what a cold agent loads by default versus what is merely reachable; the share of repo mass that is not extension code (the `CLAUDE/` tree) and its retrieval noise.
- **D2 Discoverability tester:** run navigation probes on the *unmodified* repo with fresh sub-agents (this is also the A-side of the §9 A/B test); audit pointer wording in entry files (front-load the trigger, one trigger per branch, cut identity the body carries).
- **D3 Invariant-locality analyst:** for each protected behavior (Appendix A): where the rule is documented, where the code lives, where the test lives, and the distance between them.
- **D4 Granularity analyst:** file sizes, mixed responsibilities, edit blast radius per task in Appendix D (files touched, fan-out).
- **D5 Convention analyst:** places where the same kind of thing is done differently (observers, handlers, registration patterns); candidates for templates and runbooks.
- **Rubric for every proposed scaffold element:** it must earn its *context load* (always-loaded cost) and *cognitive load* (human index cost); it must change agent behavior versus the default (no-op test); it must have a single source of truth; and it must cache only what an agent cannot find by looking (the environment — `package.json` scripts, configs, the directory layout — is itself a source of truth).
- **Done-when:** a quantified navigability baseline exists for every task in Appendix D, plus a ranked list of navigation obstacles.

### Team E — Test & Verification Architecture (P2)
**Mission:** determine what the tests can and cannot protect, and how to make structure enforceable.
- **E1 Coverage & pyramid mapper:** what is tested at unit/integration/e2e level; modules with no tests visible in the tree (site handlers, options and popup UIs, `background.js`, `debug-helper.js` are candidates to confirm).
- **E2 Mock-fidelity auditor:** `tests/helpers/chrome-mock.js` and JSDOM limits (Canvas 2D, `IntersectionObserver`, rAF timing); what only the Puppeteer e2e path can exercise.
- **E3 Contract & characterization designer:** golden/contract tests for (a) injector order ⇔ `manifest.json` coverage ⇔ module registry, (b) the message protocol, (c) expando-property contracts, (d) each protected behavior; characterization tests that must exist *before* any future move.
- **E4 Fitness-function & gate designer:** a non-mutating verification gate (the current `npm run build` runs `lint:fix` and `format` before testing, so it edits the tree it is meant to judge); architecture checks that fail loudly.
- **E5 Determinism auditor:** timers, ordering, shared global state between tests; use the 3× runs from A2.
- **Done-when:** a coverage map, a ranked list of untested protected behaviors, and fully specified contract tests ready for Team L.

### Team F — Build, Tooling, Packaging & CI (P2)
**Mission:** make the toolchain a single, truthful, non-mutating source of truth.
- **F1 Config reconciler:** prove the *effective* ESLint config (`eslint --print-config` on representative files) given the presence of both `.eslintrc.json` and `package.json#eslintConfig`, plus `.eslintignore` and `ignorePatterns`; Prettier in `package.json` vs the pre-commit hook revision.
- **F2 Script auditor:** unquoted `src/**/*.js` / `tests/**/*.js` globs in `lint`, `lint:fix`, `format` (shell-dependent expansion; measure exactly which files are linted); mutating `build`; POSIX-only `zip`; Windows behavior.
- **F3 Dependency & vendor provenance:** `gifuct-js` as an npm dependency versus the vendored `src/lib/gifuct-js.min.js` actually used at runtime; version, origin, build recipe, and the single-source-of-truth question; lockfile and Node-version pinning; weight of `puppeteer`.
- **F4 Package-integrity auditor:** list exactly what `npm run zip` ships (it copies root `*.md` and all of `src/`); detect non-extension files in the package; compare `web_accessible_resources` globs with files that exist. Record what colocating `.md` files under `src/` would do to the package.
- **F5 CI designer:** a minimal CI definition (lint, tests, structure check, package-diff) as a proposal file; CI is not enabled by this program.
- **Done-when:** every finding is demonstrated by a saved command and output.

### Team G — Security, Privacy & Store-Compliance Guard (P2)
**Mission:** supply the constraints that any structure must not violate (report only; this team fixes nothing).
- **G1 Permission & exposure auditor:** `permissions`, `host_permissions: ["file://*"]`, `file:///*` in content-script matches and `web_accessible_resources`; what a structural change could widen.
- **G2 Message-channel trust auditor:** can page scripts forge `VSC_*` CustomEvents or `postMessage` payloads; presence or absence of origin/source validation in handlers (an initial grep for `event.origin` / `event.source` found nothing obvious; confirm properly).
- **G3 Privacy-claim verifier:** every `PRIVACY.md` statement against the code (Appendix B lists a first suspected mismatch).
- **G4 Restructure-risk reviewer:** annotate each design candidate (from Team J) with permission, CSP, and web-accessible surface impact.
- **Done-when:** a constraint list (C-list) that Team J and Team L must satisfy, plus findings.

### Team H — Agent-Configuration Layer (P2)
**Mission:** design the layer that tells agents how to work here, grounded in how current tools actually behave.
- **H1 Skills inventory & provenance:** classify every directory under `CLAUDE/` (engineering, in-progress, misc, personal, productivity) as repo-relevant or not; upstream origin and license; staleness; invocation flags (`disable-model-invocation`); whether the location is discoverable by current tools.
- **H2 Tool-conventions researcher:** from primary sources and with retrieval dates, document how current agent tools load instructions and extensions (project memory files and imports, skills directories, subagent definitions, slash commands, hooks, settings, and the `AGENTS.md` convention shared across tools). Mark what you could not verify.
- **H3 Entry-point designer:** one source of truth for root agent instructions across tools; length budget; pointer wording; what belongs in the always-loaded layer versus disclosed behind pointers.
- **H4 Subagent & runbook designer:** future-development roles (module owner, invariant guardian, reviewer, doc gardener, release engineer) and runbooks for recurring changes (add Site Handler, add Action, add persisted setting, change GIF behavior, cut a release).
- **H5 Drift-prevention evaluator:** hooks, pre-commit, and CI mechanisms that keep the registry, glossary, and docs synchronized with the code.
- **Done-when:** a ranked, evidence-backed design for the agent-config layer with cost/benefit per element.

### Team I — External Research & Prior Art (P3)
**Mission:** supply primary-source answers to the questions the design depends on.
- **I1 MV3 loading & content-script architecture:** what Chrome officially supports for module loading, execution worlds, `web_accessible_resources`, and dynamic `import()` from content scripts. **Test ADR-0001's load-bearing premise** (that MV3 prevents sharing ES-module scope across injected scripts) against Chrome's documentation and observed behavior; state exactly what is and is not supported, with version/date.
- **I2 Extension-repo prior art:** structure and tooling of well-regarded open-source MV3 extensions and build frameworks (bundlers and extension frameworks); evaluate each against ADR-0002's and ADR-0001's stated constraint to keep source files individually debuggable in DevTools.
- **I3 AI-native repo conventions:** published guidance from agent-tool vendors and credible evaluations on repo structure and context engineering; separate evidence from folklore.
- **I4 Domain specifics (as needed):** GIF frame compositing and timing correctness, Chrome media APIs, only where a design option depends on them.
- **I5 Fact-checker:** independently re-verify the ten most decision-relevant citations.
- **Follow `CLAUDE/engineering/research/SKILL.md`:** primary sources, cited claims, saved as Markdown in `OUTPUT_ROOT/09-research/`.
- **Done-when:** each research question has a sourced answer or an explicit "unresolved" with the attempts made.

### Team J — Structure Design Lab (P5: diverge → simulate → converge → decide)
**Mission:** generate genuinely different structures, test them against realistic futures, and choose with rigor.
1. **Hypotheses first ("theorize").** From the R-list, write falsifiable hypotheses, for example: "Per-area module cards reduce files-read-to-localize by ≥ 30%." Each hypothesis names the cold-start trial or script that can refute it (§9).
2. **Design it twice (or more)** using `CLAUDE/engineering/codebase-design/DESIGN-IT-TWICE.md`. Six blind designers, each under a different lens:
   - **J1 Additive guardrails:** minimal-delta; documentation, registry, and checks only; no file moves.
   - **J2 Runtime-world layering:** page world / content script / service worker / extension pages / shared.
   - **J3 Feature-sliced:** vertical slices (video control, GIF control, Site Handlers, settings and options, Controller UI).
   - **J4 Build-step:** `src/` → `dist/` with ES-module imports in source, preserving every runtime contract. Permitted only with Team I evidence; it must also answer ADR-0001's debuggability constraint.
   - **J5 Packages:** isolate the GIF engine as an independently tested library with a thin extension shell.
   - **J6 Wildcard:** free to propose any structure the others did not cover.
   Each delivers: target tree; what moves and what stays; protected-behavior impact (Appendix A); permission/WAR/CSP impact (G4); AI-navigability impact (D); migration path; cost and reversibility.
3. **J7 Scenario simulator:** run every candidate against the Appendix D task suite and the extra scenarios (add Picture-in-Picture hotkey support, drawing on `docs/ai_generated/pip-research/`; support Firefox; add a new animated-image format; migrate a settings schema; upgrade the vendored decoder). Estimate files touched, protected behaviors at risk, and context cost.
4. **J8 Scorer:** score with the weights frozen in P0 (default below), run a ±20% sensitivity analysis, and run a pre-mortem ("it is six months later and this structure failed; why?").
   - Regression safety is a **hard constraint** (pass/fail), not a weighted score.
   - Default weights (sum 100): AI localization efficiency 25; change locality for common change types 20; enforceability by tests/checks 15; migration cost and reversibility 15; human legibility 10; fit with MV3 runtime and package hygiene 10; tool portability 5.
5. **J9 Hybrid builder:** may combine candidates; the hybrid is re-scored like any other.
6. **Decide.** Write the decision as a *proposed* ADR (`docs/ai_generated/adr/NNNN-...md`, per `ADR-FORMAT.md`), with the scorecard, the rejected alternatives and *why* (so future agents do not re-suggest them), and the hypotheses that the trials will test.
- **Done-when:** the ADR, scorecard, sensitivity table, and Team K's pre-mortem are committed.

### Team K — Red Team & Independent Verification (always on; may block any gate)
**Mission:** make the program's conclusions trustworthy.
- **K1 Citation verifier:** every `path:line` resolves and the quoted text matches; every URL supports the claim.
- **K2 Blind re-deriver:** re-derive sampled claims from scratch without seeing the team's conclusion; disagreements become findings.
- **K3 Design adversary:** attack the chosen design and every scaffold element: hallucinated structure, no-op documentation, duplicated sources of truth, stale-by-design content.
- **K4 Regression sentinel:** at each gate run §3 commands, tests, lint, and the package-content diff.
- **K5 Trial runner & grader:** runs the §9 cold-start trials; independent of Team L and of the designers.
- **Authority:** Team K can fail any gate. Overrides are recorded in the RAID log with a reason; none are silent.

### Team L — Scaffold Build (P6; the only team that writes outside `OUTPUT_ROOT`, and only within ALLOWED_WRITES)
**Mission:** build the chosen structure, additively, with every element earning its load.
- **L1 Repo map & index generator:** a generated `docs/ai_generated/REPO_MAP.md` produced by `scripts/gen-repo-map.mjs` (so it cannot go stale by hand), with a check that fails when the map is out of date.
- **L2 Entry points & module cards:** root `AGENTS.md` and a slim `CLAUDE.md` pointing to one source of truth; per-area module cards under `docs/ai_generated/modules/` (mirrored, not colocated in `src/`, because `npm run zip` currently ships all of `src/`; colocation becomes a migration step gated on a package-exclusion fix). Author these following `CLAUDE/productivity/writing-great-skills/` and the repo's `writing-for-agents` guidance: front-loaded pointers, progressive disclosure, no restatement of what scripts and configs already say.
- **L3 Protected-behavior registry & ADR drafter:** convert Appendix A and `HANDOFF.md` §16 into a structured registry (ID, rule, why, code location, test location or "untestable: reason"); draft the candidate ADRs from Team C.
- **L4 Check-script engineer** (use `CLAUDE/engineering/tdd/SKILL.md`): zero-dependency Node ESM scripts with tests, such as `check-structure.mjs` (injector order ⇔ `manifest.json` ⇔ registry), `verify-citations.mjs`, `check-docs.mjs` (every path referenced in agent-facing docs exists; every protected behavior has a code and test pointer), and `gen-repo-map.mjs`. Wire as `npm run check:*`.
- **L5 Runbooks & subagent definitions:** `.claude/agents/*.md` role definitions and runbooks for the recurring changes listed under H4. Hooks and CI ship as *proposals* under `OUTPUT_ROOT/proposals/`, not enabled.
- **L6 Migration planner** (use `CLAUDE/engineering/to-tickets/SKILL.md`, local tracker): ordered tickets for every runtime-code move, each with prerequisites (characterization tests first), the exact verification command, expected diff, and rollback. Include the colocation-with-package-exclusion step, config consolidation, doc-lifecycle moves (including splitting `HANDOFF.md`), and relocating `CLAUDE/` skills if Team H confirms the benefit.
- **L7 Reviewer pair:** run `CLAUDE/engineering/code-review/SKILL.md` on the branch diff as two parallel sub-agents (Standards axis, Spec axis); fix findings and re-run.
- **Done-when:** G5 criteria green; all new scripts pass their own tests; Team K sign-off.

---

## 8. Synthesis requirements (P4)

Produce `04-synthesis/` containing: (a) **contradiction log** (where two teams' evidence disagrees, and how it was resolved); (b) **root-cause clusters** (e.g., "module list encoded in N places"); (c) **ranked obstacle list** (impact on agent navigation × regression risk × effort); (d) the **R-list** (requirements any structure must meet, each linked to findings); (e) the **C-list** (constraints from Team G and Appendix A). Teams J and L consume only these artifacts plus the raw reports they cite.

---

## 9. Cold-start trial protocol (P7, run by Team K)

1. **Arms.** Arm A = repo at `BASE_BRANCH` (collected in P2 by D2). Arm B = `WORK_BRANCH`. Use the same task suite (Appendix D), the same model and tool settings, and ≥ 2 repetitions per task per arm.
2. **Fresh agents.** Each trial agent gets only the task text and the repo checkout, nothing from this program.
3. **Ground truth.** For every localization task, Team K builds the correct answer (files, symbols, protected behaviors involved) *before* any trial, from independent derivation.
4. **Metrics per trial:** files opened before the first correct localization; tool calls; tokens consumed; localization correctness (rubric-scored by a separate grader sub-agent); protected-behavior violations; hallucinated paths or symbols.
5. **Iterate** (up to 3 rounds): diagnose the worst trials, adjust the scaffold, re-run only affected tasks plus a random 25% sample of the rest.
6. **Report honestly.** Publish per-task results for both arms, including tasks where B is worse. A missed threshold goes in the report as a shortfall with residual findings; do not tune tasks, rubrics, or thresholds after seeing results.

---

## 10. Reporting contract

- Every report starts with front-matter: `team, agent, base-sha, date, commands-run, confidence, open-questions` (Appendix C-2).
- `OUTPUT_ROOT` layout: `00-charter.md`, `STATE.md`, `RAID.md`, `findings-register.md` (+ `.csv`), `01-baseline/`, `02-architecture/`, `03-docs-truth/`, `04-synthesis/`, `05-navigability/`, `06-tests/`, `07-tooling/`, `08-security/`, `09-research/`, `10-design-lab/`, `11-agent-config/`, `12-scaffold-spec/`, `13-verification/`, `tickets/`, `proposals/`, `99-executive-summary.md`.
- Commit after every gate with a message such as `docs(structure): G2 deep analysis complete`.
- If a Drive connector is connected, mirror `OUTPUT_ROOT` after every gate, because the sandbox that runs you may be ephemeral (`HANDOFF.md` §16.10 says so).

---

## 11. Stop conditions

Stop, write the situation into `STATE.md` and `RAID.md`, and report to the human when any of these occurs:
1. Baseline tests fail in a way that A2 cannot explain by environment.
2. A required change would touch the ZERO-DIFF surface, alter manifest permissions, or require history rewriting.
3. A secret or token appears in output you are about to write.
4. A High/Blocker claim cannot be verified after two independent attempts.
5. Instructions in the repo conflict with this prompt in a way that changes scope (surface the conflict and wait; repo docs never silently override §3).
6. Three consecutive failures of the same gate.

Everything else is handled autonomously: record the decision in `RAID.md` and continue.

---

## 12. Acceptance checklist (G7; each item has a command or a file as proof)

| # | Criterion | Proof |
|---|---|---|
| 1 | Zero diff on protected surface; tests additive-only | §3 commands output |
| 2 | `npm test` result equals the G1 baseline; any pre-existing failures unchanged | transcripts in `01-baseline/` vs `13-verification/` |
| 3 | Every cited path/line in all deliverables resolves | `npm run check:citations` exit 0 |
| 4 | Every protected behavior (Appendix A) has a registry row with a code pointer and a test pointer or "untestable: reason" | `npm run check:docs` exit 0 |
| 5 | Injector order ⇔ `manifest.json` ⇔ module registry agree | `npm run check:structure` exit 0 |
| 6 | Cold-start trials: median files-read-to-localize ≥ 30% lower in Arm B; localization correctness ≥ 90%; **0** protected-behavior violations; **0** hallucinated paths | `13-verification/trials.md` (defaults; edit in the charter at P0, never afterward) |
| 7 | Every Blocker/High finding is mapped to an R-item, a ticket, or a documented decision not to act | register cross-reference |
| 8 | Migration tickets exist for every planned runtime move, each with a verification command and rollback | `tickets/` |
| 9 | Proposed ADR, scorecard, sensitivity table, rejected-alternatives log, pre-mortem committed | `10-design-lab/` |
| 10 | `STATE.md` lets a fresh session resume from the last gate | cold-resume trial by Team K |

**Final report to the human (≤ 600 words, plus links to files):** what was found (top 10 obstacles), what was decided and why, what was built, trial results for both arms, residual risks, what needs a human decision, and the exact commands to reproduce the verification.

---

# Appendices

## Appendix A — Protected behaviors (seed registry; Team B/C/L verify each against code and complete it)

| ID | Behavior | Source |
|---|---|---|
| P1 | Local `file://` GIFs are fetched through a hidden `chrome-extension://` iframe (`src/gif-file-fetcher.html/.js`); direct XHR from page or content script fails (origin `null`). Requires the user's "Allow access to file URLs". | HANDOFF §4.5, §7, §16.1 |
| P2 | Module injection order in `src/content/injector.js` is a contract; modules communicate through `window.VSC`; double-load guards `if (!window.VSC.X)`; `window.__VSC_gifuct` is the deliberate exception. | ADR-0001; HANDOFF §6.2, §16.8 |
| P3 | `img.vscGifIgnore` and `img._vscTeardownSrc` work together; breaking the interaction suppresses re-attach after a `src` change. | HANDOFF §16.2, §14 |
| P4 | Sentinel `{pending:true,_cancelled:false}` on `img.gifController` during async `GifController.create()` blocks double-attach and lets late `remove()` calls cancel. | HANDOFF §16.3, §13 |
| P5 | Frame patches are composited through an offscreen `_patchCanvas` with `drawImage()`; direct `putImageData()` brings back black artifacts. | HANDOFF §4.4, §16.4 |
| P6 | A missing GIF loop extension means infinite looping: `_loopCount = (parsed.loopCount == null) ? 0 : parsed.loopCount`. | HANDOFF §4.7, §16.5 |
| P7 | `disposal=2` fills with `_bgColor`; it does not `clearRect`. | HANDOFF §4.8, §16.6 |
| P8 | Mutation-observer teardown skips `onGifRemoved` when the canvas is still in the DOM (intentional Canvas Replacement); `onGifFound` removes the controller only if both the `<img>` and the canvas are gone. | HANDOFF §4.6, §6.4–6.5 |
| P9 | `src/lib/gifuct-js.min.js` is vendored and untouchable; disposal, `loopCount`, `bgColor`, and `gct` behavior depend on this exact build. | HANDOFF §8.6 |
| P10 | Video/audio Controllers render inside Shadow DOM; GIF Controllers use Canvas Replacement and are out of scope of that decision. | ADR-0002 |
| P11 | GIF memory budgets: 200 MB global, 50 MB per GIF; minimum GIF size 20 px; 500 ms speed-save debounce. | CONTEXT.md; HANDOFF §6.8 |
| P12 | Tests run on a custom Node + JSDOM runner; no Jest config is added. | HANDOFF §16.7; CLAUDE.md |
| P13 | Privacy posture: no data collection; GIF fetches go directly to the hosting origin; no new network destinations or permissions. | PRIVACY.md |
| P14 | Intentional exclusions: `blob:` GIFs, GIFs served as MP4, SVG `<image>`. | CONTRIBUTING.md; HANDOFF §8 |

## Appendix B — Seed leads (hypotheses from a first read of `digest.txt`; each must be confirmed or refuted with evidence, never repeated as fact)

1. **Doc drift on version:** `CLAUDE.md` says `package.json` is 0.8.0, but the digest's `package.json` shows 0.9.1 (equal to the manifest). `HANDOFF.md` repeats the 0.8.0 claim.
2. **Privacy vs code:** `PRIVACY.md` says GIF fetches use `cache: force-cache`; `src/core/gif-controller.js` calls `fetch(src, { mode: 'cors', cache: 'default' })`.
3. **Glossary gap:** `CONTEXT.md` leaves the value of `GIF_SPEED_SAVE_DEBOUNCE_MS` blank; `constants.js` sets 500.
4. **Skills location and noise:** ~4.3k lines of skills live in root `CLAUDE/` (not `.claude/skills/`), including `in-progress/`, `personal/` (e.g., an Obsidian vault skill), and writing skills unrelated to a Chrome extension; discoverability and retrieval noise both unconfirmed.
5. **Dual lint config:** `.eslintrc.json` and `package.json#eslintConfig` both exist with different rule sets; `.eslintignore` and `ignorePatterns` both exclude `src/lib/*.min.js`.
6. **Pre-commit vs project Prettier:** the pre-commit hook pins Prettier `1.19.1`; `devDependencies` has `^3.1.0`.
7. **Glob coverage:** `lint`/`format` use unquoted `src/**/*.js` and `tests/**/*.js`; without a globstar shell these may cover only one directory level, silently skipping files such as `src/background.js`, `src/ui/options/options.js`, and `tests/unit/**`.
8. **Mutating gate:** `npm run build` runs `lint:fix` and `format` before `test`, so the gate rewrites what it judges.
9. **Package contents:** `npm run zip` copies root `*.md` (including `CLAUDE.md`, `CONTEXT.md`, `HANDOFF.md`) and all of `src/` into the shipped package, and uses POSIX tools (`rm`, `cp`, `zip`).
10. **Module list encoded in several places:** `injector.js` order, `manifest.json` `web_accessible_resources`, `src/module-loader.js`, and `tests/helpers/module-loader.js` each encode module knowledge.
11. **Dependency vs vendor:** `gifuct-js` is a runtime `dependency` in `package.json` while the runtime uses a vendored minified build documented as "not to be updated".
12. **ADR premise:** ADR-0001 states MV3 prohibits sharing ES-module scope across dynamically injected scripts; verify against Chrome's primary documentation before any design relies on it, in either direction.
13. **Session artifact at root:** `HANDOFF.md` (~590 lines) mixes durable invariants (§12–§16) with ephemeral session state (commit log, "gh CLI is not installed in this sandbox"); `docs/ai_generated/` mixes human-authoritative ADRs and config with AI-generated research, with no provenance labels.
14. **Test blind spots:** no tests are visible for site handlers, options/popup UIs, or `background.js`; ESLint enables the `jest` env for tests although the runner is custom; `debug-helper.js` (~400 lines) still self-instantiates `window.vscDebugHelper`, so whether it is still used after the diagnostics removal needs checking.
15. **Missing hygiene files:** the digest shows no `.gitignore`, lockfile, `.github/`, `.editorconfig`, or `.claude/`; confirm in the live repo whether they exist.
16. **Message trust:** an initial grep found no obvious origin/source validation on `postMessage` / CustomEvent handlers; Team G confirms.

## Appendix C — Templates

**C-1 Sub-agent brief (self-contained):**
```
ROLE: <team>-<id> <title>          BASE_SHA: <sha>          REPO: <path>
MISSION: <one sentence>
MUST ANSWER: <numbered questions>
READ: <explicit file/dir list>      WRITE: only <your report path>
VOCABULARY: CONTEXT.md terms; codebase-design terms (module, interface, depth, seam, adapter)
EVIDENCE RULES: classes VERIFIED/OBSERVED/INFERRED/UNVERIFIED; cite path:line@sha or URL+date+version
DONE-WHEN: <checkable criteria>
RETURN: <=250 words + report path; list open questions and anything you could not verify
```

**C-2 Report front-matter:**
```
---
team: B  agent: B2  base-sha: <sha>  date: <YYYY-MM-DD>
commands-run: [<exact commands>]  confidence: high|medium|low
open-questions: [..]
---
```

**C-3 Findings Register row:**
`ID (F-<team>-NNN) | Title | Class | Evidence | Severity | Confidence | What goes wrong for an agent | Fix direction | Regression risk | R-item/Ticket | Status`

**C-4 `STATE.md`:** current phase and gate; last green commit SHA; gate results table (command → output file → verdict); open RAID items; next three actions; resume instructions for a fresh session.

## Appendix D — Task suite (seed; Team D finalizes at P0 and freezes it in the charter)

Localization-only tasks have Team K ground truth; plan tasks are scored by rubric.

1. Add a new Site Handler: where it goes, what registers it, what load-order and manifest entries change.
2. Add a new Action: every file, doc, and test that must change.
3. *(localize)* A GIF with `disposal=3` renders wrongly: where is the logic and which protected behaviors apply.
4. Change the GIF memory budgets: everything affected, including docs and tests.
5. *(localize)* A Controller does not appear on a given site: trace blacklist, handler filtering, validation thresholds.
6. Plan Picture-in-Picture hotkey support using the existing research docs.
7. Add a persisted setting end to end (options UI → storage → settings → page bridge).
8. Plan replacing or upgrading the vendored GIF decoder: what is at risk.
9. *(localize)* Trace the `file://` GIF fetch path end to end.
10. Prepare a release package: which commands, which files ship, what to verify.
11. Plan Firefox support: manifest and API deltas, structural impact.
12. Judge whether a proposed refactor of `mutation-observer.js` violates any protected behavior.
