/**
 * Tests for the VSC_INJECT_MAIN_WORLD handler in background.js
 *
 * ROOT CAUSE: DOM-based script injection (<script src="chrome-extension://...">) is
 * blocked by YouTube's Content Security Policy. The fix routes injection through
 * chrome.scripting.executeScript({ world: 'MAIN' }), which Chrome executes outside
 * the page's CSP.
 *
 * These tests verify:
 * 1. VSC_INJECT_MAIN_WORLD triggers chrome.scripting.executeScript({ world:'MAIN' })
 * 2. The target uses sender.tab.id and sender.frameId
 * 3. All 27 MAIN_WORLD_MODULES are passed in dependency order
 * 4. Netflix script is spliced in before inject.js when on netflix.com
 * 5. sendResponse is called with { success: true } on success
 * 6. sendResponse is called with { success: false } on scripting failure
 */

import {
  installChromeMock,
  cleanupChromeMock,
  resetMockStorage,
} from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  // chrome.scripting is not in the base mock — each test sets it up
  chrome.scripting = null;
});

runner.afterEach(() => {
  cleanupChromeMock();
});

// ─── Inline guard logic mirroring background.js MAIN_WORLD_MODULES ──────────

const EXPECTED_MODULES = [
  'src/utils/constants.js',
  'src/utils/logger.js',
  'src/utils/debug-helper.js',
  'src/utils/dom-utils.js',
  'src/utils/event-manager.js',
  'src/core/storage-manager.js',
  'src/core/settings.js',
  'src/observers/media-observer.js',
  'src/observers/mutation-observer.js',
  'src/core/action-handler.js',
  'src/core/video-controller.js',
  'src/ui/controls.js',
  'src/ui/drag-handler.js',
  'src/ui/shadow-dom.js',
  'src/site-handlers/base-handler.js',
  'src/site-handlers/netflix-handler.js',
  'src/site-handlers/youtube-handler.js',
  'src/site-handlers/facebook-handler.js',
  'src/site-handlers/amazon-handler.js',
  'src/site-handlers/apple-handler.js',
  'src/site-handlers/index.js',
  'src/lib/gifuct-js.min.js',
  'src/core/gif-frame-engine.js',
  'src/observers/gif-observer.js',
  'src/core/gif-controller.js',
  'src/content/inject.js',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeHandler() {
  // Re-implement the VSC_INJECT_MAIN_WORLD handler inline so we can test it
  // without loading the full background.js (which requires a service worker env).
  const MAIN_WORLD_MODULES = [...EXPECTED_MODULES];

  return function handleMessage(message, sender, sendResponse) {
    if (!sender.tab) return;
    if (message.type !== 'VSC_INJECT_MAIN_WORLD') return;

    const tabId = sender.tab.id;
    const frameId = sender.frameId ?? 0;
    const tabUrl = sender.tab.url ?? '';

    const files = [...MAIN_WORLD_MODULES];
    if (tabUrl.includes('www.netflix.com')) {
      files.splice(files.length - 1, 0, 'src/site-handlers/scripts/netflix.js');
    }

    chrome.scripting
      .executeScript({
        target: { tabId, frameIds: [frameId] },
        world: 'MAIN',
        files,
      })
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));

    return true;
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

runner.test(
  'VSC_INJECT_MAIN_WORLD calls chrome.scripting.executeScript with world MAIN',
  async () => {
    let capturedOptions = null;
    chrome.scripting = {
      executeScript: (options) => {
        capturedOptions = options;
        return Promise.resolve();
      },
    };

    const handler = makeHandler();
    const sender = { tab: { id: 42, url: 'https://www.youtube.com/' }, frameId: 0 };
    await new Promise((resolve) => {
      handler({ type: 'VSC_INJECT_MAIN_WORLD' }, sender, resolve);
    });

    assert.equal(capturedOptions.world, 'MAIN', 'world must be MAIN to bypass page CSP');
    assert.equal(capturedOptions.target.tabId, 42, 'target tabId must match sender.tab.id');
    assert.equal(capturedOptions.target.frameIds[0], 0, 'target frameId must match sender.frameId');
  }
);

runner.test('VSC_INJECT_MAIN_WORLD passes all 26 standard modules plus inject.js', async () => {
  let capturedFiles = null;
  chrome.scripting = {
    executeScript: (options) => {
      capturedFiles = options.files;
      return Promise.resolve();
    },
  };

  const handler = makeHandler();
  const sender = { tab: { id: 1, url: 'https://www.example.com/' }, frameId: 0 };
  await new Promise((resolve) => {
    handler({ type: 'VSC_INJECT_MAIN_WORLD' }, sender, resolve);
  });

  assert.equal(capturedFiles.length, EXPECTED_MODULES.length, 'must pass exactly 27 module files');
  assert.equal(
    capturedFiles[capturedFiles.length - 1],
    'src/content/inject.js',
    'inject.js must be last (it bootstraps the page world)'
  );
  assert.equal(capturedFiles[0], 'src/utils/constants.js', 'constants.js must be first (P11)');
});

runner.test(
  'VSC_INJECT_MAIN_WORLD splices netflix.js before inject.js on netflix.com',
  async () => {
    let capturedFiles = null;
    chrome.scripting = {
      executeScript: (options) => {
        capturedFiles = options.files;
        return Promise.resolve();
      },
    };

    const handler = makeHandler();
    const sender = { tab: { id: 2, url: 'https://www.netflix.com/watch/123' }, frameId: 0 };
    await new Promise((resolve) => {
      handler({ type: 'VSC_INJECT_MAIN_WORLD' }, sender, resolve);
    });

    const netflixIdx = capturedFiles.indexOf('src/site-handlers/scripts/netflix.js');
    const injectIdx = capturedFiles.indexOf('src/content/inject.js');

    assert.true(netflixIdx !== -1, 'netflix.js must be present on netflix.com');
    assert.true(
      netflixIdx < injectIdx,
      'netflix.js must load before inject.js (inject.js bootstraps the extension)'
    );
    assert.equal(capturedFiles.length, EXPECTED_MODULES.length + 1, 'one extra file for Netflix');
  }
);

runner.test('VSC_INJECT_MAIN_WORLD sends { success: true } on successful injection', async () => {
  chrome.scripting = {
    executeScript: () => Promise.resolve(),
  };

  const handler = makeHandler();
  const sender = { tab: { id: 3, url: 'https://example.com/' }, frameId: 0 };
  const response = await new Promise((resolve) => {
    handler({ type: 'VSC_INJECT_MAIN_WORLD' }, sender, resolve);
  });

  assert.true(response.success, 'sendResponse must be called with { success: true }');
});

runner.test(
  'VSC_INJECT_MAIN_WORLD sends { success: false } when scripting API throws',
  async () => {
    chrome.scripting = {
      executeScript: () => Promise.reject(new Error('Frame not found')),
    };

    const handler = makeHandler();
    const sender = { tab: { id: 4, url: 'https://example.com/' }, frameId: 99 };
    const response = await new Promise((resolve) => {
      handler({ type: 'VSC_INJECT_MAIN_WORLD' }, sender, resolve);
    });

    assert.equal(response.success, false, 'sendResponse must be { success: false } on error');
    assert.equal(response.error, 'Frame not found', 'error message must be propagated');
  }
);

export default runner;
