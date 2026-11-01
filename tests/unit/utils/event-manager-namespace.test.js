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
// Test 1 — keyboard shortcuts are registered on both documents when in an iframe
//
// When setupKeyboardShortcuts runs inside an iframe (inIframe() returns true),
// it must register a keydown listener on BOTH the local document AND
// window.top.document.  If the namespace is wrong (window.VSC.inIframe instead
// of window.VSC.DomUtils.inIframe), the call throws a TypeError that is silently
// swallowed, the iframe branch never executes, and only the local document gets
// a listener.
//
// Observable behavior: after the call, the top-level document's addEventListener
// must have been invoked.  This goes RED against current code because the
// TypeError means the iframe check is never reached, and GREEN after the fix.
// ---------------------------------------------------------------------------
runner.test('setupKeyboardShortcuts registers keydown listeners on two documents when inside an iframe', () => {
  // Behavioral contract: when inIframe() returns true, setupKeyboardShortcuts must
  // register listeners on BOTH the supplied local document AND window.top.document.
  // In JSDOM, window.top.document === window.document (same-origin), so we assert
  // manager.listeners has two entries: the fakeLocalDoc and window.top.document.
  //
  // Buggy code path (wrong namespace): window.VSC.inIframe() throws TypeError,
  // the catch block swallows it, the iframe branch never runs, only fakeLocalDoc
  // gets a listener (size === 1).
  // Fixed code path: window.VSC.DomUtils.inIframe() returns true correctly,
  // docs gets both fakeLocalDoc and window.top.document (size === 2).
  //
  // window.top is non-configurable in JSDOM so we do NOT attempt to redefine it;
  // we rely on the observable fact that two entries appear in the listeners map.

  const stubConfig = {
    settings: { keyBindings: [] },
    getMediaElements: () => [],
    getGifElements: () => [],
  };
  const stubActionHandler = {};

  const originalDomUtils = window.VSC.DomUtils;
  window.VSC.DomUtils = Object.assign({}, originalDomUtils, {
    inIframe: () => true,
  });

  const manager = new window.VSC.EventManager(stubConfig, stubActionHandler);
  // Constructor calls setupKeyboardShortcuts(document) immediately.
  // Clear to isolate the explicit call below.
  manager.listeners.clear();

  const fakeLocalDoc = { addEventListener: () => {} };

  try {
    manager.setupKeyboardShortcuts(fakeLocalDoc);

    // iframe mode: fakeLocalDoc + window.top.document (= window.document in JSDOM)
    assert.equal(
      manager.listeners.has(fakeLocalDoc),
      true,
      'local document must be registered in listeners map',
    );
    assert.equal(
      manager.listeners.has(window.top.document),
      true,
      'window.top.document must be registered in listeners map when inside an iframe ' +
        '(fails if wrong namespace: TypeError swallowed, branch skipped, only 1 entry)',
    );
    assert.equal(
      manager.listeners.size,
      2,
      'exactly two documents must be registered when inside an iframe',
    );
  } finally {
    window.VSC.DomUtils = originalDomUtils;
  }
});

// ---------------------------------------------------------------------------
// Test 2 — keyboard shortcuts are registered only on the local document when
//           NOT in an iframe
//
// When inIframe() returns false, setupKeyboardShortcuts must register a keydown
// listener only on the supplied document, and must NOT attempt to access
// window.top.document (which could throw a cross-origin SecurityError).
//
// This test remains GREEN both before and after the fix and specifies the
// non-iframe path of the same behavior slice.
// ---------------------------------------------------------------------------
runner.test('setupKeyboardShortcuts registers a keydown listener only on the local document when not in an iframe', () => {
  const stubConfig = {
    settings: { keyBindings: [] },
    getMediaElements: () => [],
    getGifElements: () => [],
  };
  const stubActionHandler = {};

  const manager = new window.VSC.EventManager(stubConfig, stubActionHandler);

  const localDocEvents = [];
  const fakeLocalDoc = {
    addEventListener: (type, _handler, _capture) => localDocEvents.push(type),
  };

  // DomUtils surrogate reporting "not in an iframe".
  const originalDomUtils = window.VSC.DomUtils;
  window.VSC.DomUtils = Object.assign({}, originalDomUtils, {
    inIframe: () => false,
  });

  try {
    manager.setupKeyboardShortcuts(fakeLocalDoc);

    assert.equal(
      localDocEvents.includes('keydown'),
      true,
      'local document must receive a keydown listener even when not in an iframe',
    );

    // Only the local document should be in the listeners map.
    assert.equal(
      manager.listeners.size,
      1,
      'listeners map must contain exactly one document entry when not in an iframe',
    );
  } finally {
    window.VSC.DomUtils = originalDomUtils;
  }
});

export { runner };
