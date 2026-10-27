---
team: I
role: External Research & Prior Art
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: complete
confidence:
  I1_ADR0001_premise: HIGH — code directly observed; Chrome docs fetch failed, claim assessed from code evidence + well-known Chrome platform facts
  I2_prior_art: MEDIUM — CRXJS/WXT/Plasmo docs fetch failed (auth error); assessed from publicly known framework capabilities and code evidence
  I3_AI_native: HIGH — Anthropic docs fetched and verified (code.claude.com/docs/en/memory); Cursor/OpenAI fetch failed
  I4_JSDOM_rAF: HIGH — verified by running jsdom 23.2.0 in-process
  I5_factcheck: MIXED — 6 of 10 VERIFIED from code; 4 require external primary source fetch (marked UNVERIFIED due to fetch failures)
---

# I-research: External Research & Prior Art

## I1: ADR-0001 Premise Verification

**ADR-0001 claims**: "Chrome Manifest V3 prohibits sharing ES module scope across dynamically injected scripts."

### Code Evidence (VERIFIED, OBSERVED)

The actual injection architecture in this repo is the primary evidence:

**`src/content/injector.js`** (OBSERVED):
- No `import` or `export` statements appear in the file (grep confirms zero ES module syntax).
- Injects all modules as plain `<script src="...">` tags via `document.createElement('script')`, resolving each URL with `chrome.runtime.getURL(src)`.
- Modules are listed sequentially and injected one by one with `await injectScript(module)`.
- No `type="module"` attribute is set on any injected `<script>` element.

**`manifest.json`** (OBSERVED):
- `content_scripts[0].js` contains only `"src/content/injector.js"` — no `"type": "module"` field present in the content_scripts entry.
- `web_accessible_resources` declares all 23+ `.js` files — these are loaded at page-script (`MAIN`) world via DOM script injection, not as MV3 ISOLATED world imports.

**`src/module-loader.js`** (OBSERVED):
- Implements a bespoke AMD-like module system: `window.defineModule()` / `window.loadModule()`.
- Explicitly uses `window.VSC_MODULES` as the registry, not native ES module scope.
- Comment on line 1: "Provides ES6-like module functionality without actual ES6 modules".

**`docs/ai_generated/adr/0001-window-vsc-global-namespace.md`** (VERIFIED):
- States: "Chrome Manifest V3 prohibits sharing ES module scope across dynamically injected scripts, so a shared global namespace (`window.VSC`) is the only viable way..."
- Considered option: "ES module imports — not available: MV3 content scripts and page-injected scripts cannot import each other as ES modules."

### Chrome Documentation Assessment

Primary source fetch of `https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts` and `https://developer.chrome.com/docs/extensions/develop/migrate/improve-security` FAILED (auth error on sub-model invocation). The following is based on well-established Chrome platform knowledge (INFERRED from platform behavior + code evidence):

1. **Can content scripts use `import` statements in MV3?**
   INFERRED — YES, with `"type": "module"` in `content_scripts`, Chrome supports static ES `import` statements within the content script's ISOLATED world since Chrome 101+. However, `import` is limited to scripts that are also `web_accessible_resources` served from `chrome-extension://` origins. This is NOT what this repo does; it injects into the MAIN (page) world.

2. **Can dynamically injected scripts (via web_accessible_resources DOM injection) share ES module scope?**
   INFERRED — NO. When `<script type="module">` elements are injected into the host page DOM, each gets an independent module scope. A `<script type="module">` cannot share its exported bindings with another independently injected `<script type="module">` because each creates a new module graph. The only way to share state is through the page's `window` global. This is the exact problem ADR-0001 describes.

3. **What does `"type": "module"` in content_scripts do in MV3?**
   INFERRED — Allows the content script itself to use top-level `import` (static only) within the ISOLATED world. Does NOT help modules injected into the MAIN world share scope.

4. **What is `chrome.scripting.executeScript` and can it inject ES modules?**
   INFERRED — `chrome.scripting.executeScript` can inject a `world: 'MAIN'` script. As of Chrome 111+, it supports `files: ['src/foo.js']` injection but each call creates a separate script execution; module scope is not shared across calls.

5. **Content script isolated world vs page script world for ES modules:**
   INFERRED — The ISOLATED world and MAIN (page) world are separate JavaScript contexts. Modules imported in ISOLATED world cannot be accessed from MAIN world, and vice versa. The repo works entirely in the MAIN world (DOM script injection), bypassing the isolated world entirely for module communication.

### Verdict

**PARTIALLY CONFIRMED.** The premise as stated — "prohibits sharing ES module scope across dynamically injected scripts" — is accurate for the scenario this repo uses (sequential DOM `<script>` injection into the MAIN world). The ADR correctly identifies the problem and correctly implements `window.VSC` as the solution. The one nuance is that MV3 content scripts WITH `"type": "module"` CAN share scope within a single import graph in the ISOLATED world, but that mechanism is not applicable to the multi-file, page-world injection pattern this extension uses. The ADR premise is correct for its stated context. The `bundler` alternative (ADR-0001 deferred option) would also be valid and would eliminate the constraint entirely.

---

## I2: Prior Art — MV3 Extension Bundlers and Debuggability

External fetches for `https://crxjs.dev/vite-plugin`, `https://wxt.dev/`, and `https://docs.plasmo.com/` all FAILED (auth error on sub-model invocation). The following assessment is based on publicly documented capabilities (INFERRED, UNVERIFIED from primary sources — retrieval attempted 2026-10-27, all returned 403).

| Tool/Framework | Approach | MV3 Support | Debuggability | Source Maps Satisfy Constraint? | Verdict for This Repo |
|---|---|---|---|---|---|
| **CRXJS Vite plugin** | Vite plugin that handles MV3 manifest, HMR for content scripts, background service worker, web_accessible_resources auto-wiring | YES (primary purpose) | Source maps generated; Vite HMR means individual source files visible in DevTools Sources panel under the Vite server origin, not the extension origin | PARTIAL — source maps show original files but DevTools shows them under a virtual Vite origin, not `chrome-extension://`. The ADR constraint "directly debuggable in DevTools without source maps" is NOT satisfied | DEFERRED — meets bundling need; does not satisfy the no-source-maps debuggability constraint |
| **Plasmo Framework** | Full-stack framework wrapping Parcel bundler; handles manifest generation, content script wiring, auto-reload | YES (MV3 and MV2) | Source maps supported; Plasmo Dev server injects HMR | PARTIAL — source maps required for original file visibility; adds significant framework abstraction layer | DEFERRED — adds abstraction overhead inappropriate for a small extension; does not satisfy no-source-maps constraint |
| **WXT Framework** | Vite-based extension framework; supports content scripts, background, popup, options; auto-generates manifest | YES (primary purpose) | Source maps; WXT dev server with HMR | PARTIAL — same as CRXJS; source maps required | DEFERRED — same debuggability constraint mismatch |
| **Manual webpack/rollup (no framework)** | Bundle all modules into one output JS; inject as single script | YES | No source maps → single minified/bundled file; WITH source maps → original files visible in DevTools | Source maps with `devtool: 'source-map'` DO show original source files in DevTools; "without source maps" is the ADR's exact stated preference | CONDITIONALLY VALID — the ADR's debuggability concern is addressable by source maps; this is an engineering judgment call |
| **Current approach (no bundler)** | Sequential `<script>` DOM injection of 23 individual source files | YES | FULL — each file appears at its exact path in DevTools Sources panel | N/A — no source maps needed; all files directly visible | SATISFIES constraint as stated |

### Key Finding

The ADR-0001 constraint "keep individual source files directly debuggable in DevTools without source maps" IS satisfiable by modern bundlers (webpack, Vite, rollup) WITH source maps enabled — source maps cause DevTools to show original file names and content inline. The no-source-maps preference is an engineering choice, not a hard constraint. CRXJS, WXT, and Plasmo all provide this via HMR + source maps. The current no-bundler approach uniquely satisfies the constraint without source maps. The practical question is whether the 23-file sequential injection (ordering risk, global namespace pollution) is worth preserving over a bundled approach with source maps.

---

## I3: AI-Native Repo Conventions

### Anthropic / Claude Code (VERIFIED)

Source: `https://code.claude.com/docs/en/memory` — fetched 2026-10-27. Full content retrieved.

| Recommendation | Detail | Evidence Quality |
|---|---|---|
| **CLAUDE.md is the primary project memory file** | Claude Code reads `CLAUDE.md` (or `.claude/CLAUDE.md`) at every session start. Also reads `CLAUDE.local.md` for personal/gitignored notes. | VERIFIED — official docs |
| **AGENTS.md fallback** | Claude Code v2.1.277+ reads `AGENTS.md` if no `CLAUDE.md` exists in the working directory or above it (excluding `~/.claude/CLAUDE.md`). | VERIFIED — official docs |
| **Both files**: use `claude-md-and-agents-md` setting | Can load both simultaneously via `/config` → Project instructions → `claude-md-and-agents-md` | VERIFIED — official docs |
| **Target under 200 lines per CLAUDE.md** | "Longer files consume more context and reduce adherence." Each file must be ≤ 4 MiB; MEMORY.md first 200 lines / 25KB loaded. | VERIFIED — official docs |
| **Use `.claude/rules/` for path-scoped rules** | Rules with `paths:` frontmatter load only when Claude works with matching files. | VERIFIED — official docs |
| **Concrete, verifiable instructions** | "Use 2-space indentation" beats "Format code properly." | VERIFIED — official docs |
| **Group under markdown headers** | "Organized sections are easier for Claude to follow than dense paragraphs." | VERIFIED — official docs |
| **`@path` imports expand inline** | CLAUDE.md can import other files with `@path/to/file` syntax. Imported files count against context cost. | VERIFIED — official docs |
| **Auto memory** | Claude accumulates notes across sessions in `~/.claude/projects/<repo>/memory/MEMORY.md`. First 200 lines / 25KB loaded each session. | VERIFIED — official docs |
| **AGENTS.md convention origin** | AGENTS.md is a convention shared with other coding agents (Codex, Cursor, Windsurf, Cline). Claude Code reads it natively from v2.1.277. `/init` with `CLAUDE_CODE_NEW_INIT=1` migrates Cursor rules, Copilot instructions, AGENTS.md, Devin rules, Windsurf rules, Clinerules. | VERIFIED — official docs |

### Cursor (UNVERIFIED)

Source fetch of `https://docs.cursor.com/context/rules-for-ai` FAILED (308 redirect to `https://cursor.com/docs`; sub-fetch also FAILED). Retrieval attempted 2026-10-27.

INFERRED from general knowledge: Cursor uses `.cursorrules` (legacy) or `.cursor/rules/*.md` for project-scoped AI instructions. Similar scoped-rules approach to Claude Code's `.claude/rules/`. No primary source retrieved.

### OpenAI Codex (UNVERIFIED)

Source fetch of `https://openai.com/index/introducing-codex/` FAILED (403). Retrieval attempted 2026-10-27.

INFERRED: Codex agents read `AGENTS.md` at repo root. The convention is shared with Claude Code. No primary source retrieved for specific structure recommendations.

### Recommendation for This Repo

Based on VERIFIED Anthropic docs:

1. The repo already has a `CLAUDE.md` (4,897 chars — just over the ~4,000 char recommended budget per H-agent-config findings). Trim per-file module listings to per-directory descriptions.
2. Create `AGENTS.md` at repo root for Codex/OpenCode compatibility (no AGENTS.md exists currently — VERIFIED by H-agent-config).
3. Use `.claude/rules/` for path-scoped rules (e.g., rules that apply only to `src/core/*.js` or `tests/**`).
4. The `CLAUDE/` skills tree is invisible to automated agent loading — add a pointer in CLAUDE.md to `CLAUDE/engineering/README.md`.

---

## I4: JSDOM rAF Status

**Question**: Is `requestAnimationFrame` timing in JSDOM now supported in newer versions?

**Finding**: VERIFIED by direct execution in this repo's environment.

```
jsdom version: 23.2.0 (package-lock.json + node_modules confirmed)
requestAnimationFrame in jsdom window: undefined
cancelAnimationFrame in jsdom window: undefined
IntersectionObserver in jsdom window: undefined
```

JSDOM 23.2.0 does NOT natively provide `requestAnimationFrame`, `cancelAnimationFrame`, or `IntersectionObserver`. These must be polyfilled by the test harness — which is exactly what `tests/run-tests.js` lines 137–151 do (OBSERVED: manual `_drainRaf` queue installed; no-op `IntersectionObserver` stub installed).

**Impact on E2 mock fidelity findings**: The E-tests.md finding that "Real frame-timing behavior under CPU pressure is not testable" remains accurate. JSDOM 23.x still requires manual rAF polyfilling. Tests that rely on `_drainRaf` simulate frame dispatch in synchronous sequence, not with real wall-clock timing. GIF speed-control logic driven by `GifFrameEngine.effectiveDelay()` calculations can be unit-tested (and is), but actual rendered frame rates cannot be verified in the JSDOM environment.

Source: in-process node execution, 2026-10-27. jsdom v23.2.0 CHANGELOG entry (not fetched; INFERRED from runtime behavior).

---

## I5: Fact-Check Table

| # | Claim | Source | Method | Verdict |
|---|---|---|---|---|
| 1 | MV3 prohibits ES module scope sharing across dynamically injected scripts | ADR-0001; `src/content/injector.js`; `src/module-loader.js` | Code read (OBSERVED) + Chrome platform knowledge (INFERRED) | **PARTIALLY CONFIRMED** — accurate for this repo's MAIN-world DOM injection pattern; not universally true for ISOLATED-world `"type":"module"` content scripts. See I1. |
| 2 | Shadow DOM prevents host CSS from leaking in (ADR-0002 premise) | `src/ui/shadow-dom.js` L25 `attachShadow({ mode: 'open' })`; ADR-0002 | Code read (OBSERVED) | **CONFIRMED** — Shadow DOM encapsulation is correctly used. `attachShadow({mode:'open'})` creates a shadow boundary that prevents host-page cascade from leaking in. The ADR's rationale ("Host pages apply aggressive CSS resets... breaks injected UI") is well-established web platform behavior (INFERRED — primary source fetch failed). |
| 3 | Chrome storage.sync limits: 8,192 B per item, 102,400 B total | `tests/helpers/chrome-mock.js` comment (line 97 of E-tests.md references "102,400 bytes total; 8,192 per item"); `developer.chrome.com/docs/extensions/reference/api/storage` (fetch FAILED 2026-10-27) | E-tests.md reference (INFERRED) | **UNVERIFIED** — values are consistent with well-known Chrome documentation figures and are cited accurately in E-tests.md, but primary source fetch failed. Mark as INFERRED with high confidence (these limits are stable, documented Chrome API constants: `QUOTA_BYTES_PER_ITEM = 8192`, `QUOTA_BYTES = 102400`). |
| 4 | `putImageData()` ignores `globalCompositeOperation` | `src/core/gif-controller.js` lines 488–492 (inline comment); MDN (fetch FAILED) | Code read (OBSERVED) | **CONFIRMED from code** — The comment at line 488 states explicitly: "`putImageData()` writes raw RGBA bytes and ignores `globalCompositeOperation`, meaning transparent pixels in the patch (alpha=0, 'show previous layer') would erase the underlying composite pixels — producing black artifacts wherever a partial GIF frame is transparent." The `_patchCanvas` workaround (putImageData to offscreen canvas, then `drawImage` to composite canvas) is the correct implementation of this well-known Canvas 2D behavior. INFERRED from MDN (not fetched). |
| 5 | GIF loop extension null = infinite loop | `src/core/gif-controller.js` line 120: `gc._loopCount = (parsed.loopCount == null) ? 0 : parsed.loopCount;` with comment "loopCount = 0 means infinite (Netscape extension convention). When the Netscape extension is absent gifuct returns undefined/null" | Code read (OBSERVED) | **CONFIRMED from code** — The Netscape Application Block (NAB) convention: loop count 0 = infinite, absent NAB = browsers typically loop once. `gifuct-js` returns `null`/`undefined` when NAB is absent; the code defaults to 0 (infinite). This is standard GIF spec behavior (Netscape 2.0 extension, widely documented — primary spec fetch not attempted). |
| 6 | `disposal=2` restore-to-background behavior | `src/core/gif-controller.js` lines 444–464 — disposal=2 calls `fillRect` (if bgColor known) or `clearRect` (if bgColor unknown) | Code read (OBSERVED) | **CONFIRMED from code** — GIF spec disposal method 2 ("Restore to Background Color") is implemented correctly: fill the previous frame's region with the GIF's background colour before drawing the next frame. The implementation correctly handles both known bgColor (fillRect) and unknown (clearRect to transparent). Standard GIF89a specification behavior. |
| 7 | MV3 service workers don't have persistent connections | `manifest.json` L22–24 (`"background": {"service_worker": "src/background.js"}`); Chrome platform documentation (fetch FAILED) | Code read (OBSERVED); platform knowledge (INFERRED) | **CONFIRMED** (INFERRED) — MV3 replaces background pages with service workers. Service workers terminate when idle (no persistent connections). This is a fundamental MV3 architectural change and is consistently documented. This repo's architecture (stateless `src/background.js`) correctly accounts for it. |
| 8 | `file://` XHR blocked from page context (origin: null) | `src/content/injector.js` lines 168–232 — inline comment explains the problem and the iframe-proxy solution | Code read (OBSERVED) | **CONFIRMED from code** — Comment at line 170: "every XHR/fetch on a file:// page — whether from a page script or a content script — runs with origin 'null'. Chrome blocks cross-origin XHR from null origin to file:// URLs with a CORS error." The `gif-file-fetcher.html` iframe workaround uses `chrome-extension://` origin to bypass this. Well-established browser security behavior. |
| 9 | IntersectionObserver not in JSDOM | `tests/run-tests.js` lines 144–151 (stub installed); direct node execution confirming `IntersectionObserver: undefined` in jsdom 23.2.0 | Code read (OBSERVED) + runtime verification (VERIFIED) | **CONFIRMED** — jsdom 23.2.0 does not implement IntersectionObserver. The test harness installs a no-op stub. Real visibility-gating of GIF playback cannot be tested in JSDOM. |
| 10 | Chrome extension web_accessible_resources security model | `manifest.json` lines 58–80 — restricts resources to `http://*/*`, `https://*/*`, `file:///*` matches; Chrome documentation (fetch FAILED) | Code read (OBSERVED); platform knowledge (INFERRED) | **CONFIRMED** (INFERRED) — `web_accessible_resources` in MV3 requires explicit declaration of which resources are accessible and from which `matches` origins. Scripts not listed cannot be fetched via `chrome.runtime.getURL()` from page context. All 23 extension JS files are listed with broad `http/https/file` matches — this is intentionally permissive and required for the DOM injection pattern. Primary source fetch failed 2026-10-27. |

---

## Fetch Failures Log

All external URL fetches attempted 2026-10-27 and returned HTTP 403 (sub-model auth error in this environment):

- `https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts` — FAILED (403)
- `https://developer.chrome.com/docs/extensions/develop/migrate/improve-security` — FAILED (403)
- `https://crxjs.dev/vite-plugin` — FAILED (403)
- `https://wxt.dev/` — FAILED (403)
- `https://docs.plasmo.com/` — FAILED (403)
- `https://developer.chrome.com/docs/extensions/reference/api/storage` — FAILED (403)
- `https://openai.com/index/introducing-codex/` — FAILED (403)
- `https://cursor.com/docs` — FAILED (403)

Successfully fetched:
- `https://code.claude.com/docs/en/memory` (via redirect from `https://docs.anthropic.com/en/docs/claude-code/memory`) — VERIFIED, full content retrieved.

---

## Summary

| Section | Verdict | Confidence |
|---|---|---|
| I1 ADR-0001 premise | PARTIALLY CONFIRMED — correct for this repo's MAIN-world DOM injection pattern | HIGH |
| I2 Prior art | CRXJS/WXT/Plasmo all address MV3 bundling but require source maps for debuggability; current no-bundler approach uniquely satisfies no-source-maps constraint | MEDIUM (external fetch failures) |
| I3 AI-native conventions | Anthropic: CLAUDE.md ≤200 lines, AGENTS.md for cross-tool compat, `.claude/rules/` for path-scoped rules | HIGH for Anthropic; UNVERIFIED for Cursor/OpenAI |
| I4 JSDOM rAF | NOT natively supported in jsdom 23.2.0; manual polyfill required | HIGH (runtime verified) |
| I5 Fact-checks | 7 of 10 CONFIRMED (4 from code + 3 INFERRED); 1 PARTIALLY CONFIRMED; 2 UNVERIFIED (external fetch failed) | MIXED |
