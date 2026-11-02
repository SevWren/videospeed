/**
 * Unit tests for YouTubeHandler
 * Seam: window.VSC.YouTubeHandler constructor + public methods (Group F, SEAMS.md)
 */

import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

await loadCoreModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  // Reset to neutral hostname before each test
  location.hostname = 'localhost';
  location.href = 'http://localhost';
});

runner.afterEach(() => {
  cleanupChromeMock();
  location.hostname = 'localhost';
  location.href = 'http://localhost';
});

// --- static matches() ---

runner.test('YouTubeHandler.matches returns true on www.youtube.com', () => {
  // RED: before matches() compared location.hostname, it always returned false.
  location.hostname = 'www.youtube.com';
  assert.equal(window.VSC.YouTubeHandler.matches(), true);
});

runner.test('YouTubeHandler.matches returns false on non-YouTube hostname', () => {
  location.hostname = 'www.vimeo.com';
  assert.equal(window.VSC.YouTubeHandler.matches(), false);
});

// --- getControllerPosition() ---

runner.test('YouTubeHandler.getControllerPosition returns parent.parentElement as insertionPoint', () => {
  // RED: before the override, returned parent itself, not parent.parentElement.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.YouTubeHandler();
  const result = handler.getControllerPosition(parent, video, {});

  assert.equal(result.insertionPoint, grandparent);
  assert.equal(result.targetParent, grandparent);
  assert.equal(result.insertionMethod, 'firstChild');
});

runner.test('YouTubeHandler.getControllerPosition in gifMode delegates to base handler', () => {
  // RED: before gifMode check, gifMode branch was unreachable.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.YouTubeHandler();
  const result = handler.getControllerPosition(parent, video, { gifMode: true });

  // Base handler returns parent itself as insertionPoint
  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

// --- shouldIgnoreVideo() ---

runner.test('YouTubeHandler.shouldIgnoreVideo returns true for video-thumbnail class', () => {
  // RED: before class check was added, all videos returned false.
  const video = document.createElement('video');
  video.classList.add('video-thumbnail');

  const handler = new window.VSC.YouTubeHandler();
  assert.equal(handler.shouldIgnoreVideo(video), true);
});

runner.test('YouTubeHandler.shouldIgnoreVideo returns true when parent has ytp-ad-player-overlay', () => {
  // RED: before parentElement check, ad-overlay videos were not ignored.
  const parent = document.createElement('div');
  parent.classList.add('ytp-ad-player-overlay');
  const video = document.createElement('video');
  parent.appendChild(video);

  const handler = new window.VSC.YouTubeHandler();
  assert.equal(handler.shouldIgnoreVideo(video), true);
});

runner.test('YouTubeHandler.shouldIgnoreVideo returns false for normal video', () => {
  const video = document.createElement('video');
  const container = document.createElement('div');
  container.classList.add('html5-video-player');
  container.appendChild(video);

  const handler = new window.VSC.YouTubeHandler();
  assert.equal(handler.shouldIgnoreVideo(video), false);
});

// --- getVideoContainerSelectors() ---

runner.test('YouTubeHandler.getVideoContainerSelectors returns YouTube-specific selectors', () => {
  // RED: before override, base class returned [].
  const handler = new window.VSC.YouTubeHandler();
  const selectors = handler.getVideoContainerSelectors();

  assert.equal(Array.isArray(selectors), true);
  assert.equal(selectors.includes('.html5-video-player'), true);
  assert.equal(selectors.includes('#movie_player'), true);
  assert.equal(selectors.includes('.ytp-player-content'), true);
});

// --- detectSpecialVideos() ---

runner.test('YouTubeHandler.detectSpecialVideos returns empty array when no iframes present', () => {
  // RED: before implementation, method returned undefined.
  const handler = new window.VSC.YouTubeHandler();
  const result = handler.detectSpecialVideos(document);

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

runner.test('YouTubeHandler.detectSpecialVideos skips cross-origin iframes gracefully', () => {
  // Simulate an iframe whose contentDocument throws (cross-origin)
  const iframe = document.createElement('iframe');
  iframe.setAttribute('src', 'https://www.youtube.com/embed/abc');
  document.body.appendChild(iframe);

  // Override contentDocument to throw
  Object.defineProperty(iframe, 'contentDocument', {
    get() { throw new Error('cross-origin'); },
    configurable: true,
  });

  const handler = new window.VSC.YouTubeHandler();
  let result;
  try {
    result = handler.detectSpecialVideos(document);
  } finally {
    document.body.removeChild(iframe);
    delete iframe.contentDocument;
  }

  assert.equal(Array.isArray(result), true);
});

runner.test('YouTubeHandler.detectSpecialVideos collects videos from accessible same-origin iframe', () => {
  // Covers lines 94-96 — the iframeDoc success path
  const iframeVideo = document.createElement('video');

  // Build a mock iframe with an accessible contentDocument containing a video
  const fakeIframeDoc = {
    querySelectorAll: (sel) => (sel === 'video' ? [iframeVideo] : []),
  };
  const iframe = { contentDocument: fakeIframeDoc };

  // Patch querySelectorAll to return our fake iframe for the youtube src selector
  const origQSA = document.querySelectorAll.bind(document);
  document.querySelectorAll = (sel) => {
    if (sel === 'iframe[src*="youtube.com"]') return [iframe];
    return origQSA(sel);
  };

  const handler = new window.VSC.YouTubeHandler();
  const result = handler.detectSpecialVideos(document);

  document.querySelectorAll = origQSA;

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 1);
  assert.equal(result[0], iframeVideo);
});

runner.test('YouTubeHandler.detectSpecialVideos handles querySelectorAll throwing at outer level', () => {
  // Covers lines 101-103 — outer catch
  const origQSA = document.querySelectorAll.bind(document);
  document.querySelectorAll = () => { throw new Error('DOM failure'); };

  const handler = new window.VSC.YouTubeHandler();
  let result;
  let threw = false;
  try {
    result = handler.detectSpecialVideos(document);
  } catch (_e) {
    threw = true;
  }

  document.querySelectorAll = origQSA;

  assert.equal(threw, false);
  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, 0);
});

// --- initialize() ---

runner.test('YouTubeHandler.initialize runs without throwing', () => {
  // RED: before super.initialize call + setupYouTubeCSS, method was absent.
  const handler = new window.VSC.YouTubeHandler();
  let threw = false;
  try {
    handler.initialize(document);
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
});

// --- onPlayerStateChange() ---

runner.test('YouTubeHandler.onPlayerStateChange runs without throwing', () => {
  // Covers lines 112-116
  const handler = new window.VSC.YouTubeHandler();
  const video = document.createElement('video');
  let threw = false;
  try {
    handler.onPlayerStateChange(video);
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
});

export { runner };
