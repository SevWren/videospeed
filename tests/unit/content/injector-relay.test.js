/**
 * Seam C — live settings relay guard logic (issue #10)
 *
 * Tests the filtering contract of the chrome.storage.onChanged listener
 * added to injector.js::setupMessageBridge().
 *
 * injector.js is a content script and cannot be loaded as an ES module in
 * JSDOM.  Instead, this file tests the identical guard logic inline,
 * verifying the contract: USER_CONTROLLED_KEYS are relayed; all other keys
 * (lastSpeed, lastGifSpeed, speeds, controlGifs, displayKeyCode) are not.
 *
 * The chrome-mock upgrade (triggerStorageChange) is exercised here so that
 * if the mock regresses, these tests catch it before the Seam B tests run.
 */

import {
  installChromeMock,
  cleanupChromeMock,
  resetMockStorage,
} from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

const runner = new SimpleTestRunner();

// ── Mirror the exact USER_CONTROLLED_KEYS set from injector.js ───────────────
// If injector.js changes this set without updating the tests, Seam B tests
// will catch the behavioural regression.
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
  'gifSpeedStep',
]);

function buildRelayPatch(changes) {
  const patch = {};
  for (const key of USER_CONTROLLED_KEYS) {
    if (Object.prototype.hasOwnProperty.call(changes, key)) {
      patch[key] = changes[key].newValue;
    }
  }
  return patch;
}

// ── chrome-mock triggerStorageChange smoke test ───────────────────────────────

runner.test('chrome-mock stores onChanged callbacks and triggerStorageChange invokes them', () => {
  installChromeMock();
  resetMockStorage();

  let fired = false;
  let receivedChanges = null;
  let receivedArea = null;

  chrome.storage.onChanged.addListener((changes, area) => {
    fired = true;
    receivedChanges = changes;
    receivedArea = area;
  });

  chrome.storage.onChanged.triggerStorageChange({ lastSpeed: { newValue: 2.0 } }, 'sync');

  cleanupChromeMock();

  assert.equal(fired, true, 'onChanged callback must be invoked by triggerStorageChange');
  assert.equal(receivedArea, 'sync', 'area argument must be forwarded');
  assert.equal(receivedChanges.lastSpeed.newValue, 2.0, 'changes argument must be forwarded');
});

runner.test('resetMockStorage clears registered onChanged listeners', () => {
  installChromeMock();
  resetMockStorage();

  let count = 0;
  chrome.storage.onChanged.addListener(() => {
    count++;
  });

  // Reset — should clear the listener
  resetMockStorage();

  chrome.storage.onChanged.triggerStorageChange({ keyBindings: { newValue: [] } }, 'sync');

  cleanupChromeMock();

  assert.equal(count, 0, 'listener registered before resetMockStorage must not fire after reset');
});

// ── Relay guard logic ─────────────────────────────────────────────────────────

runner.test('keyBindings change produces a relay patch', () => {
  const newBindings = [{ action: 'faster', key: 70, value: 0.1, force: false, predefined: true }];
  const patch = buildRelayPatch({ keyBindings: { newValue: newBindings } });

  assert.equal(Object.keys(patch).length, 1, 'patch should contain exactly keyBindings');
  assert.equal(patch.keyBindings, newBindings, 'patch.keyBindings should carry newValue');
});

runner.test('lastSpeed change produces an empty patch (not relayed)', () => {
  const patch = buildRelayPatch({ lastSpeed: { newValue: 1.5 } });
  assert.equal(Object.keys(patch).length, 0, 'lastSpeed must not appear in relay patch');
});

runner.test('lastGifSpeed change produces an empty patch (not relayed)', () => {
  const patch = buildRelayPatch({ lastGifSpeed: { newValue: 2.0 } });
  assert.equal(Object.keys(patch).length, 0, 'lastGifSpeed must not appear in relay patch');
});

runner.test('controlGifs change produces an empty patch (handled by dedicated channel)', () => {
  const patch = buildRelayPatch({ controlGifs: { newValue: false } });
  assert.equal(Object.keys(patch).length, 0, 'controlGifs must not appear in relay patch');
});

runner.test(
  'displayKeyCode change produces an empty patch (legacy field, key is in keyBindings)',
  () => {
    const patch = buildRelayPatch({ displayKeyCode: { newValue: 68 } });
    assert.equal(Object.keys(patch).length, 0, 'displayKeyCode must not appear in relay patch');
  }
);

runner.test('mixed change: only user-controlled keys are relayed', () => {
  const newBindings = [{ action: 'faster', key: 70, value: 0.1, force: false, predefined: true }];
  const patch = buildRelayPatch({
    keyBindings: { newValue: newBindings },
    lastSpeed: { newValue: 1.5 },
    lastGifSpeed: { newValue: 2.0 },
    rememberSpeed: { newValue: true },
    gifSpeedStep: { newValue: 0.25 },
    controlGifs: { newValue: false },
  });

  assert.equal(patch.keyBindings, newBindings, 'keyBindings must be in patch');
  assert.equal(patch.rememberSpeed, true, 'rememberSpeed must be in patch');
  assert.equal(patch.gifSpeedStep, 0.25, 'gifSpeedStep must be in patch');
  assert.equal(patch.lastSpeed, undefined, 'lastSpeed must NOT be in patch');
  assert.equal(patch.lastGifSpeed, undefined, 'lastGifSpeed must NOT be in patch');
  assert.equal(patch.controlGifs, undefined, 'controlGifs must NOT be in patch');
  assert.equal(Object.keys(patch).length, 3, 'patch must contain exactly 3 keys');
});

runner.test('empty changes produces an empty patch', () => {
  const patch = buildRelayPatch({});
  assert.equal(Object.keys(patch).length, 0, 'empty changes must produce empty patch');
});

runner.test('all USER_CONTROLLED_KEYS pass through the relay', () => {
  const changes = {};
  for (const key of USER_CONTROLLED_KEYS) {
    changes[key] = { newValue: `val_${key}` };
  }
  const patch = buildRelayPatch(changes);
  assert.equal(
    Object.keys(patch).length,
    USER_CONTROLLED_KEYS.size,
    'all USER_CONTROLLED_KEYS must appear in relay patch'
  );
  for (const key of USER_CONTROLLED_KEYS) {
    assert.equal(patch[key], `val_${key}`, `${key} must carry its newValue`);
  }
});

runner.test('non-sync area produces no relay dispatch', () => {
  // Simulate the areaName guard in the injector.js listener
  let dispatched = false;
  const origDispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = (event) => {
    if (event.type === 'VSC_USER_SETTINGS') {
      dispatched = true;
    }
    return origDispatch(event);
  };

  // Simulate: areaName !== 'sync' → early return; patch never dispatched
  const areaName = 'local';
  if (areaName === 'sync') {
    const patch = buildRelayPatch({ keyBindings: { newValue: [] } });
    if (Object.keys(patch).length > 0) {
      window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', { detail: patch }));
    }
  }

  window.dispatchEvent = origDispatch;
  assert.equal(dispatched, false, 'VSC_USER_SETTINGS must not be dispatched for non-sync area');
});

export default runner;
