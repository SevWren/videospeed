# Video Speed Controller — Chrome MV3 extension

Controls HTML5 video/audio playback speed and GIF animation speed via keyboard shortcuts.
Injects a floating UI into web pages; supports YouTube, Netflix, Amazon, Apple, Facebook.

---

## Start here

1. **Read this file** — cold-start entry point for Codex, OpenCode, Claude Code, and any tool
   that auto-loads `AGENTS.md`.
2. **Read `CLAUDE.md`** — coding style, test commands, commit conventions.
3. **Locate your task** via the module map below, then read the relevant module card.

Two worlds at runtime:
- **Isolated world** (`src/content/injector.js`) — has `chrome.*`, no `window.VSC`
- **Page main world** (everything else in `src/`) — has `window.VSC`, no `chrome.*`
- Bridge: `window.dispatchEvent(CustomEvent(...))` — 9 named event types (see B-architecture.md)

---

## Key commands

```
npm test                  # unit + integration (JSDOM runner, no Jest CLI)
npm run test:gif          # GIF-specific integration tests only
npm run lint              # ESLint check (no auto-fix)
npm run build             # lint:fix + format + test (full local gate)
node scripts/gen-repo-map.mjs          # regenerate REPO_MAP.md
node scripts/gen-repo-map.mjs --check  # exit non-zero if >24 h stale
```

---

## Module map

Complete file tree with LOC counts and entry point markers:
**`docs/ai_generated/REPO_MAP.md`** (generated; run `npm run map:repo` to refresh)

| Area | Module card | Key files |
|------|-------------|-----------|
| Core | `docs/ai_generated/modules/core.md` | gif-controller.js (805), video-controller.js (432), action-handler.js (568) |
| Content | `docs/ai_generated/modules/content.md` | inject.js (611), injector.js (319), background.js (191) |
| Observers | `docs/ai_generated/modules/observers.md` | mutation-observer.js (351), media-observer.js (290), gif-observer.js (57) |
| Site handlers | `docs/ai_generated/modules/site-handlers.md` | base-handler.js (96) + 5 per-site handlers |
| UI | `docs/ai_generated/modules/ui.md` | shadow-dom.js (248), controls.js (131), options/, popup/ |
| Utils | `docs/ai_generated/modules/utils.md` | event-manager.js (319), debug-helper.js (400), constants.js (121) |

---

## Protected behaviors (what must NOT break)

Registry with code pointers and test locations for all 14 protected behaviors (P1-P14):
**`docs/ai_generated/protected-behaviors/registry.md`**

Key invariants most likely to be accidentally broken:

- **P1** — `src/lib/gifuct-js.min.js` is vendored; do not modify or replace without thorough testing.
- **P3** — `disposal=3` in GIF frames: copy from previous frame canvas. Logic in
  `gif-controller.js::_drawFrame`. **D3 answer: look at `_drawFrame` in gif-controller.js.**
- **P4** — Sentinel pattern: `img.gifController = {pending:true, _cancelled:false}` set before
  async `GifController.create()`. Guards against double-attach and handles race on teardown.
- **P9** — `effectiveDelay` in `gif-frame-engine.js::GifFrameEngine.effectiveDelay` — do not
  round or clamp; floating-point precision is intentional.
- **P11** — Injector load order in `injector.js` lines 37-63 must match `window.VSC.*` dependency
  order. Consumers read globals lazily at call time, not at parse time.

---

## Architecture decisions (why)

ADRs live in `docs/ai_generated/adr/`. Relevant for platform/refactor tasks:

- `0001-window-vsc-global-namespace.md` — why `window.VSC.*` IPC instead of ES imports
- `0002-shadow-dom-controller-isolation.md` — why Shadow DOM for the overlay
- `0003-additive-ai-scaffold.md` — why the scaffold is additive-only (no src/ moves)

Full architecture (worlds, seam crossing points, module dependency graph):
`docs/ai_generated/structure-initiative/02-architecture/B-architecture.md`

---

## Seam index (module dependency map)

Canonical module list + cross-module contracts:
**`docs/ai_generated/SEAM-INDEX.md`** (single source of truth for module registry)

---

## Runbooks (sub-agent roles)

Agent role definitions with pre-conditions live in `.claude/agents/`:
- `implement.md` — pre-conditions before any `src/` edit
- `triage.md` — diagnosis starting points
- `gif-specialist.md` — GIF subsystem invariants
- `site-handler-specialist.md` — per-site handler pattern
- `settings-specialist.md` — settings flow

---

## Constraints — what NOT to do

- **ZERO src/ changes without checking P1-P14** in the protected behaviors registry first.
- **Never modify `src/lib/gifuct-js.min.js`** (vendored GIF decoder — P1).
- **Never add a `chrome.*` call** inside page main world scripts (`src/core/`, `src/utils/`,
  `src/observers/`, `src/site-handlers/`, `src/ui/`, `src/content/inject.js`).
- **Never add CustomEvent listeners without origin/source checking** (VSC_SAVE_SETTINGS gap
  is documented in MT-001; do not replicate the pattern).
- **Never use ES `import`/`export`** in `src/` files — modules communicate via `window.VSC.*`
  globals (ADR-0001). All src/ files are injected as plain `<script>` tags.
- **Load order is sacred** — adding a new module to `injector.js` requires placing it after all
  globals it reads and before all globals that read it (see B-architecture.md B2).
- **Do not run `--fix` or `--write`** in CI scripts; use check-only variants (`check:lint`,
  `check:format`).

---

## D-task quick answers

| Task | Starting point |
|------|---------------|
| D3 — disposal=3 logic | `gif-controller.js::_drawFrame` → `docs/ai_generated/modules/core.md` |
| D9 — file:// fetch path | `injector.js` → `src/gif-file-fetcher.js` (iframe proxy); see B-architecture.md crossing #7-9 |
| D6 — PiP planning | `docs/ai_generated/pip-research/` (5 files; feature researched, not implemented) |
| D10 — release package | `npm run zip` → `dist/videospeed.zip`; check PRIVACY.md MT-002 before Web Store submit |
| D11 — Firefox porting | No MV3→MV2 shim exists; `chrome.*` calls in `injector.js` and `background.js` are the delta |

---

## File-not-exist guard

Before citing a file path in any output, confirm it exists. The `check:docs` script
(`node scripts/check-docs.mjs`) verifies all paths cited in agent-facing docs.

---

*Video Speed Controller AGENTS.md — Team-L scaffold output — base SHA e904370*
