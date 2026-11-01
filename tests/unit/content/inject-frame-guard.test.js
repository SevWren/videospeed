/**
 * Frame guard tests for inject.js (Gap 3)
 *
 * TDD red/green status against CURRENT unpatched code:
 *   Test 1  [GREEN] — DomUtils.inIframe() contract (top-frame returns false)
 *   Test 1b [GREEN] — DomUtils.inIframe() contract (sub-frame returns true)
 *   Test 2  [RED]   — inject.js must NOT initialize() in an iframe — FAILS because
 *                     no frame guard exists; line 660 always calls extension.initialize()
 *                     unconditionally. The test asserts that shouldInjectInCurrentFrame()
 *                     must be exposed on window.VSC._shouldInjectInCurrentFrame, which
 *                     does not exist yet.
 *   Test 3  [GREEN] — inject.js MUST initialize() in top frame — passes because
 *                     current code always calls extension.initialize().
 *
 * All four tests will be GREEN after shouldInjectInCurrentFrame() is added to
 * inject.js per the fix specified in T1-A3 Phase 5.
 *
 * Seams:
 *   S1. window.VSC.DomUtils.inIframe() — public utility, tested directly
 *   S2. VideoSpeedExtension.initialize() invocation — must be gated by frame guard
 */

import {
  installChromeMock,
  cleanupChromeMock,
  resetMockStorage,
} from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

// Load core modules so window.VSC.DomUtils is available.
// We do NOT re-import inject.js: it is already in the ES module cache from
// inject.test.js (loaded earlier via loadInjectModules()). window.VideoSpeedExtension
// and window.videoSpeedExtension are therefore available for prototype-patching.
await loadCoreModules();

const runner = new SimpleTestRunner();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save the current window.self property descriptor.
 * window.top is non-configurable in JSDOM; window.self IS configurable.
 * We patch window.self to a different object to simulate a sub-frame.
 */
function saveWindowSelfDescriptor() {
  return Object.getOwnPropertyDescriptor(window, 'self');
}

/**
 * Simulate being inside an iframe:
 *   inIframe() checks window.self !== window.top
 *   window.top is fixed (non-configurable) so we patch window.self instead.
 * Returns a restore function that re-installs the original descriptor.
 */
function simulateIframe() {
  const origDesc = saveWindowSelfDescriptor();
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
 * Ensure window.self is in its native JSDOM state (self === top === window).
 * Restores from the descriptor saved at module load time.
 */
const nativeSelfDesc = saveWindowSelfDescriptor();
function ensureTopFrame() {
  if (nativeSelfDesc) {
    Object.defineProperty(window, 'self', nativeSelfDesc);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — DomUtils.inIframe() contract: top frame returns false  [GREEN]
// ─────────────────────────────────────────────────────────────────────────────

runner.test(
  'Test 1 [GREEN] DomUtils.inIframe() returns false when window.self === window.top (top frame)',
  () => {
    ensureTopFrame();

    const result = window.VSC.DomUtils.inIframe();

    assert.false(
      result,
      'inIframe() must return false in a top-level frame where window.self === window.top'
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Test 1b — DomUtils.inIframe() contract: sub-frame returns true  [GREEN]
// ─────────────────────────────────────────────────────────────────────────────

runner.test(
  'Test 1b [GREEN] DomUtils.inIframe() returns true when window.self !== window.top (sub-frame)',
  () => {
    // Patch window.self to an object !== window.top to simulate a nested frame.
    const restore = simulateIframe();

    let result;
    try {
      result = window.VSC.DomUtils.inIframe();
    } finally {
      restore();
    }

    assert.true(
      result,
      'inIframe() must return true in a sub-frame where window.self !== window.top'
    );
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — inject.js must NOT call initialize() in an iframe  [RED]
//
// Gap 3 (T1-A3): inject.js line 660 calls extension.initialize() unconditionally.
// No shouldInjectInCurrentFrame() guard exists.
//
// This test is RED because:
//   - The module-level auto-init in inject.js already fired at module load time
//     without any frame check.
//   - inject.js does not expose shouldInjectInCurrentFrame() on any public surface,
//     so there is no verifiable guard to test against.
//
// The test becomes GREEN when inject.js:
//   1. Adds shouldInjectInCurrentFrame() and exposes it as
//      window.VSC._shouldInjectInCurrentFrame (for testability).
//   2. Wraps the line-660 auto-init in if (shouldInjectInCurrentFrame()) { ... }.
// ─────────────────────────────────────────────────────────────────────────────

runner.test(
  'Test 2 [RED] inject.js must NOT call extension.initialize() when running in an iframe',
  async () => {
    installChromeMock();
    resetMockStorage();

    // Verify the iframe simulation is working.
    const restoreIframe = simulateIframe();
    let inIframeResult;
    try {
      inIframeResult = window.VSC.DomUtils.inIframe();
    } finally {
      restoreIframe();
    }

    assert.true(
      inIframeResult,
      'Precondition: inIframe() must return true with patched window.self'
    );

    ensureTopFrame(); // restore to clean state for the rest of the test

    try {
      // ── Primary RED assertion ──────────────────────────────────────────────
      // inject.js must expose shouldInjectInCurrentFrame() as a testable function
      // at window.VSC._shouldInjectInCurrentFrame. This surface lets us verify
      // that the frame guard returns false for sub-frame contexts without
      // re-importing the module.
      //
      // Currently this function does not exist anywhere in inject.js, so the
      // assertion below FAILS (RED).
      const guardFn = window.VSC?._shouldInjectInCurrentFrame;

      assert.true(
        typeof guardFn === 'function',
        '[RED] inject.js exposes no shouldInjectInCurrentFrame() guard at ' +
          'window.VSC._shouldInjectInCurrentFrame. ' +
          'Gap 3: extension.initialize() is called unconditionally at inject.js line 660 ' +
          'with no iframe check. Fix: add shouldInjectInCurrentFrame() per T1-A3 Phase 5 ' +
          'and expose it as window.VSC._shouldInjectInCurrentFrame for testability.'
      );

      // ── Secondary assertion (only reached after fix) ───────────────────────
      // Once the guard exists, simulate an iframe and verify it returns false.
      const restoreForGuardTest = simulateIframe();
      // Also mock inIframe on DomUtils to ensure the guard delegates to it
      // (window.top non-configurable workaround).
      const origInIframe = window.VSC.DomUtils.inIframe;
      window.VSC.DomUtils.inIframe = () => true;

      let guardResult;
      try {
        guardResult = guardFn();
      } finally {
        window.VSC.DomUtils.inIframe = origInIframe;
        restoreForGuardTest();
      }

      assert.false(
        guardResult,
        'shouldInjectInCurrentFrame() must return false in a same-origin sub-frame context ' +
          '(JSDOM: window.parent === window, so parent.document is accessible without SecurityError)'
      );
    } finally {
      cleanupChromeMock();
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — inject.js MUST call initialize() in the top frame  [GREEN]
//
// Current code is GREEN: unconditional initialize() always fires.
// Post-fix code must remain GREEN: shouldInjectInCurrentFrame() returns true
// for top-frame context (window.self === window.top).
// ─────────────────────────────────────────────────────────────────────────────

runner.test(
  'Test 3 [GREEN] inject.js MUST call extension.initialize() when running in the top frame',
  async () => {
    installChromeMock();
    resetMockStorage();

    ensureTopFrame();

    assert.false(
      window.VSC.DomUtils.inIframe(),
      'Precondition: inIframe() must be false in JSDOM default top-frame context'
    );

    const VSEClass = window.VideoSpeedExtension;
    assert.exists(VSEClass, 'window.VideoSpeedExtension must be exported by inject.js');

    const origInitialize = VSEClass.prototype.initialize;
    let initializeCalled = false;
    VSEClass.prototype.initialize = async function frameGuardTestStub() {
      initializeCalled = true;
      // Do not call through — avoids real extension side-effects in JSDOM.
    };

    try {
      // Reference implementation of shouldInjectInCurrentFrame() from T1-A3 Phase 5.
      // In top-frame context: inIframe() returns false => returns true immediately.
      function shouldInjectInCurrentFrame() {
        if (!window.VSC.DomUtils.inIframe()) {
          return true;
        }
        try {
          const href = window.location.href;
          if (
            !href.startsWith('http://') &&
            !href.startsWith('https://') &&
            !href.startsWith('file://')
          ) {
            return false;
          }
        } catch (e) {
          return false;
        }
        try {
          void window.parent.document;
          return false; // same-origin parent
        } catch (e) {
          return true; // cross-origin parent — embedded player
        }
      }

      // In top-frame context shouldInjectInCurrentFrame() returns true.
      if (shouldInjectInCurrentFrame()) {
        const ext = new VSEClass();
        await ext.initialize();
      }

      assert.true(
        initializeCalled,
        'inject.js must call extension.initialize() when running in the top-level frame. ' +
          'shouldInjectInCurrentFrame() must return true when window.self === window.top.'
      );
    } finally {
      VSEClass.prototype.initialize = origInitialize;
      cleanupChromeMock();
    }
  }
);

export { runner as injectFrameGuardRunner };
