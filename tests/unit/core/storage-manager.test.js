/**
 * Tests for StorageManager — SD-02 deficiency
 *
 * SD-02: StorageManager.set() callback does NOT check chrome.runtime.lastError.
 *        A failed write (e.g., quota exceeded) resolves silently instead of
 *        surfacing the error to the caller.
 *
 * Fix: Check chrome.runtime.lastError in the set() callback and reject the
 *      promise when it is present.
 */

import {
  installChromeMock,
  cleanupChromeMock,
  resetMockStorage,
} from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

await loadMinimalModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
});

runner.afterEach(() => {
  cleanupChromeMock();
});

// ─── SD-02: StorageManager.set() must surface chrome.runtime.lastError ───────

runner.test(
  'StorageManager.set() rejects when chrome.runtime.lastError is set (SD-02 — silent write failure)',
  async () => {
    // Arrange — override chrome.storage.sync.set to simulate a storage error
    const simulatedError = { message: 'QUOTA_BYTES_PER_ITEM quota exceeded' };
    const origSet = chrome.storage.sync.set;
    chrome.storage.sync.set = (_items, callback) => {
      // Simulate chrome setting lastError before the callback fires
      chrome.runtime.lastError = simulatedError;
      setTimeout(() => {
        callback && callback();
        // Chrome clears lastError after the callback returns
        delete chrome.runtime.lastError;
      }, 10);
    };

    let caughtError = null;
    try {
      await window.VSC.StorageManager.set({ lastSpeed: 2.0 });
    } catch (err) {
      caughtError = err;
    } finally {
      // Restore original
      chrome.storage.sync.set = origSet;
    }

    assert.exists(
      caughtError,
      'StorageManager.set() must reject when chrome.runtime.lastError is set. ' +
        'Pre-fix: the callback ignores lastError and calls resolve(), so the caller ' +
        'never learns the write failed. ' +
        'Fix: check chrome.runtime.lastError in the set callback and call reject(lastError).'
    );

    assert.equal(
      caughtError.message,
      simulatedError.message,
      'Rejected error should carry the lastError message'
    );
  }
);

runner.test(
  'StorageManager.set() resolves normally when there is no chrome.runtime.lastError',
  async () => {
    // Baseline — default mock has no error
    let resolved = false;
    let caughtError = null;
    try {
      await window.VSC.StorageManager.set({ lastSpeed: 1.5 });
      resolved = true;
    } catch (err) {
      caughtError = err;
    }

    assert.true(resolved, 'StorageManager.set() should resolve when no lastError is present');
    assert.equal(caughtError, null, 'No error should be thrown on a successful write');
  }
);

export default runner;
