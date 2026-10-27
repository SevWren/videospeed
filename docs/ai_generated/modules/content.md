---
area: content
module-card: true
base-sha: e904370863d69a2b5d853af62745141953c4860d
---

# content — extension entry points and world bridge

**Mission**: Own the boundary between the browser extension runtime (isolated world / service
worker) and the injected page scripts (main world); orchestrate module load order and message
routing.

---

## Files

| File | LOC | Role |
|------|-----|------|
| `src/content/injector.js` | 319 | MEDIUM — content script entry point (isolated world); sequentially injects all page-world `<script>` tags; bridges `chrome.runtime` messages to `CustomEvent('VSC_MESSAGE')`; manages file:// GIF iframe proxy |
| `src/content/inject.js` | 611 | DEEP — page main world orchestrator (`VideoSpeedExtension` class); wires observers, handles GIF/video found/removed callbacks, dispatches popup messages; E2E export via `window.videoSpeedExtension` |
| `src/background.js` | 191 | SHALLOW — MV3 service worker; tracks active controllers per tab; manages extension icon state; relays popup queries |

---

## Key invariants (protected behaviors)

| PB | Rule | Code location |
|----|------|--------------|
| P11 | Load order in `injector.js` lines 37–63 is the production dependency order; modules may only reference `window.VSC.*` globals lazily at call time (not at parse/top-level time) | `injector.js` array lines 37–63 |
| P2 | `img.vscGifIgnore` must be checked before re-attaching a GifController; `img._vscTeardownSrc` must be checked before treating a src-change as a new GIF | `inject.js::onGifFound`, `gif-controller.js` teardown |

---

## Seam: what this area exposes / consumes

**Exposes:**
- `window.VideoSpeedExtension` / `window.videoSpeedExtension` — E2E test handle only
- Custom event channels (injector as relay): `VSC_USER_SETTINGS` (injector → main), `VSC_MESSAGE` (injector → main), `VSC_SAVE_SETTINGS` (main → injector)

**Consumes (inject.js reads from `window.VSC.*` on startup):**
- All core, observer, UI, and site-handler globals in load order

**Crossing points (B-architecture.md B2):**

| # | Event | Direction |
|---|-------|-----------|
| 1 | `VSC_USER_SETTINGS` | injector → inject.js (via storage-manager) |
| 2 | `VSC_SAVE_SETTINGS` | inject.js → injector |
| 3 | `VSC_MESSAGE` | injector → inject.js (popup relay) |
| 4/5 | `VSC_CONTROLLER_CREATED/REMOVED` | inject.js → injector → background |
| 6 | `VSC_FETCH_GIF_BYTES` | gif-controller → injector |
| 7–9 | `VSC_GIF_FETCH_REQUEST/RESPONSE/FETCHER_READY` | injector ↔ gif-file-fetcher iframe |

---

## Common D-tasks landing here

| Task | Entry point |
|------|------------|
| D1 — add a new message type from popup | `inject.js` lines 476–587 (message switch), `injector.js:132` (bridge), `background.js:95` |
| D7 — debug cross-world IPC | B-architecture.md B2 crossing table → `injector.js` → `inject.js` |
| D9 — file:// GIF fetch path | `injector.js:203` → `src/gif-file-fetcher.js` (iframe postMessage); crossing points #7–9 |

---

## Notes

- `src/content/injector.js` runs in the **isolated world** (has `chrome.*`, no `window.VSC`).
  `src/content/inject.js` runs in the **page main world** (has `window.VSC`, no `chrome.*`).
  Never call `chrome.*` from `inject.js` or any page-world file.
- The file:// iframe proxy (`src/gif-file-fetcher.html` + `src/gif-file-fetcher.js`) is loaded
  by `injector.js` only on `file://` pages. It uses `chrome-extension://` origin to bypass
  CORS for local GIF files. This is the **D9 answer**: the file:// fetch path goes through
  `injector.js:203` → `gif-file-fetcher.js` via `postMessage`.
