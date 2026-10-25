/**
 * Test module loader - loads all common dependencies for unit tests
 * This avoids the need for long import lists in individual test files
 */

/**
 * Load all core modules required for most tests
 * This mimics the global module loading pattern used in the extension
 */
export async function loadCoreModules() {
  // Core utilities (order matters due to dependencies)
  await import('../../src/utils/constants.js');
  await import('../../src/utils/logger.js');
  await import('../../src/utils/dom-utils.js');
  await import('../../src/utils/event-manager.js');

  // Storage and settings
  await import('../../src/core/storage-manager.js');
  await import('../../src/core/settings.js');

  // Site handlers
  await import('../../src/site-handlers/base-handler.js');
  await import('../../src/site-handlers/netflix-handler.js');
  await import('../../src/site-handlers/youtube-handler.js');
  await import('../../src/site-handlers/facebook-handler.js');
  await import('../../src/site-handlers/amazon-handler.js');
  await import('../../src/site-handlers/apple-handler.js');
  await import('../../src/site-handlers/index.js');

  // Core controllers
  await import('../../src/core/action-handler.js');
  await import('../../src/core/video-controller.js');

  // UI components
  await import('../../src/ui/controls.js');
  await import('../../src/ui/drag-handler.js');
  await import('../../src/ui/shadow-dom.js');

  // Observers
  await import('../../src/observers/mutation-observer.js');
  await import('../../src/observers/media-observer.js');
}

/**
 * Load injection script modules (includes core modules + inject.js)
 */
export async function loadInjectModules() {
  await loadCoreModules();
  await import('../../src/content/inject.js');
}

/**
 * Load minimal modules for lightweight tests
 */
export async function loadMinimalModules() {
  await import('../../src/utils/constants.js');
  await import('../../src/utils/logger.js');
  await import('../../src/core/storage-manager.js');
  await import('../../src/core/settings.js');
}

/**
 * Load observer modules for observer tests
 */
export async function loadObserverModules() {
  await import('../../src/utils/logger.js');
  await import('../../src/utils/dom-utils.js');
  await import('../../src/observers/mutation-observer.js');
}

export async function loadGifModules() {
  await loadCoreModules();
  globalThis.__VSC_gifuct = {
    parseGIF: (_ab) => ({
      lsd: { width: 10, height: 10, backgroundColorIndex: 0 },
      gct: [255, 0, 0, 0, 0, 255, 0, 0, 0, 0, 0, 0],
      loopCount: 0,
    }),
    decompressFrames: (_parsed, _full) => [
      {
        patch: new Uint8ClampedArray(10 * 10 * 4).fill(255),
        dims: { left: 0, top: 0, width: 10, height: 10 },
        delay: 100,
        disposalType: 1,
      },
      {
        patch: new Uint8ClampedArray(10 * 10 * 4).map((_, i) => (i % 4 === 2 ? 255 : 0)),
        dims: { left: 0, top: 0, width: 10, height: 10 },
        delay: 200,
        disposalType: 2,
      },
    ],
  };
  // Load GIF modules in order
  try {
    // Set window.__VSC_gifuct for browser context
    if (typeof window !== 'undefined') {
      window.__VSC_gifuct = globalThis.__VSC_gifuct;
    }
    await import('../../src/core/gif-frame-engine.js');
    await import('../../src/observers/gif-observer.js');
    await import('../../src/core/gif-controller.js');
  } catch (err) {
    // Modules may fail in test context; that's expected for some tests
    console.warn('loadGifModules: some modules failed to load:', err.message);
  }
}
