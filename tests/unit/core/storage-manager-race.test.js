/**
 * Race condition tests — Finding 4: VSC_USER_SETTINGS dispatch / StorageManager listener race
 *
 * T1-A5 | Branch: fix/path-b-world-main | Date: 2026-11-01
 *
 * Seam under test: StorageManager._setupSettingsListener() / waitForInjectedSettings()
 *
 * The race:
 *   injector.js fires VSC_USER_SETTINGS as a one-shot fire-and-forget CustomEvent.
 *   StorageManager._setupSettingsListener() registers the window listener lazily, only
 *   when waitForInjectedSettings() (or get()) is first called.  If the event is
 *   dispatched before the listener is registered, the event is permanently lost.
 *   waitForInjectedSettings() then polls _injectedSettings every 10 ms for 5 s and
 *   resolves with DEFAULT_SETTINGS, silently discarding the user's custom config.
 *
 * Test 1 — Scenario A (base race still exists):
 *   Dispatches ONLY the DOM event (no window.__VSC_injectedSettings set).
 *   Listener is NOT registered before dispatch.
 *   Asserts that custom settings ARE LOST and defaults are returned.
 *   This proves the underlying race condition is real and still present if only the
 *   event mechanism is used without the window-property fallback.
 *
 * Test 2 — Scenario B (window-property fallback fix works):
 *   Writes window.__VSC_injectedSettings directly (no event dispatched, no listener).
 *   Asserts that waitForInjectedSettings() recovers the custom settings via the
 *   window property. This proves the Option A fix works.
 *
 * Test 3 — GREEN (dispatch after listener = happy path):
 *   Registers the listener first, THEN dispatches VSC_USER_SETTINGS, then calls
 *   waitForInjectedSettings().  Asserts custom value is received.
 *   Documents the happy path; must stay green.
 *
 * Timeout strategy: rather than waiting the real 5000 ms for Test 1 (Scenario A),
 * we intercept the 5000 ms deadline setTimeout and reduce it to 20 ms so the suite
 * remains fast while still exercising the real polling path.
 */

import { loadMinimalModules } from '../../helpers/module-loader.js';
import { SimpleTestRunner, assert, wait } from '../../helpers/test-utils.js';

// Modules write to window.VSC — load once for the suite.
await loadMinimalModules();

const runner = new SimpleTestRunner();

// ── Custom settings fixture (distinct from DEFAULT_SETTINGS) ──────────────────
const CUSTOM_SETTINGS = {
  rememberSpeed: true,
  lastSpeed: 2.5,
  enabled: false,
  blacklist: 'example.com\nfoo.com',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reset all StorageManager static state between tests so each test starts
 * from a clean slate.  settings.test.js already relies on this pattern.
 */
function resetStorageManager() {
  const SM = window.VSC.StorageManager;

  // Remove the current listener (if any) so stale listeners from earlier test
  // files in the shared JSDOM environment cannot fire during this test.
  SM._teardownSettingsListener();

  SM._injectedSettings = null;

  // Clear the window property written by the fixed injector.js so each test
  // starts without a pre-existing injected-settings value.
  delete window.__VSC_injectedSettings;
}

/**
 * Dispatch ONLY the DOM event — does NOT set window.__VSC_injectedSettings.
 * Use this to simulate the unfixed injector.js (pure event, no window property
 * fallback), in order to demonstrate that the base race condition still exists.
 */
function dispatchEventOnly(detail) {
  window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', { detail }));
}

/**
 * Dispatch VSC_USER_SETTINGS with the given detail object — mirrors exactly
 * what injector.js::injectUserSettings() does after the Option A race fix:
 * sets window.__VSC_injectedSettings BEFORE dispatching the event so that
 * the settings are always recoverable even if the event is missed.
 */
function dispatchUserSettingsEvent(detail) {
  window.__VSC_injectedSettings = detail;
  window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', { detail }));
}

// ── beforeEach / afterEach ────────────────────────────────────────────────────

runner.beforeEach(() => {
  resetStorageManager();
});

runner.afterEach(() => {
  resetStorageManager();
});

// =============================================================================
// Test 1 — Scenario A: base race condition (pure event, no window property)
//
// The unfixed injector only dispatches a CustomEvent; it does NOT write
// window.__VSC_injectedSettings.  If the listener is not yet registered when
// the event fires, the event is lost forever.
//
// This test uses dispatchEventOnly() — which purposely does NOT set the window
// property — to prove the race still exists at the event layer.
//
// Observable facts:
//   (a) _injectedSettings is still null after the missed event.
//   (b) waitForInjectedSettings() times out and returns defaults.
//
// To avoid a 5000 ms wait, we intercept the 5000 ms deadline setTimeout and
// reduce it to 20 ms.
// =============================================================================

runner.test(
  'Test 1 — Scenario A: pure event dispatched before listener — settings are lost (base race)',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // --- Step 1: StorageManager listener is NOT yet registered ---
    assert.equal(SM._listenerSetup, false, 'precondition: listener must not be set up yet');
    assert.equal(SM._injectedSettings, null, 'precondition: _injectedSettings must be null');
    assert.equal(
      window.__VSC_injectedSettings,
      undefined,
      'precondition: window.__VSC_injectedSettings must not exist'
    );

    // --- Step 2: injector.js fires ONLY the event — no window property written ---
    // This simulates the unfixed injector (pure CustomEvent, no fallback).
    dispatchEventOnly(CUSTOM_SETTINGS);

    // --- Step 3: Listener is registered too late — event already gone ---
    SM._setupSettingsListener();
    assert.equal(SM._listenerSetup, true, 'listener should now be marked as set up');

    // --- Step 4a: Confirm the race — _injectedSettings is still null ---
    assert.equal(
      SM._injectedSettings,
      null,
      'RACE CONFIRMED: _injectedSettings must still be null — event was lost before listener registered'
    );
    assert.equal(
      window.__VSC_injectedSettings,
      undefined,
      'RACE CONFIRMED: window.__VSC_injectedSettings must still be absent'
    );

    // --- Step 4b: waitForInjectedSettings() must return defaults (settings lost) ---
    // Shorten the 5000 ms deadline to 20 ms to keep the suite fast.
    const realSetTimeout = window.setTimeout.bind(window);
    const realClearTimeout = window.clearTimeout.bind(window);

    let deadlineIntercepted = false;
    window.setTimeout = function shortDeadlineSetTimeout(fn, ms, ...args) {
      if (ms === 5000 && !deadlineIntercepted) {
        deadlineIntercepted = true;
        return realSetTimeout(fn, 20, ...args);
      }
      return realSetTimeout(fn, ms, ...args);
    };
    window.clearTimeout = realClearTimeout;

    let result;
    try {
      result = await SM.waitForInjectedSettings(defaults);
    } finally {
      window.setTimeout = realSetTimeout;
    }

    // The base race causes waitForInjectedSettings() to time out and return
    // defaults — the custom values are silently discarded.
    assert.equal(
      result.rememberSpeed,
      defaults.rememberSpeed,
      'Scenario A: rememberSpeed must be the DEFAULT value — custom settings were lost'
    );
    assert.equal(
      result.lastSpeed,
      defaults.lastSpeed,
      'Scenario A: lastSpeed must be the DEFAULT value — custom settings were lost'
    );
    assert.equal(
      result.enabled,
      defaults.enabled,
      'Scenario A: enabled must be the DEFAULT value — custom settings were lost'
    );
  }
);

// =============================================================================
// Test 2 — Scenario B: window-property fallback fix works
//
// The fixed injector writes window.__VSC_injectedSettings BEFORE (or instead of)
// dispatching the event.  No event is dispatched here and no listener is
// registered.  waitForInjectedSettings() must still recover the custom settings
// by reading the window property directly.
//
// This proves the Option A fix is sufficient: even a completely missed event is
// recoverable as long as the window property is present.
// =============================================================================

runner.test(
  'Test 2 — Scenario B: window property set without event — settings recovered by fix',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // --- Step 1: No listener, no event ---
    assert.equal(SM._listenerSetup, false, 'precondition: listener must not be set up');
    assert.equal(SM._injectedSettings, null, 'precondition: _injectedSettings must be null');

    // --- Step 2: Fixed injector writes window property (no event dispatched) ---
    window.__VSC_injectedSettings = CUSTOM_SETTINGS;

    // --- Step 3: waitForInjectedSettings() should find the window property ---
    const result = await SM.waitForInjectedSettings(defaults);

    assert.equal(
      result.rememberSpeed,
      CUSTOM_SETTINGS.rememberSpeed,
      'Scenario B: rememberSpeed from custom settings must be returned via window property'
    );
    assert.equal(
      result.lastSpeed,
      CUSTOM_SETTINGS.lastSpeed,
      'Scenario B: lastSpeed from custom settings must be returned via window property'
    );
    assert.equal(
      result.enabled,
      CUSTOM_SETTINGS.enabled,
      'Scenario B: enabled from custom settings must be returned via window property'
    );
    assert.equal(
      result.blacklist,
      CUSTOM_SETTINGS.blacklist,
      'Scenario B: blacklist from custom settings must be returned via window property'
    );
  }
);

// =============================================================================
// Test 3 — Happy path: listener registered before dispatch
//
// _setupSettingsListener() runs first, then the event is dispatched.
// _injectedSettings is set synchronously inside the listener callback.
// waitForInjectedSettings() finds _injectedSettings non-null on its first check
// and resolves immediately with the merged custom values.
// =============================================================================

runner.test(
  'Test 3 — VSC_USER_SETTINGS dispatched after listener: custom settings received (happy path)',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // --- Step 1: Register the listener FIRST ---
    SM._setupSettingsListener();
    assert.equal(SM._listenerSetup, true, 'precondition: listener must be registered');
    assert.equal(
      SM._injectedSettings,
      null,
      'precondition: _injectedSettings must still be null before dispatch'
    );

    // --- Step 2: injector.js fires the event — listener is already registered ---
    dispatchUserSettingsEvent(CUSTOM_SETTINGS);

    // --- Step 3: Listener callback ran synchronously; _injectedSettings is now set ---
    assert.equal(
      SM._injectedSettings,
      CUSTOM_SETTINGS,
      'happy path: _injectedSettings must be set synchronously by the listener'
    );

    // --- Step 4: waitForInjectedSettings() finds the settings immediately ---
    const result = await SM.waitForInjectedSettings(defaults);

    assert.equal(
      result.rememberSpeed,
      CUSTOM_SETTINGS.rememberSpeed,
      'happy path: rememberSpeed from custom settings must be returned'
    );
    assert.equal(
      result.lastSpeed,
      CUSTOM_SETTINGS.lastSpeed,
      'happy path: lastSpeed from custom settings must be returned'
    );
    assert.equal(
      result.enabled,
      CUSTOM_SETTINGS.enabled,
      'happy path: enabled from custom settings must be returned'
    );
    assert.equal(
      result.blacklist,
      CUSTOM_SETTINGS.blacklist,
      'happy path: blacklist from custom settings must be returned'
    );
  }
);

// =============================================================================
// Test 4 — Fix G: window.__VSC_injectedSettings deleted after consumption
//
// storage-manager.js must delete window.__VSC_injectedSettings after reading it
// so that SPA re-navigation (a second call to waitForInjectedSettings()) does
// not pick up stale settings from the previous page load.
//
// This test verifies the production-code delete at the early-check path.
// =============================================================================

runner.test(
  'Test 4 — Fix G: window.__VSC_injectedSettings is deleted after waitForInjectedSettings resolves',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // --- Step 1: Simulate fixed injector writing the window property ---
    window.__VSC_injectedSettings = CUSTOM_SETTINGS;

    // --- Step 2: First call resolves with custom settings ---
    const result = await SM.waitForInjectedSettings(defaults);

    assert.equal(
      result.rememberSpeed,
      CUSTOM_SETTINGS.rememberSpeed,
      'Fix G precondition: custom settings must be returned'
    );

    // --- Step 3: The window property must be deleted after consumption ---
    assert.equal(
      window.__VSC_injectedSettings,
      undefined,
      'Fix G: window.__VSC_injectedSettings must be deleted after consumption to prevent SPA stale-settings'
    );
  }
);

export { runner as storageManagerRaceTestRunner };
