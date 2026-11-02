/**
 * Unit tests for AppleHandler
 * Seam: window.VSC.AppleHandler constructor + public methods (Group F, SEAMS.md)
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

runner.test('AppleHandler.matches returns true on tv.apple.com', () => {
  // RED: before matches() checked hostname, it returned false.
  location.hostname = 'tv.apple.com';
  assert.equal(window.VSC.AppleHandler.matches(), true);
});

runner.test('AppleHandler.matches returns false on www.apple.com', () => {
  location.hostname = 'www.apple.com';
  assert.equal(window.VSC.AppleHandler.matches(), false);
});

runner.test('AppleHandler.matches returns false on unrelated hostname', () => {
  location.hostname = 'www.netflix.com';
  assert.equal(window.VSC.AppleHandler.matches(), false);
});

// --- getControllerPosition() ---

runner.test('AppleHandler.getControllerPosition returns firstChild with parentNode', () => {
  // RED: before override, base handler returned parent itself as insertionPoint.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.AppleHandler();
  const result = handler.getControllerPosition(parent, video, {});

  assert.equal(result.insertionPoint, grandparent);
  assert.equal(result.insertionMethod, 'firstChild');
  assert.equal(result.targetParent, grandparent);
});

runner.test('AppleHandler.getControllerPosition in gifMode delegates to base handler', () => {
  // RED: before gifMode branch, gif elements used Apple-specific positioning.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.AppleHandler();
  const result = handler.getControllerPosition(parent, video, { gifMode: true });

  // Base handler returns parent itself
  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

// --- getVideoContainerSelectors() ---

runner.test('AppleHandler.getVideoContainerSelectors returns Apple-specific selectors', () => {
  // Covers lines 39-41
  const handler = new window.VSC.AppleHandler();
  const selectors = handler.getVideoContainerSelectors();

  assert.equal(Array.isArray(selectors), true);
  assert.equal(selectors.includes('apple-tv-plus-player'), true);
  assert.equal(selectors.includes('[data-testid="player"]'), true);
  assert.equal(selectors.includes('.video-container'), true);
});

// --- detectSpecialVideos() ---

runner.test('AppleHandler.detectSpecialVideos returns empty array when no apple-tv-plus-player element', () => {
  // RED: before check for applePlayer, missing element caused a null-deref.
  const handler = new window.VSC.AppleHandler();
  const result = handler.detectSpecialVideos(document);

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

runner.test('AppleHandler.detectSpecialVideos returns empty array when apple player has no shadowRoot', () => {
  // Covers line 51 false-branch
  const player = document.createElement('div');
  // player has no shadowRoot property

  const origQuerySelector = document.querySelector.bind(document);
  document.querySelector = (sel) => {
    if (sel === 'apple-tv-plus-player') return player;
    return origQuerySelector(sel);
  };

  const handler = new window.VSC.AppleHandler();
  const result = handler.detectSpecialVideos(document);

  document.querySelector = origQuerySelector;

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

runner.test('AppleHandler.detectSpecialVideos returns videos from shadowRoot when present', () => {
  // Covers lines 49-54 — the shadowRoot.querySelectorAll path
  const video1 = document.createElement('video');
  const video2 = document.createElement('video');

  const fakeShadowRoot = {
    querySelectorAll: (sel) => (sel === 'video' ? [video1, video2] : []),
  };

  // Use a plain object as the player proxy since shadowRoot is read-only on real DOM elements
  const player = {
    shadowRoot: fakeShadowRoot,
  };

  const origQuerySelector = document.querySelector.bind(document);
  document.querySelector = (sel) => {
    if (sel === 'apple-tv-plus-player') return player;
    return origQuerySelector(sel);
  };

  const handler = new window.VSC.AppleHandler();
  const result = handler.detectSpecialVideos(document);

  document.querySelector = origQuerySelector;

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 2);
  assert.equal(result[0], video1);
  assert.equal(result[1], video2);
});

export { runner };
