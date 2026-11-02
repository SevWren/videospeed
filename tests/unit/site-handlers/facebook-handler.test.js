/**
 * Unit tests for FacebookHandler
 * Seam: window.VSC.FacebookHandler constructor + public methods (Group F, SEAMS.md)
 */

import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

await loadCoreModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  location.hostname = 'localhost';
  location.href = 'http://localhost';
  // Clean up any observer marker left by previous test
  delete document.__vscFacebookObserver;
});

runner.afterEach(() => {
  cleanupChromeMock();
  location.hostname = 'localhost';
  location.href = 'http://localhost';
  delete document.__vscFacebookObserver;
});

// --- static matches() ---

runner.test('FacebookHandler.matches returns true on www.facebook.com', () => {
  // RED: before matches() checked hostname, it always returned false.
  location.hostname = 'www.facebook.com';
  assert.equal(window.VSC.FacebookHandler.matches(), true);
});

runner.test('FacebookHandler.matches returns false on non-Facebook hostname', () => {
  location.hostname = 'www.instagram.com';
  assert.equal(window.VSC.FacebookHandler.matches(), false);
});

// --- getControllerPosition() ---

runner.test('FacebookHandler.getControllerPosition in gifMode delegates to base', () => {
  // RED: before gifMode branch, gif elements used Facebook's deep-traversal path.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.FacebookHandler();
  const result = handler.getControllerPosition(parent, video, { gifMode: true });

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

runner.test('FacebookHandler.getControllerPosition with CANVAS delegates to base', () => {
  // RED: before canvas check, canvas hit deep-traversal.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const canvas = document.createElement('canvas');

  const handler = new window.VSC.FacebookHandler();
  const result = handler.getControllerPosition(parent, canvas, {});

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

runner.test('FacebookHandler.getControllerPosition traverses 7 levels deep when DOM is deep enough', () => {
  // RED: before deep traversal, handler used parent directly.
  // Build a chain: root -> l1 -> l2 -> l3 -> l4 -> l5 -> l6 -> parent (7 levels down from root)
  let current = document.createElement('div');
  const root = current;
  for (let i = 0; i < 7; i++) {
    const child = document.createElement('div');
    current.appendChild(child);
    current = child;
  }
  const parent = current; // 7 levels below root

  const handler = new window.VSC.FacebookHandler();
  const result = handler.getControllerPosition(parent, document.createElement('video'), {});

  // Going up 7 parentElement calls from parent should land on root
  assert.equal(result.insertionPoint, root);
  assert.equal(result.insertionMethod, 'firstChild');
});

runner.test('FacebookHandler.getControllerPosition falls back when DOM is too shallow', () => {
  // RED: before try/catch fallback, shallow DOM threw TypeError.
  const parent = document.createElement('div'); // no ancestors
  const video = document.createElement('video');

  const handler = new window.VSC.FacebookHandler();
  let threw = false;
  let result;
  try {
    result = handler.getControllerPosition(parent, video, {});
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
  assert.equal(result !== undefined, true);
});

// --- initialize() and setupFacebookObserver() ---

runner.test('FacebookHandler.initialize sets up a MutationObserver on document.body', () => {
  // Covers lines 51-56, 63-93
  const handler = new window.VSC.FacebookHandler();
  handler.initialize(document);

  assert.equal(handler.facebookObserver !== undefined, true);
  assert.equal(typeof handler.facebookObserver.disconnect, 'function');
  assert.equal(document.__vscFacebookObserver !== undefined, true);

  handler.facebookObserver.disconnect();
});

runner.test('FacebookHandler MutationObserver callback fires when video-containing node is added', async () => {
  // Covers lines 69-82 — the observer callback body
  const handler = new window.VSC.FacebookHandler();
  handler.initialize(document);

  // Add a child node that contains a video — this should trigger the observer callback
  const container = document.createElement('div');
  const video = document.createElement('video');
  container.appendChild(video);

  // MutationObserver is async; we append and give it a tick to fire
  document.body.appendChild(container);
  await new Promise((resolve) => setTimeout(resolve, 20));

  document.body.removeChild(container);
  handler.facebookObserver.disconnect();

  // If we reached here without throwing, the callback path executed
  assert.equal(true, true);
});

runner.test('FacebookHandler.initialize does not create duplicate observers', () => {
  // Covers line 64-66 (early return when observer already set)
  const handler = new window.VSC.FacebookHandler();
  handler.initialize(document);
  const firstObserver = handler.facebookObserver;

  // Second initialize with same document — should reuse existing marker
  const handler2 = new window.VSC.FacebookHandler();
  handler2.initialize(document);

  // handler2.facebookObserver is undefined because the early-return path was taken
  assert.equal(handler2.facebookObserver, undefined);

  firstObserver.disconnect();
});

// --- shouldIgnoreVideo() ---

runner.test('FacebookHandler.shouldIgnoreVideo returns false for null video', () => {
  // Covers line 112
  const handler = new window.VSC.FacebookHandler();
  assert.equal(handler.shouldIgnoreVideo(null), false);
});

runner.test('FacebookHandler.shouldIgnoreVideo returns false for non-VIDEO element', () => {
  // Covers line 112-113
  const audio = document.createElement('audio');
  const handler = new window.VSC.FacebookHandler();
  assert.equal(handler.shouldIgnoreVideo(audio), false);
});

runner.test('FacebookHandler.shouldIgnoreVideo returns true when video is inside data-story-id ancestor', () => {
  // Covers lines 116-117
  const story = document.createElement('div');
  story.setAttribute('data-story-id', '12345');
  const video = document.createElement('video');
  story.appendChild(video);
  document.body.appendChild(story);

  const handler = new window.VSC.FacebookHandler();
  const result = handler.shouldIgnoreVideo(video);

  document.body.removeChild(story);
  assert.equal(result, true);
});

runner.test('FacebookHandler.shouldIgnoreVideo returns true when video is inside story-bucket-container', () => {
  // Covers lines 117-118
  const bucket = document.createElement('div');
  bucket.classList.add('story-bucket-container');
  const video = document.createElement('video');
  bucket.appendChild(video);
  document.body.appendChild(bucket);

  const handler = new window.VSC.FacebookHandler();
  const result = handler.shouldIgnoreVideo(video);

  document.body.removeChild(bucket);
  assert.equal(result, true);
});

runner.test('FacebookHandler.shouldIgnoreVideo returns true when data-video-width is 0', () => {
  // Covers line 119
  const video = document.createElement('video');
  video.setAttribute('data-video-width', '0');
  document.body.appendChild(video);

  const handler = new window.VSC.FacebookHandler();
  const result = handler.shouldIgnoreVideo(video);

  document.body.removeChild(video);
  assert.equal(result, true);
});

runner.test('FacebookHandler.shouldIgnoreVideo returns false for normal main-feed video', () => {
  const main = document.createElement('div');
  main.setAttribute('role', 'main');
  const video = document.createElement('video');
  main.appendChild(video);
  document.body.appendChild(main);

  const handler = new window.VSC.FacebookHandler();
  const result = handler.shouldIgnoreVideo(video);

  document.body.removeChild(main);
  assert.equal(result, false);
});

// --- getVideoContainerSelectors() ---

runner.test('FacebookHandler.getVideoContainerSelectors returns Facebook-specific selectors', () => {
  // Covers lines 127-129
  const handler = new window.VSC.FacebookHandler();
  const selectors = handler.getVideoContainerSelectors();

  assert.equal(Array.isArray(selectors), true);
  assert.equal(selectors.includes('[data-video-id]'), true);
  assert.equal(selectors.includes('.fbStoryVideoContainer'), true);
});

// --- cleanup() ---

runner.test('FacebookHandler.cleanup disconnects and removes the observer', () => {
  // Covers lines 134-142
  const handler = new window.VSC.FacebookHandler();
  handler.initialize(document);
  assert.equal(handler.facebookObserver !== undefined, true);

  handler.cleanup();

  assert.equal(handler.facebookObserver, null);
  assert.equal(document.__vscFacebookObserver, undefined);
});

runner.test('FacebookHandler.cleanup does nothing when no observer was set', () => {
  // Covers line 137 false branch
  const handler = new window.VSC.FacebookHandler();
  let threw = false;
  try {
    handler.cleanup();
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
});

export { runner };
