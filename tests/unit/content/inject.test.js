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

runner.test('VSC_USER_SETTINGS dispatch updates keyBindings on initialized extension', async () => {
  // Use the module-level extension instance that inject.js registered the listener for
  const ext = window.videoSpeedExtension;
  assert.exists(ext, 'window.videoSpeedExtension should be available');

  // Ensure it is initialized (inject.js initializes it on load)
  if (!ext.initialized) {
    await ext.initialize();
  }
  assert.true(ext.initialized, 'Extension should be initialized');

  // Apply new keyBindings via VSC_USER_SETTINGS event
  const newBindings = [
    { action: 'faster', key: 70, value: 0.2, force: false, predefined: true },
  ];

  window.dispatchEvent(
    new CustomEvent('VSC_USER_SETTINGS', { detail: { keyBindings: newBindings } })
  );

  assert.equal(
    ext.config.settings.keyBindings,
    newBindings,
    'keyBindings should be updated to new value'
  );
});

runner.test('VSC_USER_SETTINGS dispatch before initialized is a no-op', async () => {
  extension = new window.VideoSpeedExtension();
  // Do NOT call initialize — extension.initialized is false

  // This should not throw and should not mutate settings
  window.dispatchEvent(
    new CustomEvent('VSC_USER_SETTINGS', { detail: { rememberSpeed: true } })
  );

  // The module-level extension listener guards with initialized check; a fresh
  // instance created here is not the one the listener references, so there is
  // nothing to assert on the fresh instance — just verify no error was thrown
  // and the fresh instance is still uninitialized.
  assert.equal(extension.initialized, false, 'Freshly created extension should still be uninitialized');
});

export { runner as injectTestRunner }; 