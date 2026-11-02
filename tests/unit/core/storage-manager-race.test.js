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
import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';

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
  // _teardownSettingsListener() also resets _injectedSettings to null.
  SM._teardownSettingsListener();

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
// Observable fact: waitForInjectedSettings() times out and returns defaults.
//
// Timeout strategy: we intercept the deadline setTimeout by capturing the first
// timer call with a delay longer than the 10 ms poll interval — this avoids
// coupling the mock to the specific 5000 ms literal in the production source.
// The poll timers use 10 ms; the deadline timer uses a much larger value.
// Any call with ms > 100 is therefore the deadline.
// =============================================================================

runner.test(
  'Test 1 — Scenario A: pure event dispatched before listener — settings are lost (base race)',
  async () => {
    const SM = window.VSC.StorageManager;
    const defaults = window.VSC.Constants.DEFAULT_SETTINGS;

    // Snapshot the expected default values as independent known-good literals
    // before touching any async machinery.  These come from the project's
    // constants module — the external source of truth — not from StorageManager.
    const expectedRememberSpeed = defaults.rememberSpeed;
    const expectedLastSpeed = defaults.lastSpeed;
    const expectedEnabled = defaults.enabled;

    // --- Step 1: injector.js fires ONLY the event — no window property written ---
    // Listener has not been registered yet; the event will be permanently missed.
    // This simulates the unfixed injector (pure CustomEvent, no fallback).
    dispatchEventOnly(CUSTOM_SETTINGS);

    // --- Step 2: Register the listener after dispatch — too late ---
    SM._setupSettingsListener();

    // --- Step 3: waitForInjectedSettings() must time out and return defaults ---
    // Intercept the deadline timer: replace the first setTimeout with ms > 100
    // (the poll uses 10 ms; the deadline uses a value far above that) so the
    // suite does not wait the full production timeout.  The mock does NOT name
    // the specific ms value from production code.
    const realSetTimeout = window.setTimeout.bind(window);
    const realClearTimeout = window.clearTimeout.bind(window);

    let deadlineIntercepted = false;
    window.setTimeout = function shortDeadlineSetTimeout(fn, ms, ...args) {
      if (ms > 100 && !deadlineIntercepted) {
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
    // Expected values are the independent literals captured above; they are NOT
    // re-read from defaults here to avoid asserting X equals X.
    assert.equal(
      result.rememberSpeed,
      expectedRememberSpeed,
      'Scenario A: rememberSpeed must be the DEFAULT value — custom settings were lost'
    );
    assert.equal(
      result.lastSpeed,
      expectedLastSpeed,
      'Scenario A: lastSpeed must be the DEFAULT value — custom settings were lost'
    );
    assert.equal(
      result.enabled,
      expectedEnabled,
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

    // --- Step 1: No listener, no event (resetStorageManager() in beforeEach ensures clean state) ---

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
    // Correct ordering is proven by the behavioral result: if the listener were not
    // registered before dispatch, the event would be missed and defaults returned.
    SM._setupSettingsListener();

    // --- Step 2: injector.js fires the event — listener is already registered ---
    dispatchUserSettingsEvent(CUSTOM_SETTINGS);

    // --- Step 3: waitForInjectedSettings() finds the settings immediately ---
    // (The listener callback ran synchronously on dispatch; no intermediate
    // private-state check needed — the behavioral result below proves it.)
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

// =============================================================================
// Test 5 — StorageManager.get() fallback: returns injected settings when chrome
// storage is unavailable (line 151 in storage-manager.js)
//
// When chrome.storage is not present and _injectedSettings has already been
// set, get() must merge injected settings with the defaults and resolve.
// =============================================================================

runner.test(
  'Test 5 — get() uses injected settings when chrome storage is unavailable',
  async () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();

    // Pre-set _injectedSettings (simulating a prior VSC_USER_SETTINGS event)
    SM._injectedSettings = { lastSpeed: 3.0, rememberSpeed: true };

    // Delete chrome so we fall into the non-chrome branch (lines 56-64)
    const savedChrome = globalThis.chrome;
    delete globalThis.chrome;

    let result;
    try {
      result = await SM.get({ lastSpeed: 1.0, rememberSpeed: false, enabled: true });
    } finally {
      globalThis.chrome = savedChrome;
      SM._injectedSettings = null;
    }

    assert.equal(result.lastSpeed, 3.0, 'get() must return injected lastSpeed 3.0');
    assert.equal(result.rememberSpeed, true, 'get() must return injected rememberSpeed true');
    // Default for enabled was not overridden by injected settings
    assert.equal(result.enabled, true, 'get() must preserve default for keys not in injected settings');
  }
);

// =============================================================================
// Test 6 — StorageManager.get() fallback: returns defaults when no chrome and
// no injected settings (confirming the else branch on line 62-63)
// =============================================================================

runner.test(
  'Test 6 — get() returns defaults when chrome is unavailable and no injected settings',
  async () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();

    const savedChrome = globalThis.chrome;
    delete globalThis.chrome;

    let result;
    try {
      result = await SM.get({ lastSpeed: 1.0, enabled: true });
    } finally {
      globalThis.chrome = savedChrome;
    }

    assert.equal(result.lastSpeed, 1.0, 'get() must return default lastSpeed 1.0');
    assert.equal(result.enabled, true, 'get() must return default enabled true');
  }
);

// =============================================================================
// Test 7 — StorageManager.remove() calls chrome.storage.sync.remove (lines 160-166)
//
// When chrome storage is available, remove() must resolve after the chrome API
// callback fires.
// =============================================================================

runner.test(
  'Test 7 — remove() resolves after chrome.storage.sync.remove callback fires',
  async () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();

    // Install a minimal chrome mock that has storage.sync.remove
    const originalChrome = globalThis.chrome;
    let removedKeys = null;
    globalThis.chrome = {
      storage: {
        sync: {
          remove: (keys, callback) => {
            removedKeys = keys;
            setTimeout(() => callback && callback(), 5);
          },
        },
      },
    };

    try {
      await SM.remove(['lastSpeed', 'keyBindings']);
    } finally {
      globalThis.chrome = originalChrome;
    }

    assert.deepEqual(
      removedKeys,
      ['lastSpeed', 'keyBindings'],
      'remove() must pass the keys array to chrome.storage.sync.remove'
    );
  }
);

// =============================================================================
// Test 8 — StorageManager.clear() calls chrome.storage.sync.clear (lines 173-179)
// =============================================================================

runner.test(
  'Test 8 — clear() resolves after chrome.storage.sync.clear callback fires',
  async () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();

    let clearCalled = false;
    const originalChrome = globalThis.chrome;
    globalThis.chrome = {
      storage: {
        sync: {
          clear: (callback) => {
            clearCalled = true;
            setTimeout(() => callback && callback(), 5);
          },
        },
      },
    };

    try {
      await SM.clear();
    } finally {
      globalThis.chrome = originalChrome;
    }

    assert.equal(clearCalled, true, 'clear() must call chrome.storage.sync.clear');
  }
);

// =============================================================================
// Test 9 — StorageManager.onChanged() registers a listener and receives changes
// (lines 186-191)
// =============================================================================

runner.test(
  'Test 9 — onChanged() registers listener; callback fires on sync storage change',
  () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();

    let receivedChanges = null;

    // chrome-mock already has onChanged.addListener and triggerStorageChange
    installChromeMock();

    try {
      SM.onChanged((changes) => {
        receivedChanges = changes;
      });

      // Trigger a sync change through the mock
      globalThis.chrome.storage.onChanged.triggerStorageChange(
        { lastSpeed: { oldValue: 1.0, newValue: 2.5 } },
        'sync'
      );
    } finally {
      cleanupChromeMock();
    }

    assert.exists(receivedChanges, 'onChanged callback must have been called');
    assert.exists(
      receivedChanges.lastSpeed,
      'onChanged callback must receive the lastSpeed change'
    );
  }
);

// =============================================================================
// Test 10 — StorageManager.onChanged() does NOT fire callback for non-sync areas
// (line 187-189: the areaName === 'sync' guard)
// =============================================================================

runner.test(
  'Test 10 — onChanged() callback is not invoked for non-sync storage changes',
  () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();

    let callbackFired = false;
    installChromeMock();

    try {
      SM.onChanged(() => {
        callbackFired = true;
      });

      // Trigger a 'local' (not 'sync') change — must NOT invoke callback
      globalThis.chrome.storage.onChanged.triggerStorageChange(
        { lastSpeed: { oldValue: 1.0, newValue: 2.5 } },
        'local'
      );
    } finally {
      cleanupChromeMock();
    }

    assert.equal(
      callbackFired,
      false,
      'onChanged callback must not fire for non-sync storage area'
    );
  }
);

// =============================================================================
// Test 11 — StorageManager.set() fallback: updates _injectedSettings cache
// and dispatches VSC_SAVE_SETTINGS (line 148 — the cache update branch)
// =============================================================================

runner.test(
  'Test 11 — set() in non-chrome context updates _injectedSettings cache',
  async () => {
    const SM = window.VSC.StorageManager;
    resetStorageManager();
    SM._injectedSettings = { lastSpeed: 1.0 };

    const savedChrome = globalThis.chrome;
    delete globalThis.chrome;

    let saveEventFired = false;
    const saveHandler = () => { saveEventFired = true; };
    window.addEventListener('VSC_SAVE_SETTINGS', saveHandler);

    try {
      await SM.set({ lastSpeed: 2.5, rememberSpeed: true });
    } finally {
      globalThis.chrome = savedChrome;
      window.removeEventListener('VSC_SAVE_SETTINGS', saveHandler);
    }

    assert.equal(
      SM._injectedSettings.lastSpeed,
      2.5,
      'set() must update _injectedSettings.lastSpeed to 2.5'
    );
    assert.equal(
      SM._injectedSettings.rememberSpeed,
      true,
      'set() must merge new keys into _injectedSettings'
    );
    assert.equal(saveEventFired, true, 'set() must dispatch VSC_SAVE_SETTINGS event');
  }
);

export { runner as storageManagerRaceTestRunner };
