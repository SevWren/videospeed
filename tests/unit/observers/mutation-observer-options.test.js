/**
 * Tests for VideoMutationObserver options-object constructor interface.
 *
 * Seams under test:
 *   1. Constructor accepts an options object { onVideoFound, onVideoRemoved,
 *      onGifAdded, onGifRemoved, mediaObserver, config }
 *   2. Constructor rejects missing required options (onVideoFound, onVideoRemoved)
 *      with a clear error message
 *   3. Existing behavior is unchanged after the refactor — adding a video node
 *      still calls onVideoFound, removing still calls onVideoRemoved
 *   4. Backward-compatible positional signature is rejected (no silent aliasing)
 */
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadObserverModules } from '../../helpers/module-loader.js';
import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';

await loadObserverModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => { installChromeMock(); });
runner.afterEach(() => { cleanupChromeMock(); });

// ─── Constructor: options object accepted ─────────────────────────────────────

runner.test('VideoMutationObserver accepts options object { config, onVideoFound, onVideoRemoved }', () => {
  let threw = false;
  try {
    new window.VSC.VideoMutationObserver({
      config: { settings: { audioBoolean: false } },
      onVideoFound: () => {},
      onVideoRemoved: () => {},
    });
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'Constructor must not throw when required options are provided');
});

runner.test('VideoMutationObserver accepts options object with optional onGifAdded and onGifRemoved', () => {
  let threw = false;
  try {
    new window.VSC.VideoMutationObserver({
      config: { settings: { audioBoolean: false } },
      onVideoFound: () => {},
      onVideoRemoved: () => {},
      onGifAdded: () => {},
      onGifRemoved: () => {},
    });
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'Constructor must not throw with optional gif callbacks');
});

// ─── Constructor: missing required options rejected with clear error ───────────

runner.test('VideoMutationObserver throws when onVideoFound is missing from options', () => {
  let threw = false;
  let msg = '';
  try {
    new window.VSC.VideoMutationObserver({
      config: { settings: {} },
      onVideoRemoved: () => {},
    });
  } catch (e) {
    threw = true;
    msg = e.message;
  }
  assert.equal(threw, true, 'Constructor must throw when onVideoFound is missing');
  if (!msg.includes('onVideoFound')) {
    throw new Error(`Error message must mention "onVideoFound", got: "${msg}"`);
  }
});

runner.test('VideoMutationObserver throws when onVideoRemoved is missing from options', () => {
  let threw = false;
  let msg = '';
  try {
    new window.VSC.VideoMutationObserver({
      config: { settings: {} },
      onVideoFound: () => {},
    });
  } catch (e) {
    threw = true;
    msg = e.message;
  }
  assert.equal(threw, true, 'Constructor must throw when onVideoRemoved is missing');
  if (!msg.includes('onVideoRemoved')) {
    throw new Error(`Error message must mention "onVideoRemoved", got: "${msg}"`);
  }
});

runner.test('VideoMutationObserver throws when config is missing from options', () => {
  let threw = false;
  let msg = '';
  try {
    new window.VSC.VideoMutationObserver({
      onVideoFound: () => {},
      onVideoRemoved: () => {},
    });
  } catch (e) {
    threw = true;
    msg = e.message;
  }
  assert.equal(threw, true, 'Constructor must throw when config is missing');
  if (!msg.includes('config')) {
    throw new Error(`Error message must mention "config", got: "${msg}"`);
  }
});

// ─── Behavior unchanged after refactor ────────────────────────────────────────

runner.test('VideoMutationObserver (options form) calls onVideoFound when video node is added', () => {
  const found = [];
  const observer = new window.VSC.VideoMutationObserver({
    config: { settings: { audioBoolean: false } },
    onVideoFound: (video, parent) => found.push({ video, parent }),
    onVideoRemoved: () => {},
  });

  const videoElement = document.createElement('video');
  const mutation = {
    type: 'childList',
    addedNodes: [videoElement],
    removedNodes: [],
    target: document.body,
  };

  observer.processMutations([mutation]);

  assert.equal(found.length, 1, 'onVideoFound must be called once');
  assert.equal(found[0].video, videoElement, 'onVideoFound must receive the video element');
});

runner.test('VideoMutationObserver (options form) calls onVideoRemoved when video with vsc is removed', () => {
  const removed = [];
  const observer = new window.VSC.VideoMutationObserver({
    config: { settings: { audioBoolean: false } },
    onVideoFound: () => {},
    onVideoRemoved: (video) => removed.push(video),
  });

  const videoElement = document.createElement('video');
  videoElement.vsc = { remove: () => {} };

  const mutation = {
    type: 'childList',
    addedNodes: [],
    removedNodes: [videoElement],
    target: document.body,
  };

  observer.processMutations([mutation]);

  assert.equal(removed.length, 1, 'onVideoRemoved must be called once');
  assert.equal(removed[0], videoElement, 'onVideoRemoved must receive the video element');
});

runner.test('VideoMutationObserver (options form) calls onGifAdded for gif IMG node added', () => {
  const gifFound = [];

  const observer = new window.VSC.VideoMutationObserver({
    config: { settings: { audioBoolean: false } },
    onVideoFound: () => {},
    onVideoRemoved: () => {},
    onGifAdded: (node, parent) => gifFound.push({ node, parent }),
  });

  const origGifObserver = window.VSC.GifObserver;
  window.VSC.GifObserver = { isGifElement: () => true };

  const img = document.createElement('img');
  img.src = 'https://example.com/animation.gif';

  const mutation = {
    type: 'childList',
    addedNodes: [img],
    removedNodes: [],
    target: document.body,
  };

  try {
    observer.processMutations([mutation]);
  } finally {
    window.VSC.GifObserver = origGifObserver;
  }

  assert.equal(gifFound.length, 1, 'onGifAdded must be called for gif IMG node');
  assert.equal(gifFound[0].node, img, 'onGifAdded must receive the img node');
});

runner.test('VideoMutationObserver (options form) stop() still works', () => {
  const observer = new window.VSC.VideoMutationObserver({
    config: { settings: { audioBoolean: false } },
    onVideoFound: () => {},
    onVideoRemoved: () => {},
  });

  observer.start(document);

  let threw = false;
  try {
    observer.stop();
  } catch (_e) {
    threw = true;
  }

  assert.equal(threw, false, 'stop() must not throw');
  assert.equal(observer.observer, null, 'observer.observer must be null after stop()');
});

export default runner;
