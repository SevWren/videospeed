/**
 * Unit tests for AmazonHandler
 * Seam: window.VSC.AmazonHandler constructor + public methods (Group F, SEAMS.md)
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
});

runner.afterEach(() => {
  cleanupChromeMock();
  location.hostname = 'localhost';
  location.href = 'http://localhost';
});

// --- static matches() ---

runner.test('AmazonHandler.matches returns true on www.amazon.com', () => {
  location.hostname = 'www.amazon.com';
  assert.equal(window.VSC.AmazonHandler.matches(), true);
});

runner.test('AmazonHandler.matches returns true on www.primevideo.com', () => {
  location.hostname = 'www.primevideo.com';
  assert.equal(window.VSC.AmazonHandler.matches(), true);
});

runner.test('AmazonHandler.matches returns true on amazon.co.uk subdomain variant', () => {
  location.hostname = 'www.amazon.co.uk';
  assert.equal(window.VSC.AmazonHandler.matches(), true);
});

runner.test('AmazonHandler.matches returns false on unrelated hostname', () => {
  location.hostname = 'www.youtube.com';
  assert.equal(window.VSC.AmazonHandler.matches(), false);
});

// --- getControllerPosition() ---

runner.test('AmazonHandler.getControllerPosition in gifMode delegates to base', () => {
  // RED: before gifMode branch, gif elements hit Amazon-specific logic.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.AmazonHandler();
  const result = handler.getControllerPosition(parent, video, { gifMode: true });

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

runner.test('AmazonHandler.getControllerPosition with CANVAS delegates to base', () => {
  // RED: before canvas check, canvas was treated as a regular video.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const canvas = document.createElement('canvas');

  const handler = new window.VSC.AmazonHandler();
  const result = handler.getControllerPosition(parent, canvas, {});

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

runner.test('AmazonHandler.getControllerPosition returns beforeParent for non-vjs-tech video', () => {
  // RED: before non-vjs-tech path, all videos used base handler positioning.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');
  // video does NOT have .vjs-tech class

  const handler = new window.VSC.AmazonHandler();
  const result = handler.getControllerPosition(parent, video, {});

  assert.equal(result.insertionPoint, grandparent);
  assert.equal(result.insertionMethod, 'beforeParent');
  assert.equal(result.targetParent, grandparent);
});

runner.test('AmazonHandler.getControllerPosition falls back to base when parent has no parentElement', () => {
  // RED: before the documentElement guard, detached parent caused DOM issues.
  // A detached div has parentElement === null
  const parent = document.createElement('div'); // no parent
  const video = document.createElement('video');

  const handler = new window.VSC.AmazonHandler();
  let threw = false;
  let result;
  try {
    result = handler.getControllerPosition(parent, video, {});
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
  // Falls back to super — returns parent as insertionPoint
  assert.equal(result.insertionPoint, parent);
});

runner.test('AmazonHandler.getControllerPosition uses base for vjs-tech video', () => {
  // RED: before vjs-tech fallback, vjs-tech videos also got beforeParent treatment.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');
  video.classList.add('vjs-tech');

  const handler = new window.VSC.AmazonHandler();
  const result = handler.getControllerPosition(parent, video, {});

  // vjs-tech path falls through to super which returns parent as insertionPoint
  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

// --- shouldIgnoreVideo() ---

runner.test('AmazonHandler.shouldIgnoreVideo returns false for null video', () => {
  // RED: before null-guard, null.tagName threw.
  const handler = new window.VSC.AmazonHandler();
  assert.equal(handler.shouldIgnoreVideo(null), false);
});

runner.test('AmazonHandler.shouldIgnoreVideo returns false for non-VIDEO element', () => {
  const audio = document.createElement('audio');
  const handler = new window.VSC.AmazonHandler();
  assert.equal(handler.shouldIgnoreVideo(audio), false);
});

runner.test('AmazonHandler.shouldIgnoreVideo returns false for video still loading (readyState < 2)', () => {
  // RED: before readyState guard, loading videos were incorrectly ignored based on rect.
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', { value: 1, writable: true, configurable: true });
  video.getBoundingClientRect = () => ({ width: 100, height: 50 });

  const handler = new window.VSC.AmazonHandler();
  assert.equal(handler.shouldIgnoreVideo(video), false);
});

runner.test('AmazonHandler.shouldIgnoreVideo returns true for small preview video', () => {
  // RED: before size check, all ready videos were accepted.
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', { value: 4, writable: true, configurable: true });
  video.getBoundingClientRect = () => ({ width: 150, height: 80 });

  const handler = new window.VSC.AmazonHandler();
  assert.equal(handler.shouldIgnoreVideo(video), true);
});

runner.test('AmazonHandler.shouldIgnoreVideo returns false for full-size video', () => {
  const video = document.createElement('video');
  Object.defineProperty(video, 'readyState', { value: 4, writable: true, configurable: true });
  video.getBoundingClientRect = () => ({ width: 1280, height: 720 });

  const handler = new window.VSC.AmazonHandler();
  assert.equal(handler.shouldIgnoreVideo(video), false);
});

// --- getVideoContainerSelectors() ---

runner.test('AmazonHandler.getVideoContainerSelectors returns Amazon-specific selectors', () => {
  // Covers lines 65-67
  const handler = new window.VSC.AmazonHandler();
  const selectors = handler.getVideoContainerSelectors();

  assert.equal(Array.isArray(selectors), true);
  assert.equal(selectors.includes('.dv-player-container'), true);
  assert.equal(selectors.includes('.webPlayerContainer'), true);
  assert.equal(selectors.includes('[data-testid="video-player"]'), true);
});

export { runner };
