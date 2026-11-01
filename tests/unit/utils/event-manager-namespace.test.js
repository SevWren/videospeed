/**
 * Failing tests (TDD RED) for the wrong-namespace bug in event-manager.js.
 *
 * Bug: event-manager.js line 37 calls window.VSC.inIframe() but the function
 * lives at window.VSC.DomUtils.inIframe(). This causes a silent TypeError in
 * cross-origin embedded players because window.VSC.inIframe is undefined.
 *
 * These tests must go RED against the current code and GREEN after the fix.
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

// Load only the modules needed for these two focused tests:
// constants and logger must come first (dom-utils depends on them).
await import('../../../src/utils/constants.js');
await import('../../../src/utils/logger.js');
await import('../../../src/utils/dom-utils.js');
// event-manager.js registers window.VSC.EventManager; load it after dom-utils.
await import('../../../src/utils/event-manager.js');

const runner = new SimpleTestRunner();

// ---------------------------------------------------------------------------
// Test 1 — namespace contract
//
// window.VSC.DomUtils.inIframe MUST be a function (it is defined in dom-utils.js).
// window.VSC.inIframe MUST be undefined (no such path exists in the codebase).
//
// This test documents the namespace contract and will remain GREEN both before
// and after the fix — its value is as explicit specification documentation.
// ---------------------------------------------------------------------------
runner.test('window.VSC.DomUtils.inIframe is a function and window.VSC.inIframe is undefined', () => {
  assert.equal(
    typeof window.VSC.DomUtils.inIframe,
    'function',
    'window.VSC.DomUtils.inIframe should be a function (defined in dom-utils.js)'
  );

  assert.equal(
    typeof window.VSC.inIframe,
    'undefined',
    'window.VSC.inIframe should be undefined — there is no such namespace path'
  );
});

// ---------------------------------------------------------------------------
// Test 2 — EventManager.setupKeyboardShortcuts calls the correct namespace
//
// We install a spy on window.VSC.DomUtils.inIframe and deliberately do NOT
// install anything at window.VSC.inIframe.  After calling setupKeyboardShortcuts
// the spy on the CORRECT path must have been called at least once.
//
// Against current code (which calls window.VSC.inIframe()) the spy is never
// reached, so this test goes RED.  After the fix (window.VSC.DomUtils.inIframe())
// the spy is invoked and the test goes GREEN.
// ---------------------------------------------------------------------------
runner.test('EventManager.setupKeyboardShortcuts calls window.VSC.DomUtils.inIframe, not window.VSC.inIframe', () => {
  // --- setup spy ---
  const original = window.VSC.DomUtils.inIframe;
  let correctNamespaceCalled = false;

  window.VSC.DomUtils.inIframe = function () {
    correctNamespaceCalled = true;
    return false; // report "not in iframe" so the test stays self-contained
  };

  // Ensure the wrong path is absent so the current bug produces a TypeError
  // (which event-manager.js silently swallows), confirming the call never
  // reaches the correct namespace.
  const wrongPathBefore = window.VSC.inIframe;
  delete window.VSC.inIframe; // make sure it is truly undefined

  try {
    // Build a minimal config stub — just enough for the constructor and
    // setupKeyboardShortcuts to run without crashing on unrelated paths.
    const stubConfig = {
      settings: { keyBindings: [] },
      getMediaElements: () => [],
      getGifElements: () => [],
    };
    const stubActionHandler = {};

    const manager = new window.VSC.EventManager(stubConfig, stubActionHandler);

    // Create a minimal document stub so addEventListener doesn't throw.
    const fakeDoc = {
      addEventListener: () => {},
    };

    manager.setupKeyboardShortcuts(fakeDoc);

    // The critical assertion: the CORRECT namespace must have been called.
    assert.equal(
      correctNamespaceCalled,
      true,
      'window.VSC.DomUtils.inIframe should have been called by setupKeyboardShortcuts ' +
        '(current code calls window.VSC.inIframe instead — wrong namespace)'
    );
  } finally {
    // Restore original state regardless of pass/fail.
    window.VSC.DomUtils.inIframe = original;
    if (wrongPathBefore !== undefined) {
      window.VSC.inIframe = wrongPathBefore;
    }
  }
});

export { runner };
