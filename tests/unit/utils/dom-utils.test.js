/**
 * Unit tests for DomUtils
 * T-actions-utils: cover dom-utils.js lines 47, 154-159, 174-175, 182-183
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

// Load only the modules needed — constants must come first (dom-utils depends on it).
await import('../../../src/utils/constants.js');
await import('../../../src/utils/logger.js');
await import('../../../src/utils/dom-utils.js');

const runner = new SimpleTestRunner();

// ---------------------------------------------------------------------------
// isBlacklisted — line 47: invalid regex pattern that starts with '/' but
// results in an empty regex string after splitting, triggering `return` early
// (the `if (!regex) { return; }` guard on line 47).
// ---------------------------------------------------------------------------

runner.test('isBlacklisted ignores regex-style entries with no pattern body', () => {
  // A match string "//" starts with '/', splits into ['', '', ''] — the middle
  // slice is empty, so `regex` is '' which is falsy — triggers line 47 `return`.
  // The entry must not contribute to blacklisting.
  const result = window.VSC.DomUtils.isBlacklisted('//');
  assert.false(result, 'an empty regex pattern "//" must not blacklist the page');
});

runner.test('isBlacklisted ignores malformed regex patterns that throw', () => {
  // A string like "/[invalid/g" starts with '/' and has flags, but the regex body
  // "[invalid" is invalid — triggers the catch block that returns early.
  const result = window.VSC.DomUtils.isBlacklisted('/[invalid/g');
  assert.false(result, 'a malformed regex must not blacklist the page');
});

runner.test('isBlacklisted returns true for a valid plain-text match', () => {
  // Sanity check: the baseline path still works.
  // JSDOM sets location.href to 'http://localhost' in the test runner.
  const result = window.VSC.DomUtils.isBlacklisted('localhost');
  assert.true(result, 'plain-text entry matching location.href must blacklist the page');
});

// ---------------------------------------------------------------------------
// initializeWhenReady — lines 154-159: the `document.onreadystatechange` path
// fires when document.readyState is NOT 'complete' at call time.
// ---------------------------------------------------------------------------

runner.test('initializeWhenReady calls callback when readyState becomes complete via onreadystatechange', () => {
  let callCount = 0;
  const callback = () => callCount++;

  // Create a fake document whose readyState starts as 'loading'
  let readyState = 'loading';
  let storedHandler = null;
  const fakeDoc = {
    get readyState() {
      return readyState;
    },
    set onreadystatechange(fn) {
      storedHandler = fn;
    },
  };

  window.VSC.DomUtils.initializeWhenReady(fakeDoc, callback);

  // callback must not have fired yet (readyState is still 'loading')
  assert.equal(callCount, 0, 'callback must not fire before readyState is complete');

  // Simulate document becoming complete
  readyState = 'complete';
  storedHandler && storedHandler();

  assert.equal(callCount, 1, 'callback must fire once when readyState changes to complete');
});

runner.test('initializeWhenReady calls callback immediately when document is already complete', () => {
  let callCount = 0;
  const callback = () => callCount++;

  const fakeDoc = {
    readyState: 'complete',
  };

  window.VSC.DomUtils.initializeWhenReady(fakeDoc, callback);

  assert.equal(callCount, 1, 'callback must be called immediately when readyState is already complete');
});

// ---------------------------------------------------------------------------
// findMediaElements — lines 174-175: the node itself matches the selector.
// ---------------------------------------------------------------------------

runner.test('findMediaElements includes the node itself when it is a video element', () => {
  const video = document.createElement('video');

  const results = window.VSC.DomUtils.findMediaElements(video, false);

  assert.equal(results.length, 1, 'findMediaElements must return the video element itself');
  assert.equal(results[0], video, 'the returned element must be the video node');
});

runner.test('findMediaElements includes audio element itself when audioEnabled is true', () => {
  const audio = document.createElement('audio');

  const results = window.VSC.DomUtils.findMediaElements(audio, true);

  assert.equal(results.length >= 1, true, 'findMediaElements must include the audio node when audioEnabled');
  assert.equal(results[0], audio, 'the first result must be the audio node itself');
});

runner.test('findMediaElements returns empty array for null node', () => {
  const results = window.VSC.DomUtils.findMediaElements(null);
  assert.equal(results.length, 0, 'findMediaElements must return empty array for null node');
});

// ---------------------------------------------------------------------------
// findMediaElements — lines 182-183: shadow root recursion path.
// findMediaElements calls findShadowMedia when node has a shadowRoot.
// ---------------------------------------------------------------------------

runner.test('findMediaElements discovers video elements inside shadow DOM', () => {
  // Build a host with a shadow root containing a video
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const video = document.createElement('video');
  shadowRoot.appendChild(video);

  const results = window.VSC.DomUtils.findMediaElements(host, false);

  assert.equal(results.length >= 1, true, 'findMediaElements must find video inside shadow DOM');
  assert.equal(results.includes(video), true, 'the shadow-DOM video must be in the results');

  // Cleanup
  document.body.removeChild(host);
});

export { runner as domUtilsTestRunner };
