# Document Picture-in-Picture API: Research Findings

**Research date:** 2026-07-08
**Scope:** Document PiP API, Chrome extension interaction, content script injection

---

## 1. What Is `documentPictureInPicture.requestWindow()` and How Does It Differ from `video.requestPictureInPicture()`?

### Legacy `video.requestPictureInPicture()` (HTML Picture-in-Picture API)

The legacy API, part of the [Picture-in-Picture API spec](https://w3c.github.io/picture-in-picture/), is restricted to `<video>` elements. Calling `videoElement.requestPictureInPicture()` opens a browser-controlled floating overlay that displays the video stream. The website has no control over the content of that overlay—it is a native browser widget. Styling, interactive controls, and arbitrary HTML cannot be placed inside it.

### Document Picture-in-Picture API (`documentPictureInPicture.requestWindow()`)

Introduced in Chrome 116, this API opens a **full HTML browsing context** in a floating always-on-top window. The site can populate that window with arbitrary HTML, CSS, and JavaScript.

```javascript
const pipWindow = await window.documentPictureInPicture.requestWindow({
  width: 640,
  height: 480,
  disallowReturnToOpener: true,   // hides the "back to tab" button
  preferInitialWindowPlacement: true,
});

// Move DOM nodes into the PiP window
pipWindow.document.body.append(myPlayerElement);
```

The method returns a `Promise<Window>` that resolves to a standard `Window` object. The call **must be initiated by a user gesture**; it rejects otherwise.

Key differences from the legacy API:

| Feature | `video.requestPictureInPicture()` | `documentPictureInPicture.requestWindow()` |
|---|---|---|
| Content | Video stream only | Arbitrary HTML/CSS/JS |
| Return value | `PictureInPictureWindow` | Standard `Window` |
| Styling | Not possible | Full CSS control |
| Interactive controls | Native browser controls only | Full DOM interaction |
| User gesture required | Yes | Yes |
| One at a time per tab | Yes | Yes |

**Sources:**
- Chrome Developer Docs: https://developer.chrome.com/docs/web-platform/document-picture-in-picture
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture

---

## 2. Can Chrome Extension Content Scripts Be Injected into a Document PiP Window?

### The browsing context model

The Document PiP window is created as a **new top-level traversable** (spec language for a top-level browsing context). The WICG spec states:

> "The resulting window will be much like a blank same-origin window opened via the existing `window.open()` API."

The window has its own `document`, its own JavaScript realm, and its own frame tree. It is **not a frame inside the opener tab**—it is a separate top-level browsing context.

### What this means for content scripts

Chrome extension content scripts are injected based on two axes:

1. **URL match patterns** — the content script runs when a page whose URL matches a declared pattern is loaded.
2. **Frame scope** — `all_frames: true` extends injection to subframes, but still within a single tab.

A Document PiP window is **neither a subframe nor a regular tab**. It does not have a standard tab ID assigned. The Chrome extension `WindowType` enum (`normal`, `popup`, `panel`, `app`, `devtools`) does not include a PiP type.

**Conclusion: Declarative manifest-based content scripts do not automatically inject into Document PiP windows.** The window is a separate browsing context that the normal tab-frame injection machinery does not reach.

**Sources:**
- WICG spec: https://wicg.github.io/document-picture-in-picture/
- Chrome Extensions content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome `chrome.tabs` API: https://developer.chrome.com/docs/extensions/reference/api/tabs

---

## 3. `manifest.json` Fields, `all_frames`, and URL Pattern Tricks

### `all_frames`

Setting `"all_frames": true` in a content script declaration causes the script to inject into every frame within a matching tab. This only applies to frames (iframes) inside a tab, not to independent top-level windows like a Document PiP window.

### `match_about_blank`

The PiP window's document URL is `about:blank` (the WICG spec notes: "its document base URL will fall back to be that of the initiator that called `requestWindow()`"). This creates an apparent opportunity:

```json
{
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "match_about_blank": true,
    "js": ["content-script.js"]
  }]
}
```

`match_about_blank` injects into `about:blank` frames whose **parent or opener frame** matches the pattern. However, this applies to frames inside a tab—it is documented as targeting frames within the tab's frame hierarchy. A Document PiP window is not a child frame of the tab; it is an independent top-level traversable. The opener relationship exists (the spec preserves it), but current Chrome behavior does not route `match_about_blank` injection into the PiP window via this opener relationship.

### `match_origin_as_fallback`

This field allows injection into frames with `about:`, `data:`, `blob:`, or `filesystem:` URLs by checking the initiator origin rather than the frame URL. Like `match_about_blank`, it targets frames within the tab frame hierarchy, not separate windows.

```json
{
  "content_scripts": [{
    "matches": ["https://example.com/*"],
    "match_origin_as_fallback": true,
    "js": ["content-script.js"]
  }]
}
```

**Chrome documentation states** that `match_origin_as_fallback` requires the match pattern path component to be `/*`.

### Summary

No combination of manifest fields (`all_frames`, `match_about_blank`, `match_origin_as_fallback`) reliably injects a content script into a Document PiP window through declarative means. The PiP window is architecturally outside the scope of tab-frame injection.

**Sources:**
- Chrome content scripts reference: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome match patterns: https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns

---

## 4. Does the Document PiP Window Share Origin with the Opener Page?

### Yes — same origin by design

The WICG spec is explicit:

> "This new window will be much like a blank same-origin window opened via the existing `window.open()` API."

The PiP document's URL is `about:blank`, but the spec overrides the base URL:

> "The document base URL will fall back to be that of the initiator that called `requestWindow()`."

This means:
- The PiP window and the opener share the same origin.
- The opener can directly access `pipWindow.document` and manipulate its DOM.
- Resources loaded inside the PiP window (images, scripts, stylesheets) resolve relative to the opener's origin.
- Cross-origin iframes can be placed **inside** the PiP window, though the PiP window itself must be same-origin with its creator.

### Effect on content script injection

Shared origin does **not** automatically cause content script injection. Content scripts inject based on URL pattern matching and the tab/frame model, not on origin. Since the PiP window is `about:blank` and is not a frame within a tab, origin sharing alone does not trigger declarative content script injection.

However, origin sharing is relevant for the `chrome.scripting` approach described in section 5: once you have a reference to the PiP window's frame ID (if one can be obtained), the shared origin means the extension's host permissions for the opener URL would cover the PiP document.

**Sources:**
- WICG spec: https://wicg.github.io/document-picture-in-picture/
- Chrome Developer Docs: https://developer.chrome.com/docs/web-platform/document-picture-in-picture

---

## 5. Is There a `chrome.scripting` API Approach to Inject into the Document PiP Window?

### The `chrome.scripting.executeScript` model

`chrome.scripting.executeScript` targets injection via:
- `tabId` (required) — the tab containing the target
- `frameIds` (optional) — specific frame IDs within that tab
- `allFrames` (optional) — all frames in the tab
- `documentIds` (optional, Chrome 106+) — specific document IDs

The Document PiP window is **not a frame within a tab**. It does not appear in the tab's frame tree and does not have a `frameId` obtainable via `chrome.webNavigation`. It is uncertain whether it receives a `tabId` at all—the Chrome `tabs` API `WindowType` enum does not include a PiP window type.

### Practical approaches

Because the PiP window is same-origin with the opener, the page's own JavaScript (not an extension content script) can freely manipulate the PiP window:

```javascript
// From the opener page's own script (not a content script):
const pipWindow = documentPictureInPicture.window;
pipWindow.document.body.appendChild(someElement);
const script = pipWindow.document.createElement('script');
script.src = chrome.runtime.getURL('my-script.js');
pipWindow.document.head.appendChild(script);
```

An extension content script running in the **opener page** can use this technique if the extension's content script is already injected into the opener tab. The content script can:

1. Access `window.documentPictureInPicture.window` to get the PiP window object.
2. Use DOM APIs on `pipWindow.document` to inject elements.
3. Use `pipWindow.eval()` or create `<script>` elements pointing to `chrome.runtime.getURL(...)` resources to run extension code inside the PiP context.

This is **not a native `chrome.scripting` injection** but achieves functional equivalence via the shared same-origin relationship, using the opener content script as a bridge.

### Direct `chrome.scripting` injection status

As of the research date (2026-07-08), there is no documented `chrome.scripting` API parameter that specifically targets a Document PiP window by its window handle or a PiP-specific ID. The API's `InjectionTarget` interface (`tabId`, `frameIds`, `allFrames`, `documentIds`) does not include a mechanism to address PiP windows as distinct targets.

**Sources:**
- `chrome.scripting` API reference: https://developer.chrome.com/docs/extensions/reference/api/scripting
- `chrome.tabs` API reference: https://developer.chrome.com/docs/extensions/reference/api/tabs

---

## 6. Chrome Version Introduction and Brave Support Status

### Chrome

The Document Picture-in-Picture API (`window.documentPictureInPicture`) shipped in **Chrome 116** (desktop), which was released in August 2023.

- Chrome 116+: Full support (desktop)
- Edge 116+: Full support (Chromium-based)
- Opera 102+: Full support (Chromium-based)
- Firefox 151+: Supported
- Safari: Not supported (as of research date)
- Mobile browsers: Limited/no support

### Brave

Brave is a Chromium-based browser that tracks Chromium releases closely. As of the research date:

- Brave Desktop v1.92.134 ships Chromium 150.0.7871.63.
- Brave is on Chromium 150, which is well beyond Chrome 116.
- Closed GitHub issues in the Brave repository confirm Document PiP functionality works (e.g., issue #35945 addressing PiP window sizing, closed March 2024).

**Brave supports the Document Picture-in-Picture API.** Because Brave ships Chromium 116+ (currently Chromium 150), the API is available. Extension handling in Brave follows the Chrome extension model, so the same content script injection limitations apply.

**Sources:**
- Can I Use: https://caniuse.com/mdn-api_documentpictureinpicture
- Brave release notes: https://brave.com/latest/
- Brave GitHub issues: https://github.com/brave/brave-browser/issues

---

## Summary Table

| Question | Answer |
|---|---|
| What is Document PiP API? | Opens a full HTML browsing context in an always-on-top floating window; arbitrary HTML/CSS/JS, not just video |
| Difference from `video.requestPictureInPicture()`? | Full DOM control vs. video-only native overlay |
| PiP window browsing context type | Separate top-level traversable (not a tab frame) |
| Can manifest content scripts inject into PiP? | No — PiP is not a tab frame; declarative injection does not reach it |
| Does `all_frames: true` help? | No — only applies to frames within a tab |
| Does `match_about_blank` help? | Unlikely in practice; targets child frames, not separate top-level windows |
| Does PiP share origin with opener? | Yes — explicitly "same-origin window" per spec |
| Does shared origin enable content script injection? | Not directly; but opener content script can bridge into PiP via DOM APIs |
| `chrome.scripting` direct injection? | No documented mechanism to target PiP window as a scripting target |
| Practical extension injection approach | Opener content script uses `documentPictureInPicture.window.document` to inject `<script src="chrome-extension://...">` |
| Chrome version introduced | Chrome 116 (August 2023) |
| Brave support | Yes — Brave Desktop tracks Chromium; confirmed working on Chromium 150 |

---

## Key Spec References

- WICG spec (living): https://wicg.github.io/document-picture-in-picture/
- Chrome developer docs: https://developer.chrome.com/docs/web-platform/document-picture-in-picture
- MDN API reference: https://developer.mozilla.org/en-US/docs/Web/API/DocumentPictureInPicture
- Chrome extensions content scripts: https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- `chrome.scripting` API: https://developer.chrome.com/docs/extensions/reference/api/scripting
- Can I Use compatibility: https://caniuse.com/mdn-api_documentpictureinpicture
- Brave release notes: https://brave.com/latest/
