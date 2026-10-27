---
agent: A1-inventory
role: Team-A
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: complete
---

# A1 Baseline Inventory

## 1. Full File Tree with LOC Counts

Evidence method: VERIFIED — produced by `git ls-files` and `wc -l` commands run in `/home/vercel-sandbox/videospeed`.

### src/ (48 files, 10567 LOC total)

| Path | LOC |
|------|-----|
| src/assets/icons/icon128.png | 221 (binary) |
| src/assets/icons/icon16.png | 170 (binary) |
| src/assets/icons/icon19.png | 173 (binary) |
| src/assets/icons/icon19_disabled.png | 48 (binary) |
| src/assets/icons/icon38.png | 175 (binary) |
| src/assets/icons/icon38_disabled.png | 51 (binary) |
| src/assets/icons/icon48.png | 172 (binary) |
| src/assets/icons/icon48_disabled.png | 54 (binary) |
| src/background.js | 191 |
| src/content/inject.js | 611 |
| src/content/injector.js | 319 |
| src/core/action-handler.js | 568 |
| src/core/gif-controller.js | 805 |
| src/core/gif-frame-engine.js | 48 |
| src/core/settings.js | 310 |
| src/core/storage-manager.js | 164 |
| src/core/video-controller.js | 432 |
| src/gif-file-fetcher.html | 16 |
| src/gif-file-fetcher.js | 72 |
| src/lib/gifuct-js.min.js | 490 |
| src/module-loader.js | 71 |
| src/observers/gif-observer.js | 57 |
| src/observers/media-observer.js | 290 |
| src/observers/mutation-observer.js | 351 |
| src/site-handlers/amazon-handler.js | 69 |
| src/site-handlers/apple-handler.js | 60 |
| src/site-handlers/base-handler.js | 96 |
| src/site-handlers/facebook-handler.js | 142 |
| src/site-handlers/index.js | 128 |
| src/site-handlers/netflix-handler.js | 100 |
| src/site-handlers/scripts/netflix.js | 7 |
| src/site-handlers/youtube-handler.js | 120 |
| src/styles/inject.css | 129 |
| src/styles/shadow.css | 105 |
| src/ui/controls.js | 131 |
| src/ui/drag-handler.js | 60 |
| src/ui/options/options.css | 700 |
| src/ui/options/options.html | 182 |
| src/ui/options/options.js | 657 |
| src/ui/popup/popup.css | 348 |
| src/ui/popup/popup.html | 64 |
| src/ui/popup/popup.js | 184 |
| src/ui/shadow-dom.js | 248 |
| src/utils/constants.js | 121 |
| src/utils/debug-helper.js | 400 |
| src/utils/dom-utils.js | 228 |
| src/utils/event-manager.js | 319 |
| src/utils/logger.js | 110 |

### tests/ (33 files, 5721 LOC total)

| Path | LOC |
|------|-----|
| tests/e2e/basic.e2e.js | 161 |
| tests/e2e/display-toggle.e2e.js | 143 |
| tests/e2e/e2e-utils.js | 415 |
| tests/e2e/manual-test-guide.md | 225 |
| tests/e2e/run-e2e.js | 108 |
| tests/e2e/settings-injection.e2e.js | 192 |
| tests/e2e/test-video.html | 34 |
| tests/e2e/validate-extension.js | 122 |
| tests/e2e/youtube.e2e.js | 241 |
| tests/fixtures/gif-fixtures.js | 37 |
| tests/fixtures/test-page.html | 175 |
| tests/helpers/chrome-mock.js | 121 |
| tests/helpers/module-loader.js | 107 |
| tests/helpers/test-utils.js | 304 |
| tests/integration/gif-integration.test.js | 100 |
| tests/integration/module-integration.test.js | 161 |
| tests/run-tests.js | 264 |
| tests/test-config.js | 15 |
| tests/unit/content/inject.test.js | 207 |
| tests/unit/core/action-handler-gif.test.js | 51 |
| tests/unit/core/action-handler.test.js | 359 |
| tests/unit/core/f-keys.test.js | 187 |
| tests/unit/core/gif-controller.test.js | 185 |
| tests/unit/core/gif-frame-engine.test.js | 92 |
| tests/unit/core/icon-integration.test.js | 225 |
| tests/unit/core/keyboard-shortcuts-saving.test.js | 203 |
| tests/unit/core/settings.test.js | 98 |
| tests/unit/core/video-controller.test.js | 178 |
| tests/unit/observers/audio-size-handling.test.js | 232 |
| tests/unit/observers/gif-observer.test.js | 101 |
| tests/unit/observers/mutation-observer.test.js | 225 |
| tests/unit/utils/blacklist-regex.test.js | 130 |
| tests/unit/utils/recursive-shadow-dom.test.js | 323 |

### docs/ (14 files, 1583 LOC total)

| Path | LOC |
|------|-----|
| docs/ai_generated/adr/0001-window-vsc-global-namespace.md | 22 |
| docs/ai_generated/adr/0002-shadow-dom-controller-isolation.md | 20 |
| docs/ai_generated/domain.md | 40 |
| docs/ai_generated/issue-tracker.md | 37 |
| docs/ai_generated/pip-research/01-pip-api-fundamentals.md | 208 |
| docs/ai_generated/pip-research/02-content-script-pip-access.md | 134 |
| docs/ai_generated/pip-research/03-keyboard-event-routing.md | 230 |
| docs/ai_generated/pip-research/04-document-pip-api.md | 255 |
| docs/ai_generated/pip-research/05-prior-art-workarounds.md | 311 |
| docs/ai_generated/structure-initiative/00-charter.md | 155 |
| docs/ai_generated/structure-initiative/RAID.md | 51 |
| docs/ai_generated/structure-initiative/STATE.md | 69 |
| docs/ai_generated/structure-initiative/findings-register.md | 36 |
| docs/ai_generated/triage-labels.md | 15 |

### CLAUDE/ (63 files, 4114 LOC total)

CLAUDE/ contains agent skill definitions (SKILL.md files), process templates, and engineering methodology guides. These are tooling for agent workflows, not extension source code. Individual file listing omitted for brevity; complete entries are in inventory.csv.

### Root files (14 files, 4312 LOC total)

| Path | LOC | Notes |
|------|-----|-------|
| .eslintignore | 1 | |
| .eslintrc.json | 46 | |
| .gitignore | 14 | |
| .pre-commit-config.yaml | 15 | |
| CLAUDE.md | 83 | |
| CONTEXT.md | 91 | |
| CONTRIBUTING.md | 133 | |
| HANDOFF.md | 589 | |
| LICENSE | 0 | |
| PRIVACY.md | 34 | |
| README.md | 61 | |
| manifest.json | 82 | |
| package-lock.json | 3062 | generated |
| package.json | 81 | |

---

## 2. Hand-written vs Generated vs Vendored

Evidence method: OBSERVED — file content inspected at path:line@e904370.

| Type | Count | LOC | Examples |
|------|-------|-----|---------|
| hand | 163 | ~22,580 | All src/*.js, tests/**/*.js, docs/**/*.md |
| generated | 1 | 3,062 | package-lock.json (npm lockfile) |
| vendored | 9 | ~1,564 | src/lib/gifuct-js.min.js (minified GIF decoder); src/assets/icons/*.png (8 binary icons) |

**src/lib/gifuct-js.min.js** is INFERRED vendored: filename contains `.min.js`, first line is 99 characters of minified code (verified: `wc -c` on line 1 = 99 bytes). OBSERVED: HANDOFF.md:438 states "It is in `src/lib/`. Do not attempt to update it without thorough testing."

**src/assets/icons/*.png** are INFERRED vendored: binary files, no build tool generates them, `wc -l` returns raw byte counts not line counts.

---

## 3. Entry Points: Files Loaded Directly by the Browser

Evidence method: VERIFIED — read `manifest.json` at root@e904370.

| File | How loaded | manifest.json reference |
|------|-----------|------------------------|
| src/content/injector.js | Content script (injected into every page) | `content_scripts[0].js[0]` (line 54) |
| src/styles/inject.css | Content script CSS | `content_scripts[0].css[0]` (line 51) |
| src/background.js | MV3 service worker | `background.service_worker` (line 23) |
| src/ui/options/options.html | Extension options page | `options_ui.page` (line 26) |
| src/ui/popup/popup.html | Extension action popup | `action.default_popup` (line 35) |
| src/assets/icons/icon16.png | Extension icon | `icons.16` (line 10) |
| src/assets/icons/icon48.png | Extension icon | `icons.48` (line 11) |
| src/assets/icons/icon128.png | Extension icon | `icons.128` (line 12) |
| src/assets/icons/icon19.png | Action icon | `action.default_icon.19` (line 31) |
| src/assets/icons/icon38.png | Action icon | `action.default_icon.38` (line 32) |

**web_accessible_resources** (loaded dynamically by injector.js via `chrome.runtime.getURL`):
All files matching: `src/styles/*.css`, `src/module-loader.js`, `src/core/*.js`, `src/utils/*.js`, `src/ui/*.js`, `src/observers/*.js`, `src/site-handlers/*.js`, `src/site-handlers/scripts/*.js`, `src/content/*.js`, `src/lib/*.js`, `src/gif-file-fetcher.html`, `src/gif-file-fetcher.js`.

**src/gif-file-fetcher.html** is also loaded as a hidden iframe by `injector.js` on `file://` pages, at `chrome-extension://` origin, to proxy file:// GIF fetches.

---

## 4. Files Docs Reference But Do Not Exist in Live Repo

Evidence method: VERIFIED — ran `grep` on `docs/ai_generated/domain.md` and HANDOFF.md, then cross-checked with `git ls-files`.

### From docs/ai_generated/domain.md

`domain.md` contains a file tree diagram (lines 17–27) showing:
- `docs/ai_generated/adr/0001-example-decision.md` — DOES NOT EXIST. This is a placeholder example filename; it is not a missing real file.
- All other concrete paths in `domain.md` (`CONTEXT.md`, `docs/ai_generated/domain.md`, `docs/ai_generated/issue-tracker.md`, `docs/ai_generated/triage-labels.md`) exist in the live repo. VERIFIED.

### From HANDOFF.md

HANDOFF.md tree diagram (section 2) lists `tests/helpers/module-loader.js` and `tests/helpers/test-utils.js` but omits `tests/helpers/chrome-mock.js` and `tests/test-config.js`, which DO exist in the live repo.

INFERRED: HANDOFF.md section 2 tree is a summary, not an exhaustive file list. The omission is a documentation gap, not a missing file.

All concrete `src/` paths in HANDOFF.md exist in the live repo. VERIFIED.

---

## 5. Files That Exist in Live Repo But Are Not Referenced in Any Doc

Evidence method: INFERRED — no doc in `docs/ai_generated/` or HANDOFF.md explicitly names these files.

| File | Notes |
|------|-------|
| tests/helpers/chrome-mock.js | Not listed in HANDOFF.md tree; present in live repo |
| tests/test-config.js | Not listed in HANDOFF.md tree; present in live repo |
| tests/unit/core/f-keys.test.js | Not in HANDOFF test file list |
| tests/unit/core/icon-integration.test.js | Not in HANDOFF test file list |
| tests/unit/core/keyboard-shortcuts-saving.test.js | Not in HANDOFF test file list |
| tests/unit/observers/audio-size-handling.test.js | Not in HANDOFF test file list |
| tests/unit/utils/blacklist-regex.test.js | Not in HANDOFF test file list |
| tests/unit/utils/recursive-shadow-dom.test.js | Not in HANDOFF test file list |
| tests/e2e/*.js (all) | Not in HANDOFF test file list |
| docs/ai_generated/pip-research/ (all 5 files) | HANDOFF.md:565 notes these are "researched but NOT implemented" — PiP future feature |
| CLAUDE/ (all 63 files) | Agent skill definitions; not referenced in extension docs |

---

## 6. Digest-vs-Live Reconciliation

Evidence method: VERIFIED — read `docs/ai_generated/domain.md` and `HANDOFF.md`; cross-checked against `git ls-files`.

### docs/ai_generated/domain.md

`domain.md` does not enumerate concrete file paths (aside from the structure diagram at lines 17–27). All paths in the diagram exist. No phantom files detected.

### HANDOFF.md — Section 2 structure tree

Files in HANDOFF.md tree that exist in live repo: ALL. (VERIFIED above.)

Files in live repo that HANDOFF.md tree omits:
- `tests/helpers/chrome-mock.js` — EXISTS in live, absent from HANDOFF tree
- `tests/test-config.js` — EXISTS in live, absent from HANDOFF tree
- `tests/fixtures/gif-fixtures.js` — EXISTS in live, absent from HANDOFF tree (though HANDOFF does mention fixture files in section 9)
- `tests/fixtures/test-page.html` — EXISTS in live, absent from HANDOFF tree
- `tests/e2e/` (all files) — EXISTS in live, absent from HANDOFF tree
- Many `tests/unit/` files not listed in HANDOFF tree section 2

INFERRED: HANDOFF.md section 2 tree is representative, not exhaustive. Section 9 (test suite) partially corrects this by listing GIF-specific test files.

### docs/ai_generated/structure-initiative/ files

`00-charter.md`, `RAID.md`, `STATE.md`, `findings-register.md` were added in commit `323c95f` (one commit after BASE_SHA `e904370`). These are post-baseline documents. VERIFIED via `git show 323c95f`.

---

## 7. Size Breakdown: Total LOC by Directory

Evidence method: VERIFIED — `wc -l $(git ls-files | grep "^<dir>/")` run per directory.

| Directory | Files | LOC |
|-----------|-------|-----|
| src/ | 48 | 10,567 |
| tests/ | 33 | 5,721 |
| docs/ | 14 | 1,583 |
| CLAUDE/ | 63 | 4,114 |
| root (all other) | 14 | 4,312 |
| **Total** | **172** | **26,297** |

Note: root LOC includes `package-lock.json` (3,062 LOC). Excluding generated lockfile: root = 1,250 LOC; grand total hand-written + vendored = ~23,235 LOC.

---

## 8. Language Breakdown

Evidence method: VERIFIED — `git ls-files | grep "\.<ext>$" | wc -l` and `wc -l` per group.

| Extension | Files | LOC | Notes |
|-----------|-------|-----|-------|
| .js | 63 | 13,246 | Includes 1 vendored minified (src/lib/gifuct-js.min.js, 490 LOC) |
| .md | 81 | 6,636 | Includes CLAUDE/ skills, docs/, tests/e2e/manual-test-guide.md |
| .json | 4 | 3,271 | Includes package-lock.json (3,062 generated) |
| .css | 4 | 1,282 | |
| .html | 5 | 471 | |
| .sh | 3 | 277 | CLAUDE/ scripts + template |
| .yaml | 1 | 15 | .pre-commit-config.yaml |
| .png | 8 | n/a | Binary icons |
| LICENSE | 1 | 0 | Empty tracked file |
| **Total** | **170** | **25,198** | (excludes 2 dotfiles: .eslintignore, .gitignore) |

---

## Summary Statistics

- **172 total tracked files** (VERIFIED: `git ls-files | wc -l`)
- **26,297 total LOC** across all tracked text files (VERIFIED: `wc -l`)
- **1 generated file**: `package-lock.json` (npm lockfile, 3,062 LOC)
- **1 vendored JS file**: `src/lib/gifuct-js.min.js` (GIF decoder, minified, 490 LOC)
- **8 vendored binary files**: `src/assets/icons/*.png`
- **5 browser entry points**: `injector.js` (content script), `background.js` (service worker), `options.html`, `popup.html`, `gif-file-fetcher.html` (iframe proxy)
- **No phantom files**: all paths in `HANDOFF.md` and `docs/ai_generated/domain.md` that refer to real files exist in the live repo
- **3 docs gaps**: HANDOFF.md tree omits `tests/helpers/chrome-mock.js`, `tests/test-config.js`, `tests/fixtures/*` — documentation gap, not missing files
- **`node_modules/` is untracked** (present on disk, not in git): all untracked files are under `node_modules/` only

---

## Open Questions

1. `src/ui/controls.js` (131 LOC) is listed in `web_accessible_resources` pattern `src/ui/*.js` but it is NOT `src/ui/shadow-dom.js` — the controls seam between `controls.js` and `shadow-dom.js` is not documented in either ADR; worth capturing.
2. `docs/ai_generated/pip-research/` (5 files, 1,138 LOC) documents a Picture-in-Picture feature that was researched but not implemented. These are not referenced by any ADR or by HANDOFF.md's main sections. Their status as "future research, not implemented" is noted only in HANDOFF.md:565.
3. The structure initiative `01-baseline` directory was empty at BASE_SHA (`e904370`). This inventory file is the first content added to it.
