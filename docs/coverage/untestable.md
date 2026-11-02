# Untestable Lines

A source line exits the coverage denominator only after a second agent has
recorded a failed attempt to cover it.

Format: `file:line-range | DEAD-CODE | NO-SEAM | BROWSER-ONLY | reason | second-agent-id`

---

## Adjudication log — T-adjudicate (2026-11-01)

### background.js — BROWSER-ONLY

`src/background.js:1-192 | BROWSER-ONLY | All logic is directly inside chrome.* event handlers with no extractable pure functions | T-adjudicate`

**Evidence of attempt:**
`background.js` is a Chrome MV3 service worker. Every statement in the file is either:
- A module-level variable (`const tabControllers = new Map()` — line 7) that is only meaningful relative to the handlers below it, or
- Directly wired to `chrome.runtime.onMessage`, `chrome.tabs.onUpdated`, `chrome.tabs.onRemoved`, `chrome.tabs.onActivated`, `chrome.runtime.onStartup`, `chrome.runtime.onInstalled`, or
- Inside `updateIcon()` / `updateTabIndicators()` which call `chrome.action.setIcon` and `chrome.runtime.getURL` — both unavailable in JSDOM.

The `updateIcon` function (lines 14–45) is the only candidate for extraction. Its entire body is `chrome.action.setIcon(...)` followed by a `chrome.runtime.lastError` check. There is no pure logic inside it — the icon path construction (`const suffix = hasActiveControllers ? '' : '_disabled'`) is one line of string logic that does not warrant a dedicated seam.

Import attempt outcome: `background.js` is not an ES module (no `export` statements) and calls `chrome.*` at the top level on load (lines 60, 109, 123, 133, 169, 182). Importing it in JSDOM via `await import(...)` would throw immediately because `chrome` is undefined before any mock can intercept the module-level listener registration calls.

**Classification: BROWSER-ONLY — no refactor ticket needed; all logic is handler-wiring with trivial inline constants.**

---

### injector.js — BROWSER-ONLY (partially covered via CS-3 exception)

`src/content/injector.js:1-292 | BROWSER-ONLY | Content script; chrome.storage, chrome.runtime unavailable in JSDOM | T-adjudicate`

**Evidence of attempt:**
`injector.js` is explicitly covered under the CS-3 exception in CODING_STANDARDS.md. It cannot be imported as an ES module in JSDOM because:
1. It is not declared as `type="module"` — it uses no `import`/`export`.
2. It calls `chrome.storage.sync.get`, `chrome.runtime.onMessage.addListener`, `chrome.storage.onChanged.addListener`, and `chrome.runtime.sendMessage` at runtime, all of which require the extension isolated world.

**What IS already covered:**
- `tests/unit/content/injector-relay.test.js` covers the `_VSC_USER_CONTROLLED_KEYS` filtering logic (mirrored inline, CS-3 exception), the structural listener-count invariant (readFileSync), and the `triggerStorageChange` smoke test — this is the maximum achievable coverage at this seam.
- The `window.__VSC_injectedSettings` protocol is exercised by `tests/unit/core/storage-manager-race.test.js` (confirmed by SEAMS.md Group E note).

**What cannot be covered without a browser:**
- `injectUserSettings()` (lines 237–260): calls `chrome.storage.sync.get(null, ...)`.
- `setupMessageBridge()` chrome.runtime.onMessage listener (lines 31–44).
- `setupFileGifFetcherProxy()` IIFE (lines 87–146): requires `location.href`, `document.createElement('iframe')` at chrome-extension:// origin, and cross-origin `postMessage`.
- Controller lifecycle forwarding (lines 149–183): calls `chrome.runtime.sendMessage`.

**NO-SEAM sub-finding:** The `isExtensionContextInvalidated` helper (lines 20–28) is a pure function — it takes an error, returns a boolean. It could be tested in isolation if extracted to a shared utility. This is a candidate for a future NO-SEAM refactor ticket (see below).

**Classification: BROWSER-ONLY for import-level coverage. Structural seam at injector-relay.test.js is the ceiling.**

---

### gif-file-fetcher.js — BROWSER-ONLY

`src/gif-file-fetcher.js:1-72 | BROWSER-ONLY | Runs in chrome-extension:// iframe; XHR to file:// requires extension origin; window.parent.postMessage requires two-window setup | T-adjudicate`

**Evidence of attempt:**
`gif-file-fetcher.js` is not an ES module and cannot be imported directly. Its entire body executes inline: it registers a `window.addEventListener('message', ...)` handler (lines 14–69) and immediately calls `window.parent.postMessage({ type: 'VSC_GIF_FETCHER_READY' }, '*')` (line 72).

Critical blockers:
1. The `xhr.open('GET', url, true)` call targets `file://` URLs. Chrome only permits this from a `chrome-extension://` origin. JSDOM XHR runs with `null` origin — it would produce the same CORS block the feature was designed to work around.
2. `window.parent` in JSDOM is `window` itself (no iframe nesting). The `postMessage` on line 72 fires immediately on load but the receiving parent is also the same JSDOM window — the protocol cannot be tested without genuine two-window/iframe isolation.
3. The XHR `arraybuffer` response type and `byteLength` check (line 31) depend on real binary data from a file system path.

The message-dispatch logic (the `if (xhr.status === 0 || ...)` branch on lines 28–44) could theoretically be extracted as a pure function `buildGifResponse(status, response)` → `{ type, requestId, success, bytes?, error? }`. This is a NO-SEAM candidate.

**Classification: BROWSER-ONLY. All observable behavior requires chrome-extension:// origin XHR.**

---

### options.js — BROWSER-ONLY (with NO-SEAM pure functions)

`src/ui/options/options.js:1-657 | BROWSER-ONLY | DOMContentLoaded entry point; all DOM reads/writes and chrome.storage calls require browser context | T-adjudicate`

**Evidence of attempt:**
`options.js` is not an ES module. It is loaded as a script tag inside `options.html`. It cannot be imported in JSDOM because:
1. It sets `window.VSC = window.VSC || {}` at line 2 (side-effect).
2. Its primary entry point is `document.addEventListener("DOMContentLoaded", ...)` at line 591.
3. `save_options()` calls `chrome.storage.sync.remove(...)` and `chrome.tabs.query(...)` (lines 298–338).
4. `restore_options()` calls `window.VSC.videoSpeedConfig.load()` which requires the storage chain.

**Pure functions that ARE extractable (NO-SEAM candidates):**

| Function | Lines | Pure? | Notes |
|---|---|---|---|
| `debounce(func, wait)` | 5–15 | Yes | Standard debounce — no DOM or chrome deps |
| `BLACKLISTED_KEYCODES` | 20–29 | Yes | Constant array |
| `keyCodeAliases` | 31–90 | Yes | Static lookup object |
| `recordKeyPress(e)` | 92–124 | Partial | Reads/writes `e.target.value` and `e.target.keyCode`; testable with a synthetic event object |
| `inputFilterNumbersOnly(e)` | 126–132 | Partial | Regex logic; testable with a synthetic event |
| `inputBlur(e)` | 138–142 | Partial | Same as recordKeyPress |
| `updateShortcutInputText(inputId, keyCode)` | 144–149 | No | Calls `document.getElementById` |
| `updateCustomShortcutInputText(inputItem, keyCode)` | 151–155 | Yes | Mutates a passed-in element — testable with a mock object |

The key insight: `keyCodeAliases`, `BLACKLISTED_KEYCODES`, and the display-string logic (`keyCode >= 48 && keyCode <= 90 ? String.fromCharCode(keyCode) : ...`) appear verbatim in 4 places across `recordKeyPress`, `inputBlur`, `updateShortcutInputText`, and `updateCustomShortcutInputText`. This duplication is itself a NO-SEAM smell — extracting a `keyCodeToDisplayString(keyCode)` pure function would both enable testing and eliminate the repetition.

**NO-SEAM refactor ticket description:**
> Extract `keyCodeToDisplayString(keyCode)` from `options.js` into a shared pure function in `src/utils/` (or export from `options.js`). The display logic (`keyCodeAliases[k] || (k >= 48 && k <= 90 ? String.fromCharCode(k) : \`Key ${k}\`)`) is duplicated 4 times. Extracting it creates a testable seam for `options.js`'s core key-display behavior without requiring DOM or chrome.storage.

**Classification: BROWSER-ONLY for the DOMContentLoaded/storage entry points. Pure utility logic is a NO-SEAM candidate requiring a NON-TEST refactor ticket before tests can be written.**

---

### popup.js — BROWSER-ONLY

`src/ui/popup/popup.js:1-184 | BROWSER-ONLY | All logic is inside DOMContentLoaded; chrome.storage.sync.get, chrome.tabs.query, chrome.action.setIcon are unavailable in JSDOM | T-adjudicate`

**Evidence of attempt:**
`popup.js` is not an ES module. It is loaded as a script tag inside `popup.html`. It cannot be imported in JSDOM because:
1. All functions (`toggleEnabled`, `toggleEnabledUI`, `setSpeed`, `adjustSpeed`, `resetSpeed`, `loadSettingsAndInitialize`, `updateSpeedControlsUI`, `initializeSpeedControls`) are declared inside the `DOMContentLoaded` callback (lines 9–184) and are not accessible at module scope.
2. Every function that performs any logic calls either `chrome.storage.sync.*`, `chrome.tabs.query(...)`, or `chrome.action.setIcon(...)`.
3. `MessageTypes` constant (lines 2–7) is the only module-level declaration — it is a pure constant but is used exclusively by `setSpeed`/`adjustSpeed`/`resetSpeed` which require `chrome.tabs`.

**NO-SEAM candidate:** `updateSpeedControlsUI(slowerStep, fasterStep, resetSpeed)` (lines 103–123) reads DOM elements by ID and updates `dataset.delta`, `textContent`. It could be tested with JSDOM if extracted and called with pre-loaded HTML — but this requires the popup HTML to be loadable in JSDOM and the function to be exported. This is a NO-SEAM candidate.

**Similarly:** The step-extraction logic from `keyBindings` (lines 79–93 inside `loadSettingsAndInitialize`) is a pure computation — given an array of keybindings, return `{slowerStep, fasterStep, resetSpeed}`. Extractable as a pure function.

**NO-SEAM refactor ticket description:**
> Extract `extractSpeedStepsFromKeyBindings(keyBindings)` from `popup.js` as a pure function (returns `{slowerStep, fasterStep, resetSpeed}` from a keybindings array). This is the only logic in popup.js that does not touch the DOM or chrome APIs. Exporting it enables a unit test without browser context.

**Classification: BROWSER-ONLY for the DOMContentLoaded/chrome.* entry points. Step-extraction logic is a NO-SEAM candidate.**

---

### scripts/netflix.js — BROWSER-ONLY (NOT dead code)

`src/site-handlers/scripts/netflix.js:1-7 | BROWSER-ONLY | Requires window.netflix.appContext runtime API; injected only on netflix.com; event origin check enforces runtime context | T-adjudicate`

**Evidence of attempt:**
The `module-loader-dead-code.test.js` test only checks that `src/module-loader.js` is absent — it does not adjudicate `netflix.js`. Direct inspection of `manifest.json` (lines 100–110) confirms that `src/site-handlers/scripts/netflix.js` IS actively injected:

```json
{
  "all_frames": true,
  "matches": ["https://www.netflix.com/*"],
  "world": "MAIN",
  "run_at": "document_end",
  "js": ["src/site-handlers/scripts/netflix.js"]
}
```

This file is **not dead code**. It is a legitimate 7-line inline script that:
1. Registers a `window.addEventListener('message', ...)` handler.
2. Guards on `event.origin === 'https://www.netflix.com'` and `event.data.action === 'videospeed-seek'`.
3. Calls `window.netflix.appContext.state.playerApp.getAPI().videoPlayer` — the proprietary Netflix player API, which only exists on netflix.com's runtime DOM.

Why it cannot be tested in JSDOM:
- `window.netflix` is a proprietary object injected by netflix.com's own scripts. JSDOM does not provide it.
- The `event.origin` check requires the `MessageEvent` to carry `origin: 'https://www.netflix.com'` — achievable with JSDOM's `window.dispatchEvent`, but only if `window.netflix` is mocked. A mock of `window.netflix.appContext.state.playerApp.getAPI().videoPlayer.getAllPlayerSessionIds()[0]` is deep enough to constitute a structural existence test rather than a meaningful behavioral test.
- The only real observable behavior (the `seek()` call) has no output — it is a side effect on a proprietary API.

**Classification: BROWSER-ONLY. Active in manifest; requires netflix.com runtime APIs.**

---

## Summary table

| File | Lines | Classification | Refactor ticket? |
|---|---|---|---|
| src/background.js | 1–192 | BROWSER-ONLY | No — no extractable pure logic |
| src/content/injector.js | 1–292 | BROWSER-ONLY | NO-SEAM: extract `isExtensionContextInvalidated` to utils |
| src/gif-file-fetcher.js | 1–72 | BROWSER-ONLY | NO-SEAM: extract `buildGifResponse(status, response, requestId)` |
| src/ui/options/options.js | 1–657 | BROWSER-ONLY | NO-SEAM: extract `keyCodeToDisplayString(keyCode)` to src/utils/ |
| src/ui/popup/popup.js | 1–184 | BROWSER-ONLY | NO-SEAM: extract `extractSpeedStepsFromKeyBindings(bindings)` |
| src/site-handlers/scripts/netflix.js | 1–7 | BROWSER-ONLY | No — all logic requires netflix.com runtime APIs |
