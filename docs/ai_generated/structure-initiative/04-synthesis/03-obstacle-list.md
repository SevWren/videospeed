---
team: Orchestrator (P4 Synthesis)
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
confidence: high
---

# Ranked Obstacle List

Ranked by: **agent navigation impact × regression risk × effort** (high impact + high risk + low effort = highest priority).

Each obstacle maps to a root-cause cluster and an R-item.

---

## OBS-01 — Protected behaviors live only in unloaded prose [BLOCKER for cold agents]

**Root cause**: RCC-01
**Impact**: A cold agent editing `gif-controller.js` (the highest-churn file at 61% of bug-fix commits) cannot know that `_patchCanvas`, `loopCount=null`, `disposal=2/bgColor`, or the sentinel pattern are invariants. They will "optimize" these away and produce black artifacts, infinite loop failures, or race conditions — none of which have a failing test.
**Regression risk**: HIGH — 6 of 14 protected behaviors have zero test coverage
**Effort to fix**: LOW — structured registry document + contract test stubs (L3)
**R-item**: R-01
**Evidence**: Teams D (distance-3), E (zero test assertions for P2-P8), A3 (gif-controller.js 61% fix churn)

---

## OBS-02 — HANDOFF.md (~8,800 tokens) is never auto-loaded and has no entry-point pointer [HIGH]

**Root cause**: RCC-03
**Impact**: Every cold-start trial agent will miss the "gotchas for the next LLM" section (§16). They will re-discover or violate P1-P14 without knowing they exist. D found no pointer from CLAUDE.md to HANDOFF.md.
**Regression risk**: HIGH — agents will repeat prior mistakes
**Effort to fix**: VERY LOW — add one pointer line to CLAUDE.md (H3)
**R-item**: R-02
**Evidence**: Teams D, H

---

## OBS-03 — 59% of src files have zero test coverage [HIGH]

**Root cause**: RCC-01
**Impact**: No safety net for 12 untested modules including injector.js (module load order contract), all 5 site handlers, all UI modules, background.js. Any refactor of these touches blind surface.
**Regression risk**: HIGH — changes to untested modules are unverifiable by tests
**Effort to fix**: MEDIUM — characterization tests needed before any runtime moves
**R-item**: R-03
**Evidence**: Team E (59% uncovered, list of 12+ untested modules)

---

## OBS-04 — CLAUDE.md has zero pointers to the 65-file skills tree; .claude/ excluded from .gitignore [HIGH]

**Root cause**: RCC-03
**Impact**: Engineering skills (TDD, code review, domain modeling, codebase design) are invisible to every cold agent. Agent definitions written to .claude/ are lost on re-clone.
**Regression risk**: MEDIUM — operational cost only, not a functional regression
**Effort to fix**: LOW — update CLAUDE.md (pointer), fix .gitignore (1 line), create .claude/
**R-item**: R-02 (same as OBS-02 — both are entry-point design gaps)
**Evidence**: Teams H, D

---

## OBS-05 — Module list encoded in 4 places; WAR globs auto-expose new files [HIGH]

**Root cause**: RCC-02
**Impact**: Adding a new module requires updating injector.js AND manifest.json AND the test helper. Missing any one silently breaks load order or test isolation. WAR `src/core/*.js` means any new file in core/ is immediately web-accessible to page scripts.
**Regression risk**: HIGH — silent WAR expansion is a security issue; missed module registration breaks the extension
**Effort to fix**: LOW — check:structure script + documentation (L4)
**R-item**: R-04
**Evidence**: Teams B, G, F

---

## OBS-06 — `build` script mutates source files; no non-mutating check gate exists [MEDIUM]

**Root cause**: RCC-04
**Impact**: `npm run build` runs lint:fix + format (both write files) before running tests. CI cannot use it. No `check:` equivalent exists. Any agent running `npm run build` in CI will modify the working tree being judged.
**Regression risk**: LOW — existing tests still pass; CI is just missing
**Effort to fix**: LOW — add `check:lint` and `check:format` to package.json scripts; update contributing docs
**R-item**: R-05
**Evidence**: Teams E, F, A2

---

## OBS-07 — PRIVACY.md has a FALSE published claim; root .md files ship in extension zip [BLOCKER for store submission]

**Root cause**: RCC-05 (privacy claim) + RCC-04 (zip contents)
**Impact**: `cache: force-cache` in PRIVACY.md is false (actual: `cache: 'default'`). Submitting to Chrome Web Store with a false privacy statement is a compliance defect. Separately, CLAUDE.md and HANDOFF.md (AI agent instructions) are packaged inside the extension zip.
**Regression risk**: HIGH (store compliance); MEDIUM (package bloat)
**Effort to fix**: LOW — PRIVACY.md one-line fix; zip script exclusion list
**R-item**: R-06
**Evidence**: Teams C, G, F

---

## OBS-08 — `VSC_SAVE_SETTINGS` has no payload validation [HIGH security, MEDIUM navigation]

**Root cause**: RCC-05
**Impact**: Page scripts on any injected site can write arbitrary keys to chrome.storage.sync. Not a cold-agent navigation obstacle, but any structural change that adds new CustomEvents must not replicate this pattern (C-list C-3, C-4).
**Regression risk**: MEDIUM — existing security posture; not worse after scaffold
**Effort to fix**: MEDIUM — requires code change (out of scope for additive scaffold; migration ticket)
**R-item**: R-07 (constraint for Teams J and L)
**Evidence**: Team G

---

## OBS-09 — `src/module-loader.js` is dead code, web-accessible, and ships in the package [MEDIUM]

**Root cause**: RCC-02
**Impact**: Exposes attack surface with zero functionality. Confuses agents scanning the repo (it looks like a module loading system but is never used). Adds 3 global names that pollute `window`.
**Regression risk**: LOW — removing it requires manifest.json change (not in ZERO-DIFF; migration ticket with characterization test first)
**Effort to fix**: LOW once characterization test exists
**R-item**: R-04
**Evidence**: Team B

---

## OBS-10 — CONTEXT.md has no cold-start preamble; 5 candidate ADRs undocumented [MEDIUM]

**Root cause**: RCC-01 (invariant documentation)
**Impact**: Agents find CONTEXT.md but it's alphabetical with no orientation. 5 key architectural decisions (iframe proxy, patch-canvas compositing, sentinel pattern, load-order contract, skills location) have no ADR — agents must re-derive them from HANDOFF.md prose or code.
**Regression risk**: LOW
**Effort to fix**: LOW — L3 drafts candidate ADRs; C4 adds lifecycle labels
**R-item**: R-02
**Evidence**: Teams C, D
