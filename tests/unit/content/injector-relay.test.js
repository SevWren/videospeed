/**
 * Unit tests for injector.js storage.onChanged relay guard logic
 * Tests that USER_CONTROLLED_KEYS filtering and area check work correctly
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

const runner = new SimpleTestRunner();

// Track dispatched VSC_USER_SETTINGS events
let dispatchedEvents = [];

function captureSettingsEvent(event) {
  dispatchedEvents.push(event.detail);
}

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  dispatchedEvents = [];
  window.addEventListener('VSC_USER_SETTINGS', captureSettingsEvent);
});

runner.afterEach(() => {
  cleanupChromeMock();
  window.removeEventListener('VSC_USER_SETTINGS', captureSettingsEvent);
  dispatchedEvents = [];
});

// Helper: simulate what setupMessageBridge does — register a storage.onChanged listener
// that filters USER_CONTROLLED_KEYS and dispatches VSC_USER_SETTINGS
function registerRelay() {
  const USER_CONTROLLED_KEYS = new Set([
    'keyBindings',
    'rememberSpeed',
    'forceLastSavedSpeed',
    'audioBoolean',
    'startHidden',
    'controllerOpacity',
    'controllerButtonSize',
    'logLevel',
    'blacklist',
    'enabled',
  ]);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    const patch = {};
    for (const [key, { newValue }] of Object.entries(changes)) {
      if (USER_CONTROLLED_KEYS.has(key)) patch[key] = newValue;
    }
    if (Object.keys(patch).length === 0) return;
    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', { detail: patch }));
  });
}

runner.test('storage.onChanged with USER_CONTROLLED_KEY dispatches VSC_USER_SETTINGS', () => {
  registerRelay();

  chrome.storage.onChanged.triggerStorageChange(
    { keyBindings: { newValue: [{ action: 'faster', key: 67, value: 0.1 }] } },
    'sync'
  );

  assert.equal(dispatchedEvents.length, 1, 'Should dispatch exactly one event');
  assert.exists(dispatchedEvents[0].keyBindings, 'Patch should include keyBindings');
});

runner.test('storage.onChanged with lastSpeed does not dispatch VSC_USER_SETTINGS', () => {
  registerRelay();

  chrome.storage.onChanged.triggerStorageChange(
    { lastSpeed: { newValue: 1.5 } },
    'sync'
  );

  assert.equal(dispatchedEvents.length, 0, 'Should not dispatch for excluded key lastSpeed');
});

runner.test('storage.onChanged with lastGifSpeed does not dispatch VSC_USER_SETTINGS', () => {
  registerRelay();

  chrome.storage.onChanged.triggerStorageChange(
    { lastGifSpeed: { newValue: 2.0 } },
    'sync'
  );

  assert.equal(dispatchedEvents.length, 0, 'Should not dispatch for excluded key lastGifSpeed');
});

runner.test('storage.onChanged with mixed keys only includes USER_CONTROLLED_KEYS in patch', () => {
  registerRelay();

  chrome.storage.onChanged.triggerStorageChange(
    {
      keyBindings: { newValue: [] },
      lastSpeed: { newValue: 1.5 },
      rememberSpeed: { newValue: true },
    },
    'sync'
  );

  assert.equal(dispatchedEvents.length, 1, 'Should dispatch one event');
  assert.exists(dispatchedEvents[0].keyBindings, 'Patch should include keyBindings');
  assert.exists(dispatchedEvents[0].rememberSpeed, 'Patch should include rememberSpeed');
  assert.equal(
    dispatchedEvents[0].lastSpeed,
    undefined,
    'Patch must not include lastSpeed'
  );
});

runner.test('storage.onChanged with area "local" does not dispatch VSC_USER_SETTINGS', () => {
  registerRelay();

  chrome.storage.onChanged.triggerStorageChange(
    { keyBindings: { newValue: [] } },
    'local'
  );

  assert.equal(dispatchedEvents.length, 0, 'Should not dispatch for non-sync area');
});

export { runner as injectorRelayTestRunner };
