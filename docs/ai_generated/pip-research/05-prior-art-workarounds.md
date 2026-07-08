# Prior Art and Workarounds: Hotkeys in Picture-in-Picture Mode

**Research date:** 2026-07-08
**Scope:** Chrome extension keyboard shortcut failures in Picture-in-Picture (PiP) windows; available APIs and workarounds.

---

## 1. Media Session API (`navigator.mediaSession.setActionHandler`)

### What it is
The Media Session API lets a page register handlers for platform-level media control signals — hardware media keys, OS lock screen controls, notification tray buttons, and browser-supplied PiP overlay controls.

**Spec:** https://w3c.github.io/mediasession/
**MDN overview:** https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API
**MDN setActionHandler:** https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setActionHandler

### All supported action types (W3C spec `MediaSessionAction` enum)

| Action | Description |
|---|---|
| `play` | Resume playback |
| `pause` | Pause playback |
| `stop` | Stop playback entirely |
| `seekbackward` | Seek backward (default offset 7-10 s; customisable via `seekOffset`) |
| `seekforward` | Seek forward (same) |
| `seekto` | Seek to absolute position (`seekTime`; supports `fastSeek` flag) |
| `previoustrack` | Previous track |
| `nexttrack` | Next track |
| `skipad` | Skip advertisement |
| `enterpictureinpicture` | Open a PiP window (includes `enterPictureInPictureReason`: `useraction`, `contentoccluded`, `other`) |
| `togglemicrophone` | Mute/unmute mic |
| `togglecamera` | Toggle camera |
| `togglescreenshare` | Toggle screen share |
| `hangup` | End call |
| `previousslide` | Previous slide (for presentation PiP) |
| `nextslide` | Next slide (for presentation PiP) |
| `voiceactivity` | Voice activity detection |

### Does it solve the PiP keyboard problem?

**Partially — and only for a narrow set of actions.**

- Action handlers are triggered by OS/browser media controls (hardware keys, headset buttons, notification widgets, browser-supplied PiP overlay buttons). They are **not triggered by arbitrary `keydown` events** from the user pressing keys like `d`, `s`, `a`, `w`, etc.
- MDN explicitly documents that `previousslide`/`nextslide` work "when the user puts their presentation into a Picture-in-Picture window and presses the **browser-supplied controls**." The same principle applies to `play`, `pause`, `seekbackward`, `seekforward`.
- **There is no `playbackRate` or speed action.** `MediaPositionState` includes a `playbackRate` field to *report* current speed to the OS, but there is no corresponding action handler to *receive* a speed-change command via platform controls.

**Conclusion:** The Media Session API lets handlers fire even when the PiP window has focus, but only via OS/browser media control surfaces — not via custom letter-key shortcuts. It cannot replace arbitrary keyboard shortcut handling for speed changes.

---

## 2. `chrome.commands` API

**Docs:** https://developer.chrome.com/docs/extensions/reference/api/commands

### Standard (non-global) commands

Standard commands are scoped to the Chrome browser process. The docs state explicitly:

> "when the browser does not have focus, command shortcuts are inactive."

A floating PiP window (both `video.requestPictureInPicture()` and Document PiP via `documentPictureInPicture.requestWindow()`) renders in its own OS-level window. When that window has focus, the underlying Chrome tab that hosts the extension's content scripts **does not have focus**. The Chrome commands API documentation makes no exception for this case.

**Practical result:** Standard `chrome.commands` shortcuts will **not fire** while the PiP window has focus unless the opener tab is also considered focused by the OS. This is an OS-level input routing issue — the PiP window is a separate window handle, and keystrokes are delivered to it, not to the Chrome browser window.

### Global commands

Extensions can declare commands with `"global": true` in the manifest, which causes them to fire even when Chrome does not have focus. This is the only documented mechanism that could reach the extension when PiP has OS focus. However:

- Global commands are restricted to `Ctrl+Shift+[0-9]` key combinations (docs describe this as "a protective measure to minimise the risk of overriding shortcuts in other applications").
- Global commands are **not supported on ChromeOS**.
- They are not suitable for single-key shortcuts like `d`/`s`/`a`/`w` typically used by video speed controllers.

**Conclusion:** `chrome.commands` cannot reliably fire for arbitrary key combinations while a PiP window has OS focus. Global commands are an escape valve but are constrained to `Ctrl+Shift+[0-9]`.

---

## 3. Open Chromium Bugs and WICG Issues

### WICG picture-in-picture (video PiP spec)
**URL:** https://github.com/WICG/picture-in-picture/issues

23 open issues as of research date. **None** address keyboard shortcuts, hotkey routing, extension commands, keydown events, or content script event listeners in video PiP. Issue topics focus on algorithm overhauls, window management, user activation requirements, and accessibility.

### WICG document-picture-in-picture
**URL:** https://github.com/WICG/document-picture-in-picture/issues

Relevant issues found:

- **Issue #146** ("Avoid stealing focus when switching tab", opened Aug 22, 2025, open): Describes unwanted focus theft by the Document PiP window when it opens, disrupting the user workflow. A commenter suggested using `navigator.mediaSession.setActionHandler('enterpictureinpicture', handler)` as an alternative that reportedly does not steal focus. The original author noted this doesn't cover their use case. **No resolution.**
- **Issue #101** ("Chrome Extension compatibility"): Describes Document PiP API being blocked in Chrome extensions. A Chrome collaborator noted that Chrome 122.0.6238.0+ expanded the allowed schemes, partially resolving the restriction for content scripts running on `chrome-extension://` origins.
- **Issue #118** ("Considering 3rd party libraries implementation on modifying window.focus API", open): Focus API modification concerns.

### Chromium Issue Tracker
**URL:** https://issues.chromium.org (formerly bugs.chromium.org, now redirects)

The tracker's search interface returns minified JavaScript rather than readable issue lists for automated fetching. No specific issue number about "extension hotkeys don't work in PiP" was retrievable via automated fetch. Manual search at https://issues.chromium.org with `component:Blink>Media>PictureInPicture` and keywords `keyboard`/`extensions` is recommended for the most current state.

---

## 4. igrigorik/videospeed — Current State

**Repo:** https://github.com/igrigorik/videospeed

### Issues filed about PiP

| Issue | Title | Status |
|---|---|---|
| #441 | "support picture-in-picture" | Closed completed (Mar 2019) |
| #796 | "Wont work in picture in picture" | Closed completed (Jul 2025) |
| #1038 | "Keyboard shortcuts on Picture-in-Picture" | Closed completed (Jul 2025) |
| #1065 | "Enable speed control for picture-in-picture mode on Edge and Chromium browsers" | Closed completed (Jul 2025) |

Issue #1038 specifically describes: "keyboard shortcuts become unavailable when using the browser's Picture-in-Picture feature ... when the source tab isn't actively focused." The reporter acknowledged this "may be a browser-level limitation rather than something the extension can directly solve." All issues were closed by the maintainer in July 2025, but the automated fetch of the repo's commit log and source code reveals **no PiP-specific code was merged**. The issues appear to have been administratively closed rather than resolved with a code fix.

### Source code analysis (as of master branch, July 2026)

Examined files: `src/content/inject.js`, `src/utils/event-manager.js`, `src/core/action-handler.js`, `src/observers/media-observer.js`, `src/observers/mutation-observer.js`, `src/entries/content-bridge.js`.

**PiP-related code found: none.**

- `event-manager.js` attaches `keydown` listeners to `document` (and `window.top.document` when inside an iframe) using capture phase. No `enterpictureinpicture`/`leavepictureinpicture` event listeners. No Document PiP API usage.
- `media-observer.js` scans shadow DOMs, iframes, and site-specific containers for video elements but contains no PiP detection.
- `mutation-observer.js` watches DOM child list and attribute mutations for video element presence/visibility but has no PiP state tracking.
- `action-handler.js` dispatches custom `ratechange` events with `detail: { origin: 'videoSpeed', speed, source }` but no PiP-aware routing.
- `content-bridge.js` bridges isolated-world content script to MAIN world via `CustomEvent`; skips `about:blank` frames; no PiP handling.

**The extension has no working PiP hotkey solution as of the examined codebase.**

---

## 5. Message-Passing Pattern (Content Script ↔ Background ↔ PiP Window)

### Video PiP (`video.requestPictureInPicture()`)

In standard video PiP, the video element remains in the original page's DOM. The PiP window is a browser-rendered overlay with minimal controls (play/pause, close, occasionally seek). The video element itself is still accessible via `document.querySelector('video')` in the content script of the originating tab. There is **no separate document** for the PiP window, so no separate injection is needed. The problem is entirely about keyboard focus: key events go to the PiP window's OS handle, not the original tab.

**Viable message-passing pattern for video PiP:**
```
PiP window focus → keyboard event lost to extension
  ↓
(No standard mechanism to intercept these from content script)
```

The only documented relay mechanism would be to inject event listeners *into the PiP window's document* if it is accessible — which requires Document PiP, not standard video PiP.

### Document PiP (`documentPictureInPicture.requestWindow()`)

Document PiP creates a **separate same-origin browsing context** (analogous to `window.open()`). The opener has a direct JavaScript reference to the PiP window object:

```javascript
const pipWindow = await documentPictureInPicture.requestWindow();
```

The opener can directly manipulate `pipWindow.document` and attach event listeners:

```javascript
pipWindow.document.addEventListener('keydown', (e) => {
  // Handle hotkeys here — this fires when PiP window has focus
  handleSpeedKey(e);
});
```

This is the **canonical workaround for Document PiP**: attach keydown listeners directly on the PiP window's document from the opener context. No message passing is required because it is same-origin synchronous DOM access.

For an extension content script, the pattern is:

1. Listen for `documentPictureInPicture.onenter` event in the content script (fires when any Document PiP window opens).
2. In the handler, call `documentPictureInPicture.window` to get the current PiP window reference.
3. Attach keydown listeners to `pipWindow.document`.

```javascript
documentPictureInPicture.addEventListener('enter', (event) => {
  const pipWindow = event.window;
  pipWindow.document.addEventListener('keydown', handleHotkey, true);
});
```

**Note:** This does not work for standard video PiP (no separate document; no `documentPictureInPicture` API involved).

---

## 6. `enterpictureinpicture` Event and MutationObserver Patterns

### `enterpictureinpicture` / `leavepictureinpicture` events on the video element

When a `<video>` element enters standard PiP, it fires `enterpictureinpicture` on the element itself. This event is accessible from a content script:

```javascript
videoElement.addEventListener('enterpictureinpicture', (event) => {
  // event.pictureInPictureWindow has .width and .height
  // But this is the PiP *overlay* window, not a document you can add listeners to
  const pipWindow = event.pictureInPictureWindow;
  // pipWindow is a PictureInPictureWindow instance — it does NOT have a .document property
  // You cannot inject keyboard listeners here
});
```

**Critical limitation:** The `PictureInPictureWindow` object returned by standard video PiP (`event.pictureInPictureWindow`) exposes only `width`, `height`, and a `resize` event. It has **no `.document` property** and no way to attach keyboard listeners to the PiP overlay. The overlay is rendered by the browser chrome, not by web content.

### `documentPictureInPicture` enter event

For Document PiP, the `enter` event on `documentPictureInPicture` gives access to a full window object with a DOM:

```javascript
documentPictureInPicture.addEventListener('enter', (event) => {
  const pipWin = event.window; // full Window with .document
  pipWin.document.addEventListener('keydown', handler, true);
});
```

This pattern **does** allow re-attaching keyboard listeners when PiP activates.

### MutationObserver

A MutationObserver cannot directly detect PiP state changes — PiP does not modify DOM attributes or child nodes by default. MutationObserver is useful for detecting when video elements are added to the page (and then registering `enterpictureinpicture` listeners on them), but it is not a direct PiP detection mechanism.

The correct event-driven pattern:

```javascript
// When a new video element appears (via MutationObserver or other detection):
function attachPiPListeners(videoEl) {
  videoEl.addEventListener('enterpictureinpicture', () => {
    // Standard PiP: cannot inject into overlay, but can note PiP is active
    pipActive = true;
  });
  videoEl.addEventListener('leavepictureinpicture', () => {
    pipActive = false;
  });
}
```

For Document PiP the `documentPictureInPicture.onenter` global event is more appropriate than polling via MutationObserver.

---

## 7. Content Script Injection into PiP Windows

### Standard video PiP
Content scripts cannot inject into the browser-rendered PiP overlay. There is no document, no matching URL, and no content script injection point.

### Document PiP
The Document PiP window is a same-origin blank window. Chrome's content script injection system (`chrome.scripting.executeScript` or manifest `content_scripts`) does **not** automatically inject into Document PiP windows because:
- The window has no URL to match against (`about:blank` or blank origin context).
- Content script manifest `matches` patterns do not apply.

However, using `match_origin_as_fallback: true` in the content script manifest declaration may allow injection into `about:blank`-scheme frames that share the opener origin:

```json
"content_scripts": [{
  "matches": ["https://example.com/*"],
  "match_origin_as_fallback": true,
  "js": ["content.js"]
}]
```

This is an **experimental approach** — the Chrome docs cover its use for `about:`, `data:`, `blob:`, and `filesystem:` scheme frames but do not explicitly confirm Document PiP windows. The WICG Document PiP issue #101 confirmed that Chrome 122+ expanded allowed schemes for extension use of the Document PiP API itself.

The more reliable approach is direct DOM access from the opener context (as described in section 5).

---

## 8. Summary Table

| Approach | Works for standard video PiP | Works for Document PiP | Notes |
|---|---|---|---|
| `navigator.mediaSession.setActionHandler` | Yes (play/pause/seek only; via OS media controls) | Yes | No speed/rate action; not keyboard-triggered |
| `chrome.commands` (non-global) | No | No | Requires Chrome window focus |
| `chrome.commands` (global) | Possibly | Possibly | Only `Ctrl+Shift+[0-9]`; no ChromeOS |
| Keydown on original `document` | No (events go to PiP window) | No | Standard PiP steals keyboard focus |
| Keydown on `pipWindow.document` | N/A (no PiP document) | Yes | Best approach for Document PiP |
| `enterpictureinpicture` event + re-attach | Partially (can note state; cannot inject into overlay) | Yes (via `documentPictureInPicture.onenter`) | Correct pattern for Document PiP |
| `match_origin_as_fallback` content script | No | Possibly (unconfirmed) | Experimental; may not target PiP window |
| MutationObserver | No (indirect only) | No (indirect only) | Useful for video discovery; not PiP-specific |

---

## 9. Key Findings

1. **Standard video PiP is fundamentally hostile to extension keyboard shortcuts.** The PiP overlay is browser chrome, not a web document. Keyboard events go to an OS window handle that is not reachable by content scripts or `chrome.commands` without global-command restrictions.

2. **Document PiP is solvable.** The `documentPictureInPicture.onenter` event provides a direct reference to the PiP window's DOM. Attaching `keydown` listeners directly on `pipWindow.document` is the established pattern and requires no message passing.

3. **Media Session API does not cover speed/rate changes.** There is no `playbackRate` action type in the W3C spec. The API helps only with play/pause/seek via OS media surfaces, not custom letter-key shortcuts.

4. **igrigorik/videospeed has no current PiP hotkey solution** despite four PiP-related issues being closed as "completed." The source code contains no `enterpictureinpicture` event listeners, no Document PiP handling, and no keyboard listener re-attachment on PiP activation.

5. **No dedicated Chromium bug or WICG issue** specifically tracks "extension hotkeys broken in PiP" in a retrievable open state. The focus-stealing issue (WICG Document PiP #146) is the closest open upstream issue.

---

## Sources

| Source | URL |
|---|---|
| MDN Media Session API | https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API |
| MDN MediaSession.setActionHandler | https://developer.mozilla.org/en-US/docs/Web/API/MediaSession/setActionHandler |
| W3C Media Session spec (enum) | https://w3c.github.io/mediasession/#enumdef-mediasessionaction |
| Chrome Extensions Commands API | https://developer.chrome.com/docs/extensions/reference/api/commands |
| Chrome Document PiP explainer | https://developer.chrome.com/docs/web-platform/document-picture-in-picture/ |
| Chrome Content Scripts docs | https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts |
| WICG picture-in-picture issues | https://github.com/WICG/picture-in-picture/issues |
| WICG document-picture-in-picture issues | https://github.com/WICG/document-picture-in-picture/issues |
| WICG doc-pip issue #101 (extension compat) | https://github.com/WICG/document-picture-in-picture/issues/101 |
| WICG doc-pip issue #146 (focus stealing) | https://github.com/WICG/document-picture-in-picture/issues/146 |
| WICG doc-pip README | https://raw.githubusercontent.com/WICG/document-picture-in-picture/main/README.md |
| igrigorik/videospeed issue #1038 | https://github.com/igrigorik/videospeed/issues/1038 |
| igrigorik/videospeed issue #1065 | https://github.com/igrigorik/videospeed/issues/1065 |
| igrigorik/videospeed src/utils/event-manager.js | https://raw.githubusercontent.com/igrigorik/videospeed/master/src/utils/event-manager.js |
| igrigorik/videospeed src/entries/content-bridge.js | https://raw.githubusercontent.com/igrigorik/videospeed/master/src/entries/content-bridge.js |
