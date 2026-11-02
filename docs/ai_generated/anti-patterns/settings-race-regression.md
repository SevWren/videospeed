# Anti-pattern: Deferring the settings bridge via requestIdleCallback

## Anti-pattern name

**Idle-callback-gated settings injection** — wrapping `initBridge()` / `injectUserSettings()` in `requestIdleCallback` before calling it from the `injector.js` bootstrap.

## The code pattern that causes it

```js
// WRONG — injector.js bootstrap before fix
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.requestIdleCallback) {
      requestIdleCallback(initBridge, { timeout: 3000 });
    } else {
      setTimeout(initBridge, 100);
    }
  });
} else if (document.readyState === 'interactive') {
  if (window.requestIdleCallback) {
    requestIdleCallback(initBridge, { timeout: 2000 });
  } else {
    setTimeout(initBridge, 50);
  }
} else {
  if (window.requestIdleCallback) {
    requestIdleCallback(initBridge, { timeout: 1000 });
  } else {
    setTimeout(initBridge, 10);
  }
}
```

## Why it is wrong

`StorageManager.waitForInjectedSettings()` (called by `VideoSpeedConfig.load()` inside
`VideoSpeedExtension.initialize()`) starts a 5000 ms deadline timer the instant `inject.js`
executes. The MAIN-world modules and `inject.js` are injected at `document_end` by the
browser natively, so `waitForInjectedSettings()` starts immediately.

`injectUserSettings()` is what writes `window.__VSC_injectedSettings` and fires
`VSC_USER_SETTINGS`. If it arrives after the 5000 ms deadline, the user's settings are
silently discarded and `DEFAULT_SETTINGS` are used instead. The observable symptom is:

```
WARNING:waitForInjectedSettings: timed out after 5000ms, resolving with defaults
```

The `requestIdleCallback` `timeout` option guarantees the callback will run **at most**
`timeout` ms after scheduling — but **only if the main thread is free** to process it.
Under heavy page load (e.g. YouTube, which can run `setTimeout` handlers for 1800–4300 ms
back-to-back, as observed in `www.youtube.com-1793580955578.log` lines 23437–23521), the
idle callback may be queued at the `timeout` point but the callback will not execute until
the blocking handler finishes. The total delay is:

```
idle_callback_timeout_ms + blocking_handler_duration_ms > 5000ms
```

For example: `requestIdleCallback(initBridge, { timeout: 1000 })` queued, a 4272 ms
handler fires → `injectUserSettings()` runs at ≈5272 ms → deadline already fired at 5000 ms.

This regression was confirmed clean in `www.youtube.com-1793564406964.log` (zero VSC
warnings) and broken in `www.youtube.com-1793580955578.log` (one WARNING at line 23551).

The regression was introduced when `requestIdleCallback` deferral was added to the
bootstrap in an attempt to avoid blocking page load startup. The intent was correct;
the implementation was wrong because it opened a timing window that could exceed 5000 ms
on heavy pages.

## The correct pattern

```js
// CORRECT — injector.js bootstrap after fix
// Call initBridge() directly so injectUserSettings() fires within milliseconds
// of document_end, well inside the 5000ms waitForInjectedSettings() window.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBridge);
} else {
  // document is 'interactive' or 'complete' — call immediately
  initBridge();
}
```

`initBridge()` calls `injectUserSettings()` first, which does one `chrome.storage.sync.get`
round-trip (~1–50 ms in practice). That is the only latency. The MAIN-world modules are
already injected by Chrome natively at the same `document_end` checkpoint, so there is no
ordering hazard; `window.VSC` is available before `injector.js` runs.

## Invariant lock-down

`tests/unit/core/storage-manager-idle-timeout.test.js` Test 13 reads `injector.js` source
and asserts that the bootstrap section does not contain a `requestIdleCallback` call.
Any future "optimisation" that reintroduces `requestIdleCallback` into the bootstrap will
immediately fail that test.

## Related

- ADR-0005: `window.__VSC_injectedSettings` race fix (Option A)
- `src/content/injector.js` — bootstrap section comment added in this fix
- `src/core/storage-manager.js` — `waitForInjectedSettings()` timeout
