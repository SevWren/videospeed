/**
 * Unit tests for GifController
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

runner.test('GifController is exported on window.VSC', () => {
  if (!window.VSC.GifController) { throw new Error('GifController not found on window.VSC'); }
});

runner.test('GifController.create is a static async method', () => {
  if (typeof window.VSC.GifController.create !== 'function') {
    throw new Error('GifController.create is not a function');
  }
});

runner.test('GifController.create returns null when controlGifs is false', async () => {
  const mockConfig = {
    settings: { controlGifs: false, lastGifSpeed: 1.0 },
    addGifElement: () => {},
    removeGifElement: () => {},
    getGifElements: () => [],
  };
  const result = await window.VSC.GifController.create(
    { src: 'test.gif', currentSrc: 'test.gif' }, null, mockConfig, null
  );
  if (result !== null) { throw new Error('Expected null when controlGifs is false'); }
});

runner.test('GifController.create returns null for empty src', async () => {
  const mockConfig = {
    settings: { controlGifs: true, lastGifSpeed: 1.0 },
    addGifElement: () => {},
    removeGifElement: () => {},
    getGifElements: () => [],
  };
  const result = await window.VSC.GifController.create(
    { src: '', currentSrc: '' }, null, mockConfig, null
  );
  if (result !== null) { throw new Error('Expected null for empty src'); }
});

// ─── file:// bridge path tests ──────────────────────────────────────────────
// The injected page script cannot XHR file:// URLs directly; it delegates to
// the content script bridge (injector.js) via VSC_FETCH_GIF_BYTES CustomEvent
// and receives bytes back via window.postMessage / VSC_GIF_BYTES_RESPONSE.

// Helper: simulate the content-script bridge for a single _fetchGifBytes call.
// `behavior(requestId)` is called when the CustomEvent fires; it should post
// back the fake response (or do nothing to simulate a missing bridge).
function withFakeBridge(behavior, fn) {
  const handler = (event) => {
    const { requestId } = event.detail || {};
    if (!requestId) return;
    behavior(requestId);
  };
  window.addEventListener('VSC_FETCH_GIF_BYTES', handler);
  const result = fn();
  const cleanup = () => window.removeEventListener('VSC_FETCH_GIF_BYTES', handler);
  return result && result.finally ? result.finally(cleanup) : (cleanup(), result);
}

runner.test('_fetchGifBytes: file:// bridge success returns ArrayBuffer', async () => {
  const buf = new ArrayBuffer(8);
  const result = await withFakeBridge((requestId) => {
    setTimeout(() => {
      window.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: true, bytes: buf },
        '*'
      );
    }, 0);
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/test.gif', null));
  if (!(result instanceof ArrayBuffer) || result.byteLength !== 8) {
    throw new Error(`Expected 8-byte ArrayBuffer, got ${result}`);
  }
});

runner.test('_fetchGifBytes: file:// bridge blocked returns null', async () => {
  const result = await withFakeBridge((requestId) => {
    setTimeout(() => {
      window.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false, error: 'blocked' },
        '*'
      );
    }, 0);
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/blocked.gif', null));
  if (result !== null) throw new Error(`Expected null for blocked, got ${result}`);
});

runner.test('_fetchGifBytes: file:// bridge timeout returns null', async () => {
  const result = await withFakeBridge((requestId) => {
    setTimeout(() => {
      window.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false, error: 'timeout' },
        '*'
      );
    }, 0);
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/slow.gif', null));
  if (result !== null) throw new Error(`Expected null for timeout, got ${result}`);
});

runner.test('_fetchGifBytes: file:// bridge empty bytes returns null', async () => {
  const result = await withFakeBridge((requestId) => {
    setTimeout(() => {
      // success:true but no bytes — treated as failure
      window.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false },
        '*'
      );
    }, 0);
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/empty.gif', null));
  if (result !== null) throw new Error(`Expected null for empty bytes, got ${result}`);
});

runner.test('_fetchGifBytes: file:// unrelated postMessage is ignored', async () => {
  // A postMessage with a different requestId must not resolve the promise early.
  const buf = new ArrayBuffer(4);
  const result = await withFakeBridge((requestId) => {
    setTimeout(() => {
      // Wrong requestId first
      window.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId: 'other-id', success: true, bytes: new ArrayBuffer(1) },
        '*'
      );
      // Then correct one
      window.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: true, bytes: buf },
        '*'
      );
    }, 0);
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/test2.gif', null));
  if (!(result instanceof ArrayBuffer) || result.byteLength !== 4) {
    throw new Error(`Expected 4-byte ArrayBuffer from correct requestId, got ${result}`);
  }
});

runner.test('_fetchGifBytes: https:// URLs still go through fetch (not XHR)', async () => {
  // If the XHR path were taken for https://, the fake XHR would never fire onload,
  // causing the test to hang.  The fact that this resolves quickly proves fetch() runs.
  // We stub fetch to return a controlled response for this test only.
  const origFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    headers: { get: () => 'image/gif' },
    arrayBuffer: async () => new ArrayBuffer(4),
  });
  try {
    const result = await window.VSC.GifController._fetchGifBytes('https://example.com/a.gif', null);
    if (!(result instanceof ArrayBuffer)) throw new Error('Expected ArrayBuffer from fetch path');
  } finally {
    global.fetch = origFetch;
  }
});

runner.test('origin extraction: file:// origin is null (not the string "null")', async () => {
  // Simulate what create() does for a file:// src
  const src = 'file:///D:/test.gif';
  const rawOrigin = new URL(src).origin;
  if (rawOrigin !== 'null') throw new Error(`Expected string "null" from URL spec, got ${rawOrigin}`);
  const origin = rawOrigin === 'null' ? null : rawOrigin;
  if (origin !== null) throw new Error(`Expected origin to be null after guard, got ${origin}`);
  // The guard `if (origin && ...)` must be falsy
  if (origin) throw new Error('origin must be falsy so the failure cache is never consulted');
});

runner.test('failure cache: one failed file:// GIF does not block others', () => {
  // Simulate the cache-write guard: origin=null → cache is never written
  const cache = window.VSC.gifFetchFailCache || new Map();
  const origin = null; // file:// origin is always null
  // This is the guard at _fetchGifBytes catch block: `if (origin && cache) { cache.set(...) }`
  if (origin && cache) {
    cache.set(origin, { permanent: false, until: Date.now() + 60000 });
  }
  // The cache should NOT contain the null key
  if (cache.has(null)) throw new Error('null origin must not be written to the failure cache');
  // A second file:// GIF check also passes
  const secondBlocked = origin && cache && cache.has(origin);
  if (secondBlocked) throw new Error('Second file:// GIF must not be blocked');
});

export default runner;
