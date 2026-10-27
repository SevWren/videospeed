---
team: Orchestrator (P4 Synthesis) — incorporating Team G C-list
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
confidence: high
---

# Constraint List (C-list)

Binding constraints for Teams J (Design Lab) and L (Scaffold Build).
These are non-negotiable. A design candidate or scaffold element that violates any of these fails automatically.

Source: Team G security findings + Appendix A protected behaviors.

---

## Security & Store Constraints (from Team G)

**C-1** — Every injected file must be explicitly listed in `web_accessible_resources`. New directories must have explicit WAR entries. Wildcard globs (`src/core/*.js`) already exist — do not add new ones without justification; they auto-expose every future file in that directory.

**C-2** — If a build-step design (J4) changes source paths to `dist/` paths, WAR entries and all `chrome.runtime.getURL()` calls must be updated atomically. No source maps in WAR (they expose implementation details).

**C-3** — No new `CustomEvent` listener that triggers a privileged action (storage write, network fetch, DOM modification) may be added without payload schema validation.

**C-4** — `VSC_SAVE_SETTINGS` currently lacks payload validation (pre-existing defect). The scaffold must not replicate this pattern. Any new event handler for settings-like operations must validate the payload against a settings-key allowlist before writing.

**C-5** — `VSC_GIF_BYTES_RESPONSE` and `VSC_GIF_FETCHER_READY` handlers should add `event.origin` validation. The scaffold must not replicate the pattern of postMessage handlers without origin checks.

**C-6** — No outbound network requests to extension-developer servers or third-party analytics. All network requests must go to the page's own origin (for GIF fetches) or Chrome extension infrastructure.

**C-7** — `gif-file-fetcher.html` must remain at a `chrome-extension://` origin. Do not move it to `src/lib/` or any path that would change its URL without updating all `getURL()` calls.

**C-8** — PRIVACY.md `cache: force-cache` claim must be corrected to `cache: 'default'` before the next Web Store submission. **This is a human-gated action** — flag it in the migration tickets.

**C-9** — No new `eval`, `document.write`, or unsanitized `innerHTML` with external data in any file the scaffold adds.

**C-10** — All directories under existing WAR globs are treated as "web-accessible by default." Security-sensitive isolation logic must not live in these directories without explicit justification.

---

## Protected Behavior Constraints (from Appendix A)

**C-11** — `src/lib/gifuct-js.min.js` is untouchable and must not appear in any diff on this branch.

**C-12** — Module injection order in `src/content/injector.js` is a contract. No scaffold element may change or re-order the injection sequence.

**C-13** — The `window.VSC` global namespace is the IPC mechanism between modules. No scaffold element may introduce `import/export` between page-world modules (ADR-0001).

**C-14** — The `img.vscGifIgnore` + `img._vscTeardownSrc` interaction must not be modified. Any check script that touches DOM element properties must be read-only.

**C-15** — The sentinel pattern (`{pending:true,_cancelled:false}` on `img.gifController`) must not be modified.

**C-16** — Frame compositing through `_patchCanvas` with `drawImage()` must not be modified.

**C-17** — Tests run on the custom Node + JSDOM runner. No `jest.config.js`, no `npx jest`. New tests go in `tests/unit/**` or `tests/integration/**` only.

**C-18** — The `type: module` field is set in `package.json`. All new scripts must be Node ESM (`.mjs` or `"type":"module"` compatible). No CommonJS `require()` in new check scripts.

---

## Runtime Invariant Constraints (implicit from all teams)

**C-19** — Version numbers must not change. The `0.9.1` / `0.8.0` discrepancy is pre-existing and must be noted, not fixed, unless the human approves.

**C-20** — `.claude/` must be removed from `.gitignore` before agent definitions are written there, or those files will not persist across fresh clones. This is a REQUIRED pre-condition for L5.
