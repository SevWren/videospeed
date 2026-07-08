# Picture-in-Picture API Fundamentals
## Research for VideoSpeed Extension

**Research date:** 2026-07-08
**Scope:** Video PiP API (HTMLVideoElement-based) and Document PiP API, with Chromium/Chrome focus
**Sources:** W3C spec, WICG spec, MDN Web Docs, Chrome Developer documentation — primary sources only

---

## Table of Contents

1. [Does the `<video>` element stay in the original DOM?](#1-does-the-video-element-stay-in-the-original-dom)
2. [What events fire, on what objects?](#2-what-events-fire-on-what-objects)
3. [What is PictureInPictureWindow — is it a real Window?](#3-what-is-pictureinpicturewindow--is-it-a-real-window)
4. [Keyboard focus when PiP is active](#4-keyboard-focus-when-pip-is-active)
5. [Can `video.playbackRate` be set from the originating page?](#5-can-videoplaybackrate-be-set-from-the-originating-page)
6. [Document PiP vs. Video PiP — key differences](#6-document-pip-vs-video-pip--key-differences)
7. [Source citations](#7-source-citations)

---

## 1. Does the `<video>` element stay in the original DOM?

**Answer: Yes. The `<video>` element remains in its original document's DOM tree. It does not move to a separate browsing context.**

The W3C Picture-in-Picture spec's `requestPictureInPicture()` algorithm contains no step that removes or relocates the element from the document tree. The PiP floating window is a separate OS-level display surface that renders the video output; it is not a DOM container that holds the element.

The Chrome Developer blog makes this explicit in the opposite direction:

> "Note that the video element doesn't have to be attached to the DOM to enter Picture-in-Picture."
> — developer.chrome.com/blog/watch-video-using-picture-in-picture

This statement (that the element does not *need* to be in the DOM) confirms that DOM attachment is independent of PiP state. The element can be in PiP whether or not it is in the DOM, and being in PiP does not alter its DOM position.

The property `Document.pictureInPictureElement` returns a direct reference to the element in the document (or `null`), further confirming the element is still reachable through the same document it came from.

The `:picture-in-picture` CSS pseudo-class can be applied to the element while it is in PiP mode, which only makes sense if the element remains part of the document's style recalculation tree.

**Contrast with Document PiP:** In the *Document* Picture-in-Picture API (a separate, newer API), DOM nodes are *explicitly moved* into the PiP window's document using `pipWindow.document.body.append(player)`. This is an intentional design difference from video PiP.

---

## 2. What events fire, on what objects?

### Video PiP API events

There are three events defined in the W3C Picture-in-Picture spec.

#### `enterpictureinpicture`

- **Fires on:** `HTMLVideoElement`
- **Event interface:** `PictureInPictureEvent` (extends `Event`)
- **Key property:** `event.pictureInPictureWindow` — returns the associated `PictureInPictureWindow` object
- **Bubbles:** Yes (`bubbles: true` per spec algorithm init dict)
- **Cancelable:** No
- **When:** After the video successfully enters PiP mode

Spec language (W3C Picture-in-Picture, §requestPictureInPicture algorithm):
> Fire an event named "enterpictureinpicture" at the video element, using `PictureInPictureEvent`, with the `pictureInPictureWindow` attribute initialized to the `PictureInPictureWindow` and `bubbles` initialized to `true`.

#### `leavepictureinpicture`

- **Fires on:** `HTMLVideoElement`
- **Event interface:** `PictureInPictureEvent`
- **Key property:** `event.pictureInPictureWindow`
- **Bubbles:** Yes (per spec)
- **Cancelable:** No
- **When:** After the video exits PiP mode (triggered by `document.exitPictureInPicture()` or user closing the PiP window)

#### `resize`

- **Fires on:** `PictureInPictureWindow` instance
- **Event interface:** `Event`
- **When:** When the user resizes the floating PiP window

**Important MDN caveat:** The `enterpictureinpicture` event does NOT fire when the browser triggers PiP programmatically (e.g., via OS-level auto-PiP). In those cases, use `MediaSession.setActionHandler('enterpictureinpicture', handler)` instead.

### Document PiP API events (for contrast)

- **`enter`** fires on the `DocumentPictureInPicture` global object (`window.documentPictureInPicture.onenter`)
- **Event interface:** `DocumentPictureInPictureEvent` with a `.window` property holding the PiP Window reference
- **`pagehide`** fires on the PiP window when the PiP window closes

---

## 3. What is `PictureInPictureWindow` — is it a real Window?

**Answer: No. `PictureInPictureWindow` is NOT a `Window` object and does NOT have a `document` property.**

The complete WebIDL from the W3C spec is:

```webidl
interface PictureInPictureWindow : EventTarget {
  readonly attribute long width;
  readonly attribute long height;
  attribute EventHandler onresize;
};
```

It extends `EventTarget` — not `Window`, not `WindowProxy`, not any browsing-context-related interface.

**What it is:** A minimal handle object representing the OS-level floating video window. It exposes only the window's pixel dimensions and a resize event handler. It has no DOM, no `document`, no `navigator`, no `location`, and no scripting context of its own.

**How it is obtained:** The `Promise` returned by `video.requestPictureInPicture()` resolves to a `PictureInPictureWindow` instance. The same object is also accessible via `event.pictureInPictureWindow` on `enterpictureinpicture` events.

**Contrast with Document PiP:** The Document PiP API (`documentPictureInPicture.requestWindow()`) returns an actual `Window` object with its own `document`, DOM, and scripting context. That is a fundamentally different API intended for richer custom-UI PiP scenarios.

---

## 4. Keyboard focus when PiP is active

**Answer: The spec does not define focus behavior for video PiP. The PiP window has no scripting context and cannot receive keyboard events in the traditional DOM sense.**

The W3C Picture-in-Picture spec's algorithm has no focus management steps. Because `PictureInPictureWindow` is not a browsing context, there is no `document` to focus and no event target for keyboard events.

In practice with Chromium:

- The PiP floating window receives OS-level window focus when the user clicks on it.
- Media Session action handlers (`play`, `pause`, `previoustrack`, `nexttrack`, etc.) registered on the originating page will respond to media keys and controls shown in the PiP window UI. These handlers run in the originating page's JavaScript context.
- The originating page's `window` retains its own focus state independently.
- There is no `KeyboardEvent` path routed from the PiP window into the originating page's DOM.

**Document PiP is different:** In Document PiP, the PiP window has a full browsing context with a `document`. When the user interacts with elements in that window, standard DOM keyboard and pointer events fire in the PiP window's document context. The originating page can re-focus itself via `window.focus()` from within the PiP window (requires user gesture, Chrome 123+).

---

## 5. Can `video.playbackRate` be set from the originating page?

**Answer: Yes. The video element remains fully controllable from the originating page's script while it is in PiP mode.**

The Chrome Developer blog states explicitly:

> "The video element behaves the same whether it is in Picture-in-Picture or not: events are fired and calling methods work."
> — developer.chrome.com/blog/watch-video-using-picture-in-picture

Because the `<video>` element stays in the original document's DOM (see §1), all script references to it remain valid. Setting `video.playbackRate`, `video.currentTime`, `video.muted`, `video.volume`, calling `video.play()` / `video.pause()`, or attaching event listeners all work exactly as they would if the video were not in PiP mode.

This is the foundation that allows VideoSpeed's playback rate controls to continue working while a video is in PiP mode — the extension's content script operates in the same document context as the video element and can manipulate it regardless of PiP state.

---

## 6. Document PiP vs. Video PiP — key differences

This table summarizes the two APIs to prevent confusion. VideoSpeed currently targets the Video PiP API.

| Aspect | Video PiP (`requestPictureInPicture()`) | Document PiP (`documentPictureInPicture.requestWindow()`) |
|---|---|---|
| Spec | W3C Picture-in-Picture | WICG Document Picture-in-Picture |
| What enters PiP | Native video rendering only | Any HTML content / DOM nodes |
| Video element moves? | No — stays in originating document | Yes — moved via `pipWindow.document.body.append()` |
| PiP object type | `PictureInPictureWindow` (not a Window) | Actual `Window` with `document` |
| Has own browsing context? | No | Yes — "top-level traversable, like `window.open()`" |
| Events (enter) | `enterpictureinpicture` on `HTMLVideoElement` | `enter` on `documentPictureInPicture` object |
| Script control from opener | Full — video element unchanged in opener DOM | Full — via `pipWindow.document` or direct references |
| Custom UI in PiP window | No | Yes |
| Chrome support | Chrome 70+ | Chrome 116+ |

---

## 7. Source citations

1. **W3C Picture-in-Picture Specification**
   https://w3c.github.io/picture-in-picture/
   Interface definitions, event init dicts, `requestPictureInPicture()` algorithm. Authoritative specification for Video PiP behavior.

2. **MDN Web Docs — Picture-in-Picture API**
   https://developer.mozilla.org/en-US/docs/Web/API/Picture-in-Picture_API
   Overview, event summary, API surface.

3. **MDN Web Docs — PictureInPictureWindow**
   https://developer.mozilla.org/en-US/docs/Web/API/PictureInPictureWindow
   Interface properties, clarification that it is not a Window.

4. **MDN Web Docs — PictureInPictureEvent**
   https://developer.mozilla.org/en-US/docs/Web/API/PictureInPictureEvent
   Confirms `pictureInPictureWindow` property on the event object.

5. **MDN Web Docs — HTMLVideoElement: enterpictureinpicture event**
   https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/enterpictureinpicture_event
   Event firing target, bubbling/cancelable flags.

6. **MDN Web Docs — HTMLVideoElement: leavepictureinpicture event**
   https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/leavepictureinpicture_event
   Event firing target, bubbling/cancelable flags.

7. **MDN Web Docs — Document.pictureInPictureElement**
   https://developer.mozilla.org/en-US/docs/Web/API/Document/pictureInPictureElement
   Confirms element is accessible via the originating document.

8. **MDN Web Docs — HTMLVideoElement.requestPictureInPicture()**
   https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestPictureInPicture
   Promise resolution, error conditions.

9. **Chrome Developer Blog — Watch video using Picture-in-Picture**
   https://developer.chrome.com/blog/watch-video-using-picture-in-picture
   "The video element behaves the same whether it is in Picture-in-Picture or not: events are fired and calling methods work." Also: "the video element doesn't have to be attached to the DOM to enter Picture-in-Picture."

10. **Chrome Developer Docs — Document Picture-in-Picture**
    https://developer.chrome.com/docs/web-platform/document-picture-in-picture
    Document PiP API details, browsing context behavior, `window.focus()` method, element movement via `append()`, same-origin access model.

11. **WICG Document Picture-in-Picture Specification**
    https://wicg.github.io/document-picture-in-picture/
    WebIDL for `DocumentPictureInPicture` interface, top-level traversable creation, `DocumentPictureInPictureEvent` with `.window` property.
