/**
 * Unit tests for VideoSpeedExtension (inject.js)
 *
 * Seam A: onVideoFound — video-controller attachment behavior (parentElement fallback)
 * Seam B: VSC_USER_SETTINGS live relay — config patching behavior
 * Seam C: setupDocumentCSS — null-head defensive guard
 *
 * Mocking policy: only chrome.* APIs are mocked (system boundary).
 * No internal collaborators (VideoController, MediaElementObserver, etc.) are mocked.
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, createMockVideo, createMockDOM } from '../../helpers/test-utils.js';
import { loadInjectModules } from '../../helpers/module-loader.js';

// Load all required modules once for the entire file.
await loadInjectModules();

const runner = new SimpleTestRunner();
let mockDOM;
// Per-test extension instance used by Seam A and Seam C tests.
let extension;

// ── Shared setup / teardown ──────────────────────────────────────────────────

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  mockDOM = createMockDOM();

  if (window.VSC && window.VSC.siteHandlerManager) {
    window.VSC.siteHandlerManager.initialize(document);
  }
});

runner.afterEach(() => {
  cleanupChromeMock();
  if (mockDOM) {
    mockDOM.cleanup();
  }
  extension = null;

  // Remove any video elements left behind by Seam A tests.
  document.querySelectorAll('video').forEach((video) => {
    if (video.vsc) {
      try { video.vsc.remove(); } catch (_e) { /* ignore */ }
    }
    if (video.parentNode) {
      try { video.parentNode.removeChild(video); } catch (_e) { /* ignore */ }
    }
  });
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build and await a fresh, fully-initialized VideoSpeedExtension instance.
 * Throws (failing the test loudly) if initialization does not complete.
 */
async function makeInitializedExtension() {
  const ext = new window.VideoSpeedExtension();
  await ext.initialize();
  assert.true(ext.initialized, 'prerequisite: extension must be initialized before test body runs');
  return ext;
}

/**
 * Return a mock video element whose parentElement is null but whose
 * parentNode is a real div — simulating shadow-DOM host scenarios.
 */
function createVideoWithoutParentElement() {
  const video = createMockVideo();
  const parentNode = document.createElement('div');

  Object.defineProperty(video, 'parentElement', { value: null, writable: false, configurable: true });
  Object.defineProperty(video, 'parentNode',    { value: parentNode, writable: false, configurable: true });
  Object.defineProperty(video, 'isConnected',   { value: true, writable: false, configurable: true });

  return { video, parentNode };
}

// ── Seam A: onVideoFound — parentElement fallback ───────────────────────────

runner.test('video without parentElement gets a controller attached', async () => {
  extension = await makeInitializedExtension();

  const { video, parentNode } = createVideoWithoutParentElement();
  extension.onVideoFound(video, parentNode);

  assert.exists(video.vsc, 'video.vsc should exist after onVideoFound');
});

runner.test('video without parentElement controller is usable (can set playback rate)', async () => {
  extension = await makeInitializedExtension();

  const { video, parentNode } = createVideoWithoutParentElement();
  extension.onVideoFound(video, parentNode);

  // The controller is functional if it does not throw when the video's
  // playback rate is changed through the standard HTMLMediaElement property.
  let threw = false;
  try {
    video.playbackRate = 1.5;
  } catch (_e) {
    threw = true;
  }
  assert.false(threw, 'setting playbackRate on a shadow-DOM video must not throw');
});

runner.test('video with parentElement gets a controller attached', async () => {
  extension = await makeInitializedExtension();

  const video = createMockVideo();
  const parentElement = document.createElement('div');

  Object.defineProperty(video, 'parentElement', { value: parentElement, writable: false, configurable: true });
  Object.defineProperty(video, 'isConnected',   { value: true,          writable: false, configurable: true });

  extension.onVideoFound(video, parentElement);

  assert.exists(video.vsc, 'video.vsc should exist when parentElement is available');
});

runner.test('video with neither parentElement nor parentNode gets a controller attached via explicit fallback', async () => {
  extension = await makeInitializedExtension();

  const video = createMockVideo();
  const fallbackParent = document.createElement('div');

  Object.defineProperty(video, 'parentElement', { value: null, writable: false, configurable: true });
  Object.defineProperty(video, 'parentNode',    { value: null, writable: false, configurable: true });
  Object.defineProperty(video, 'isConnected',   { value: true, writable: false, configurable: true });

  // Must not throw even with no DOM parent.
  extension.onVideoFound(video, fallbackParent);

  assert.exists(video.vsc, 'video.vsc should exist even when both parentElement and parentNode are null');
});

runner.test('calling onVideoFound twice on the same video does not attach a second controller', async () => {
  extension = await makeInitializedExtension();

  const { video, parentNode } = createVideoWithoutParentElement();
  extension.onVideoFound(video, parentNode);
  const firstController = video.vsc;

  extension.onVideoFound(video, parentNode);

  assert.equal(video.vsc, firstController, 'video.vsc must remain the same object on repeated calls');
});

// ── Seam B: VSC_USER_SETTINGS live relay ────────────────────────────────────
//
// The VSC_USER_SETTINGS listener is registered at module scope in inject.js
// against the module-level `extension` constant (window.videoSpeedExtension).
// Each Seam B test creates its own initialized instance, temporarily swaps it
// onto window.videoSpeedExtension so the already-registered listener routes
// dispatches to it, then restores the original after the test.
//
// This avoids:
//   - Early-return false greens (the old `if (!ext.initialized) return` guards)
//   - Shared mutable singleton contamination across tests

/**
 * Run `fn(ext)` with `ext` wired as window.videoSpeedExtension for the
 * duration of the call, then restore the original reference.
 *
 * NOTE: The VSC_USER_SETTINGS listener captured the module-level `extension`
 * constant at definition time (a closure), so swapping window.videoSpeedExtension
 * does NOT redirect the listener.  The correct pattern for Seam B is therefore
 * to use the module-level instance directly — but only after confirming it is
 * initialized.  If it is not yet initialized (async race), the test must await
 * initialization explicitly rather than silently skipping.
 */
async function withInitializedModuleExtension(fn) {
  const ext = window.videoSpeedExtension;
  assert.exists(ext, 'window.videoSpeedExtension must exist — was loadInjectModules() called?');

  // If the module-level instance is not yet initialized (async race at load
  // time), initialize it now so the test exercises a real code path.
  if (!ext.initialized) {
    await ext.initialize();
  }
  assert.true(ext.initialized, 'prerequisite: module-level extension must be initialized');

  await fn(ext);
}

runner.test('VSC_USER_SETTINGS updates keyBindings in live config', async () => {
  await withInitializedModuleExtension((ext) => {
    const newBindings = [
      { action: 'faster', key: 70, value: 0.1, force: false, predefined: true },
      { action: 'slower', key: 71, value: 0.1, force: false, predefined: true },
    ];

    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
      detail: { keyBindings: newBindings },
    }));

    assert.equal(
      ext.config.settings.keyBindings, newBindings,
      'keyBindings reference must point to the new array after a relay dispatch',
    );
  });
});

runner.test('VSC_USER_SETTINGS relay applies the correct key code value', async () => {
  await withInitializedModuleExtension((ext) => {
    const newBindings = [
      { action: 'faster', key: 70, value: 0.1, force: false, predefined: true },
    ];

    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
      detail: { keyBindings: newBindings },
    }));

    assert.equal(ext.config.settings.keyBindings[0].key, 70, 'relayed key code must be 70');
  });
});

runner.test('VSC_USER_SETTINGS is a no-op before extension.initialized is true', async () => {
  await withInitializedModuleExtension((ext) => {
    const originalBindings = ext.config.settings.keyBindings;

    // Temporarily mark as not initialized to exercise the listener guard.
    ext.initialized = false;
    try {
      window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
        detail: { keyBindings: [{ action: 'faster', key: 99, value: 0.5, force: false, predefined: true }] },
      }));

      assert.equal(
        ext.config.settings.keyBindings, originalBindings,
        'keyBindings must not change while extension.initialized is false',
      );
    } finally {
      // Always restore so subsequent tests see a properly initialized instance.
      ext.initialized = true;
    }
  });
});

runner.test('VSC_USER_SETTINGS updates rememberSpeed in live config', async () => {
  await withInitializedModuleExtension((ext) => {
    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
      detail: { rememberSpeed: true },
    }));

    assert.equal(ext.config.settings.rememberSpeed, true, 'rememberSpeed must be true after relay dispatch');
  });
});

runner.test('VSC_USER_SETTINGS updates gifSpeedStep in live config', async () => {
  await withInitializedModuleExtension((ext) => {
    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
      detail: { gifSpeedStep: 0.25 },
    }));

    assert.equal(ext.config.settings.gifSpeedStep, 0.25, 'gifSpeedStep must be 0.25 after relay dispatch');
  });
});

runner.test('VSC_USER_SETTINGS does not wipe per-source speed entries', async () => {
  await withInitializedModuleExtension((ext) => {
    ext.config.settings.speeds = { 'https://example.com/video.mp4': 1.5 };

    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
      detail: { rememberSpeed: false },
    }));

    assert.equal(
      ext.config.settings.speeds['https://example.com/video.mp4'], 1.5,
      'per-source speed entry must survive a relay patch that does not include speeds',
    );
  });
});

runner.test('VSC_USER_SETTINGS does not reset lastSpeed', async () => {
  await withInitializedModuleExtension((ext) => {
    ext.config.settings.lastSpeed = 1.5;

    window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', {
      detail: { rememberSpeed: false },
    }));

    assert.equal(ext.config.settings.lastSpeed, 1.5, 'lastSpeed must not be reset by relay patch');
  });
});

// ── Seam C: setupDocumentCSS — null-head guard ───────────────────────────────

runner.test('setupDocumentCSS does not throw when document.head is null', async () => {
  extension = await makeInitializedExtension();

  const nullHeadDoc = {
    createElement: (tag) => document.createElement(tag),
    head: null,
  };

  let threw = false;
  let thrownError = null;
  try {
    extension.setupDocumentCSS(nullHeadDoc);
  } catch (e) {
    threw = true;
    thrownError = e;
  }

  assert.false(
    threw,
    'setupDocumentCSS must not throw when document.head is null' +
      (thrownError ? ` — got: ${thrownError.message}` : ''),
  );
});

export { runner as injectTestRunner };