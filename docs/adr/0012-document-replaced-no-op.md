# onDocumentReplaced is a named no-op — document replacement recovery is intentionally deferred

`VideoMutationObserver.onDocumentReplaced()` is called when `document.documentElement` appears as an added node in a mutation record, which is the signal that a site has replaced the entire document (e.g., via `document.write`). The method body does nothing beyond logging a warning:

```js
onDocumentReplaced() {
  window.VSC.logger.warn('Document replacement detected - full reinitialization needed');
}
```

No controllers are stopped, no observers are restarted, and no re-scan is scheduled.

## Why this looks like a bug

A named handler that detects a specific event and then does nothing is an unfired gun. A reader seeing the detection code in `processChildListMutation` — the `if (node === document.documentElement)` branch — naturally expects `onDocumentReplaced()` to contain the recovery logic that comment implies. The absence of that logic is not visible from the call site.

## What full recovery would require

A correct implementation of `onDocumentReplaced()` would need to:

1. Stop all active `VideoController` instances (call `remove()` on each tracked media element's `.vsc`).
2. Remove all active `GifController` instances (call `gc.remove()` on each tracked GIF element's `.gifController`).
3. Disconnect all shadow root sub-observers in `VideoMutationObserver.shadowObservers`.
4. Restart the main mutation observer against the new `document`.
5. Re-run the full initialization sequence — `siteHandlerManager.initialize(document)`, `eventManager.setupEventListeners(document)`, and a full media scan — against the new document.

Steps 1–3 are safe mechanical cleanup. Steps 4–5 are the risk surface: `VideoSpeedExtension.initialize()` is not idempotent. It sets `this.initialized = true`, calls `this.initializeWhenReady`, and schedules observers via `requestIdleCallback`. Calling it a second time in the same extension instance (without a full reset of the instance's state) risks double-registration of `VSC_USER_SETTINGS` listeners, duplicate controllers on re-detected media elements, and orphaned event listeners from the first initialization that now point into the replaced document.

## Why it is currently a no-op

The partial-re-initialization risk outweighs the recovery benefit for the following reasons:

- **Document replacement is rare.** The only known real-world case is `watch.sling.com` (noted in the detection comment). Most users will never encounter it.
- **The failure mode is recoverable by the user.** A replaced document means the page itself has reloaded its content; a manual page refresh restores VSC in a clean state.
- **Partial re-initialization is worse than no re-initialization.** An incomplete recovery that leaves orphaned listeners or duplicate controllers is harder to diagnose than a clean absence of controllers.

## When to revisit

This decision should be revisited if:

1. Document replacement becomes common on a high-traffic site (a new Sling-style SPA framework), **and**
2. `VideoSpeedExtension.initialize()` is refactored to be fully idempotent (accepting re-entry after `cleanup()` is called first), **or**
3. A dedicated `reinitialize(document)` path is extracted that performs only steps 4–5 above against the new document without touching the existing extension instance state.

Until at least condition 2 or 3 is met, adding behavior to `onDocumentReplaced()` carries a meaningful risk of introducing harder bugs than the one it solves.
