# Observer Pipeline + Injection Initialization Cluster Analysis

## Ask-Matt Routing Log

Goal: "deepen the observer pipeline and injection initialization chain."

**Route taken:**
1. `/improve-codebase-architecture` — Step 1 (Explore): apply the deletion test and depth analysis to the named cluster. Surface friction points, seam candidates, and deepening opportunities.
2. `/codebase-design` — vocabulary layer applied throughout: module, interface, depth, seam, adapter, leverage, locality.

No grilling loop was run (analysis only; no implementation). No ADRs are contradicted by any finding below; all are noted where relevant.

---

## Source Files Analyzed

| File | Role |
|---|---|
| `src/observers/mutation-observer.js` | VideoMutationObserver — reactive DOM watcher |
| `src/observers/media-observer.js` | MediaElementObserver — imperative DOM scanner |
| `src/observers/gif-observer.js` | GifObserver — GIF detection utilities |
| `src/content/inject.js` (lines 1–100, 100–440, 630–719) | VideoSpeedExtension — orchestrator and initialization chain |
| `src/content/injector.js` | ISOLATED-world bridge: settings delivery, message relay |

---

## Friction Points — Deletion Test Results

### 1. VideoMutationObserver (`mutation-observer.js`)

**Deletion test:** Delete `VideoMutationObserver`. Where does complexity reappear?

Every piece of logic currently inside the class would have to move somewhere:

- The `requestIdleCallback` wrapping with 2000 ms timeout would land in inject.js.
- The shadow-root sub-observer registry (`shadowObservers` Map) would land in inject.js.
- The `processAttributeMutation` GIF lazy-load path (src-change on `<img>`) would duplicate logic already in `gif-observer.js`.
- The Apple TV+ special case (`APPLE-TV-PLUS-PLAYER` aria-hidden handling) would land directly in the orchestrator.
- `recheckVideoElement` — which calls back into `MediaElementObserver.isValidMediaElement()` — would be inlined in mutation callbacks.
- `onDocumentReplaced` — currently a no-op stub that logs a warning — would have no home.

**Verdict:** Deletion concentrates complexity in the caller (inject.js). The module is earning its keep. However, its *interface* is too wide: the constructor takes six positional parameters (`config, onVideoFound, onVideoRemoved, mediaObserver, onGifFound, onGifRemoved`), which means callers must know about all element types and supply five callbacks. This is a shallow interface relative to what the module does.

**Depth verdict: medium-shallow.** Large implementation, but the interface leaks the distinction between video callbacks, GIF callbacks, and the mediaObserver dependency. A deeper interface would accept a single `onMediaFound(element, type)` and own the GIF/video branching internally.

---

### 2. MediaElementObserver (`media-observer.js`) — Coupling Analysis

**Deletion test:** Delete `MediaElementObserver`. Where does complexity reappear?

- `scanForMedia`, `scanForMediaLight`, `scanAll`, `scanIframes`, `scanSiteSpecificContainers` would all land in `VideoSpeedExtension.deferredMediaScan()`, which is already 60+ lines.
- `isValidMediaElement` is called from *two* sites: `VideoMutationObserver.recheckVideoElement()` and `VideoSpeedExtension.onVideoFound()`. Deleting `MediaElementObserver` would force this predicate into a shared utility or duplicate it.
- `shouldStartHidden` is called only from `VideoSpeedExtension.onVideoFound()`.
- `scanForGifs` duplicates logic already in `GifObserver.detectGifsInDOM()` (see #3 below).
- `findControllerParent` is a thin delegation to `siteHandler.getControllerPosition()` — it would vanish without loss.

**Coupling with VideoMutationObserver:** `VideoMutationObserver` holds a reference to `MediaElementObserver` solely for `recheckVideoElement` → `isValidMediaElement`. This is the only cross-observer call. It creates a one-way dependency: mutation-observer imports (by reference) media-observer. If `isValidMediaElement` were exposed at a higher level (on the orchestrator or via a passed-in predicate), this coupling disappears.

**Depth verdict: shallow.** `MediaElementObserver` has six public scan methods plus `isValidMediaElement`, `shouldStartHidden`, and `findControllerParent` — nine methods total. The interface is almost as complex as the implementation. Most scan variants differ only in whether they include shadow DOM, iframes, or site-specific containers. This is a textbook wide-interface shallow module.

---

### 3. GifObserver (`gif-observer.js`) — Wrong Module?

`gif-observer.js` exports three functions as `window.VSC.GifObserver`:

- `isGifSrc(src)` — pure string predicate
- `isGifElement(element)` — pure DOM predicate (delegates to `isGifSrc`)
- `detectGifsInDOM(doc)` — queries `<img>`, applies `isGifElement` + size filter

**Deletion test:** Delete `GifObserver`. Where does complexity reappear?

- `isGifSrc` is referenced only inside `isGifElement`. Zero external callers. If deleted, the two-line regex moves into `isGifElement`.
- `isGifElement` is called from `VideoMutationObserver.processAttributeMutation()`, `VideoMutationObserver.checkForVideoAndShadowRoot()`, and `MediaElementObserver.scanForGifs()`. All three guard with `window.VSC.GifObserver?.isGifElement(node)`.
- `detectGifsInDOM` is *never called by any production code*. `MediaElementObserver.scanForGifs()` re-implements an almost-identical query inline (it adds shadow DOM traversal and deduplication, but the core filter logic is copied). `detectGifsInDOM` appears to be dead code or an early version that was never updated to include shadow traversal.

**Finding — `detectGifsInDOM` is dead code.** `MediaElementObserver.scanForGifs()` is the live path; `detectGifsInDOM` exists in `GifObserver` but is never invoked. This is pure duplication with no live caller.

**Finding — `isGifSrc` and `isGifElement` are pure utility functions in the wrong module.** The file is named `gif-observer.js` and sits in `src/observers/`, but it performs no observation (no `MutationObserver`, no event listener, no subscription). It is a detection predicate library. Its placement implies it is a peer of `mutation-observer.js`, which misleads a reader about what "observing" means in this codebase.

**Depth verdict: shallow.** Three functions, one of which is dead, and the two live ones are simple predicates. This is not a module with depth — it is a utility bag. It could be absorbed into a `GifDetector` concept or merged into `MediaElementObserver` (which already re-implements `detectGifsInDOM` in `scanForGifs`).

---

### 4. inject.js Initialization Chain

The async initialization sequence in `VideoSpeedExtension.initialize()`:

```
injector.js:  injectUserSettings()
                  chrome.storage.sync.get(null)
                  → window.__VSC_injectedSettings = settings  (ADR-0005 race fix)
                  → dispatchEvent('VSC_USER_SETTINGS')
                                        ↓
inject.js:    StorageManager.waitForInjectedSettings()  (called from config.load())
              → reads window.__VSC_injectedSettings synchronously (Option A path)
              → OR awaits 'VSC_USER_SETTINGS' event (Option B path)
                                        ↓
              VideoSpeedExtension.initialize()
                  config.load()           ← awaits settings
                  setupObservers()        ← synchronous, creates objects, does NOT start observation
                  initializeWhenReady()   ← schedules initializeDocument() on DOMContentLoaded
                                        ↓
              initializeDocument(doc)
                  eventManager.setupEventListeners()
                  deferExpensiveOperations()  ← requestIdleCallback(timeout=2000)
                                        ↓
              deferExpensiveOperations callback:
                  mutationObserver.start(document)
                  deferredMediaScan(document)   ← requestIdleCallback(timeout=3000)
                                        ↓
              deferredMediaScan callback:
                  scanForMediaLight() → onVideoFound() per element
                  scanForGifs()       → onGifFound() per GIF (chunked via requestIdleCallback)
                  [if nothing found]: scheduleComprehensiveScan() ← setTimeout(1000)
```

**Is this chain clearly expressed or fragile?**

The chain has four async levels nested inside a single method (`initialize`), each using a different timing mechanism: `await`, `requestIdleCallback`, `requestIdleCallback`, `setTimeout`. This is not expressed as a state machine; the progression is implicit in the nesting. Key observations:

1. **`setupObservers()` is called before `initializeWhenReady()`** — the mutation observer *object* is created but `mutationObserver.start()` is not called until inside `deferExpensiveOperations`. This is correct, but the gap between construction and start is invisible at the call site. An agent reading `setupObservers()` on line 64 would not know that the observer does not actually begin watching until `deferExpensiveOperations` fires, potentially 2+ seconds later.

2. **`this.initialized = true` is set on line 72**, before `initializeWhenReady()` fires its callback. This means the `VSC_USER_SETTINGS` live relay guard (`if (!extension.initialized) return`) passes as soon as `config.load()` completes — before the mutation observer has started or any media has been scanned. This is intentional (the live relay should apply settings after startup), but it makes `initialized` mean "settings loaded and blacklist passed", not "observation active and media attached", which is the more intuitive meaning.

3. **After the `requestIdleCallback` removal from `injector.js`**, `initBridge()` is called directly (synchronously if `document.readyState !== 'loading'`, or on `DOMContentLoaded`). This guarantees `VSC_USER_SETTINGS` fires before the 5000 ms `StorageManager` deadline on every load. The fix is sound. However, `setupMessageBridge()` is called immediately after `injectUserSettings()` inside `initBridge()`, which means the `chrome.storage.onChanged` live relay listener is registered before `inject.js` has run its initialization. This is correct — storage changes can arrive at any time — but the ordering dependency is not documented at the call site.

4. **`onDocumentReplaced()` is a stub.** `VideoMutationObserver.onDocumentReplaced()` logs a warning and does nothing. The GLOSSARY.md entry for Document Replacement says it "requires full reinitialization of the observer pipeline." There is no reinitialization. This is an unfired gun: the detection exists, the concept is named in the glossary, but no recovery action is wired. Any test coverage of the document-replacement path would pass vacuously because the callback does nothing testable.

---

### 5. Observer Orchestration — Who Starts and Stops?

**Start:**
- `VideoMutationObserver.start(document)` is called from `deferExpensiveOperations()` inside inject.js. inject.js owns the start.
- There is no explicit "start" call for `MediaElementObserver` — it is stateless; scans are invoked directly.
- GIF observation (src-attribute mutation watching) is embedded *inside* `VideoMutationObserver.start()` — GIF attribute watching is not a separate start call.

**Stop:**
- `VideoMutationObserver.stop()` is called from `VideoSpeedExtension.cleanup()`, which is called on `beforeunload`.
- Shadow sub-observers are cleaned up inside `stop()`.
- There is no stop sequence for `MediaElementObserver` (it is stateless, nothing to stop).
- GIF attribute observation (from shadow observers) is stopped inside `stop()` via the `shadowObservers.forEach(obs => obs.disconnect())` loop.

**Document replacement:** If `onDocumentReplaced()` were wired, it would need to call `stop()` then restart the pipeline. Currently neither happens.

**Verdict:** Start/stop are asymmetric but functional. The fragility is that `start` is triggered indirectly through two layers of deferred callbacks from `initializeDocument`, which makes the sequence hard to trace. There is no single "observer pipeline start" call site.

---

## Seam Analysis — Media Detection Pipeline

### Current shape (shallow)

The current observer pipeline presents a multi-callback interface to its orchestrator:

```
VideoMutationObserver(config, onVideoFound, onVideoRemoved, mediaObserver, onGifFound, onGifRemoved)
```

The caller (inject.js `setupObservers()`) must:
- Know about video callbacks separately from GIF callbacks
- Supply a `mediaObserver` dependency (coupling `VideoMutationObserver` to `MediaElementObserver`)
- Implement `onVideoFound`, `onVideoRemoved`, `onGifFound`, `onGifRemoved` as four separate methods
- Separately drive `MediaElementObserver.scanForMediaLight()` and `scanForGifs()` at startup

The orchestrator holds the element-type branching at the boundary. This is a shallow interface: callers must understand the video/GIF distinction and the reactive/imperative distinction.

### Natural seam for media detection

A deeper seam would surface a single concept: **media element found / removed**, typed by element kind:

```
onMediaFound(element, kind)   // kind: 'video' | 'audio' | 'gif'
onMediaRemoved(element, kind)
```

Behind that seam, the module owns:
- All mutation observation (video childList + GIF src-attribute)
- All startup scanning (light scan, shadow scan, GIF scan)
- The `isValidMediaElement` predicate
- Shadow root registration and teardown
- The `requestIdleCallback` timing strategy

This is the natural deep module: **MediaPipeline**. It encapsulates both the reactive (mutation-observer) and imperative (scan) detection paths behind one interface, hiding the timing strategy, the element-type branching, and the scan scheduling from the orchestrator.

### Where a port goes

`MutationObserver` is a browser API. Per DEEPENING.md dependency categories:

- It has a test stand-in: JSDOM provides a `MutationObserver` implementation, so it is **local-substitutable**, not true-external.
- No port is needed at the `MediaPipeline` external interface. The JSDOM stand-in runs inside the test suite; tests verify behavior through the `onMediaFound` callback.
- The seam is internal to `MediaPipeline`. The existing `tests/helpers/` mocks should be sufficient.

Since there is currently only one adapter for `MutationObserver` (the browser's), adding a port now would be a hypothetical seam (one adapter = hypothetical). The seam discipline from DEEPENING.md says: don't introduce it unless two adapters are justified.

---

## Injection Initialization Chain Analysis

### Current shape

The initialization sequence is a **shallow sequence controller**: `VideoSpeedExtension.initialize()` coordinates six distinct concerns in one method body using four different async mechanisms. It is not a state machine; it does not have named states, transitions, or error recovery per state.

The sequence has these phases:

| Phase | Trigger | Concern |
|---|---|---|
| 0 | Module load in injector.js | Settings fetch from chrome.storage |
| 1 | `extension.initialize()` | Settings delivery, blacklist check |
| 2 | `initializeWhenReady` callback | Event listener setup |
| 3 | `requestIdleCallback(2000ms)` | Mutation observer start |
| 4 | `requestIdleCallback(3000ms)` | Light media scan |
| 5 | `setTimeout(1000ms)` (conditional) | Comprehensive scan fallback |

A state machine representation would make transitions explicit: UNINITIALIZED → SETTINGS_LOADED → DOCUMENT_READY → OBSERVERS_ACTIVE → MEDIA_SCANNED. The current code has no such named states; the `initialized` flag covers only the UNINITIALIZED → SETTINGS_LOADED transition.

### Deepening candidate: InitializationStateMachine

A deeper initialization module would:
- Own the state transitions explicitly (named states, guarded transitions)
- Make `onDocumentReplaced` a first-class transition (OBSERVERS_ACTIVE → DOCUMENT_READY) rather than a no-op stub
- Express `initialized` as a state (e.g., `phase >= OBSERVERS_ACTIVE`) rather than a boolean that conflates two different readiness levels
- Consolidate the four async mechanisms (await, requestIdleCallback×2, setTimeout) into a single declared timing policy per phase

The interface would be small: `start()`, `stop()`, `onDocumentReplaced()`. The implementation would be deep.

---

## Deepening Candidates

### Candidate 1: MediaPipeline (Strong)

**Files involved:** `src/observers/mutation-observer.js`, `src/observers/media-observer.js`, `src/observers/gif-observer.js`, plus the observer-driving code in `src/content/inject.js` (`setupObservers`, `deferExpensiveOperations`, `deferredMediaScan`, `scheduleComprehensiveScan`).

**Problem:** The orchestrator (`VideoSpeedExtension`) knows about video callbacks, GIF callbacks, the `mediaObserver` dependency, the scan scheduling strategy, and the timing of each scan phase. This is a wide interface — the orchestrator must coordinate four scan methods, two mutation callback pairs, and the startup timing. Callers must understand the video/GIF type distinction at the seam.

**Solution:** Merge `VideoMutationObserver`, `MediaElementObserver` (its scan methods), and the scan-scheduling logic from inject.js into a single deep module `MediaPipeline`. Expose one interface: `start(document, onMediaFound, onMediaRemoved)` where `onMediaFound(element, kind)` is the single callback. All scan strategies, timing, shadow traversal, GIF detection, and mutation observation are hidden behind this seam.

**Benefits:**
- **Locality:** the timing strategy (requestIdleCallback with 2000 ms/3000 ms timeouts, the 1-second comprehensive fallback) concentrates in one module instead of being split across inject.js and mutation-observer.js.
- **Leverage:** the orchestrator goes from coordinating six callback-wires and four scan methods to one `start()` call and one callback.
- **Testability:** tests assert "when this DOM subtree is added, `onMediaFound` is called with kind='video'" — no need to wire up six callbacks or understand the scan scheduling.

**Before/after (interface shape):**

```
// Before: orchestrator must know all element types and supply five wires
new VideoMutationObserver(
  config,
  (video, parent) => this.onVideoFound(video, parent),
  (video) => this.onVideoRemoved(video),
  this.mediaObserver,          // internal dependency exposed as param
  (img, parent) => this.onGifFound(img, parent),
  (img) => this.onGifRemoved(img)
)
// plus: this.mediaObserver.scanForMediaLight(doc)
// plus: this.mediaObserver.scanForGifs(doc)
// plus: this.mediaObserver.scanAll(doc)   (fallback)
// plus: requestIdleCallback scheduling in inject.js

// After: orchestrator supplies one callback
mediaPipeline.start(document, (element, kind) => this.onMediaFound(element, kind));
mediaPipeline.stop();
```

**Dependency category:** `MutationObserver` is local-substitutable (JSDOM). No port needed at the external seam. Tests run with the JSDOM MutationObserver stand-in.

**ADR check:** No conflict. ADR-0002 notes that GIF detection uses a separate `MutationObserver` watching src-attribute changes — this fact is absorbed into `MediaPipeline`'s implementation and is not part of its interface.

---

### Candidate 2: Remove `detectGifsInDOM` from GifObserver / absorb GifObserver (Worth exploring)

**Files involved:** `src/observers/gif-observer.js`, `src/observers/media-observer.js`.

**Problem:** `GifObserver.detectGifsInDOM()` is dead code — no production caller exists. `MediaElementObserver.scanForGifs()` re-implements the same logic with shadow traversal added. The two functions have drifted; `detectGifsInDOM` does not include shadow DOM scanning, making it incorrect for the current architecture. `isGifSrc` and `isGifElement` are pure predicates with no observation behavior, misplaced in a file named `gif-observer.js` in `src/observers/`.

**Solution:** Delete `detectGifsInDOM`. Move `isGifSrc` and `isGifElement` into the proposed `MediaPipeline` (Candidate 1), or if that refactor is not taken, into a `src/utils/gif-detection.js` utility. Rename the namespace from `GifObserver` to `GifDetector` (or absorb it entirely) to match the actual behavior (detection predicates, not observation).

**Benefits:**
- **Locality:** GIF detection predicate logic concentrates in one place rather than being split between `gif-observer.js` and `media-observer.js`.
- Removes dead code that misleads readers into thinking `detectGifsInDOM` is the GIF scan path.

**ADR check:** ADR-0002 references `GifObserver` by name as the detection mechanism. If the namespace is renamed, the ADR should be updated. This is not a re-litigation of the ADR's decision; it is a renaming of the implementation artifact.

---

### Candidate 3: InitializationStateMachine — deepen the initialization chain (Worth exploring)

**Files involved:** `src/content/inject.js` (initialization and lifecycle methods).

**Problem:** `VideoSpeedExtension.initialize()` is a shallow sequence controller. It coordinates six concerns across four async mechanisms in one method body. The `initialized` flag is a boolean that covers only the first phase transition. The `onDocumentReplaced` path is named in the GLOSSARY.md and detected in the code, but the recovery action is a stub.

**Solution:** Extract the initialization phase sequence into a named state machine: UNINITIALIZED → SETTINGS_LOADED → OBSERVERS_ACTIVE → MEDIA_SCANNED. Wire `onDocumentReplaced` as a real transition (MEDIA_SCANNED → OBSERVERS_ACTIVE, re-running the observer start and scan phases against the new document). Replace the boolean `initialized` with a `phase` property that guards the live settings relay correctly.

**Benefits:**
- **Locality:** document replacement recovery logic concentrates alongside the initial startup logic, rather than being an unfired stub in VideoMutationObserver.
- **Testability:** each state transition is individually testable: "given SETTINGS_LOADED state, when document is ready, observe that state becomes OBSERVERS_ACTIVE."
- **Depth:** callers of the extension see `initialize()` and `cleanup()` (same as now); the state machine is internal.

**Note:** this candidate interacts with Candidate 1. If `MediaPipeline` owns scan scheduling, the InitializationStateMachine shrinks to owning only the settings-load and document-ready phases; the observation/scan phases become a single `mediaPipeline.start()` transition.

**ADR check:** No conflict. ADR-0005 governs the race-condition fix in settings delivery (the `window.__VSC_injectedSettings` window property and delete-on-read). The state machine does not change this mechanism; it expresses the sequence around it more clearly.

---

### Candidate 4: Absorb `isValidMediaElement` into the MediaPipeline seam (Speculative)

**Files involved:** `src/observers/media-observer.js`, `src/observers/mutation-observer.js`, `src/content/inject.js`.

**Problem:** `isValidMediaElement` is called from two places: `VideoMutationObserver.recheckVideoElement()` (inside mutation-observer.js, through the `mediaObserver` reference) and `VideoSpeedExtension.onVideoFound()` (inside inject.js). This cross-boundary call is the sole reason `VideoMutationObserver` takes `mediaObserver` as a constructor parameter. If the predicate lived inside `MediaPipeline` (Candidate 1), the dependency is absorbed and the constructor parameter vanishes.

**Speculative** because it is strictly a consequence of Candidate 1, not a standalone deepening. It becomes automatic if Candidate 1 is taken.

---

## Top Recommendation

**Candidate 1 — MediaPipeline — is the highest-leverage deepening.**

The current architecture splits a single coherent concept ("detect media elements as they appear and disappear in the DOM") across three modules and ~120 lines of scheduling code in the orchestrator. The orchestrator holds all the wiring: it knows about video and GIF as separate element types, supplies five separate callbacks, drives three scan methods with separate timing, and schedules the startup sequence. This is maximum shallowness at the seam: callers must know everything the module knows.

A `MediaPipeline` module with interface `start(document, onMediaFound, onMediaRemoved)` hides all of this behind a seam that expresses the concept correctly: "tell me when media appears or disappears." Everything else — the timing strategy, the scan variants, the shadow traversal, the GIF src-attribute watching, the requestIdleCallback budgets — becomes locality inside the module.

This deepening also unblocks Candidate 2 (absorbing GifObserver predicates into the module) and Candidate 3 (shrinking the state machine to the phases MediaPipeline does not own), making it the natural first move.

The dependency on `MutationObserver` is local-substitutable (JSDOM), so no port is needed at the external seam. Tests at the `MediaPipeline` interface replace the current unit tests on the three shallow observer modules.

The only constraint to check before starting: the GIF-control toggle path in inject.js (`ENABLE_GIF_CONTROL` / `DISABLE_GIF_CONTROL` message handlers) calls `extension.mediaObserver.scanForGifs()` directly. This call site would need to route through `mediaPipeline` instead — likely as `mediaPipeline.rescanGifs()` or by re-issuing `onMediaFound` for newly eligible GIFs. This is a known interface design question to resolve during the grilling loop.
