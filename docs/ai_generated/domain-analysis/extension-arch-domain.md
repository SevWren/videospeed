# Extension Architecture Domain Analysis

## Terms to update in GLOSSARY.md

**Service Worker** (currently absent from glossary, but referenced in CLAUDE.md as a known concept):
The existing GLOSSARY.md has no entry for this even though CLAUDE.md names it. It is not a general programming concept in the context of this extension — it is the specific MV3 replacement for a background page, and it carries meaningful constraints (no persistent state, can be terminated between events). It deserves a glossary entry. Proposed:

> **Service Worker**: The background script (`src/background.js`) that runs in the extension's own process, separate from any tab. Responsible for tracking per-tab controller counts and updating the extension icon. Stateless across browser restarts; all tab-controller mappings are cleared on `onStartup` and `onInstalled`.
> _Avoid_: background script, background page (the MV2 term)

---

## New terms to add to GLOSSARY.md

**MAIN World**:
The JavaScript execution environment shared with the host page. Scripts declared with `"world": "MAIN"` in `manifest.json` have direct access to the page's `window` object, `window.VSC`, and the full DOM. All 26 VSC core/UI/handler modules plus `inject.js` run here. Chrome injects them natively — no DOM `<script>` tag is involved.
_Avoid_: page context, page world (informal synonym — see note below), injected context

Note: "Page World" appears informally in code comments (`// page world`) as a synonym for MAIN World. The canonical term should be **MAIN World**; "page world" is an informal gloss.

**ISOLATED World**:
The JavaScript execution environment reserved for Chrome content scripts. Scripts in this world share the DOM with the page but have a completely separate JavaScript scope — they cannot read or write `window.VSC` or any page-defined variables. Only `injector.js` runs here. Its sole purpose is to bridge `chrome.*` APIs (which are unavailable in the MAIN World) to the rest of the extension.
_Avoid_: content script context, isolated context

**Content Script Bridge**:
The bidirectional message channel implemented in `injector.js` (`setupMessageBridge()`) between the ISOLATED World and the MAIN World. Uses `window.dispatchEvent` / `window.addEventListener` with `CustomEvent` for ISOLATED→MAIN direction, and `chrome.runtime.sendMessage` / `chrome.runtime.onMessage` for MAIN→Service Worker direction. The bridge is the only mechanism by which MAIN World code can trigger `chrome.storage` writes or reach the Service Worker.
_Avoid_: message bridge, event bridge, relay

**VSC_USER_SETTINGS event**:
A `CustomEvent` dispatched on `window` carrying a settings patch object as `event.detail`. Fired in two scenarios: (1) by `injectUserSettings()` in `injector.js` at page load to deliver the initial settings snapshot from `chrome.storage.sync` into the MAIN World; (2) by the `chrome.storage.onChanged` listener in `setupMessageBridge()` whenever a user-controlled key changes in storage, enabling live settings relay to already-open tabs without a reload.
_Avoid_: settings event, settings relay event

**Injected Settings** (`window.__VSC_injectedSettings`):
A `window` property written by `injector.js` immediately before dispatching the initial `VSC_USER_SETTINGS` event. Acts as a fallback for `StorageManager.waitForInjectedSettings()` in the event that the MAIN World's event listener is not yet registered when the event fires (the startup race condition). Read and deleted by `StorageManager` on first access.
_Avoid_: settings cache, window settings property

**Extension Context Invalidated**:
The error state that occurs when the extension is reloaded or updated while a tab remains open. After reload, `chrome.runtime` APIs in the still-running ISOLATED World content script throw an error whose message contains the string `"Extension context invalidated"`. The `isExtensionContextInvalidated()` helper in `injector.js` detects this condition; all `catch` blocks in `setupMessageBridge()` silently swallow it to prevent console noise on the now-orphaned tab.
_Avoid_: stale context, dead context, invalidated extension

**Path B** (MAIN World via `content_scripts` declaration):
The current injection architecture. All VSC modules are listed directly in `manifest.json` under `content_scripts[1]` with `"world": "MAIN"`. Chrome injects them natively, bypassing the host page's Content Security Policy entirely. No `chrome.scripting.executeScript` call is made at runtime.
See: ADR candidate below.
_Avoid_: native injection, manifest injection

**Path A** (DOM injection via `chrome.scripting`):
The abandoned prior architecture in which `injector.js` dynamically called `chrome.scripting.executeScript` (or manually created `<script>` tags in the DOM) to load modules into the page. Superseded by Path B. The name survives in `injector.js` comments as historical context.
_Avoid_: dynamic injection, scripting injection

**document_end injection** (`run_at: document_end`):
The timing at which Chrome injects the MAIN World content scripts — after the DOM is parsed but before subresources finish loading. The alternative (`document_start`, before DOM parsing) was previously used but caused crashes. See ADR candidate below.
_Avoid_: deferred injection, late injection

**VSC_CONTROLLER_CREATED / VSC_CONTROLLER_REMOVED events**:
A pair of `CustomEvent`s dispatched on `window` by MAIN World code when a controller is attached to or detached from a media element. The Content Script Bridge forwards them as `chrome.runtime.sendMessage` calls to the Service Worker, which uses them to maintain a per-tab controller count and update the extension icon.
_Avoid_: controller events, lifecycle events (too generic)

**Controller Lifecycle Events**:
The collective name for the `VSC_CONTROLLER_CREATED` and `VSC_CONTROLLER_REMOVED` events. Useful as a group term when describing the icon-management flow end-to-end.
_Avoid_: controller messages, controller signals

**File GIF Fetch Proxy**:
A hidden `<iframe>` element injected into `file://` pages by `injector.js`. Because XHR from `null` origin (file pages) to `file://` URLs is blocked by Chrome's CORS policy, the iframe runs at `chrome-extension://` origin — which is allowed — and proxies GIF byte requests from `gif-controller.js` back to the page via `postMessage`. Protocol messages: `VSC_GIF_FETCH_REQUEST`, `VSC_GIF_BYTES_RESPONSE`, `VSC_GIF_FETCHER_READY`.
_Avoid_: gif iframe, fetch proxy

---

## Fuzzy / overloaded terms

**"Page World" vs "MAIN World"**:
`injector.js` comments use both "page world" and "MAIN world" for the same concept. The spec term is `"world": "MAIN"` (from `manifest.json`). Canonical term should be **MAIN World**; "page world" should be treated as informal and avoided in documentation.

**"Content script"**:
Used loosely in code comments and CLAUDE.md to mean either (a) `injector.js` specifically (the ISOLATED World script), or (b) any script declared under `content_scripts` in `manifest.json` (which includes the 26 MAIN World modules). This ambiguity is significant: `injector.js` has access to `chrome.*` APIs; the MAIN World scripts do not. When precision matters, prefer **ISOLATED World script** for `injector.js` and **MAIN World content script** for the others.

**"Injected"**:
Appears in three distinct senses: (1) Chrome natively injecting MAIN World scripts via the manifest declaration; (2) the old Path A approach of injecting `<script>` tags into the DOM; (3) `injectUserSettings()` injecting a settings payload from ISOLATED to MAIN World via a `CustomEvent`. These are three different mechanisms. The overloaded term should be disambiguated in comments and documentation as: **native injection** (manifest), **DOM injection** (Path A, deprecated), and **settings injection** (the event-based payload delivery).

**"Message"**:
Used for both `CustomEvent`s on `window` (ISOLATED↔MAIN boundary) and `chrome.runtime.sendMessage` calls (content script↔Service Worker boundary). These are entirely different channels. Prefer distinguishing as **window event** vs **runtime message**.

---

## ADR candidates

### Candidate 1: Path B — MAIN World via `content_scripts` declaration, not `chrome.scripting`

**Hard to reverse**: Yes. Switching to `chrome.scripting` (Path A) or a bundler would require restructuring every module's load order, removing `window.VSC` registration guards, and potentially changing how `injector.js` initializes. Non-trivial refactor.

**Surprising without context**: Yes. A reader opening `manifest.json` will see 26 files listed under `content_scripts` with `"world": "MAIN"` and wonder why not use `chrome.scripting.executeScript` (more idiomatic for dynamic injection) or a bundler (more idiomatic for complex module graphs). The answer — CSP bypass and direct DevTools debuggability without source maps — is not visible in the code.

**Real trade-off**: Yes. Three genuine alternatives were considered: chrome.scripting (Path A, abandoned), ES module bundler (deferred due to build chain complexity), and the chosen Path B. ADR-001 already documents the bundler deferral in passing, but the Path A vs Path B decision itself has no ADR.

**Recommendation**: Write ADR. This is the most significant architectural decision in the extension's injection model and the hardest for a new contributor to understand without it.

---

### Candidate 2: `document_end` instead of `document_start` for MAIN World injection

**Hard to reverse**: Moderate. Reverting to `document_start` previously caused crashes. The risk is real but the change is a one-liner in `manifest.json`.

**Surprising without context**: Yes. `document_start` is the natural choice for an extension that wants to intercept media elements as early as possible (before the page's own scripts run). A reader will ask why `document_end` is used instead.

**Real trade-off**: Yes. `document_start` caused crashes (the specific nature of the crash should be confirmed from git history). `document_end` was chosen to avoid them, accepting the risk that some very early media elements might be missed before the observer starts.

**Recommendation**: Write ADR if the specific crash reason is recoverable from git history. Even without it, the fact that `document_start` was tried and rejected is worth recording to prevent future regressions. A short ADR noting "we tried `document_start`, it caused crashes, `document_end` was stable" is sufficient.

---

### Candidate 3: `window.__VSC_injectedSettings` as a race condition fix

**Hard to reverse**: Low. The fix is a single window property write + read-and-delete pattern. Removing it would reintroduce the race, but the pattern itself is easy to change.

**Surprising without context**: Yes. Writing to `window.__VSC_injectedSettings` before dispatching the event, and then having the consumer read and delete it, is an unusual protocol. A reader will wonder why a plain event listener is insufficient.

**Real trade-off**: Yes. The comment in `storage-manager.js` labels this "race condition fix — Option A", implying Option B was considered. The race is: `injector.js` dispatches `VSC_USER_SETTINGS` at `document_end`; `storage-manager.js` registers its listener only when `StorageManager.get()` is first called, which may happen after the event fires. The window property ensures the settings are recoverable regardless of listener registration order.

**Recommendation**: Write ADR. The pattern is non-obvious and a future maintainer might "clean it up" without understanding the race. The ADR should name the race explicitly and explain why the window property was chosen over alternatives (e.g., re-fetching from storage, using a Promise that resolves on the event).

---

## Terms correct — no change needed

The following existing GLOSSARY.md terms are unaffected by the extension architecture domain and need no changes:

- **Action** — correctly defined; the architecture domain adds nothing.
- **Blacklist** — storage-level concept; correctly defined.
- **Canvas Replacement** — correctly defined; GIF architecture is covered by ADR-0002.
- **Cancelled Element** — correctly defined.
- **Controller** — correctly defined. The note that it "renders inside a Shadow DOM host" is accurate for video/audio controllers.
- **GIF Controller**, **GIF Element**, **GIF Frame Cache**, **GIF Frame Engine** — all correctly defined.
- **Key Binding** — correctly defined.
- **Marker** — correctly defined.
- **Media Element** — correctly defined, including the note excluding GIF elements.
- **Playback Rate** — correctly defined.
- **Preferred Speed** — correctly defined.
- **Site Handler** — correctly defined.
- **Speed Indicator** — correctly defined.

The constants table is correct and unaffected.

---

## Stress-test scenario analysis

**Scenario 1: User installs extension mid-tab (tab already open when extension is installed)**

Chrome fires `onInstalled` in the Service Worker. The Service Worker clears `tabControllers` and resets the icon. However, `chrome.runtime.onInstalled` does NOT automatically reinject content scripts into existing tabs in MV3. The tab's ISOLATED World (`injector.js`) and MAIN World scripts are not present. The user must reload the tab. No domain term describes this "stale tab after install" state — it is not **Extension Context Invalidated** (that applies to a *previously injected* context that is now invalid). There is no current term for this. It may not need one if it is considered out of scope for the extension's error handling.

**Scenario 2: Extension updated while user is on YouTube**

The ISOLATED World's `injector.js` continues running in the tab with a now-invalid extension context. Any call to `chrome.runtime.sendMessage`, `chrome.storage.sync.set`, or `chrome.storage.onChanged` will throw an error whose message contains `"Extension context invalidated"`. The `isExtensionContextInvalidated()` helper in `setupMessageBridge()` catches and silently drops these errors. The MAIN World scripts (`inject.js`, controllers) continue to function for already-attached controllers — they do not call `chrome.*` APIs directly. Settings changes will fail silently. New controllers will emit `VSC_CONTROLLER_CREATED` events that the ISOLATED World will silently drop. This is the **Extension Context Invalidated** state.

**Scenario 3: Settings change saved in popup — full path using domain terms**

1. User changes a setting in the popup UI and clicks Save.
2. Popup calls `chrome.storage.sync.set(...)` directly (popup runs in extension context).
3. `chrome.storage.onChanged` fires in every ISOLATED World instance (`injector.js`) across all open tabs.
4. The `chrome.storage.onChanged` listener in `setupMessageBridge()` filters changes to **user-controlled keys** and builds a patch object.
5. It dispatches a `VSC_USER_SETTINGS` event on `window` with the patch as `event.detail`.
6. In the MAIN World, the `VSC_USER_SETTINGS` listener in `inject.js` (lines 643–656) receives the event and calls `extension.config.applySettings(patch)`, applying the change live.
7. No page reload is needed. This is the **live settings relay** flow.

Note: The `window.__VSC_injectedSettings` (**Injected Settings**) property is NOT involved in this path — it is only used at initial page load for the startup race condition fix.

**Scenario 4: SPA navigation on YouTube**

YouTube's SPA router updates the URL and swaps video elements without a full page navigation. Chrome does NOT re-inject content scripts on SPA navigations. The existing `injector.js` (ISOLATED World) and MAIN World scripts remain active. The `VideoMutationObserver` watches `childList` mutations on the DOM and detects the new `<video>` element. A new **Controller** is created and a `VSC_CONTROLLER_CREATED` event is dispatched through the **Content Script Bridge** to the **Service Worker** to update the icon. The old controller is removed (if the old `<video>` is detached from the DOM) and a `VSC_CONTROLLER_REMOVED` event is dispatched. There is no special term for "controller created after SPA navigation" — it is just normal controller creation triggered by a mutation observer. The Service Worker clears its tab-controller map only on full `chrome.tabs.onUpdated` with `status: 'loading'`, which does fire on YouTube SPA navigations (YouTube uses the History API and Chrome detects these as tab URL updates).
