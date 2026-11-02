# Cross-Log Pattern Inventory — All 4 YouTube Console Logs

Generated: 2026-11-02
Analyst: sevwrenai[bot]
Scope: Systematic comparison of all 4 captured YouTube console logs against VSC source code.

---

## Log Inventory

| Log file | Timestamp | Lines | Description |
|---|---|---|---|
| `www.youtube.com-1793491279163.log` | oldest | 36 | Log 1 — Path A era, `injector.js` crash |
| `www.youtube.com-1793503139767.log` | | 59 | Log 2 — 3 VSC crashes (constants + inject TypeErrors) |
| `www.youtube.com-1793564406964.log` | | 427 | Log 3 — "clean" (no VSC-originated output) |
| `www.youtube.com-1793580955578.log` | newest | 23619 | Log 4 — 1 VSC WARNING at line 23551 |

---

## Pattern Inventory Table

| # | Pattern | Log 1 | Log 2 | Log 3 | Log 4 | Attribution | Severity |
|---|---|---|---|---|---|---|---|
| P1 | `💥 Module injection failed: Cannot access contents of url` | YES | NO | NO | NO | VSC (`injector.js`) | FIXED (Path A) |
| P2 | `constants.js:18 Uncaught TypeError: Cannot read properties of null (reading 'appendChild')` | NO | YES (x2) | NO | NO | VSC (`constants.js`) | FIXED |
| P3 | `inject.js:92 ❌ Failed to initialize Video Speed Controller: Cannot read properties of undefined (reading 'INFO')` | NO | YES (x2) | NO | NO | VSC (`inject.js` / `logger.js`) | FIXED |
| P4 | `inject.js:681 Uncaught TypeError: Cannot read properties of null (reading 'appendChild')` | NO | YES (x2) | NO | NO | VSC (`inject.js`) | FIXED |
| P5 | `WARNING:waitForInjectedSettings: timed out after 5000ms, resolving with defaults` | NO | NO | NO | YES (x1, line 23551) | VSC (`storage-manager.js`) | ACTIVE (low severity) |
| P6 | `LegacyDataMixin will be applied to all legacy elements.` (`m=late,app:1359`) | NO | NO | YES | YES | YouTube (Polymer) | Not VSC |
| P7 | `Blocked script execution in 'about:blank' because the document's frame is sandboxed` | YES | YES | YES | YES | YouTube/Chrome | Not VSC |
| P8 | `webcomponents-sd.js:65/66/96/122/124` stack frames (`insertBefore`, `appendChild`, `attachShadow`) | NO | NO | NO | YES (48 `attachShadow` occurrences) | YouTube (Polymer via webcomponents-sd.js polyfill) | Not VSC |
| P9 | `VM24:1 [Rewards] Current path type: (/)` / `No creator found for current URL` | NO | NO | NO | YES (lines 1-2) | Third-party extension or YouTube internal | Not VSC |
| P10 | `characterData` (bare log entry, no context) | NO | NO | NO | YES (lines 9910, 10383) | YouTube (Polymer MutationObserver) | Not VSC |
| P11 | `[Violation] 'requestAnimationFrame' handler took Nms` | NO | NO | YES | YES | YouTube | Not VSC |
| P12 | `[Violation] 'requestIdleCallback' handler took Nms` | NO | NO | YES | YES | YouTube | Not VSC |
| P13 | `[Violation] Added non-passive event listener to a scroll-blocking 'touchstart' event` | NO | NO | NO | YES | YouTube (`m=base:691`) | Not VSC (but see P14) |
| P14 | VSC's own `wheel` handler registered `{ passive: false }` — scroll-blocking violation potential | N/A | N/A | N/A | not in log (correct — log shows no VSC output) | VSC (`controls.js:86`) | KNOWN (test deliberately RED) |
| P15 | `manifest.webmanifest: property 'migrate_from' ignored` | NO | NO | YES | YES | YouTube manifest | Not VSC |
| P16 | `The resource https://i.ytimg.com/generate_204 was preloaded but not used` | NO | NO | YES | YES | YouTube | Not VSC |
| P17 | `powerPreference option is currently ignored when calling requestAdapter()` | NO | NO | YES | NO | YouTube (WebGPU) | Not VSC |
| P18 | `Banner not shown: beforeinstallpromptevent.preventDefault() called` | NO | NO | YES | NO | YouTube | Not VSC |

---

## VSC-Attributed Patterns — Detailed Analysis

### P1: `injector.js:37 💥 Module injection failed` (Log 1 only)

**Source:** `/home/vercel-sandbox/videospeed/src/content/injector.js:37`

**Error text (exact):**
```
💥 Module injection failed: Error: Cannot access contents of url "https://www.youtube.com/".
Extension manifest must request permission to access this host.
```

**Stack:** `injectModules @ injector.js:37` → `requestIdleCallback` → `(anonymous) @ injector.js:366`

**Root cause:** This was the Path A era: `injector.js` called `chrome.scripting.executeScript()` to inject modules. This API requires both `"scripting"` in `permissions` AND a matching `host_permissions` entry. The `host_permissions` was absent (or `content_scripts.matches` was mistakenly assumed to satisfy it). CS-2 documents this exact failure mode.

**Status:** FIXED. Path B replaced Path A. All modules are now listed in `manifest.json` under `content_scripts[1]` with `"world": "MAIN"`. No `chrome.scripting.executeScript` call is made at runtime. Log 2 and later logs show no P1 recurrence.

**Regression test exists:** YES — `npm run check:manifest` enforces the Path B invariant (no `chrome.scripting` calls in main modules). `npm run check:invariants` guards structural source properties.

---

### P2: `constants.js:18 Uncaught TypeError: Cannot read properties of null (reading 'appendChild')` (Log 2 only, ×2)

**Source:** `/home/vercel-sandbox/videospeed/src/utils/constants.js`, lines 14–19.

**Exact lines (current source):**
```js
if (document.head) {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'vsc-constants-loaded';
  debugDiv.style.display = 'none';
  debugDiv.textContent = `Constants loaded at ${new Date().toISOString()}`;
  document.head.appendChild(debugDiv);   // ← line 19 (was 18 in log 2 era)
}
```

**Root cause in log 2 era:** The `if (document.head)` guard was absent. `constants.js` ran inside sub-frames (sandboxed `about:blank` iframes) where `document.head` is `null`, causing an unguarded `appendChild` to throw.

**Status:** FIXED. The `if (document.head)` guard was added. Identical guard was added at `inject.js` lines 723–729 for the `vsc-test-indicator` element. Log 3 and Log 4 show no P2 recurrence.

**Regression test exists:** NO formal regression test for the null-head guard specifically. The guard is verified indirectly by the test suite not crashing in JSDOM. Documented as a known testing gap (sub-frame sandboxed context cannot be replicated in JSDOM).

---

### P3: `inject.js:92 ❌ Failed to initialize Video Speed Controller: Cannot read properties of undefined (reading 'INFO')` (Log 2 only, ×2)

**Source:** `/home/vercel-sandbox/videospeed/src/utils/logger.js:86` and `/home/vercel-sandbox/videospeed/src/content/inject.js:34`

**Exact error chain:**
1. `VideoSpeedExtension.initialize()` at `inject.js:34` calls `this.logger.info(...)`.
2. `Logger.info()` at `logger.js:86` calls `window.VSC.Constants.LOG_LEVELS.INFO`.
3. `window.VSC.Constants` was `undefined` at that moment — `constants.js` had crashed (P2) before finishing, leaving `window.VSC.Constants.LOG_LEVELS` unset.

**Stack confirmed by log 2:**
```
at Logger.info (chrome-extension://ohncnnclhcjljnoibomabldeiobbdbeg/src/utils/logger.js:86:57)
at VideoSpeedExtension.initialize (chrome-extension://ohncnnclhcjljnoibomabldeiobbdbeg/src/content/inject.js:34:19)
```

**Root cause:** P2 (the `constants.js` crash) is upstream. Once constants.js threw, `window.VSC.Constants.LOG_LEVELS` was never populated. P3 is a cascade failure of P2, not an independent bug.

**Status:** FIXED as a consequence of fixing P2. The `constants.js` guard ensures `LOG_LEVELS` is always written before `inject.js` runs.

**Regression test exists:** NO direct test for the cascade. The upstream fix (P2) prevents P3 from being reachable.

---

### P4: `inject.js:681 Uncaught TypeError: Cannot read properties of null (reading 'appendChild')` (Log 2 only, ×2)

**Source:** `/home/vercel-sandbox/videospeed/src/content/inject.js`, current lines 723–729.

**Current source (guarded):**
```js
// Add test indicator for E2E tests (guard: document.head may be null in sub-frames)
if (document.head) {
  const testIndicator = document.createElement('div');
  testIndicator.id = 'vsc-test-indicator';
  testIndicator.style.display = 'none';
  document.head.appendChild(testIndicator);
}
```

**Root cause in log 2 era:** The same sub-frame `document.head === null` issue as P2. The `vsc-test-indicator` append was unguarded; it executed in sandboxed `about:blank` iframes.

**Note:** In log 2, this appeared at `inject.js:681` because the `shouldInjectInCurrentFrame()` function and its surrounding code were not yet present — the module was shorter. The current source has the same guard pattern as `constants.js`.

**Status:** FIXED. Guard added. Logs 3 and 4 show no P4 recurrence.

**Regression test exists:** NO. Same gap as P2.

---

### P5: `WARNING:waitForInjectedSettings: timed out after 5000ms, resolving with defaults` (Log 4 only, line 23551)

**Source:** `/home/vercel-sandbox/videospeed/src/core/storage-manager.js:95–97`

**Exact source:**
```js
const deadline = setTimeout(() => {
  window.VSC.logger.warn(
    'waitForInjectedSettings: timed out after 5000ms, resolving with defaults'
  );
  resolve({ ...defaults });
}, 5000);
```

**Logger output format:** `logger.warn()` calls `this.log(message, LOG_LEVELS.WARNING)` which calls `console.log('WARNING:' + message)`. The leading space in the log entry (` WARNING:...`) is a browser console formatting artifact — the message content is correct.

**Root cause:** `StorageManager.waitForInjectedSettings()` starts a 5-second timeout. If `injector.js` does not dispatch the `VSC_USER_SETTINGS` event (or write `window.__VSC_injectedSettings`) within 5 seconds, the timeout fires and the extension initializes with default settings. This can occur when:
- The ISOLATED World content script (`injector.js`) runs significantly after the MAIN World modules.
- The `initBridge` bootstrap in `injector.js` is delayed (e.g., by YouTube's heavy initial load).
- A race condition where the `VSC_USER_SETTINGS` event fires before the listener in `StorageManager` is registered AND `window.__VSC_injectedSettings` is also missed.

**Severity:** LOW. The extension initializes correctly with defaults; no functional failure results. The warning is informational — the extension is operational in log 4 (no crash errors follow).

**Presence pattern:** ONLY in log 4. This is the newest and largest log (23,619 lines), representing a much heavier page-load session (a video was playing — `base.js:8234 [Violation] 'playing' handler` and `timeupdate` violations appear at lines 23563/23568). The longer load time increases the probability of the 5-second timeout firing.

**Regression test exists:** YES — `tests/unit/core/storage-manager.test.js` covers `waitForInjectedSettings` including the timeout path. The 5000ms timeout is a design parameter, not a bug.

**Unresolved question:** Whether the timeout is triggering because `injector.js` is genuinely delayed (a real race) or because an upstream change broke the settings delivery path on heavy pages. Needs monitoring across more log samples.

---

## YouTube-Attributed Patterns — 3-Proof Verification

### P6: `LegacyDataMixin will be applied to all legacy elements` (Logs 3 and 4)

**Proof 1 — Source file:** `m=late,app:1359` — this is YouTube's minified `m=late,app` bundle (Polymer/LitElement framework code), not any VSC file.

**Proof 2 — VSC source search:** `grep -rn "LegacyDataMixin\|_legacyUndefinedCheck" /home/vercel-sandbox/videospeed/src/` returns zero results. The string does not exist anywhere in VSC source.

**Proof 3 — Stack trace:** In log 3 (lines 7–30), the full stack leading to this message is entirely within `m=late,app` and `m=base` YouTube bundle frames. The call chain `window.Polymer → Y.connectedCallback → TCm.C.attached → Y.connectedCallback → Y.connectedCallback → n._.setHistoryDispatchElement → n._.init → PG9.init → H.init` is entirely YouTube Polymer component initialization. No `chrome-extension://` URL appears in this stack.

---

### P7: `Blocked script execution in 'about:blank' (sandboxed)` (All 4 logs)

**Proof 1 — Source:** Emitted from `about:blank:1` or `VM11:xxx` (YouTube's sandbox shim), not from any `chrome-extension://` URL.

**Proof 2 — Stack trace (log 3 lines 11–31):** The full stack goes `reflect @ VM13:781 → (anonymous) @ VM13:840 → apply @ VM13:816 → (anonymous) @ m=late,app:586 → H.init @ m=late,app:15386 → ...`. This is YouTube's VM-sandboxed reflection proxy, not VSC.

**Proof 3 — Presence in log 1:** This pattern appears in log 1 BEFORE any VSC modules run (lines 1–13 precede the first VSC error at line 15). YouTube's sandboxed iframes generate this noise independently of VSC loading.

---

### P8: `webcomponents-sd.js` stack frames (Log 4 only, 48 `attachShadow` occurrences)

**Proof 1 — Every caller is YouTube Polymer:** Every `attachShadow @ webcomponents-sd.js:96` in log 4 is immediately followed by `k.attachShadow @ webcomponents-sd.js:124` then `t._attachDom @ m=late,app:1519` — YouTube's Polymer `_attachDom` method, not VSC code.

**Proof 2 — VSC `attachShadow` does not appear in any log:** `grep -n "vsc-controller\|ShadowDOMManager\|createShadowDOM"` across all 4 logs returns zero results. VSC's shadow DOM creation (`ShadowDOMManager.createShadowDOM` in `src/ui/shadow-dom.js:25`) emits a DEBUG-level log (`Shadow DOM created for video controller`). In all 4 logs, DEBUG output is never present (verbosity is at WARNING level = 3 in defaults). The absence of VSC debug output confirms the extension's shadow creation path is not reflected in these logs.

**Proof 3 — No `chrome-extension://` URL adjacent to any `webcomponents-sd.js` frame:** Checked all 48 `attachShadow` occurrences. The surrounding 10 lines in every case are exclusively `m=late,app`, `m=base`, and `VM11` frames. No VSC module path appears.

**Shadow root count:** 48 `attachShadow` calls in log 4 vs 0 in logs 1–3. This is consistent with log 4 being a full page-load of a video page where YouTube Polymer renders all its custom element components (thumbnail grids, navigation, sidebar, etc.) — each YouTube Polymer component attaches its own shadow root. Log 3's 427 lines capture only an early page state before full component rendering completes.

**VSC shadow count per page:** VSC creates exactly 1 shadow root per video element (via `ShadowDOMManager.createShadowDOM` at `src/ui/shadow-dom.js:25`) and 1 per GIF controller (via `GifController` calling the same method). On a standard YouTube watch page, this is typically 1 shadow root. None of VSC's shadow root creations appear in these logs because `webcomponents-sd.js` only intercepts calls from Polymer-patched elements, and VSC calls `wrapper.attachShadow({ mode: 'open' })` directly on a plain `<div>` without going through the Polymer polyfill chain.

---

### P9: `[Rewards] Current path type: (/)` / `No creator found for current URL` (Log 4 only, lines 1–2)

**Proof 1 — Source file `VM24:1`:** This is a dynamically-evaluated script (Chrome `VM` prefix), not a `chrome-extension://` URL.

**Proof 2 — VSC source search:** `grep -rn "Rewards\|creator found\|path type" /home/vercel-sandbox/videospeed/src/` returns zero results.

**Proof 3 — Absence from all other logs:** This pattern appears only in log 4, exclusively at lines 1–2 (the very start of the log capture). It is not emitted by VSC on any other session. The `[Rewards]` namespace is consistent with a YouTube Premium/Membership rewards feature or a third-party extension (e.g., a loyalty/rewards extension). It is not VSC.

---

### P10: `characterData` (bare log entry, Log 4 only, lines 9910 and 10383)

**Proof 1 — Context is entirely YouTube Polymer:** The surrounding stack at lines 9900–9929 is `m=late,app:130 (rtA) → m=late,app:900–965 (Polymer render chain) → m=late,app:1349–1355 → m=late,app:232–242 → n._.__createAndInsertInstance`. This is YouTube Polymer's template stamping and MutationObserver system printing `characterData` as a logged mutation type.

**Proof 2 — VSC source search:** `grep -rn "characterData" /home/vercel-sandbox/videospeed/src/` returns zero results. VSC does not log or reference `characterData` anywhere.

**Proof 3 — Polymer MutationObserver known pattern:** Polymer's `_propertiesChanged` cycle pipes through `rtA @ m=late,app:130` which is Polymer's internal MutationObserver callback. The string `characterData` is a standard `MutationRecord.type` value that Polymer logs during element property observation. This is entirely internal to YouTube's Polymer framework.

---

## Non-Recurring / Single-Log Patterns (Reference)

These patterns appeared in only one log and are attributed above. No cross-log recurrence investigation required beyond attribution:

- P17 (`powerPreference ignored`): YouTube WebGPU initialization, log 3 only.
- P18 (`Banner not shown: beforeinstallpromptevent`): YouTube PWA install prompt suppression, log 3 only.

---

## Unresolved Items Requiring Further Investigation

### U1: `WARNING:waitForInjectedSettings` — race condition or genuine timeout?

**Status:** UNRESOLVED. The warning appeared in log 4 (the heaviest session, with a video actively playing). It did not appear in logs 1–3. The extension continues to function after this warning (no subsequent crash errors). However, the WARNING means the extension loaded with default settings rather than the user's persisted settings. If the user had custom key bindings or speed settings, they would have been silently ignored for that page load.

**Investigation needed:**
- Is the 5-second timeout consistently hit on heavy YouTube pages?
- Is `injector.js`'s `initBridge` (the recent commit `01ca981: fix(injector): remove requestIdleCallback deferral from initBridge bootstrap`) the correct fix, or does it introduce a new race?
- Does the WARNING correlate with the `[Rewards] VM24:1` output at lines 1–2 (a third-party extension potentially competing for ISOLATED World execution time)?

**Suggested feedback loop:** Add a counter to `injector.js` to record how many ms elapsed between `initBridge` starting and the `VSC_USER_SETTINGS` event being dispatched. Compare against the 5000ms deadline.

### U2: VSC `{ passive: false }` wheel handler — 1 test deliberately RED

**Status:** KNOWN LIMITATION, documented.

The test `tests/unit/ui/controls-wheel-passive.test.js` is deliberately written to FAIL (EXPECTED RED). `ControlsManager.setupWheelHandler` at `src/ui/controls.js:86` registers the `wheel` event listener with `{ passive: false }` because the handler calls `event.preventDefault()` (to block page scroll while the controller is being used). This is architecturally correct behavior, but it triggers the `[Violation] Added non-passive event listener to a scroll-blocking...` category of Chrome DevTools warnings (P13 in the table, though P13 is attributed to YouTube's `m=base:691` — not VSC's wheel handler).

VSC's wheel handler on `#controller` does NOT appear in the `[Violation] Added non-passive event listener` messages in log 4. Those violations are all sourced from `gqw @ m=base:691` (YouTube). However, VSC's wheel handler would generate the same warning type in a different browser session where the controller is actually visible and the user interacts with it.

**Documented in:** `docs/coverage/untestable.md` (per the test file header). The test must not be deleted without updating that file.

---

## Test Suite Status

Verified: `2026-11-02`

```
npm run check:manifest  → PASS (all Path B manifest invariants passed)
npm run check:invariants → PASS (all source invariants passed)
npm test                → 529/530 PASS, 1 EXPECTED RED
```

The 1 failing test (`controls-wheel-passive.test.js`) is an intentional EXPECTED RED, not a regression. It documents a known limitation (wheel handler must use `{ passive: false }` to call `preventDefault()`). The test header explicitly states: "DO NOT delete this file without updating untestable.md."

No new regressions were introduced since the previous session. All 529 other tests pass.

---

## Summary

**VSC-originated patterns across all 4 logs:**

| Pattern | First seen | Last seen | Fixed? |
|---|---|---|---|
| P1 — `injector.js` `executeScript` permission error (Path A) | Log 1 | Log 1 | YES |
| P2 — `constants.js` null `document.head` `appendChild` | Log 2 | Log 2 | YES |
| P3 — `logger.js` cascade from P2 (`LOG_LEVELS` undefined) | Log 2 | Log 2 | YES (cascade) |
| P4 — `inject.js` null `document.head` `appendChild` | Log 2 | Log 2 | YES |
| P5 — `storage-manager.js` 5-second settings timeout | — | Log 4 | OPEN (low severity) |

**Logs 3 and 4 are clean of VSC errors.** Log 4 has exactly one VSC-originated output: the WARNING at line 23551 from `storage-manager.js`. This is not a crash, not a TypeError, not a UI failure — it is a diagnostic warning indicating the extension initialized with defaults due to a settings delivery race. The extension continues to operate after it.

**All `webcomponents-sd.js`, `LegacyDataMixin`, `[Rewards]`, and `characterData` patterns are independently confirmed as YouTube-originated.** Zero VSC source files contain these strings. Zero VSC `chrome-extension://` URLs appear in the relevant stack traces.
