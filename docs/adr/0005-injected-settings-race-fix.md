# Write window.__VSC_injectedSettings before dispatching VSC_USER_SETTINGS (race-condition fix)

`injector.js::injectUserSettings()` writes `window.__VSC_injectedSettings = userSettings` immediately before dispatching the `VSC_USER_SETTINGS` CustomEvent. `StorageManager.waitForInjectedSettings()` reads and deletes the property on first access (the code comments label this "Option A").

## The race

Both the event dispatch and the listener registration happen at `document_end`. If `StorageManager.get()` is called before its `VSC_USER_SETTINGS` listener is registered, the event fires and the settings are lost. Without the window property, the module would have to re-fetch from `chrome.storage.sync`, adding an async round-trip on every page load.

## Considered options

- **Window property write-before-dispatch + delete-on-read ("Option A", chosen)**: Settings are recoverable synchronously from the window property if the event was already fired. The `delete` on read prevents stale state if the module is reloaded.
- **Polling ("Option B")**: `waitForInjectedSettings()` polls every 10 ms until `VSC_USER_SETTINGS` fires. Adds latency on every cold-start even when there is no race. Rejected.
- **Re-fetch from chrome.storage.sync**: Correct but introduces an async round-trip on every page load and requires MAIN World code to have a storage access path (which it does not — storage access goes through the Content Script Bridge).

## Consequences

Removing `window.__VSC_injectedSettings` or the `delete` call would silently reintroduce the race on pages where `StorageManager.get()` is called before the event listener is set up. The pattern is non-obvious; this ADR exists to prevent future "cleanup" from breaking it.
