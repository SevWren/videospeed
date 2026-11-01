/**
 * Frame guard tests for inject.js
 *
 * Seams under test:
 *   S1. window.VSC.DomUtils.inIframe() — public utility; tested for its own contract.
 *   S2. window.VSC._shouldInjectInCurrentFrame() — the agreed test-only export of the
 *       frame-guard function from inject.js. Tests verify its *behavior* (return values
 *       for controlled browser-context conditions), not its existence or internal wiring.
 *
 * Environment control:
 *   window.top is non-configurable in JSDOM, so we patch window.self (which IS
 *   configurable) to an object !== window.top in order to simulate a sub-frame.
 *   window.parent.document is accessible in JSDOM (same-origin by definition), so the
 *   guard's same-origin branch is exercised naturally without any mock.
 *
 * No internal collaborators (DomUtils, etc.) are stubbed — conditions are set
 * through the browser environment properties the production code actually reads.
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

// Load core modules so window.VSC.DomUtils and window.VSC._shouldInjectInCurrentFrame
// are available. inject.js is already in the ES module cache from inject.test.js.
await loadCoreModules();

const runner = new SimpleTestRunner();

// ─────────────────────────────────────────────────────────────────────────────
// Environment helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patch window.self to an object !== window.top to simulate a sub-frame.
 * window.top is non-configurable in JSDOM; window.self is configurable.
 * Returns a restore function that re-installs the original descriptor.
 */
function simulateIframe() {
  const origDesc = Object.getOwnPropertyDescriptor(window, 'self');
  const fakeSelf = { location: window.location };
  Object.defineProperty(window, 'self', {
    get: () => fakeSelf,
    configurable: true,
    enumerable: true,
  });
  return function restore() {
    if (origDesc) {
      Object.defineProperty(window, 'self', origDesc);
    }
  };
}

/**
 * Restore window.self to its native JSDOM state (self === top === window).
 * Captured once at module load time before any test can mutate it.
 */
const nativeSelfDesc = Object.getOwnPropertyDescriptor(window, 'self');
function ensureTopFrame() {
  if (nativeSelfDesc) {
    Object.defineProperty(window, 'self', nativeSelfDesc);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — DomUtils.inIframe(): top frame returns false
// ─────────────────────────────────────────────────────────────────────────────

runner.test('DomUtils.inIframe() returns false in a top-level frame', () => {
  ensureTopFrame();

  assert.false(
    window.VSC.DomUtils.inIframe(),
    'inIframe() must return false when window.self === window.top'
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1b — DomUtils.inIframe(): sub-frame returns true
// ─────────────────────────────────────────────────────────────────────────────

runner.test('DomUtils.inIframe() returns true in a sub-frame', () => {
  const restore = simulateIframe();
  let result;
  try {
    result = window.VSC.DomUtils.inIframe();
  } finally {
    restore();
  }

  assert.true(result, 'inIframe() must return true when window.self !== window.top');
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — frame guard returns false for a same-origin sub-frame
//
// In JSDOM, window.parent.document is always accessible (same-origin), so the
// guard's rule "same-origin parent → skip" is exercised without any stubbing.
// We control the iframe condition through window.self only.
// ─────────────────────────────────────────────────────────────────────────────

runner.test(
  'shouldInjectInCurrentFrame() returns false in a same-origin sub-frame',
  () => {
    const guardFn = window.VSC._shouldInjectInCurrentFrame;
    const restore = simulateIframe();
    let result;
    try {
      result = guardFn();
    } finally {
      restore();
    }

    assert.false(
      result,
      'shouldInjectInCurrentFrame() must return false in a same-origin sub-frame ' +
        '(window.parent.document is accessible — top-level frame handles initialization)'
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — frame guard returns true in the top-level frame
// ─────────────────────────────────────────────────────────────────────────────

runner.test('shouldInjectInCurrentFrame() returns true in the top-level frame', () => {
  ensureTopFrame();

  const result = window.VSC._shouldInjectInCurrentFrame();

  assert.true(
    result,
    'shouldInjectInCurrentFrame() must return true when window.self === window.top ' +
      'so that extension.initialize() runs in top-level documents'
  );
});

export { runner as injectFrameGuardRunner };
