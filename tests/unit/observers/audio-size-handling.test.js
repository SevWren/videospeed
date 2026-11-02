/**
 * Tests for audio element size handling
 */

import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadObserverModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadObserverModules();

const runner = new SimpleTestRunner();

// Test constants — arbitrary small sizes used to exercise audio/video element handling.
// The production isValidMediaElement() has no size threshold; these values represent
// elements that would have been invisible in older size-gated logic.
const SMALL_AUDIO_SIZE = {
  WIDTH: 20,
  HEIGHT: 15,
};

const SMALL_VIDEO_SIZE = {
  WIDTH: 40,
  HEIGHT: 30,
};

runner.beforeEach(() => {
  installChromeMock();
});

runner.afterEach(() => {
  cleanupChromeMock();
});

function createMockAudio(options = {}) {
  const audio = document.createElement('audio');

  // Set up properties
  Object.defineProperties(audio, {
    readyState: {
      value: options.readyState || 2, // HAVE_CURRENT_DATA
      writable: true,
      configurable: true,
    },
    currentSrc: {
      value: options.currentSrc || 'https://example.com/audio.mp3',
      writable: true,
      configurable: true,
    },
    ownerDocument: {
      value: document,
      writable: true,
      configurable: true,
    },
  });

  // Mock getBoundingClientRect to return small size by default
  audio.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    width: options.width || SMALL_AUDIO_SIZE.WIDTH,
    height: options.height || SMALL_AUDIO_SIZE.HEIGHT,
  });

  // Mock isConnected
  Object.defineProperty(audio, 'isConnected', {
    value: true,
    configurable: true,
  });

  return audio;
}

runner.test('MediaElementObserver should allow small audio when audioBoolean enabled', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  // Enable audio support
  config.settings.audioBoolean = true;

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const smallAudio = createMockAudio({ width: SMALL_AUDIO_SIZE.WIDTH, height: SMALL_AUDIO_SIZE.HEIGHT });
  document.body.appendChild(smallAudio);

  const isValid = observer.isValidMediaElement(smallAudio);
  assert.true(isValid, 'Small audio element should be valid when audioBoolean is enabled');

  // Cleanup
  document.body.removeChild(smallAudio);
});

runner.test('MediaElementObserver should reject small audio when audioBoolean disabled', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  // Disable audio support
  config.settings.audioBoolean = false;

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const smallAudio = createMockAudio({ width: SMALL_AUDIO_SIZE.WIDTH, height: SMALL_AUDIO_SIZE.HEIGHT });
  document.body.appendChild(smallAudio);

  const isValid = observer.isValidMediaElement(smallAudio);
  assert.false(isValid, 'Small audio element should be rejected when audioBoolean is disabled');

  // Cleanup
  document.body.removeChild(smallAudio);
});

runner.test('VideoController should start visible for small audio elements', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  // Enable audio support
  config.settings.audioBoolean = true;
  config.settings.startHidden = false; // Ensure global startHidden is false

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const smallAudio = createMockAudio({ width: SMALL_AUDIO_SIZE.WIDTH, height: SMALL_AUDIO_SIZE.HEIGHT });
  document.body.appendChild(smallAudio);

  // Use MediaElementObserver to determine if controller should start hidden
  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);
  const shouldStartHidden = observer.shouldStartHidden(smallAudio);

  const controller = new window.VSC.VideoController(smallAudio, null, config, actionHandler, shouldStartHidden);

  // Check that controller was created
  assert.exists(controller.div, 'Controller should be created for small audio');

  // Check that it starts visible (size no longer matters)
  assert.false(
    controller.div.classList.contains('vsc-hidden'),
    'Small audio controller should start visible'
  );

  // Cleanup
  controller.remove();
  document.body.removeChild(smallAudio);
});

runner.test('VideoController should accept all video sizes', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  // Create small video element
  const smallVideo = document.createElement('video');
  smallVideo.getBoundingClientRect = () => ({
    top: 0,
    left: 0,
    width: SMALL_VIDEO_SIZE.WIDTH, // Small but should still get visible controller
    height: SMALL_VIDEO_SIZE.HEIGHT, // Small but should still get visible controller
  });

  Object.defineProperty(smallVideo, 'isConnected', {
    value: true,
    configurable: true,
  });

  Object.defineProperty(smallVideo, 'readyState', {
    value: 2,
    configurable: true,
  });

  document.body.appendChild(smallVideo);

  const isValid = observer.isValidMediaElement(smallVideo);
  assert.true(isValid, 'Small video element should be allowed');

  // Check if it would start hidden (should not due to size)
  const shouldStartHidden = observer.shouldStartHidden(smallVideo);
  assert.false(shouldStartHidden, 'Small video should start visible (size checks removed)');

  // Cleanup
  document.body.removeChild(smallVideo);
});

runner.test('Display toggle should work with audio controllers', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  // Enable audio support
  config.settings.audioBoolean = true;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const smallAudio = createMockAudio({ width: SMALL_AUDIO_SIZE.WIDTH, height: SMALL_AUDIO_SIZE.HEIGHT });
  document.body.appendChild(smallAudio);

  // Use MediaElementObserver to determine if controller should start hidden
  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);
  const shouldStartHidden = observer.shouldStartHidden(smallAudio);

  const controller = new window.VSC.VideoController(smallAudio, null, config, actionHandler, shouldStartHidden);

  // Verify starts visible (size checks removed)
  assert.false(controller.div.classList.contains('vsc-hidden'), 'Should start visible');

  // Toggle display using action handler
  actionHandler.runAction('display', 0, null);

  // Should now be hidden after first toggle
  assert.true(controller.div.classList.contains('vsc-hidden'), 'Should be hidden after first toggle');
  assert.true(controller.div.classList.contains('vsc-manual'), 'Should have manual class');

  // Toggle again
  actionHandler.runAction('display', 0, null);

  // Should be visible again after second toggle
  assert.false(controller.div.classList.contains('vsc-hidden'), 'Should be visible after second toggle');

  // Cleanup
  controller.remove();
  document.body.removeChild(smallAudio);
});

// --- MediaElementObserver.scanForGifs: GifObserver absent returns empty array (lines 256-257) ---

runner.test('scanForGifs returns [] when window.VSC.GifObserver is absent', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  // Temporarily remove GifObserver to exercise the early-return branch
  const saved = window.VSC.GifObserver;
  delete window.VSC.GifObserver;

  try {
    const results = observer.scanForGifs(document);
    assert.true(Array.isArray(results), 'scanForGifs should return an array');
    assert.true(results.length === 0, 'scanForGifs should return [] when GifObserver is absent');
  } finally {
    // Always restore (even if it was undefined before)
    if (saved !== undefined) {
      window.VSC.GifObserver = saved;
    }
  }
});

// --- MediaElementObserver.scanForGifs: filter exercises size-check branch (lines 262-278) ---
// These tests require GifObserver to be loaded. Load it on demand and restore after.

async function ensureGifObserver() {
  if (!window.VSC.GifObserver) {
    await import('../../../src/observers/gif-observer.js');
  }
}

runner.test('scanForGifs excludes img with gifController already set (line 262-263 branch)', async () => {
  await ensureGifObserver();

  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  img.gifController = {}; // triggers the early-exit filter branch
  document.body.appendChild(img);

  const results = observer.scanForGifs(document);
  document.body.removeChild(img);

  assert.false(results.includes(img), 'scanForGifs should exclude img with gifController set');
});

runner.test('scanForGifs excludes non-gif img (exercises !isGifElement branch lines 265-267)', async () => {
  await ensureGifObserver();

  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const img = document.createElement('img');
  img.src = 'https://example.com/photo.png'; // not a gif
  document.body.appendChild(img);

  const results = observer.scanForGifs(document);
  document.body.removeChild(img);

  assert.false(results.includes(img), 'scanForGifs should exclude non-gif img elements');
});

runner.test('scanForGifs includes gif with known dimensions above minimum size (lines 271-277)', async () => {
  await ensureGifObserver();

  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  // naturalWidth/Height > 0 means the size-filter branch is taken
  Object.defineProperty(img, 'naturalWidth', { value: 50, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 50, configurable: true });
  document.body.appendChild(img);

  const results = observer.scanForGifs(document);
  document.body.removeChild(img);

  assert.true(results.includes(img), 'scanForGifs should include 50x50 gif (above GIF_MIN_SIZE_PX)');
});

runner.test('scanForGifs excludes gif with known dimensions below minimum size (lines 271-276 false branch)', async () => {
  await ensureGifObserver();

  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const img = document.createElement('img');
  img.src = 'https://example.com/tiny.gif';
  // Below GIF_MIN_SIZE_PX (which is typically 16px)
  Object.defineProperty(img, 'naturalWidth', { value: 1, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 1, configurable: true });
  document.body.appendChild(img);

  const results = observer.scanForGifs(document);
  document.body.removeChild(img);

  assert.false(results.includes(img), 'scanForGifs should exclude 1x1 gif (below GIF_MIN_SIZE_PX)');
});

// --- MediaElementObserver.findControllerParent (lines 288-290) ---

runner.test('findControllerParent returns site-handler targetParent when provided (lines 288-290)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const customParent = document.createElement('div');
  const video = document.createElement('video');
  const defaultParent = document.createElement('div');
  defaultParent.appendChild(video);
  document.body.appendChild(defaultParent);
  document.body.appendChild(customParent);

  // Create a site handler stub that returns a specific targetParent
  const siteHandlerStub = {
    getControllerPosition: (_parent, _media) => ({ targetParent: customParent }),
    detectSpecialVideos: () => [],
    shouldIgnoreVideo: () => false,
    getVideoContainerSelectors: () => [],
  };

  const observer = new window.VSC.MediaElementObserver(config, siteHandlerStub);
  const result = observer.findControllerParent(video);

  document.body.removeChild(defaultParent);
  document.body.removeChild(customParent);

  assert.true(result === customParent, 'findControllerParent should return targetParent from site handler');
});

runner.test('findControllerParent falls back to media.parentElement when targetParent is null (line 289)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const video = document.createElement('video');
  const parentDiv = document.createElement('div');
  parentDiv.appendChild(video);
  document.body.appendChild(parentDiv);

  // Site handler returns no targetParent — null/undefined
  const siteHandlerStub = {
    getControllerPosition: (_parent, _media) => ({ targetParent: null }),
    detectSpecialVideos: () => [],
    shouldIgnoreVideo: () => false,
    getVideoContainerSelectors: () => [],
  };

  const observer = new window.VSC.MediaElementObserver(config, siteHandlerStub);
  const result = observer.findControllerParent(video);

  document.body.removeChild(parentDiv);

  assert.true(result === parentDiv, 'findControllerParent should fall back to media.parentElement');
});

// --- shouldStartHidden: hidden video branch (lines 241-243) ---

runner.test('shouldStartHidden returns true for video with display:none (lines 241-243)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const video = document.createElement('video');
  video.style.display = 'none';
  document.body.appendChild(video);

  const result = observer.shouldStartHidden(video);
  document.body.removeChild(video);

  assert.true(result, 'shouldStartHidden should return true for display:none video');
});

// --- isValidMediaElement: siteHandler.shouldIgnoreVideo returns true → return false (lines 201-203) ---

runner.test('isValidMediaElement returns false when siteHandler.shouldIgnoreVideo returns true (lines 201-203)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  // Stub site handler that ignores all videos
  const siteHandlerStub = {
    shouldIgnoreVideo: () => true,
    detectSpecialVideos: () => [],
    getVideoContainerSelectors: () => [],
    getControllerPosition: () => ({ targetParent: null }),
  };

  const observer = new window.VSC.MediaElementObserver(config, siteHandlerStub);

  const video = document.createElement('video');
  Object.defineProperty(video, 'isConnected', { value: true, configurable: true });
  document.body.appendChild(video);

  const result = observer.isValidMediaElement(video);
  document.body.removeChild(video);

  assert.false(result, 'isValidMediaElement should return false when siteHandler ignores the video');
});

// --- shouldStartHidden: audio with audioBoolean=false returns true (lines 220-222) ---

runner.test('shouldStartHidden returns true for audio when audioBoolean is disabled (lines 220-222)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();
  config.settings.audioBoolean = false;

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const audio = createMockAudio();
  const result = observer.shouldStartHidden(audio);

  assert.true(result, 'shouldStartHidden should return true for audio when audioBoolean is false');

  // Restore
  config.settings.audioBoolean = true;
});

// --- shouldStartHidden: audio.disabled → return true (lines 227-229) ---

runner.test('shouldStartHidden returns true for disabled audio element (lines 227-229)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();
  config.settings.audioBoolean = true;

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const audio = createMockAudio();
  Object.defineProperty(audio, 'disabled', { value: true, configurable: true });
  const result = observer.shouldStartHidden(audio);

  assert.true(result, 'shouldStartHidden should return true for disabled audio element');
});

// --- scanForGifs: img with naturalWidth=0 passes through (line 278 return true) ---

runner.test('scanForGifs includes gif with naturalWidth=0 (unknown size, line 278 return true)', async () => {
  await ensureGifObserver();

  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const siteHandler = new window.VSC.BaseSiteHandler();
  const observer = new window.VSC.MediaElementObserver(config, siteHandler);

  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  // naturalWidth defaults to 0 in JSDOM for unloaded images — exercises the return true path
  document.body.appendChild(img);

  const results = observer.scanForGifs(document);
  document.body.removeChild(img);

  assert.true(results.includes(img), 'scanForGifs should pass through gif with naturalWidth=0 (not yet loaded)');
});

export default runner;