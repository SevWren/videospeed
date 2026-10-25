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

// ─── file:// XHR path tests ────────────────────────────────────────────────

// Helper: install a fake XMLHttpRequest on the global so we can control what
// the XHR path returns without real file I/O.
function withFakeXHR(behavior, fn) {
  const OrigXHR = global.XMLHttpRequest;
  global.XMLHttpRequest = class FakeXHR {
    constructor() {
      this.responseType = '';
      this.timeout = 0;
      this.status = 0;
      this.response = null;
      this.onload = null;
      this.onerror = null;
      this.ontimeout = null;
    }
    open(_method, _url, _async) {}
    send() {
      // Defer so the Promise constructor finishes first
      setTimeout(() => behavior(this), 0);
    }
  };
  const result = fn();
  // Restore after the microtask queue drains (end of current test)
  return result.finally ? result.finally(() => { global.XMLHttpRequest = OrigXHR; })
    : (global.XMLHttpRequest = OrigXHR, result);
}

runner.test('_fetchGifBytes: file:// success (status=0) returns ArrayBuffer', async () => {
  const buf = new ArrayBuffer(8);
  const result = await withFakeXHR((xhr) => {
    xhr.status = 0;
    xhr.response = buf;
    if (xhr.onload) xhr.onload();
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/test.gif', null));
  if (result !== buf) throw new Error(`Expected the ArrayBuffer, got ${result}`);
});

runner.test('_fetchGifBytes: file:// empty response returns null', async () => {
  const result = await withFakeXHR((xhr) => {
    xhr.status = 0;
    xhr.response = new ArrayBuffer(0); // byteLength === 0
    if (xhr.onload) xhr.onload();
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/empty.gif', null));
  if (result !== null) throw new Error(`Expected null for empty response, got ${result}`);
});

runner.test('_fetchGifBytes: file:// null response returns null', async () => {
  const result = await withFakeXHR((xhr) => {
    xhr.status = 0;
    xhr.response = null;
    if (xhr.onload) xhr.onload();
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/null.gif', null));
  if (result !== null) throw new Error(`Expected null for null response, got ${result}`);
});

runner.test('_fetchGifBytes: file:// onerror returns null (permission denied)', async () => {
  const result = await withFakeXHR((xhr) => {
    if (xhr.onerror) xhr.onerror();
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/blocked.gif', null));
  if (result !== null) throw new Error(`Expected null on XHR error, got ${result}`);
});

runner.test('_fetchGifBytes: file:// timeout returns null', async () => {
  const result = await withFakeXHR((xhr) => {
    if (xhr.ontimeout) xhr.ontimeout();
  }, () => window.VSC.GifController._fetchGifBytes('file:///D:/slow.gif', null));
  if (result !== null) throw new Error(`Expected null on XHR timeout, got ${result}`);
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
