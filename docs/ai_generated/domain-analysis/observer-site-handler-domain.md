# Domain Analysis: Observer Pipeline & Site Handler

## Scope

This analysis covers:
- `src/observers/mutation-observer.js` (`VideoMutationObserver`)
- `src/observers/media-observer.js` (`MediaElementObserver`)
- `src/observers/gif-observer.js` (`GifObserver`)
- `src/site-handlers/base-handler.js` (`BaseSiteHandler`)
- `src/site-handlers/index.js` (`SiteHandlerManager`)
- `src/site-handlers/youtube-handler.js` (`YouTubeHandler`)
- `src/site-handlers/netflix-handler.js` (`NetflixHandler`)

---

## 1. Challenges to Existing Glossary Terms

### "Media Element"

The glossary states: "An HTML `<video>` or `<audio>` element that the extension has detected, **validated against size thresholds**, and attached a controller to."

The code does not agree with the size-threshold clause. In `media-observer.js`, `isValidMediaElement()` checks:
1. Tag is VIDEO or AUDIO
2. Element `isConnected` (in the DOM)
3. `audioBoolean` is enabled if tag is AUDIO
4. Site handler's `shouldIgnoreVideo()` returns false

There is no size check in `isValidMediaElement()`. The comment inside `shouldStartHidden()` explicitly says: "All visible media elements get visible controllers regardless of size." Size filtering applies to GIF elements (via `GIF_MIN_SIZE_PX`), not to media elements.

**Finding:** The glossary definition is inaccurate. The phrase "validated against size thresholds" should be removed. Size thresholds are a GIF-only concern.

### "GIF Element"

The glossary states: "An animated `<img>` whose `src` ends in `.gif` or is a `data:image/gif` URI."

`gif-observer.js` implements `isGifSrc()` as:
- `data:image/gif` prefix match, OR
- regex `/\.gif([/?#]|$)/i` against the src (matches `.gif` followed by `/`, `?`, `#`, or end-of-string)

It also checks `element.currentSrc` in addition to `element.src`, which the glossary does not mention.

The file also notes known limitations: blob URL GIFs are not detected. This is a deliberate scoping decision.

**Finding:** The glossary definition is mostly correct but incomplete. It does not mention the `currentSrc` fallback or the query-string/hash-tolerant regex. The definition is adequate for most purposes but could mislead someone implementing a new detection path. A future edit should mention `currentSrc`.

The size threshold (`GIF_MIN_SIZE_PX`) is applied in both `detectGifsInDOM()` (gif-observer.js) and `scanForGifs()` (media-observer.js), but only when `naturalWidth > 0` — images that have not yet decoded are allowed through so the controller can attach before load completes. The glossary does not mention this deferred-filter behavior.

### "Site Handler"

The glossary states: "A per-site **subclass** of `BaseHandler`."

The code names the base class `BaseSiteHandler` (not `BaseHandler`). More substantively: the glossary says "subclass" — but for sites with no custom behavior, `SiteHandlerManager.detectHandler()` instantiates `BaseSiteHandler` directly (not a subclass). `BaseSiteHandler` is therefore both the base class and a valid runtime handler in its own right.

**Finding:** The "subclass" framing is correct for the five named sites (YouTube, Netflix, Amazon, Apple, Facebook) but misleading as a general rule. `BaseSiteHandler` is also a first-class handler.

### "Cancelled Element"

The glossary states: "A media element carrying the `vsc-cancelled` CSS class. A controller exists but all action dispatch is skipped for it."

Neither `youtube-handler.js` nor `netflix-handler.js` references `vsc-cancelled` directly. The handlers operate through `shouldIgnoreVideo()`, which causes the element to be excluded entirely during the scan phase — before a controller is created. The `vsc-cancelled` class appears to be applied by higher-level logic (likely in the content script / injector layer), not by site handlers.

**Finding:** Site handlers do not use `vsc-cancelled` directly. Their mechanism for exclusion is `shouldIgnoreVideo()`, which operates upstream of controller creation. The glossary definition of Cancelled Element is not contradicted, but the relationship to site handlers is more indirect than implied.

---

## 2. Missing Terms

### Media Element Observer (`MediaElementObserver`)

The class in `media-observer.js`. Responsible for scanning the DOM for existing media elements at initialization time (and on demand), applying `isValidMediaElement()` as the acceptance predicate, delegating to the site handler for site-specific detection and filtering, and providing `scanForGifs()`. It does not watch for DOM changes — that is `VideoMutationObserver`'s job.

Distinction from `VideoMutationObserver`: the Media Element Observer is a pull-based scanner; the Mutation Observer is an event-driven watcher. The former runs at startup (and on explicit calls); the latter runs continuously.

**Proposed term: Media Element Observer**

### VideoMutationObserver

The class in `mutation-observer.js`. Wraps the browser's `MutationObserver` API to watch the entire document (and any shadow roots it discovers) for `childList` and `attribute` changes. When a new VIDEO/AUDIO/IMG node appears or disappears, it fires the appropriate callback (`onVideoFound`, `onVideoRemoved`, `onGifFound`, `onGifRemoved`). It also maintains a map of per-shadow-root observers (`shadowObservers`) to handle media inside shadow DOMs.

Mutations are processed via `requestIdleCallback` with a 2-second timeout (500ms for shadow observers), meaning detection is deferred to idle time but bounded.

**Proposed term: Video Mutation Observer** (code name `VideoMutationObserver`)

### Audio Boolean (`audioBoolean`)

A settings boolean (`config.settings.audioBoolean`) that gates whether `<audio>` elements are included in scans and mutation handling. When `false`, AUDIO tags are excluded from every selector string (`'video'` vs `'video,audio'`), from `isValidMediaElement()`, and from `checkForVideoAndShadowRoot()`.

**Proposed term: Audio Boolean** — already present in the glossary indirectly as a setting, but not defined as a standalone term. It warrants a term because it gates an entire category of element detection.

### Valid Media Element (`isValidMediaElement`)

The predicate in `MediaElementObserver` that determines whether a media element should receive a controller. Criteria: connected to DOM, correct tag, passes `audioBoolean` check, not excluded by site handler. There are no size or visibility criteria — those are deferred to the controller's own initialization (via `shouldStartHidden()`).

**Proposed term: Valid Media Element** — the code already uses this name; it should be in the glossary as the canonical acceptance test for media elements.

### Scan for GIFs (`scanForGifs`)

A method on `MediaElementObserver` that queries all `<img>` elements (including those in shadow DOMs), filters by `isGifElement()`, excludes elements already managed (`gifController`) or explicitly ignored (`vscGifIgnore`), and applies the `GIF_MIN_SIZE_PX` size threshold only when the image has decoded (`naturalWidth > 0`). Used at startup and after document replacement.

**Proposed term: GIF Scan** (method `scanForGifs`)

### Controller Parent (`findControllerParent`)

`MediaElementObserver.findControllerParent()` calls `siteHandler.getControllerPosition()` and returns `positioning.targetParent` (falling back to `media.parentElement`). This is the DOM node into which the controller's shadow-DOM host is inserted. The YouTube handler shifts this one level up from the video's direct parent; the Netflix handler also shifts up to bypass Netflix's overlay.

**Proposed term: Controller Parent** — the element selected as the insertion ancestor for the controller's shadow host.

### Shadow Root Scan

The pattern used in both `VideoMutationObserver` and `MediaElementObserver` of recursively entering `shadowRoot` properties to find media elements not reachable by a normal `querySelectorAll` on `document`. In `VideoMutationObserver` this triggers a new `MutationObserver` instance (`observeShadowRoot`) stored in `shadowObservers`. In `MediaElementObserver` it is implemented in `_findShadowMedia`.

**Proposed term: Shadow Root Scan** — the act of recursing into shadow roots to find media elements.

### Document Replacement (`onDocumentReplaced`)

Triggered when `document.documentElement` appears as an added node in a mutation — meaning the entire document was replaced (e.g., via `document.write`, as noted in a comment referencing `watch.sling.com`). The current implementation logs a warning; the comment notes that full reinitialization is needed. The handler method exists as a hook but is not fully wired up in the code as read.

**Proposed term: Document Replacement** — the event where a site replaces the entire `document.documentElement`, requiring the observer pipeline to reinitialize.

### Size Threshold (for GIFs)

`GIF_MIN_SIZE_PX` (20 px). The minimum natural width and height both an `<img>` must have (once decoded) to qualify for canvas replacement. Tracker pixels and other tiny images are excluded by this threshold. Already in the GLOSSARY.md constants table; does not require a new language term since it is already named as a constant.

### SiteHandlerManager

The class in `src/site-handlers/index.js`. Holds an ordered list of site-specific handler classes (`NetflixHandler`, `YouTubeHandler`, `FacebookHandler`, `AmazonHandler`, `AppleHandler`). On first call to `getCurrentHandler()`, iterates the list calling each class's static `matches()` method, instantiates the first match, or falls back to `BaseSiteHandler`. Exposes the active handler's interface as a proxy.

**Proposed term: Site Handler Manager** (class `SiteHandlerManager`)

### Handler Refresh (`SiteHandlerManager.refresh()`)

Destroys the current handler (calling `cleanup()`) and clears `currentHandler`, so that the next call to `getCurrentHandler()` re-runs `detectHandler()`. Called during SPA navigation to allow a fresh handler selection after the URL changes (e.g., navigating within YouTube).

**Proposed term: Handler Refresh** — the operation of discarding and re-selecting the active site handler, used on SPA navigation.

### Controller Positioning

The return value of `BaseSiteHandler.getControllerPosition()` and its overrides. An object with three fields:
- `insertionPoint` — the DOM node relative to which the shadow host is inserted
- `insertionMethod` — one of `'firstChild'`, `'beforeParent'`, `'afterParent'`
- `targetParent` — the node `findControllerParent()` returns as the logical parent

YouTube uses `'firstChild'` on `parent.parentElement`. Netflix uses `'beforeParent'` on `parent.parentElement` to escape Netflix's overlay structure.

**Proposed term: Controller Positioning** — the site-specific descriptor for where the controller's shadow host is inserted in the DOM.

### Custom Seek (Netflix)

`NetflixHandler.handleSeek()` does not manipulate `video.currentTime` directly. Instead it calls `window.postMessage({ action: 'videospeed-seek', seekMs: seekSeconds * 1000 }, 'https://www.netflix.com')`. This is necessary because Netflix's player intercepts direct `currentTime` mutations. The base handler uses `video.currentTime` directly; Netflix overrides this with a postMessage-based seek.

**Proposed term: Custom Seek** — a site-handler override of the default `currentTime` seek, using a site-native messaging mechanism instead.

### Base Handler

`BaseSiteHandler` — the default site handler used when no site-specific handler matches. Implements all interface methods with generic behavior: `getControllerPosition()` returns `insertionMethod: 'firstChild'` with the direct parent; `handleSeek()` uses `video.currentTime`; `shouldIgnoreVideo()` returns `false`; `detectSpecialVideos()` returns `[]`.

The glossary already has "Site Handler" but does not separately name the base/default case. Worth naming because `BaseSiteHandler` is both the superclass and a directly instantiated runtime handler for generic sites.

**Proposed term: Base Handler** — the `BaseSiteHandler` instance used on sites without a custom handler. Provides generic behavior for all handler interface methods.

---

## 3. Stress-Test Scenarios

### Scenario A: New video added dynamically on YouTube SPA navigation

1. User navigates within YouTube (no page reload). `SiteHandlerManager.refresh()` is called, resetting the active handler. `detectHandler()` re-runs and selects `YouTubeHandler` again (hostname unchanged).
2. YouTube's player adds a new `<video>` element to the DOM.
3. `VideoMutationObserver` receives a `childList` mutation. The added node is a VIDEO element. `checkForVideoAndShadowRoot()` matches the VIDEO tag and calls `onVideoFound(node, parent)`.
4. The content script's `onVideoFound` callback calls `MediaElementObserver.isValidMediaElement()` — the video is connected, passes `audioBoolean` check (it's VIDEO), and `YouTubeHandler.shouldIgnoreVideo()` returns false (not a thumbnail or ad).
5. Controller creation proceeds. `findControllerParent()` calls `YouTubeHandler.getControllerPosition()`, which shifts the insertion point one level up (to `parent.parentElement`).

Terms involved: Video Mutation Observer, Valid Media Element, Site Handler Manager, Handler Refresh, Controller Parent, Controller Positioning, YouTubeHandler (Site Handler).

### Scenario B: `<picture>` element with a GIF `<source>` is added dynamically

1. A `<picture>` node is added to the DOM. It contains an `<img>` child (the `<picture>` fallback/display element) and `<source>` children.
2. `VideoMutationObserver` receives a `childList` mutation for the `<picture>` node. The node is not VIDEO, AUDIO, or IMG, so `checkForVideoAndShadowRoot()` calls `processNodeChildren()` to recurse.
3. The `<img>` child is encountered. Its `src` (or `currentSrc`, which the browser resolves from the `<source>` elements) is checked: if it ends in `.gif` or starts with `data:image/gif`, `GifObserver.isGifElement()` returns true.
4. `onGifFound` is called with the `<img>` node.
5. `MediaElementObserver.scanForGifs()` would not have seen this element at startup (it wasn't yet in the DOM), so this mutation path is the only way it gets picked up.
6. The `<source>` elements themselves are never directly processed — detection is always on the `<img>` tag, using `currentSrc`.

Terms involved: Video Mutation Observer, GIF Element, GIF Scan, `isGifElement`, `currentSrc` fallback (gap in glossary).

Note: `<picture>` elements whose `<source>` resolves to a GIF are detected only if `currentSrc` is populated at the time of mutation processing. If the browser hasn't yet resolved `currentSrc`, the element passes through undetected until a subsequent `src` attribute mutation fires (which `processAttributeMutation` handles).

### Scenario C: YouTube handler active, user seeks 5 seconds forward

1. User triggers the `advance` action (key binding fires, action dispatched).
2. The action handler calls `SiteHandlerManager.handleSeek(video, 5)`.
3. `SiteHandlerManager` delegates to `YouTubeHandler.handleSeek()`. `YouTubeHandler` does not override `handleSeek()`, so `BaseSiteHandler.handleSeek()` runs.
4. `BaseSiteHandler.handleSeek()` computes `newTime = Math.max(0, Math.min(video.duration, video.currentTime + 5))` and sets `video.currentTime = newTime`.

Contrast with Netflix (Scenario C'): `NetflixHandler.handleSeek()` fires `window.postMessage({ action: 'videospeed-seek', seekMs: 5000 }, 'https://www.netflix.com')` instead of touching `currentTime`. This is the Custom Seek.

Terms involved: Action, Site Handler Manager, Base Handler (for YouTube), Custom Seek (for Netflix contrast).

---

## 4. ADR Candidates

### ADR Candidate 1: Netflix seek via postMessage instead of `video.currentTime`

**Qualifies?** Yes — all three criteria met.
- **Hard to reverse**: switching back to `currentTime` manipulation would break seeking on Netflix. Netflix's player intercepts direct time writes.
- **Surprising without context**: every other site uses `video.currentTime`. A future developer will look at `NetflixHandler.handleSeek()` and immediately wonder why `postMessage` is used.
- **Real trade-off**: the alternative (direct `currentTime`) is the default and works everywhere except Netflix. The choice is deliberate and site-specific.

**Recommendation: Write this ADR.** Suggested number: 0003.

### ADR Candidate 2: MutationObserver for detection vs polling

**Qualifies?** Marginal — the "surprising" criterion is weaker now that `MutationObserver` is the standard pattern. However, the use of `requestIdleCallback` for deferral is a deliberate latency vs correctness trade-off that could surprise someone. Not a strong ADR candidate on its own; could be a note in the VideoMutationObserver term.

**Recommendation: Skip.**

### ADR Candidate 3: Handler selection by static `matches()` hostname check vs URL pattern

**Qualifies?** Weak. Hostname matching is obvious for most sites. The interesting edge is that `BaseSiteHandler` is instantiated directly when no handler matches, rather than requiring a default handler class. This is a mild design choice, not a surprising trade-off.

**Recommendation: Skip.**

---

## 5. Proposed GLOSSARY.md Changes

The following are proposed additions and corrections. Do not apply directly to `GLOSSARY.md` without review — this is a working analysis document.

### Corrections to existing terms

**Media Element** — remove "validated against size thresholds" from the definition. Size thresholds apply to GIF Elements only.

**GIF Element** — extend to mention `currentSrc` as a secondary detection source and the deferred size filter (applied only when `naturalWidth > 0`).

**Site Handler** — clarify that `BaseSiteHandler` is both the superclass and a valid runtime handler for generic sites, not only a base class for subclasses.

### Proposed new terms

**Media Element Observer**:
The `MediaElementObserver` class. Scans the DOM for existing media elements on demand, applying the Valid Media Element predicate and delegating to the Site Handler for site-specific filtering. Distinct from the Video Mutation Observer, which watches for DOM changes reactively.
_Avoid_: media scanner, element finder

**Video Mutation Observer**:
The `VideoMutationObserver` class. Wraps the browser MutationObserver to watch the document (and all discovered shadow roots) for added or removed media elements and GIF elements, firing callbacks when they appear or disappear.
_Avoid_: DOM observer, mutation watcher

**Valid Media Element**:
A media element that passes `MediaElementObserver.isValidMediaElement()`: connected to the DOM, correct tag (VIDEO or AUDIO), enabled by Audio Boolean if AUDIO, and not excluded by the Site Handler. This is the acceptance predicate for controller attachment.
_Avoid_: qualifying element, eligible element

**Audio Boolean**:
The `config.settings.audioBoolean` flag. When `false`, all `<audio>` elements are excluded from scans, mutation handling, and controller attachment.
_Avoid_: audio setting, audio flag

**Controller Parent**:
The DOM element selected by `findControllerParent()` as the insertion ancestor for the controller's shadow host. Determined by the active Site Handler's Controller Positioning.
_Avoid_: parent node, container element

**Controller Positioning**:
The object returned by `getControllerPosition()`, specifying where a controller's shadow host is inserted: `insertionPoint` (the anchor node), `insertionMethod` (`'firstChild'`, `'beforeParent'`, or `'afterParent'`), and `targetParent` (the logical parent). Site handlers override this to escape site-specific overlay structures.
_Avoid_: positioning info, insertion config

**Shadow Root Scan**:
The recursive traversal of `shadowRoot` properties to find media elements not reachable by a normal `querySelectorAll` on `document`. Performed by both Media Element Observer (at scan time) and Video Mutation Observer (which also attaches a sub-observer to each newly discovered shadow root).
_Avoid_: shadow DOM scan, shadow traversal

**Document Replacement**:
The event where a site replaces `document.documentElement` (e.g., via `document.write`). Detected by `VideoMutationObserver` when `document.documentElement` appears as an added node. Requires full reinitialization of the observer pipeline.
_Avoid_: document reload, page reset

**GIF Scan**:
The operation performed by `MediaElementObserver.scanForGifs()`: queries all `<img>` elements (including those in shadow DOMs), applies `isGifElement()`, excludes already-managed elements, and applies the `GIF_MIN_SIZE_PX` size threshold when the image has decoded. Used at startup and after document replacement.
_Avoid_: gif detection, gif discovery

**Site Handler Manager**:
The `SiteHandlerManager` singleton. Maintains the ordered list of site-specific handler classes, selects the active handler by calling each class's static `matches()` method, and proxies all handler calls through the selected instance. Falls back to `BaseSiteHandler` when no specific handler matches.
_Avoid_: handler factory, handler registry

**Base Handler**:
The `BaseSiteHandler` instance used on sites with no custom handler. Provides generic implementations for all handler interface methods: `insertionMethod: 'firstChild'`, direct `video.currentTime` seeking, no video exclusions, no special container selectors.
_Avoid_: default handler, fallback handler

**Handler Refresh**:
The operation of discarding the active Site Handler and forcing re-detection on the next request. Performed by `SiteHandlerManager.refresh()`. Called on SPA navigation to allow the correct handler to be selected after a URL change.
_Avoid_: handler reset, handler reinit

**Custom Seek**:
A Site Handler override of seek behavior that uses a site-native mechanism instead of direct `video.currentTime` assignment. Currently only `NetflixHandler`, which fires `window.postMessage({ action: 'videospeed-seek', seekMs })` because Netflix's player intercepts direct time writes.
_Avoid_: postMessage seek, native seek override
