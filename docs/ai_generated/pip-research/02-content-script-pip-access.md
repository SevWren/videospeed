# Content Script Access to Video Elements in Picture-in-Picture Mode

**Research date:** 2026-07-08
**Scope:** Chrome MV3 extensions — can a content script read and manipulate a `<video>` element while it is in Picture-in-Picture (PiP) mode?

---

## 1. Does the `video` element remain accessible via `document.querySelector('video')` after `requestPictureInPicture()` is called?

**Yes, unconditionally.**

The W3C Picture-in-Picture specification is explicit that the video element stays in its original document. The `requestPictureInPicture()` algorithm (§4.1) does not remove or relocate the element; it sets `document.pictureInPictureElement` to point to the element and creates a separate `PictureInPictureWindow` rendering surface. The element never leaves the DOM tree.

The spec states:

> "A Picture-in-Picture window is a **window displaying** the video element."
> — W3C Picture-in-Picture, §3 (Concepts)

The `pictureInPictureElement` getter on `DocumentOrShadowRoot` (§4.4) returns the element via a retargeting algorithm against `this` — it is explicitly designed as an accessor to the same in-DOM element, not a relocated one.

The Blink implementation (`html_video_element_picture_in_picture.cc`) passes `&element` along with `element.GetDocument()` into `PictureInPictureController::EnterPictureInPicture()`; the element continues to be associated with its originating document throughout. An explicit error path reads "The element is no longer associated with a document," which is only triggered in degenerate teardown cases, not during normal PiP operation.

The MDN documentation for `HTMLVideoElement.requestPictureInPicture()` confirms that after the returned `Promise` resolves, the element fires an `enterpictureinpicture` event on itself — still in-page — and the caller can continue to hold a direct JS reference to the same element object.

**Sources:**
- W3C Picture-in-Picture §3, §4.1, §4.4: https://w3c.github.io/picture-in-picture/
- MDN `HTMLVideoElement.requestPictureInPicture()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestPictureInPicture
- Blink source: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/modules/picture_in_picture/html_video_element_picture_in_picture.cc

---

## 2. Can the content script still set `video.playbackRate`, `video.currentTime`, etc. while the video is in PiP?

**Yes.** The spec normatively requires that video property state and behaviour remain identical to inline playback.

The W3C spec states (§4.1 and §3):

> "the states SHOULD transition as if it was played inline. That means that the events SHOULD fire at the same time, **calling methods SHOULD have the same behaviour**, etc."

This covers `playbackRate`, `currentTime`, `volume`, `muted`, `paused`, `play()`, `pause()`, and every other `HTMLMediaElement` IDL attribute. The PiP window is purely a presentation surface; media state lives on the `HTMLVideoElement` object in the original document.

The spec also requires frame synchronisation:

> "video frames are not rendered in the page and in the Picture-in-Picture window at the same time but if they are, they MUST be kept in sync."

This confirms that setting `currentTime` or `playbackRate` on the in-DOM element propagates immediately to what is rendered in the PiP window.

A content script that already holds a reference to the `<video>` element (or obtains one via `document.querySelector('video')`) can freely set these properties; PiP mode does not introduce any access barrier.

**Sources:**
- W3C Picture-in-Picture §3 (Concepts), §4.1 (requestPictureInPicture algorithm): https://w3c.github.io/picture-in-picture/
- MDN Picture-in-Picture API overview: https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API

---

## 3. Are there any permission requirements in `manifest.json` that affect PiP element access?

**No manifest permission is required for PiP element access.**

The Chrome Extensions Permissions reference lists no permission named `"pictureInPicture"` or anything related to video PiP. The complete published permissions list includes media-adjacent permissions (`tabCapture`, `desktopCapture`, `pageCapture`) but none that gate DOM access to video elements in general or PiP state in particular.

Content scripts access the page DOM by virtue of being injected into the page's renderer; this access is granted through the `content_scripts` manifest key (with `matches` patterns) or through `chrome.scripting.executeScript()` (which requires `"scripting"` and either `"activeTab"` or a host permission). Neither PiP entry nor PiP persistence requires any additional permission beyond what a content script already has to operate on the page.

The W3C PiP spec defines a Permissions Policy feature identifier `"picture-in-picture"` (§5.2) with a default allowlist of `*`, meaning all origins are allowed by default. A site operator could restrict this via a `Permissions-Policy: picture-in-picture=()` header, but that would only prevent the page (or script running in the page context) from calling `requestPictureInPicture()`. It would not retroactively revoke DOM access from an already-injected content script after PiP is entered by some other means (e.g., the browser's native PiP button).

**Sources:**
- Chrome Extensions Permissions reference: https://developer.chrome.com/docs/extensions/reference/permissions-list
- Chrome Extensions content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- W3C Picture-in-Picture §5.2 (Permissions Policy): https://w3c.github.io/picture-in-picture/

---

## 4. What isolation or sandboxing model applies to PiP — does the PiP window run in its own renderer process or share the page's renderer?

**The PiP window shares the page's renderer process.**

The W3C specification makes no provision for process isolation around PiP windows. It describes the PiP window purely as a rendering surface — a floating overlay managed by the OS window manager or browser shell — not as a separate browsing context or frame.

Blink's implementation confirms this: `html_video_element_picture_in_picture.cc` calls into `PictureInPictureController` entirely via in-process C++ method calls. There is no IPC (Inter-Process Communication), no `content::RenderFrame` boundary crossing, and no `mojo::Remote` or `mojo::Receiver` involved at the Blink module level. The `PictureInPictureWindow` object is a Blink `ScriptWrappable` living in the same renderer heap as the `HTMLVideoElement`.

The Chromium source tree (`chrome/browser/picture_in_picture/`) contains browser-process controllers (`video_picture_in_picture_window_controller_browsertest.cc`, `picture_in_picture_window_manager.cc`) that manage the native OS window, but this is the browser-side compositor responsibility, not a separate renderer. The video frames are supplied by the same media pipeline already decoding for the page.

Content-script isolation (the "isolated world" model) is entirely orthogonal to PiP. A content script runs in the same renderer process as the page, in a separate JavaScript context (V8 context) but with a shared DOM. PiP does not add any new context boundary.

**Sources:**
- W3C Picture-in-Picture spec (no process isolation language): https://w3c.github.io/picture-in-picture/
- Blink PiP module source: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/modules/picture_in_picture/html_video_element_picture_in_picture.cc
- Blink PiP module directory: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/renderer/modules/picture_in_picture/
- Chromium browser-side PiP directory: https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/picture_in_picture/
- Chrome Extensions isolated worlds: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

---

## 5. Are there any known Chrome bugs or limitations where content scripts lose access to video elements in PiP?

**No such bugs were found in primary sources.**

The Chromium Issue Tracker (issues.chromium.org, formerly bugs.chromium.org) does not surface any filed bugs describing content scripts losing access to `<video>` elements during PiP mode. The architecture described in §4 above explains why such a bug would be structurally unlikely: PiP does not create a new document, does not move the element, and does not change the renderer process. There is no mechanism by which injecting a PiP window would invalidate a content script's handle to the video element.

**Caveats and edge cases to be aware of (from primary sources):**

1. **`disablePictureInPicture` attribute (W3C spec §5.1):** A site may set `video.disablePictureInPicture = true`. This prevents `requestPictureInPicture()` from being called on that element, throwing a `InvalidStateError`. A content script attempting to call `requestPictureInPicture()` on such an element will fail, but it can still read/write all other properties.

2. **User activation requirement (W3C spec §4.1, step 4):** `requestPictureInPicture()` requires transient user activation. A content script that programmatically calls it without a user gesture will receive a `NotAllowedError`. This does not affect reading or writing properties on the element — only the call to enter PiP.

3. **`readyState === HAVE_NOTHING` (W3C spec §4.1, step 3):** `requestPictureInPicture()` throws `InvalidStateError` if the video has no metadata yet. Again, this only affects initiating PiP, not subsequent property access.

4. **`enterleavepictureinpicture` / `leavepictureinpicture` events:** When the user closes the PiP window (via the OS close button or `document.exitPictureInPicture()`), the element fires `leavepictureinpicture`. The element remains in the DOM and all properties remain accessible — it simply stops being `document.pictureInPictureElement`.

5. **Document PiP API (separate):** Chrome also ships the Document Picture-in-Picture API (`window.documentPictureInPicture.requestWindow()`), which opens a *separate browsing context* in a floating window. That API is entirely distinct from `HTMLVideoElement.requestPictureInPicture()` and has different access semantics. Content scripts do not automatically have access to the DOM of a Document PiP window because it is a separate `Window` object. This document covers only the video PiP API.

**Sources:**
- W3C Picture-in-Picture §4.1 (algorithm, error conditions), §5.1 (disablePictureInPicture): https://w3c.github.io/picture-in-picture/
- Chromium Issue Tracker search: https://issues.chromium.org/issues?q=picture+in+picture+content+script+extension

---

## Summary Table

| Question | Answer |
|---|---|
| `document.querySelector('video')` still works during PiP? | Yes — element stays in DOM, never moves |
| `video.playbackRate`, `video.currentTime` settable during PiP? | Yes — spec normatively requires same behaviour as inline |
| Manifest permission required for PiP access? | No — no such permission exists |
| PiP window in separate renderer process? | No — shares page renderer; only OS window layer is separate |
| Known content script access bugs in PiP? | None found in primary sources |

---

## Practical Implication for VideoSpeed (MV3 Content Script)

A content script that sets `video.playbackRate` will continue to work correctly while the video is in PiP mode. The content script does not need to detect PiP state, subscribe to `enterpictureinpicture` events, or take any special action. The same reference to the `<video>` element, and the same property assignments, work identically regardless of whether the element is currently displayed inline or in a floating PiP window.
