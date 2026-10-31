/**
 * Tests for EventManager — E-3 latent defect
 *
 * E-3: event-manager.js calls window.VSC.inIframe() which does not exist.
 *      The correct reference is window.VSC.DomUtils.inIframe().
 *      The TypeError is silently caught, so keyboard shortcuts are never
 *      registered on window.top.document when running inside a sub-frame.
 *
 * Fix: change window.VSC.inIframe() → window.VSC.DomUtils.inIframe() at
 *      src/utils/event-manager.js line 37.
 *
 * JSDOM note: window === window.top in the test environment, so both
 * document references are the same object.  The observable symptom is that
 * the listeners map grows from 1 entry (base doc only) to 1 entry with
 * 2 keydown handlers registered (base + top) when DomUtils.inIframe is true.
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
  if (runner._origInIframe !== undefined) {
    window.VSC.DomUtils.inIframe = runner._origInIframe;
    runner._origInIframe = undefined;
  }
});

// ─── E-3: inIframe call site must use DomUtils.inIframe ─────────────────────

runner.test(
  'setupKeyboardShortcuts registers TWO listeners on document when DomUtils.inIframe returns true (E-3 — iframe path)',
  async () => {
    // Arrange
    runner._origInIframe = window.VSC.DomUtils.inIframe;
    window.VSC.DomUtils.inIframe = () => true;

    // Sanity: window.VSC.inIframe must not exist — if it did the bug wouldn't matter
    assert.equal(
      typeof window.VSC.inIframe,
      'undefined',
      'Precondition: window.VSC.inIframe must not exist (only DomUtils.inIframe does)'
    );

    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    const actionHandler = new window.VSC.ActionHandler(config, null);
    const eventManager = new window.VSC.EventManager(config, actionHandler);

    // Act — only setupKeyboardShortcuts, not the full setupEventListeners
    eventManager.setupKeyboardShortcuts(document);

    // In JSDOM window === window.top, so window.top.document === document.
    // Pre-fix: TypeError from window.VSC.inIframe() is caught, top.document is NOT
    //          pushed, docs stays [document] → 1 keydown handler registered.
    // Post-fix: DomUtils.inIframe() returns true, top.document IS pushed, docs
    //           becomes [document, document] → 2 keydown handlers registered.
    const handlers = eventManager.listeners.get(document) || [];
    assert.equal(
      handlers.length,
      2,
      'Expected 2 keydown handlers on document (base + top) when inIframe() is true. ' +
        'Pre-fix: window.VSC.inIframe() throws TypeError (caught silently), top.document ' +
        'is never pushed, only 1 handler exists. ' +
        'Fix: change window.VSC.inIframe() → window.VSC.DomUtils.inIframe() in event-manager.js:37.'
    );

    eventManager.cleanup();
  }
);

runner.test(
  'setupKeyboardShortcuts registers ONE listener on document when DomUtils.inIframe returns false (not in iframe)',
  async () => {
    // Arrange
    runner._origInIframe = window.VSC.DomUtils.inIframe;
    window.VSC.DomUtils.inIframe = () => false;

    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    const actionHandler = new window.VSC.ActionHandler(config, null);
    const eventManager = new window.VSC.EventManager(config, actionHandler);

    // Act
    eventManager.setupKeyboardShortcuts(document);

    const handlers = eventManager.listeners.get(document) || [];
    assert.equal(
      handlers.length,
      1,
      'Expected exactly 1 keydown handler on document when not in an iframe'
    );

    eventManager.cleanup();
  }
);

export default runner;
