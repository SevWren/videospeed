/**
 * Unit tests for VideoSpeedExtension (inject.js)
 * Testing the fix for video elements without parentElement
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, createMockVideo, createMockDOM } from '../../helpers/test-utils.js';
import { loadInjectModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadInjectModules();

const runner = new SimpleTestRunner();
let mockDOM;
let extension;

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  mockDOM = createMockDOM();

  // Initialize site handler manager for tests
  if (window.VSC && window.VSC.siteHandlerManager) {
    window.VSC.siteHandlerManager.initialize(document);
  }
});

runner.afterEach(() => {
  cleanupChromeMock();
  if (mockDOM) {
    mockDOM.cleanup();
  }
  if (extension) {
    extension = null;
  }

  // Clean up any remaining video elements
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    if (video.vsc) {
      try {
        video.vsc.remove();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (video.parentNode) {
      try {
        video.parentNode.removeChild(video);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  });
});

/**
 * Create a video element without parentElement but with parentNode
 * This simulates shadow DOM scenarios where parentElement is undefined
 */
function createVideoWithoutParentElement() {
  const video = createMockVideo();
  const parentNode = document.createElement('div');

  // Simulate shadow DOM scenario where parentElement is undefined
  Object.defineProperty(video, 'parentElement', {
    value: null,
    writable: false,
    configurable: true
  });

  Object.defineProperty(video, 'parentNode', {
    value: parentNode,
    writable: false,
    configurable: true
  });

  // Mock isConnected property for validity check
  Object.defineProperty(video, 'isConnected', {
    value: true,
    writable: false,
    configurable: true
  });

  return { video, parentNode };
}

runner.test('onVideoFound should handle video elements without parentElement', async () => {
  // Create extension instance
  extension = new window.VideoSpeedExtension();

  try {
    await extension.initialize();

    // Create a video element without parentElement but with parentNode
    const { video, parentNode } = createVideoWithoutParentElement();

    // Test the onVideoFound method directly - this is the core functionality
    extension.onVideoFound(video, parentNode);

    // Verify that the video controller was attached
    assert.exists(video.vsc, 'Video controller should be attached to the video element');
    assert.true(video.vsc instanceof window.VSC.VideoController, 'Should create VideoController instance');

    // Verify that the controller was initialized with the correct parent (parentNode fallback)
    assert.equal(video.vsc.parent, parentNode, 'VideoController should use parentNode when parentElement is null');

  } catch (error) {
    console.error('Test error:', error);
    assert.true(false, `Test should not throw error: ${error.message}`);
  }
});

runner.test('onVideoFound should prefer parentElement when available', async () => {
  // Create extension instance
  extension = new window.VideoSpeedExtension();

  try {
    await extension.initialize();

    // Create a normal video element with both parentElement and parentNode
    const video = createMockVideo();
    const parentElement = document.createElement('div');
    const parentNode = document.createElement('span'); // Different from parentElement

    Object.defineProperty(video, 'parentElement', {
      value: parentElement,
      writable: false,
      configurable: true
    });

    Object.defineProperty(video, 'parentNode', {
      value: parentNode,
      writable: false,
      configurable: true
    });

    // Mock isConnected property for validity check
    Object.defineProperty(video, 'isConnected', {
      value: true,
      writable: false,
      configurable: true
    });

    // Test onVideoFound with parentElement available
    extension.onVideoFound(video, parentNode);

    // Verify that the video controller was attached
    assert.exists(video.vsc, 'Video controller should be attached to the video element');

    // Verify that the controller was initialized with video.parentElement (not the passed parent)
    // VideoController constructor uses target.parentElement || parent
    assert.equal(video.vsc.parent, parentElement, 'VideoController should prefer video.parentElement when available');

  } catch (error) {
    assert.true(false, `Test should not throw error: ${error.message}`);
  }
});

runner.test('onVideoFound should handle video with neither parentElement nor parentNode', async () => {
  // Verify VideoSpeedExtension is available
  assert.exists(window.VideoSpeedExtension, 'VideoSpeedExtension class should be available on window');
  
  // Create extension instance
  extension = new window.VideoSpeedExtension();
  
  // Verify extension was created
  assert.exists(extension, 'Extension instance should be created');

  try {
    await extension.initialize();

    // Create a video element with no parent references
    const video = createMockVideo();
    const fallbackParent = document.createElement('div');

    Object.defineProperty(video, 'parentElement', {
      value: null,
      writable: false,
      configurable: true
    });

    Object.defineProperty(video, 'parentNode', {
      value: null,
      writable: false,
      configurable: true
    });

    // Mock isConnected property for validity check
    Object.defineProperty(video, 'isConnected', {
      value: true,
      writable: false,
      configurable: true
    });

    // This should not throw an error even with no parent references
    extension.onVideoFound(video, fallbackParent);

    // Verify basic functionality
    assert.exists(video.vsc, 'Video controller should be attached even without parent references');
    assert.equal(video.vsc.parent, fallbackParent, 'VideoController should use provided fallback parent');

  } catch (error) {
    assert.true(false, `Test should not throw error: ${error.message}`);
  }
});

// ── Live settings relay — Seam B tests (issue #10) ───────────────────────────
// Dispatch VSC_USER_SETTINGS on window and assert that the live config is
// updated immediately.  The listener in inject.js references the module-level
// `window.videoSpeedExtension` instance (set at module load time), so tests
// read results from that instance rather than creating a new one.

runner.test('VSC_USER_SETTINGS updates keyBindings in live config when extension is initialized', () => {
  // window.videoSpeedExtension is the module-level instance whose listener
  // was registered when loadInjectModules() loaded inject.js.
  const ext = window.videoSpeedExtension;
  if (!ext || !ext.initialized) return; // guard: skip if module didn't init

  const newBindings = [
    { action: 'faster', key: 70, value: 0.1, force: false, predefined: true },
    { action: 'slower', key: 71, value: 0.1, force: false, predefined: true },
  ];

  window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
    detail: { keyBindings: newBindings },
  }));

  assert.equal(
    ext.config.settings.keyBindings, newBindings,
    'keyBindings reference should be updated after relay dispatch'
  );
  assert.equal(ext.config.settings.keyBindings[0].key, 70, 'new key code should be in effect');
});

runner.test('VSC_USER_SETTINGS is a no-op before extension.initialized is true', () => {
  const ext = window.videoSpeedExtension;
  if (!ext) return;

  const originalBindings = ext.config.settings.keyBindings;
  const wasInitialized = ext.initialized;

  // Temporarily mark as not initialized to test the guard
  ext.initialized = false;

  window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
    detail: { keyBindings: [{ action: 'faster', key: 99, value: 0.5, force: false, predefined: true }] },
  }));

  // Restore
  ext.initialized = wasInitialized;

  assert.equal(
    ext.config.settings.keyBindings, originalBindings,
    'keyBindings must not be modified while extension.initialized is false'
  );
});

runner.test('VSC_USER_SETTINGS updates rememberSpeed and gifSpeedStep simultaneously', () => {
  const ext = window.videoSpeedExtension;
  if (!ext || !ext.initialized) return;

  window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
    detail: { rememberSpeed: true, gifSpeedStep: 0.25 },
  }));

  assert.equal(ext.config.settings.rememberSpeed, true, 'rememberSpeed should be updated');
  assert.equal(ext.config.settings.gifSpeedStep, 0.25, 'gifSpeedStep should be updated');
});

runner.test('VSC_USER_SETTINGS does not wipe unrelated runtime state', () => {
  const ext = window.videoSpeedExtension;
  if (!ext || !ext.initialized) return;

  ext.config.settings.speeds = { 'https://example.com/video.mp4': 1.5 };
  ext.config.settings.lastSpeed = 1.5;

  window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
    detail: { rememberSpeed: false },
  }));

  assert.equal(
    ext.config.settings.speeds['https://example.com/video.mp4'], 1.5,
    'per-source speeds must not be wiped by relay patch'
  );
  assert.equal(ext.config.settings.lastSpeed, 1.5, 'lastSpeed must not be reset by relay patch');
});

runner.test(
  'Seam B: VSC_USER_SETTINGS with modified keyBindings triggers action on matching keydown',
  async () => {
    const ext = window.videoSpeedExtension;
    assert.exists(ext, 'window.videoSpeedExtension should be available');

    if (!ext.initialized) {
      await ext.initialize();
    }
    assert.true(ext.initialized, 'Extension should be initialized');

    // Add a mock video to config so the keydown handler does not bail early
    const video = document.createElement('video');
    video.playbackRate = 1.0;
    ext.config.addMediaElement(video);

    // Use a unique keyCode (999) that does not conflict with any existing binding
    const uniqueKeyCode = 999;
    const newBindings = [
      { action: 'faster', key: uniqueKeyCode, value: 0.5, force: false, predefined: false },
    ];

    let runActionCalled = false;
    let runActionArgs = null;
    const origRunAction = ext.actionHandler.runAction.bind(ext.actionHandler);
    ext.actionHandler.runAction = (action, value, event) => {
      runActionCalled = true;
      runActionArgs = { action, value };
      return origRunAction(action, value, event);
    };

    try {
      // Step 1: relay new bindings in via VSC_USER_SETTINGS
      window.dispatchEvent(
        new CustomEvent('VSC_USER_SETTINGS', { detail: { keyBindings: newBindings } })
      );

      assert.equal(
        ext.config.settings.keyBindings,
        newBindings,
        'keyBindings should be updated after VSC_USER_SETTINGS'
      );

      // Step 2: fire a synthetic keydown with the unique keyCode
      const keyEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        keyCode: uniqueKeyCode,
      });
      Object.defineProperty(keyEvent, 'keyCode', { value: uniqueKeyCode });
      document.dispatchEvent(keyEvent);

      // Step 3: assert the action was dispatched
      assert.true(runActionCalled, 'runAction should be called after keydown with new keyCode');
      assert.equal(runActionArgs.action, 'faster', 'Action should be "faster"');
      assert.equal(runActionArgs.value, 0.5, 'Action value should be 0.5');
    } finally {
      ext.actionHandler.runAction = origRunAction;
      ext.config.removeMediaElement(video);
      ext.config.settings.keyBindings = [...window.VSC.Constants.DEFAULT_SETTINGS.keyBindings];
    }
  }
);

export { runner as injectTestRunner };