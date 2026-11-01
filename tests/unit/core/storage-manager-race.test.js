/**
 * TDD failing tests — Finding 4: VSC_USER_SETTINGS dispatch / StorageManager listener race
 *
 * T3-A7 | Branch: fix/path-b-world-main | Date: 2026-11-01
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
 * Test 1 — RED (dispatch before listener = settings permanently lost):
 *   Dispatches VSC_USER_SETTINGS BEFORE _setupSettingsListener() runs, then calls
 *   waitForInjectedSettings().  Asserts that the custom value IS returned.
 *   Currently fails because the event is lost; _injectedSettings stays null.
 *
 * Test 2 — GREEN (dispatch after listener = settings received):
 *   Registers the listener first, THEN dispatches VSC_USER_SETTINGS, then calls
 *   waitForInjectedSettings().  Asserts custom value is received.
 *   Documents the happy path; must stay green.
 *
 * Timeout strategy: rather than waiting the real 5000 ms for Test 1, we (a) set
 * _injectedSettings directly to observe the missed-event state and (b) call
 * waitForInjectedSettings() with a fake deadline by temporarily shortening the
 * global setTimeout to expire immediately.  This keeps the suite fast while still
 * exercising the real polling path.
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
  SM._injectedSettings = null;
  SM._listenerSetup = false;

  // Remove any lingering VSC_USER_SETTINGS listeners left by previous test
  // by replacing the window with a fresh event-listener state.  JSDOM does not
  // provide a public API to enumerate listeners, so we recreate the flag and
  // rely on the _listenerSetup guard in _setupSettingsListener() to re-register
  // a fresh listener when the next test calls it.
}

/**
 * Dispatch VSC_USER_SETTINGS with the given detail object — mirrors exactly
 * what injector.js::injectUserSettings() does (injector.js lines 289-293).
 */
function dispatchUserSettingsEvent(detail) {
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
// Test 1 — RED
// Dispatch fires BEFORE _setupSettingsListener() — event is permanently lost.
//
// Expected (after fix): waitForInjectedSettings() returns CUSTOM_SETTINGS values.
// Actual (unfixed):     _injectedSettings remains null; waitForInjectedSettings()
//                       would time out and return defaults.
//
// We test two observable facts in this scenario:
//   (a) _injectedSettings is null after the missed event + listener registration
//       — proving the event was irrecoverably lost.
//   (b) waitForInjectedSettings() returns defaults, NOT the custom values
//       — the user-facing failure.  We assert the DESIRED outcome (custom values
//       ARE returned) so this test is RED until a fix is applied.
//
// To avoid a 5000 ms wait for fact (b), we shorten the polling deadline by
// temporarily replacing window.setTimeout so the timeout fires on the next tick.
// =============================================================================

runner.test(
  'Test 1 (RED) — VSC_USER_SETTINGS dispatched before listener: custom settings are lost',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // --- Step 1: StorageManager listener is NOT yet registered ---
    assert.equal(SM._listenerSetup, false, 'precondition: listener must not be set up yet');
    assert.equal(SM._injectedSettings, null, 'precondition: _injectedSettings must be null');

    // --- Step 2: injector.js fires the event (fire-and-forget, no ACK) ---
    dispatchUserSettingsEvent(CUSTOM_SETTINGS);

    // --- Step 3: Now the listener is registered (too late — event already gone) ---
    SM._setupSettingsListener();
    assert.equal(SM._listenerSetup, true, 'listener should be marked as set up');

    // --- Step 4a: Verify the race — _injectedSettings is still null ---
    // The event fired before the listener was registered; it was silently dropped.
    // This is the root cause: there is no way to recover a missed CustomEvent.
    assert.equal(
      SM._injectedSettings,
      null,
      'RACE CONFIRMED: _injectedSettings must still be null — the event was dispatched before the listener registered and is permanently lost'
    );

    // --- Step 4b: waitForInjectedSettings() must return the custom values ---
    // This assertion documents what SHOULD happen after the fix.
    // Currently RED: the method polls for up to 5000 ms then returns defaults.
    // To avoid blocking the test suite for 5 s, we shorten the timeout to 20 ms
    // by temporarily overriding window.setTimeout.

    const realSetTimeout = window.setTimeout.bind(window);
    const realClearTimeout = window.clearTimeout.bind(window);

    // Intercept the deadline setTimeout (the 5000 ms one) and reduce it to 20 ms.
    // The 10 ms poll setTimeouts are left unchanged so the poll loop still runs.
    let deadlineIntercepted = false;
    window.setTimeout = function shortDeadlineSetTimeout(fn, ms, ...args) {
      if (ms === 5000 && !deadlineIntercepted) {
        deadlineIntercepted = true;
        return realSetTimeout(fn, 20, ...args); // fire after 20 ms instead
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

    // DESIRED outcome (currently RED — will go GREEN after fix):
    // The fix must ensure waitForInjectedSettings() recovers the custom settings
    // even when the event fires before the listener is registered.
    assert.equal(
      result.rememberSpeed,
      CUSTOM_SETTINGS.rememberSpeed,
      'RED: rememberSpeed from custom settings must be returned (currently lost due to race)'
    );
    assert.equal(
      result.lastSpeed,
      CUSTOM_SETTINGS.lastSpeed,
      'RED: lastSpeed from custom settings must be returned (currently lost due to race)'
    );
    assert.equal(
      result.enabled,
      CUSTOM_SETTINGS.enabled,
      'RED: enabled from custom settings must be returned (currently lost due to race)'
    );
  }
);

// =============================================================================
// Test 2 — GREEN
// Listener registered BEFORE dispatch — happy path, settings received.
//
// _setupSettingsListener() runs first, then the event is dispatched.
// _injectedSettings is set synchronously inside the listener callback.
// waitForInjectedSettings() finds _injectedSettings non-null on its first check
// and resolves immediately with the merged custom values.
// =============================================================================

runner.test(
  'Test 2 (GREEN) — VSC_USER_SETTINGS dispatched after listener: custom settings received',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // --- Step 1: Register the listener FIRST ---
    SM._setupSettingsListener();
    assert.equal(SM._listenerSetup, true, 'precondition: listener must be registered');
    assert.equal(SM._injectedSettings, null, 'precondition: _injectedSettings must still be null before dispatch');

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
      'GREEN: rememberSpeed from custom settings must be returned'
    );
    assert.equal(
      result.lastSpeed,
      CUSTOM_SETTINGS.lastSpeed,
      'GREEN: lastSpeed from custom settings must be returned'
    );
    assert.equal(
      result.enabled,
      CUSTOM_SETTINGS.enabled,
      'GREEN: enabled from custom settings must be returned'
    );
    assert.equal(
      result.blacklist,
      CUSTOM_SETTINGS.blacklist,
      'GREEN: blacklist from custom settings must be returned'
    );
  }
);

export { runner as storageManagerRaceTestRunner };
