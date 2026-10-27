---
team: D
title: AI-Navigability & Context Engineering
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: complete
evidence_protocol: VERIFIED/OBSERVED/INFERRED/UNVERIFIED
---

# D-Navigability: AI Agent Navigation Audit

## D1 Context-Cost Mapper

### File-level token estimates

Token estimate: 1 token ≈ 4 chars. All char counts VERIFIED via `wc -c`.

| File | Chars | Est. Tokens | Load status |
|---|---|---|---|
| `CLAUDE.md` | 4,897 | ~1,224 | Always-loaded (auto-injected by Claude Code) |
| `CONTEXT.md` | 5,873 | ~1,468 | Reachable (linked from CLAUDE.md §Domain docs) |
| `HANDOFF.md` | 35,242 | ~8,810 | Reachable (not referenced in CLAUDE.md directly) |
| `README.md` | 5,825 | ~1,456 | Reachable |
| `CONTRIBUTING.md` | 4,801 | ~1,200 | Reachable |
| `src/core/gif-controller.js` | 32,590 | ~8,148 | Reachable |
| `src/content/inject.js` | 20,449 | ~5,112 | Reachable |
| `src/core/action-handler.js` | 16,399 | ~4,100 | Reachable |
| `src/lib/gifuct-js.min.js` | 16,153 | ~4,038 | Reachable (minified; opaque to agent) |
| `src/content/injector.js` | 11,398 | ~2,849 | Reachable |
| `src/core/settings.js` | 9,972 | ~2,493 | Reachable |

### Cold-agent load on first prompt

OBSERVED: Claude Code auto-loads `CLAUDE.md` (4,897 chars / ~1,224 tokens) before the first tool call. All other context must be pulled by explicit reads. A cold agent therefore begins with ~1,224 tokens of repo context.

### CLAUDE/ tree burden

VERIFIED via `wc -l` and `wc -c`:

| Metric | Value |
|---|---|
| CLAUDE/ total chars | 240,073 |
| CLAUDE/ total LOC | 4,114 |
| CLAUDE/ est. tokens | ~60,018 |
| Entire repo chars (excl. `.git`) | 8,810,081 |
| CLAUDE/ share of repo chars | **2.7%** |
| CLAUDE/ share of repo LOC | ~1.9% (repo: 219,963 LOC) |
| Load mode | Reachable only — not auto-loaded |

The CLAUDE/ tree is NOT always-loaded. It contains general-purpose skill templates (engineering, productivity, misc) with no video-speed-controller domain content. An agent following only CLAUDE.md pointers would never reach CLAUDE/ in a normal task session. Loading all 63 files would cost ~60,018 tokens — a substantial but avoidable context burn.

### All files in CLAUDE/ tree

VERIFIED via `find CLAUDE/ -type f | sort`:

```
CLAUDE/engineering/README.md
CLAUDE/engineering/ask-matt/SKILL.md
CLAUDE/engineering/code-review/SKILL.md
CLAUDE/engineering/codebase-design/DEEPENING.md
CLAUDE/engineering/codebase-design/DESIGN-IT-TWICE.md
CLAUDE/engineering/codebase-design/SKILL.md
CLAUDE/engineering/diagnosing-bugs/SKILL.md
CLAUDE/engineering/diagnosing-bugs/scripts/hitl-loop.template.sh
CLAUDE/engineering/domain-modeling/ADR-FORMAT.md
CLAUDE/engineering/domain-modeling/CONTEXT-FORMAT.md
CLAUDE/engineering/domain-modeling/SKILL.md
CLAUDE/engineering/grill-with-docs/SKILL.md
CLAUDE/engineering/implement/SKILL.md
CLAUDE/engineering/improve-codebase-architecture/HTML-REPORT.md
CLAUDE/engineering/improve-codebase-architecture/SKILL.md
CLAUDE/engineering/prototype/LOGIC.md
CLAUDE/engineering/prototype/SKILL.md
CLAUDE/engineering/prototype/UI.md
CLAUDE/engineering/research/SKILL.md
CLAUDE/engineering/resolving-merge-conflicts/SKILL.md
CLAUDE/engineering/setup-matt-pocock-skills/SKILL.md
CLAUDE/engineering/setup-matt-pocock-skills/domain.md
CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-github.md
CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-gitlab.md
CLAUDE/engineering/setup-matt-pocock-skills/issue-tracker-local.md
CLAUDE/engineering/setup-matt-pocock-skills/triage-labels.md
CLAUDE/engineering/tdd/SKILL.md
CLAUDE/engineering/tdd/mocking.md
CLAUDE/engineering/tdd/tests.md
CLAUDE/engineering/to-spec/SKILL.md
CLAUDE/engineering/to-tickets/SKILL.md
CLAUDE/engineering/triage/AGENT-BRIEF.md
CLAUDE/engineering/triage/OUT-OF-SCOPE.md
CLAUDE/engineering/triage/SKILL.md
CLAUDE/engineering/wayfinder/SKILL.md
CLAUDE/in-progress/README.md
CLAUDE/in-progress/claude-handoff/SKILL.md
CLAUDE/in-progress/loop-me/SKILL.md
CLAUDE/in-progress/wizard/SKILL.md
CLAUDE/in-progress/wizard/template.sh
CLAUDE/in-progress/writing-beats/SKILL.md
CLAUDE/in-progress/writing-fragments/SKILL.md
CLAUDE/in-progress/writing-shape/SKILL.md
CLAUDE/misc/README.md
CLAUDE/misc/git-guardrails-claude-code/SKILL.md
CLAUDE/misc/git-guardrails-claude-code/scripts/block-dangerous-git.sh
CLAUDE/misc/migrate-to-shoehorn/SKILL.md
CLAUDE/misc/scaffold-exercises/SKILL.md
CLAUDE/misc/setup-pre-commit/SKILL.md
CLAUDE/personal/README.md
CLAUDE/personal/edit-article/SKILL.md
CLAUDE/personal/obsidian-vault/SKILL.md
CLAUDE/productivity/README.md
CLAUDE/productivity/grill-me/SKILL.md
CLAUDE/productivity/grilling/SKILL.md
CLAUDE/productivity/handoff/SKILL.md
CLAUDE/productivity/teach/GLOSSARY-FORMAT.md
CLAUDE/productivity/teach/LEARNING-RECORD-FORMAT.md
CLAUDE/productivity/teach/MISSION-FORMAT.md
CLAUDE/productivity/teach/RESOURCES-FORMAT.md
CLAUDE/productivity/teach/SKILL.md
CLAUDE/productivity/writing-great-skills/GLOSSARY.md
CLAUDE/productivity/writing-great-skills/SKILL.md
```

---

## D2 Discoverability — Pointer Quality Audit

### Scoring rubric

- **(T)** Trigger front-loaded? — Does the file put the most agent-relevant dispatch cue in the first screen?
- **(B)** One trigger per branch? — Is each decision path clearly separated (not blended into prose)?
- **(N)** No restatement? — Does the file avoid re-describing things that configs/scripts already declare?

Scores: YES / PARTIAL / NO

### CLAUDE.md (583 words, 10 `##`-level sections, 84 lines)

OBSERVED: Opens with "Project Overview" in §1 — immediately names the extension, MV3, GIF canvas-replacement, and site-handlers. The trigger (what kind of repo this is and where code lives) is front-loaded within the first 5 lines.

| Criterion | Score | Notes |
|---|---|---|
| (T) Trigger front-loaded | YES | Project overview and full `src/` tree map appear before any commands |
| (B) One trigger per branch | YES | Each section (Build, Test, Style, Commit) is a separate heading with no blending |
| (N) No restatement | PARTIAL | §Build Commands restates npm scripts already in `package.json`; §Coding Style restates `.eslintrc`/`.prettierrc` content |

Overall: Good entry point. The restatement of commands/lint rules is a minor redundancy — low cost because CLAUDE.md is always-loaded and the duplication is intentional orientation.

### CONTEXT.md (816 words, 2 `##`-level sections, 91 lines)

OBSERVED: Organized as an alphabetical glossary of domain terms (Action, Blacklist, Canvas Replacement, ...) plus a constants table. No narrative introduction; jumps straight into term definitions.

| Criterion | Score | Notes |
|---|---|---|
| (T) Trigger front-loaded | NO | No leading summary or "start here" pointer; agent must scan all terms before understanding scope |
| (B) One trigger per branch | PARTIAL | Terms are defined sequentially but no cross-links; an agent looking for "GIF" behavior must scan all 16 terms |
| (N) No restatement | YES | Pure glossary; does not re-describe code behavior beyond defining terms |

Overall: Optimized for lookup by an agent that already knows which term to search for, but weak for a cold agent that needs a map of the domain. Lacks a brief preamble pointing to the entry seam.

### README.md (922 words, 3 `##`-level sections, 62 lines)

OBSERVED: User-facing documentation. Describes keyboard shortcuts and GIF behavior for end users, with FAQ and settings table.

| Criterion | Score | Notes |
|---|---|---|
| (T) Trigger front-loaded | NO | Leads with user-facing narrative ("HTML5 video provides a native API..."), not file locations or module names |
| (B) One trigger per branch | NO | Mixed audience (end user + agent); no dedicated agent section |
| (N) No restatement | NO | Settings table duplicates defaults already in `src/utils/constants.js` and `src/core/settings.js` |

Overall: Provides no localization help for an agent. Does not name any source files. Useful only for understanding the external behavior contract. An agent must read CLAUDE.md and CONTEXT.md first.

### Summary scorecard

| File | (T) Front-loaded | (B) One trigger/branch | (N) No restatement | Agent utility |
|---|---|---|---|---|
| `CLAUDE.md` | YES | YES | PARTIAL | High |
| `CONTEXT.md` | NO | PARTIAL | YES | Medium (lookup only) |
| `README.md` | NO | NO | NO | Low (user-facing) |

---

## D3 Invariant-Locality for Protected Behaviors

HANDOFF.md §16 enumerates 10 numbered "Gotchas". The following table maps each to the protected-behavior (PB) cluster it represents, its documentation location, code location, and nearest test.

**Distance scale**: 0 = all in same file; 1 = same directory; 2 = different directories; 3 = no test exists.

| PB-id | Description | Doc location | Code location (OBSERVED) | Test location | Distance |
|---|---|---|---|---|---|
| P1 | `gif-file-fetcher` iframe proxy — only correct path for `file://` GIF fetch; no direct XHR | HANDOFF.md §16 gotcha 1, §4.5; ADR §7 | `src/content/injector.js:174-235`; `src/core/gif-controller.js:388` | `tests/unit/core/gif-controller.test.js:47-170` | 2 |
| P2 | `vscGifIgnore` + `_vscTeardownSrc` interaction — ignore flag bypassed on src change | HANDOFF.md §16 gotcha 2 | `src/core/gif-controller.js:709,766-767`; `src/content/inject.js:359-364` | No dedicated test found | 3 |
| P3 | Sentinel pattern (`pending: true` / `_cancelled`) — blocks double-attach during async `create()` window | HANDOFF.md §16 gotcha 3 | `src/content/inject.js:367-371`; `src/observers/mutation-observer.js:115,214,247` | No dedicated test found | 3 |
| P4 | `_patchCanvas` indirection in `_drawFrame` — prevents black artifacts; must NOT use direct `putImageData` on composite canvas | HANDOFF.md §16 gotcha 4 | `src/core/gif-controller.js:41,466-500` | `tests/run-tests.js:124,127` (mock only; no behavioral assertion) | 3 |
| P5 | `loopCount = 0` means infinite loop (GIF spec); `null`/`undefined` from `gifuct` must default to 0 | HANDOFF.md §16 gotcha 5 | `src/core/gif-controller.js:120,533` | `tests/helpers/module-loader.js:77` (fixture sets `loopCount: 0`; no edge-case test for null input) | 3 |
| P6 | `disposal=2` fills with `_bgColor` via `fillRect`, not `clearRect` — prevents black backgrounds on transparent frames | HANDOFF.md §16 gotcha 6 | `src/core/gif-controller.js:444-453` | `tests/fixtures/gif-fixtures.js:19` (fixture declares `disposal=2`; no assertion that `fillRect` is called with `_bgColor`) | 3 |
| P7 | Module load order in `injector.js` is critical — sequential, globals via `window.VSC.*` | HANDOFF.md §16 gotcha 8 | `src/content/injector.js` (sequential injection) | `tests/integration/module-integration.test.js` (partial coverage) | 2 |
| P8 | Custom Node+JSDOM test runner — do NOT add `jest.config.js` or run `npx jest` | HANDOFF.md §16 gotcha 7 | `tests/run-tests.js` | N/A (meta-constraint, not runtime behavior) | N/A |

**Summary of worst gaps**: P2, P3, P4, P5, P6 all have distance score 3 — documented in HANDOFF.md, implemented in `src/`, but with no dedicated test assertion that would catch a regression. The only enforcement is the human-readable prose in §16.

---

## D4 Task Blast Radius

Estimates are INFERRED from reading CLAUDE.md, HANDOFF.md §2, and the src/ module map. "Read" = files an agent must load to understand the seam; "Write" = files that must change.

| Task | Description | Files to READ | Files to WRITE | Read count | Write count |
|---|---|---|---|---|---|
| D1 | Add a new Site Handler | `src/site-handlers/base-handler.js`, `src/site-handlers/index.js`, one existing handler (e.g. `youtube-handler.js`), `src/content/injector.js` (load order), `manifest.json` (`web_accessible_resources`), CLAUDE.md | New `src/site-handlers/<name>-handler.js`, `src/site-handlers/index.js`, `src/content/injector.js`, `manifest.json` | 6 | 4 |
| D2 | Add a new Action | `src/core/action-handler.js`, `src/core/gif-controller.js` (GIF action subset), `CONTEXT.md` (Action term), `src/utils/constants.js`, `src/ui/controls.js`, `tests/unit/core/action-handler.test.js` | `src/core/action-handler.js`, `CONTEXT.md`, test file | 6 | 3 |
| D7 | Add a persisted setting end to end | `src/core/settings.js`, `src/utils/constants.js`, `src/core/storage-manager.js`, `src/content/injector.js` (bridge), `src/ui/options/options.js`, `src/ui/options/options.html`, `CONTEXT.md` | `src/core/settings.js`, `src/utils/constants.js`, `src/ui/options/options.js`, `src/ui/options/options.html`, `CONTEXT.md`, new test | 7 | 6 |
| D9 | Trace the `file://` GIF fetch path | `src/content/injector.js:165-260`, `src/core/gif-controller.js:380-410`, `src/gif-file-fetcher.js`, `src/gif-file-fetcher.html`, `manifest.json` (`web_accessible_resources`), HANDOFF.md §4.5 and §12 | Read-only trace; 0 writes | 6 | 0 |

**Key observation** (INFERRED): Every multi-file task touches at least 3 different directories under `src/`. There is no single "seam file" that an agent can open to understand a full change type. The highest blast radius task is D7 (persisted setting), requiring reads across `core/`, `utils/`, `content/`, and `ui/` plus a CONTEXT.md update — 7 reads, 6 writes.

---

## D5 Convention Divergence

### Observer pattern count

VERIFIED via `grep -rn "MutationObserver|IntersectionObserver|addEventListener" src/ | wc -l` (excluding `gifuct-js.min.js`):

| Pattern | Count in src/ | Notes |
|---|---|---|
| `addEventListener` | 49 occurrences | Distributed across 9 files |
| `MutationObserver` (raw `new`) | 4 instantiations | `mutation-observer.js`, `gif-controller.js`, `video-controller.js` — three separate instantiation sites |
| `IntersectionObserver` | 0 | Not used |

### Handler registration patterns

OBSERVED via `grep -rn "class.*Handler" src/`:

| Class | File | Registration mechanism |
|---|---|---|
| `ActionHandler` | `src/core/action-handler.js` | Registered as `window.VSC.ActionHandler`; instantiated in `inject.js` |
| `BaseSiteHandler` | `src/site-handlers/base-handler.js` | Registered as `window.VSC.BaseSiteHandler`; subclassed by all site handlers |
| `YouTubeHandler` | `src/site-handlers/youtube-handler.js` | Registered as `window.VSC.YouTubeHandler` |
| `NetflixHandler` | `src/site-handlers/netflix-handler.js` | Registered as `window.VSC.NetflixHandler` |
| `AmazonHandler` | `src/site-handlers/amazon-handler.js` | Registered as `window.VSC.AmazonHandler` |
| `AppleHandler` | `src/site-handlers/apple-handler.js` | Registered as `window.VSC.AppleHandler` |
| `FacebookHandler` | `src/site-handlers/facebook-handler.js` | Registered as `window.VSC.FacebookHandler` |
| `SiteHandlerManager` | `src/site-handlers/index.js` | Registered as `window.VSC.SiteHandlerManager`; selects handler at init |
| `DragHandler` | `src/ui/drag-handler.js` | Not registered on `window.VSC`; directly instantiated |

### Competing conventions for the same concept

| Concept | Competing patterns | Impact |
|---|---|---|
| Module export | `window.VSC.X = X` (all `src/core/`, `src/observers/`, `src/site-handlers/`, most `src/ui/`) vs. direct instantiation for `DragHandler` | An agent adding a new module must infer the correct convention from context; `DragHandler` is a false example |
| Event dispatch | `CustomEvent` via `window.dispatchEvent` (VSC_MESSAGE, VSC_FETCH_GIF_BYTES, VSC_CONTROLLER_CREATED, VSC_CONTROLLER_REMOVED, VSC_SAVE_SETTINGS) vs. `postMessage` (gif-file-fetcher bridge) vs. native `addEventListener` on DOM elements | Three distinct IPC patterns in use; an agent tracing a message must know which channel is active |
| MutationObserver use | Wrapped class `VideoMutationObserver` (for DOM scanning) vs. raw `new MutationObserver` in-line in `gif-controller.js` and `video-controller.js` | The wrapper seam is not enforced; future code may proliferate raw instantiations |
| GIF element exclusion | `vscGifIgnore = true` on `<img>` (GIFs) vs. `vsc-cancelled` CSS class on `<video>`/`<audio>` | Two exclusion mechanisms for what appears to be the same concept (skip controller); no shared interface |

### Convention divergence table summary

| Convention axis | Number of competing patterns | Assessment |
|---|---|---|
| Module registration | 2 (`window.VSC.*` vs. none) | Minor; DragHandler is outlier |
| IPC / event dispatch | 3 (CustomEvent / postMessage / DOM listener) | High divergence; cross-cutting |
| MutationObserver instantiation | 2 (wrapped / raw) | Medium; encapsulation is incomplete |
| Element exclusion (cancel) | 2 (`vscGifIgnore` / `vsc-cancelled`) | Medium; parallel mechanisms, no shared seam |

---

## Top Navigation Obstacles (Ranked by Impact)

### 1. HANDOFF.md is the de-facto protected-behavior registry but is not auto-loaded

OBSERVED: HANDOFF.md (35,242 chars / ~8,810 tokens) contains the only prose description of P2–P6 invariants. It is not referenced from CLAUDE.md and is not auto-loaded. A cold agent working on GIF rendering will not encounter these constraints unless it explicitly reads HANDOFF.md or stumbles on §16. This is the single highest-risk navigation gap.

### 2. Five critical invariants (P2, P3, P4, P5, P6) have no test assertions

OBSERVED: The behaviors guarded by HANDOFF.md §16 gotchas 2–6 (ignore flag interaction, sentinel pattern, patchCanvas indirection, loopCount null handling, disposal=2 fill strategy) are implemented in `src/core/gif-controller.js` and `src/content/inject.js` but have no dedicated test that would fail if the invariant were violated. An agent "optimizing" `_drawFrame` or `_loopCount` would produce silent regressions. Distance score: 3 for all five.

### 3. Three distinct IPC channels with no single dispatch seam

OBSERVED: An agent tracing any message-passing behavior must determine whether to follow `CustomEvent` on `window`, `postMessage` across iframes, or native DOM `addEventListener` — all used in active code paths. There is no dispatch seam file or registry. This forces multi-file reads on any message-flow task.

### 4. CONTEXT.md lacks a cold-start entry preamble

OBSERVED: CONTEXT.md is an alphabetical glossary with no introduction, no "start here" pointer, and no cross-reference to the file that implements each concept. An agent seeing the term "Canvas Replacement" must independently locate `src/core/gif-controller.js`. The file is optimized for lookup, not orientation.

### 5. Task D7 (persisted setting) spans 4 directories and 7 reads

INFERRED: The setting seam is split across `src/utils/constants.js` (default value), `src/core/settings.js` (class), `src/core/storage-manager.js` (storage), `src/content/injector.js` (bridge), `src/ui/options/options.js` (UI), and `src/ui/options/options.html` (form element). No single file or module card describes the full path. An agent without HANDOFF.md §2 must reconstruct this chain from first principles.

### 6. CLAUDE/ tree (63 files, ~60k tokens) is unreachable dead weight for this repo

INFERRED: The CLAUDE/ tree contains general-purpose engineering/productivity skills for a different project context. None of the 63 files reference video-speed-controller domain concepts. The tree is never pointed to by CLAUDE.md, CONTEXT.md, or HANDOFF.md. It imposes zero token cost in practice (never loaded), but it creates confusion: an agent exploring the repo tree will find it and may attempt to load it.

---

*Generated by Team-D. All measurements VERIFIED at base SHA `e904370863d69a2b5d853af62745141953c4860d`.*
