/**
 * Unit tests for NetflixHandler
 * Seam: window.VSC.NetflixHandler constructor + public methods (Group F, SEAMS.md)
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

runner.test('NetflixHandler.matches returns true on www.netflix.com', () => {
  // RED: before matches() checked hostname, it always returned false.
  location.hostname = 'www.netflix.com';
  assert.equal(window.VSC.NetflixHandler.matches(), true);
});

runner.test('NetflixHandler.matches returns false on non-Netflix hostname', () => {
  location.hostname = 'www.hulu.com';
  assert.equal(window.VSC.NetflixHandler.matches(), false);
});

// --- getControllerPosition() ---

runner.test('NetflixHandler.getControllerPosition returns beforeParent for normal video', () => {
  // RED: before override, base handler returned parent directly.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.NetflixHandler();
  const result = handler.getControllerPosition(parent, video, {});

  assert.equal(result.insertionPoint, grandparent);
  assert.equal(result.insertionMethod, 'beforeParent');
  assert.equal(result.targetParent, grandparent);
});

runner.test('NetflixHandler.getControllerPosition in gifMode delegates to base', () => {
  // RED: before gifMode branch, gif mode hit the normal Netflix path.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.NetflixHandler();
  const result = handler.getControllerPosition(parent, video, { gifMode: true });

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

runner.test('NetflixHandler.getControllerPosition with CANVAS video delegates to base', () => {
  // RED: before canvas tagName check, canvas elements hit the Netflix positioning path.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const canvas = document.createElement('canvas');

  const handler = new window.VSC.NetflixHandler();
  const result = handler.getControllerPosition(parent, canvas, {});

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

// --- handleSeek() ---

runner.test('NetflixHandler.handleSeek returns true on success', () => {
  // RED: before postMessage path, handleSeek returned undefined.
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', { value: 10, writable: true, configurable: true });

  const handler = new window.VSC.NetflixHandler();
  const result = handler.handleSeek(video, 5);

  assert.equal(result, true);
});

runner.test('NetflixHandler.handleSeek posts message with correct seekMs', () => {
  // RED: before postMessage was called with seekMs, the message object was wrong.
  const video = document.createElement('video');
  const posted = [];
  const origPostMessage = window.postMessage ? window.postMessage.bind(window) : null;
  window.postMessage = (msg, target) => {
    posted.push({ msg, target });
  };

  const handler = new window.VSC.NetflixHandler();
  handler.handleSeek(video, 3);

  window.postMessage = origPostMessage;

  assert.equal(posted.length >= 1, true);
  assert.equal(posted[0].msg.action, 'videospeed-seek');
  assert.equal(posted[0].msg.seekMs, 3000);
});

runner.test('NetflixHandler.handleSeek falls back to currentTime when postMessage throws', () => {
  // RED: before fallback path, exceptions propagated uncaught.
  const video = document.createElement('video');
  Object.defineProperty(video, 'currentTime', { value: 10, writable: true, configurable: true });

  const origPostMessage = window.postMessage ? window.postMessage.bind(window) : null;
  window.postMessage = () => { throw new Error('blocked'); };

  const handler = new window.VSC.NetflixHandler();
  const result = handler.handleSeek(video, 5);

  window.postMessage = origPostMessage;

  // Falls back: currentTime += seekSeconds
  assert.equal(result, true);
  assert.equal(video.currentTime, 15);
});

// --- initialize() ---

runner.test('NetflixHandler.initialize runs without throwing', () => {
  // Covers lines 66-74
  const handler = new window.VSC.NetflixHandler();
  let threw = false;
  try {
    handler.initialize(document);
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
});

// --- shouldIgnoreVideo() ---

runner.test('NetflixHandler.shouldIgnoreVideo returns false for null video', () => {
  // RED: before null-guard, null.tagName threw.
  const handler = new window.VSC.NetflixHandler();
  assert.equal(handler.shouldIgnoreVideo(null), false);
});

runner.test('NetflixHandler.shouldIgnoreVideo returns false for non-VIDEO element', () => {
  const audio = document.createElement('audio');
  const handler = new window.VSC.NetflixHandler();
  assert.equal(handler.shouldIgnoreVideo(audio), false);
});

runner.test('NetflixHandler.shouldIgnoreVideo returns true for preview-video class', () => {
  // RED: before class check, preview videos were not ignored.
  const video = document.createElement('video');
  video.classList.add('preview-video');

  const handler = new window.VSC.NetflixHandler();
  assert.equal(handler.shouldIgnoreVideo(video), true);
});

runner.test('NetflixHandler.shouldIgnoreVideo returns true when parent has billboard-row class', () => {
  // RED: before parentElement check, billboard thumbnails were not ignored.
  const parent = document.createElement('div');
  parent.classList.add('billboard-row');
  const video = document.createElement('video');
  parent.appendChild(video);

  const handler = new window.VSC.NetflixHandler();
  assert.equal(handler.shouldIgnoreVideo(video), true);
});

runner.test('NetflixHandler.shouldIgnoreVideo returns false for normal watch video', () => {
  const video = document.createElement('video');
  const container = document.createElement('div');
  container.classList.add('watch-video');
  container.appendChild(video);

  const handler = new window.VSC.NetflixHandler();
  assert.equal(handler.shouldIgnoreVideo(video), false);
});

// --- getVideoContainerSelectors() ---

runner.test('NetflixHandler.getVideoContainerSelectors returns Netflix-specific selectors', () => {
  // Covers lines 96-98
  const handler = new window.VSC.NetflixHandler();
  const selectors = handler.getVideoContainerSelectors();

  assert.equal(Array.isArray(selectors), true);
  assert.equal(selectors.includes('.watch-video'), true);
  assert.equal(selectors.includes('.nfp-container'), true);
  assert.equal(selectors.includes('#netflix-player'), true);
});

export { runner };
