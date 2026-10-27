---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# injector.seam.md

**File**: `src/content/injector.js`
**World**: content-isolated (MV3 content script; NOT the page-main world)
**window.VSC registration**: none — injector.js does not write to `window.VSC`
**LOC**: 320

---

## window.VSC Depends On

None. Injector runs in the isolated world and has no access to `window.VSC.*` globals set
by the page-world scripts it injects. It communicates with the page world exclusively via
CustomEvents on `window`.

---

## Exposes

Injector.js does not expose any named API. Its responsibilities:

| Responsibility | Function | Lines |
|----------------|----------|-------|
| Script injection | `injectScript(src)` | 7–20 |
| CSS injection | `injectCSS()` | 23–29 |
| Module injection sequence | `injectModules()` | 32–93 |
| Site-specific script injection | `injectSiteSpecificScripts()` | 96–112 |
| Settings bridge | `injectUserSettings()` | 273–291 |
| Popup ↔ page message bridge | `setupMessageBridge()` | 115–270 |
| File:// GIF proxy IIFE | `setupFileGifFetcherProxy()` | 183–232 |

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P10 | Module load order enforced sequentially via `await injectScript()` in the 26-module array | `injectModules()` lines 37–63 |
| P11 | `window.VSC` namespace IPC: all messages cross worlds via CustomEvent (no direct function calls) | `setupMessageBridge()` lines 115–270 |
| P14 | `VSC_SAVE_SETTINGS` listener writes to `chrome.storage.sync` — no payload schema validation (known gap C-4) | `setupMessageBridge()` line 144 |

---

## IPC Responsibilities

### CustomEvent listeners (page → isolated)

| Event | Handler location | Action |
|-------|-----------------|--------|
| `VSC_SAVE_SETTINGS` | line 144 | Writes `event.detail` to `chrome.storage.sync` |
| `VSC_FETCH_GIF_BYTES` | line 222 | Routes to iframe via `dispatchToIframe()` (file:// pages only) |
| `VSC_CONTROLLER_CREATED` | line 235 | Forwards to `background.js` via `chrome.runtime.sendMessage` |
| `VSC_CONTROLLER_REMOVED` | line 253 | Forwards to `background.js` via `chrome.runtime.sendMessage` |

### CustomEvent dispatched (isolated → page)

| Event | Dispatched at | Carries |
|-------|--------------|---------|
| `VSC_USER_SETTINGS` | line 284 (after all modules loaded) | All `chrome.storage.sync` settings |
| `VSC_MESSAGE` | line 132 (bridges popup messages) | Popup command payload |

### postMessage (file:// GIF proxy — only on file:// pages)

`setupFileGifFetcherProxy()` IIFE (lines 183–232):
- Lazy-creates `<iframe src="chrome-extension://.../gif-file-fetcher.html">` (display:none)
- Listens for `VSC_GIF_FETCHER_READY` from iframe → marks ready, flushes pending queue
- Receives `VSC_FETCH_GIF_BYTES` from page → routes `VSC_GIF_FETCH_REQUEST` to iframe
- `VSC_GIF_BYTES_RESPONSE` flows directly iframe → parent window → `gif-controller.js` (injector does NOT relay it)

---

## Common Tasks

- **D7: Add a new IPC crossing** — start here; every page ↔ isolated message must be wired in `setupMessageBridge()`
- **D11: Firefox port planning** — injector.js uses `chrome.runtime.getURL` and `chrome.storage` (MV3 APIs); Firefox requires `browser.*` namespace
- **D10: Release / packaging** — verify WAR list in `manifest.json` covers every module in the `modules` array here; `check:structure` script validates this

---

## Gotchas

- **Module load order is the single most critical invariant in this file.** The 26-module array (lines 37–63 + line 85) is the canonical load order. Do not reorder, parallelize, or defer any entry. Each module reads `window.VSC.*` globals written by prior modules; any load-order change causes `TypeError` at startup. (HANDOFF.md §16.8, P11)

- **`VSC_SAVE_SETTINGS` has no payload validation.** Any page script can dispatch this event and write arbitrary keys to `chrome.storage.sync`. This is a known security gap (C-4, P14). Do not expand the listener or add new payloads without adding schema validation.

- **The iframe proxy only activates on `file://` pages.** `setupFileGifFetcherProxy()` returns immediately if `!location.href.startsWith('file://')`. The hidden iframe is created lazily only when the first `VSC_FETCH_GIF_BYTES` event arrives. Do not attempt to move this logic to `gif-controller.js` — content scripts have `chrome.runtime` access, page scripts do not. (HANDOFF.md §4.5, ADR in §7)

- **`VSC_GIF_BYTES_RESPONSE` is NOT re-dispatched by injector.** The iframe posts directly to `window.parent`, which is the page window. `gif-controller.js` listens on `window.addEventListener('message')`. The injector only handles `VSC_GIF_FETCHER_READY`.
