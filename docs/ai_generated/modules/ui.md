---
area: ui
module-card: true
base-sha: e904370863d69a2b5d853af62745141953c4860d
---

# ui — controller overlay, options page, popup

**Mission**: Render and manage the floating speed-controller overlay on every media element;
provide the extension options page and popup; handle overlay drag repositioning.

---

## Files

| File | LOC | Role |
|------|-----|------|
| `src/ui/shadow-dom.js` | 248 | MEDIUM — `ShadowDOMManager`: creates Shadow DOM root, injects styles, computes overlay position |
| `src/ui/controls.js` | 131 | SHALLOW — `ControlsManager`: creates button elements, updates speed display text |
| `src/ui/drag-handler.js` | 60 | SHALLOW — `handleDrag`: mouse drag logic for overlay repositioning |
| `src/ui/options/options.js` | 657 | DEEP — options page: key binding UI, settings load/save, speed preset management |
| `src/ui/options/options.html` | 182 | Options page HTML (manifest entry point) |
| `src/ui/options/options.css` | 700 | Options page styles |
| `src/ui/popup/popup.js` | 184 | Popup JS: queries active controllers, sends speed commands via `chrome.runtime.sendMessage` |
| `src/ui/popup/popup.html` | 64 | Popup HTML (manifest entry point) |
| `src/ui/popup/popup.css` | 348 | Popup styles |

---

## Key invariants (protected behaviors)

| PB | Rule | Code location |
|----|------|--------------|
| P7 | `_patchCanvas` in `gif-controller.js` replaces `<img>` with `<canvas>` sized to the img's computed layout; the canvas gets `canvas.vsc = { div: gc.div }` so `DragHandler` works the same way it works on `video.vsc` | `gif-controller.js::_patchCanvas`, `drag-handler.js` |
| P10 | Options page reads/writes settings via `window.VSC.VideoSpeedConfig`; it must NOT call `chrome.storage` directly (StorageManager wraps that) | `options.js` |

---

## Seam: what this area exposes / consumes

**Exposes (via `window.VSC.*`):**
- `window.VSC.ControlsManager` — consumed by `video-controller.js`, `gif-controller.js`
- `window.VSC.DragHandler` — consumed by `action-handler.js:163,277`
- `window.VSC.ShadowDOMManager` — consumed by `video-controller.js:108`, `gif-controller.js:606`

**The options page** runs in an extension page (world d), not the content script. It accesses
`window.VSC.VideoSpeedConfig` (constructed fresh in the options page context) and writes to
`chrome.storage.sync` via `StorageManager`.

**The popup** runs in extension world (world d); sends `chrome.runtime.sendMessage` to
`background.js`; receives a relay from `injector.js` as `CustomEvent('VSC_MESSAGE')`.

**Consumes:**
- `window.VSC.Constants`, `window.VSC.logger` (content-world files)
- `window.VSC.VideoSpeedConfig` / `window.VSC.StorageManager` (options page)

---

## Common D-tasks landing here

| Task | Entry point |
|------|------------|
| D5 — add a speed preset button | `options.js` + `options.html` |
| D6 — PiP: overlay positioning in PiP window | `shadow-dom.js::ShadowDOMManager` (position calc) |
| D13 — change overlay appearance | `controls.js`, `shadow-dom.js`, `src/styles/shadow.css` |

---

## Notes

- The `canvas.vsc = { div: gc.div }` adapter (set in `gif-controller.js::_patchCanvas`) is the
  only reason `DragHandler` works on GIF canvases without modification. Removing or changing this
  expando shape breaks drag for all GIFs.
- `src/styles/inject.css` is injected as a content-script CSS (manifest `content_scripts[0].css`),
  not via `ShadowDOMManager`. It styles the page-level container. `src/styles/shadow.css` is
  loaded inside the Shadow DOM by `ShadowDOMManager`.
