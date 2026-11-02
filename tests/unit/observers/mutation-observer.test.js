// Import necessary modules
import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadObserverModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadObserverModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
});

runner.afterEach(() => {
  cleanupChromeMock();
});

runner.test('VideoMutationObserver should process element nodes', () => {
  const mockConfig = { settings: {} };
  const mockOnVideoFound = [];
  const mockOnVideoRemoved = [];

  const onVideoFound = (video, parent) => {
    mockOnVideoFound.push({ video, parent });
  };

  const onVideoRemoved = (video) => {
    mockOnVideoRemoved.push(video);
  };

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    onVideoFound,
    onVideoRemoved
  );

  const videoElement = document.createElement('video');
  const divElement = document.createElement('div');

  const mutation = {
    type: 'childList',
    addedNodes: [videoElement, divElement],
    removedNodes: [],
    target: document.body
  };

  observer.processMutations([mutation]);

  // Video element should trigger callback
  assert.equal(mockOnVideoFound.length, 1);
  assert.equal(mockOnVideoFound[0].video, videoElement);
  assert.equal(mockOnVideoFound[0].parent, document.body);
});

runner.test('VideoMutationObserver should skip non-element nodes', () => {
  const mockConfig = { settings: {} };
  const mockOnVideoFound = [];
  const mockOnVideoRemoved = [];

  const onVideoFound = (video, parent) => {
    mockOnVideoFound.push({ video, parent });
  };

  const onVideoRemoved = (video) => {
    mockOnVideoRemoved.push(video);
  };

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    onVideoFound,
    onVideoRemoved
  );

  const textNode = document.createTextNode('text');
  const commentNode = document.createComment('comment');
  const videoElement = document.createElement('video');

  const mutation = {
    type: 'childList',
    addedNodes: [textNode, commentNode, videoElement],
    removedNodes: [],
    target: document.body
  };

  observer.processMutations([mutation]);

  // Only video element should be processed
  assert.equal(mockOnVideoFound.length, 1);
  assert.equal(mockOnVideoFound[0].video, videoElement);
  assert.equal(mockOnVideoFound[0].parent, document.body);
});

runner.test('VideoMutationObserver should handle removed video elements', () => {
  const mockConfig = { settings: {} };
  const mockOnVideoFound = [];
  const mockOnVideoRemoved = [];

  const onVideoFound = (video, parent) => {
    mockOnVideoFound.push({ video, parent });
  };

  const onVideoRemoved = (video) => {
    mockOnVideoRemoved.push(video);
  };

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    onVideoFound,
    onVideoRemoved
  );

  const videoElement = document.createElement('video');
  videoElement.vsc = { remove: () => { } };

  const mutation = {
    type: 'childList',
    addedNodes: [],
    removedNodes: [videoElement],
    target: document.body
  };

  observer.processMutations([mutation]);

  assert.equal(mockOnVideoRemoved.length, 1);
  assert.equal(mockOnVideoRemoved[0], videoElement);
});

runner.test('VideoMutationObserver should handle null and undefined nodes gracefully', () => {
  const mockConfig = { settings: {} };
  const mockOnVideoFound = [];
  const mockOnVideoRemoved = [];

  const onVideoFound = (video, parent) => {
    mockOnVideoFound.push({ video, parent });
  };

  const onVideoRemoved = (video) => {
    mockOnVideoRemoved.push(video);
  };

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    onVideoFound,
    onVideoRemoved
  );

  const mutation = {
    type: 'childList',
    addedNodes: [null, undefined, document.createElement('video')],
    removedNodes: [null, undefined],
    target: document.body
  };

  // Should not throw
  observer.processMutations([mutation]);

  // Only the video element should be processed
  assert.equal(mockOnVideoFound.length, 1);
  assert.equal(mockOnVideoRemoved.length, 0);
});

runner.test('VideoMutationObserver should detect video elements in shadow DOM', () => {
  const mockConfig = { settings: {} };
  const mockOnVideoFound = [];
  const mockOnVideoRemoved = [];

  const onVideoFound = (video, parent) => {
    mockOnVideoFound.push({ video, parent });
  };

  const onVideoRemoved = (video) => {
    mockOnVideoRemoved.push(video);
  };

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    onVideoFound,
    onVideoRemoved
  );

  const host = document.createElement('div');
  const shadowRoot = host.attachShadow({ mode: 'open' });
  const videoElement = document.createElement('video');
  shadowRoot.appendChild(videoElement);

  const mutation = {
    type: 'childList',
    addedNodes: [host],
    removedNodes: [],
    target: document.body,
  };

  observer.processMutations([mutation]);

  assert.equal(mockOnVideoFound.length, 1);
  assert.equal(mockOnVideoFound[0].video, videoElement);
  assert.equal(mockOnVideoFound[0].parent, videoElement.parentNode);
});

runner.test('VideoMutationObserver should detect nested video elements', () => {
  const mockConfig = { settings: {} };
  const mockOnVideoFound = [];
  const mockOnVideoRemoved = [];

  const onVideoFound = (video, parent) => {
    mockOnVideoFound.push({ video, parent });
  };

  const onVideoRemoved = (video) => {
    mockOnVideoRemoved.push(video);
  };

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    onVideoFound,
    onVideoRemoved
  );

  const container = document.createElement('div');
  const innerDiv = document.createElement('div');
  const videoElement = document.createElement('video');
  innerDiv.appendChild(videoElement);
  container.appendChild(innerDiv);

  const mutation = {
    type: 'childList',
    addedNodes: [container],
    removedNodes: [],
    target: document.body,
  };

  observer.processMutations([mutation]);

  assert.equal(mockOnVideoFound.length, 1);
  assert.equal(mockOnVideoFound[0].video, videoElement);
  assert.equal(mockOnVideoFound[0].parent, videoElement.parentNode);
});

// ─────────────────────────────────────────────────────────────────────────────
// Lines 259, 261-262 — GIF removal path in checkForVideoAndShadowRoot
//
// When an IMG node with a gifController (that is not pending) is removed
// from the DOM and its canvas is NOT in the DOM, onGifRemoved must be called.
// This exercises the branch at lines 259-262.
// ─────────────────────────────────────────────────────────────────────────────

runner.test('VideoMutationObserver calls onGifRemoved when gif IMG is removed and canvas not in DOM', () => {
  const mockConfig = { settings: { audioBoolean: false } };
  const removedGifs = [];

  const onGifFound = () => {};
  const onGifRemoved = (node) => removedGifs.push(node);

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {},
    null,
    onGifFound,
    onGifRemoved
  );

  // Temporarily install a GifObserver mock so isGifElement returns true
  const origGifObserver = window.VSC.GifObserver;
  window.VSC.GifObserver = { isGifElement: () => true };

  // Create an IMG element that looks like a controlled GIF
  const img = document.createElement('img');
  img.src = 'https://example.com/animation.gif';

  // Attach a fake gifController: not pending, has remove(), canvas not in DOM
  const fakeCanvas = document.createElement('canvas');
  // fakeCanvas is NOT appended to document.body
  img.gifController = {
    pending: false,
    remove: () => {},
    _canvas: fakeCanvas,
  };

  // The img is NOT in document.body (simulating removal from DOM)
  // document.body.contains(img) returns false — so the removal path proceeds

  const mutation = {
    type: 'childList',
    addedNodes: [],
    removedNodes: [img],
    target: document.body,
  };

  try {
    observer.processMutations([mutation]);
  } finally {
    window.VSC.GifObserver = origGifObserver;
  }

  assert.equal(removedGifs.length, 1, 'onGifRemoved must be called for removed GIF with controller');
  assert.equal(removedGifs[0], img, 'onGifRemoved must receive the img node');
});

runner.test('VideoMutationObserver does NOT call onGifRemoved when gifController.pending is true', () => {
  const mockConfig = { settings: { audioBoolean: false } };
  const removedGifs = [];
  const onGifRemoved = (node) => removedGifs.push(node);

  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {},
    null,
    null,
    onGifRemoved
  );

  const img = document.createElement('img');
  img.src = 'https://example.com/animation.gif';
  img.gifController = { pending: true, remove: () => {}, _canvas: null };

  const mutation = {
    type: 'childList',
    addedNodes: [],
    removedNodes: [img],
    target: document.body,
  };

  observer.processMutations([mutation]);

  assert.equal(removedGifs.length, 0, 'onGifRemoved must NOT be called when gifController.pending is true');
});

// ─────────────────────────────────────────────────────────────────────────────
// Lines 334-336 — onDocumentReplaced() logs a warning
// ─────────────────────────────────────────────────────────────────────────────

runner.test('VideoMutationObserver onDocumentReplaced() triggers document-replacement handling', () => {
  const mockConfig = { settings: {} };
  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {}
  );

  // onDocumentReplaced() calls window.VSC.logger.warn — capture it
  const warnCalls = [];
  const origWarn = window.VSC.logger.warn.bind(window.VSC.logger);
  window.VSC.logger.warn = (msg) => warnCalls.push(msg);

  let threw = false;
  try {
    observer.onDocumentReplaced();
  } catch (_e) {
    threw = true;
  } finally {
    window.VSC.logger.warn = origWarn;
  }

  assert.equal(threw, false, 'onDocumentReplaced() must not throw');
  // The warn message is emitted (line 335)
  assert.equal(warnCalls.length, 1, 'onDocumentReplaced() must emit exactly one warning');
});

runner.test('document replacement mutation triggers onDocumentReplaced path', () => {
  const mockConfig = { settings: {} };
  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {}
  );

  // document.documentElement triggers the "document was replaced" branch
  const mutation = {
    type: 'childList',
    addedNodes: [document.documentElement],
    removedNodes: [],
    target: document.body,
  };

  // Patch logger.warn to suppress output
  const origWarn = window.VSC.logger.warn.bind(window.VSC.logger);
  window.VSC.logger.warn = () => {};

  let threw = false;
  try {
    observer.processMutations([mutation]);
  } catch (_e) {
    threw = true;
  } finally {
    window.VSC.logger.warn = origWarn;
  }

  assert.equal(threw, false, 'Processing document-replacement mutation must not throw');
});

// ─────────────────────────────────────────────────────────────────────────────
// Lines 342-354 — stop() disconnects main observer and all shadow observers
// ─────────────────────────────────────────────────────────────────────────────

runner.test('stop() sets observer to null after disconnecting', () => {
  const mockConfig = { settings: {} };
  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {}
  );

  // Start the observer on the document so this.observer is set
  observer.start(document);
  assert.exists(observer.observer, 'observer.observer must be set after start()');

  observer.stop();

  assert.equal(observer.observer, null, 'observer.observer must be null after stop()');
});

runner.test('stop() clears all shadow observers', () => {
  const mockConfig = { settings: {} };
  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {}
  );

  observer.start(document);

  // Manually add a shadow observer entry to verify it is cleaned up
  const fakeShadowObs = { disconnect: () => {} };
  const fakeShadowRoot = document.createElement('div'); // use as key
  observer.shadowObservers.set(fakeShadowRoot, fakeShadowObs);

  assert.equal(observer.shadowObservers.size, 1, 'shadowObservers must have 1 entry before stop()');

  observer.stop();

  assert.equal(observer.shadowObservers.size, 0, 'shadowObservers must be empty after stop()');
});

runner.test('stop() is safe to call when observer was never started', () => {
  const mockConfig = { settings: {} };
  const observer = new window.VSC.VideoMutationObserver(
    mockConfig,
    () => {},
    () => {}
  );

  // observer.observer is null — stop() must not throw
  let threw = false;
  try {
    observer.stop();
  } catch (_e) {
    threw = true;
  }

  assert.equal(threw, false, 'stop() must not throw when observer was never started');
});

export { runner as mutationObserverTestRunner };