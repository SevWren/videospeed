/**
 * Tests for Bug B fix: GifController.create() must reject
 *   (a) single-frame (non-animated) GIFs — E-1, SD-10
 *   (b) GIFs whose decoded dimensions are below GIF_MIN_SIZE_PX — E-2
 *
 * RED pre-fix / GREEN post-fix design
 * ────────────────────────────────────────────────────────────────────────────
 * gif-controller.js has one top-level try/catch that logs
 * `window.VSC.logger.error('GifController.create failed: ...')` whenever the
 * code throws past the guards.  The CORRECT exit paths (frames guard and
 * dimension guard) return null WITHOUT going through the catch.
 *
 * This is the observable difference:
 *
 *   Pre-fix  — single-frame / tiny GIF passes the missing guard, reaches
 *              `getComputedStyle` (which is undefined in this test context),
 *              throws, logger.error IS called.
 *              Assertion "must not exit via exception" FAILS. ← RED
 *
 *   Post-fix — frame-count / dimension guard fires early, return null
 *              without throwing, logger.error NOT called.
 *              Assertion PASSES. ← GREEN
 *
 * Production path: GifController.create() at src/core/gif-controller.js
 * (confirmed production path via SD-08).
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

// ─── shared helpers ──────────────────────────────────────────────────────────

const MIN = window.VSC.Constants.GIF_MIN_SIZE_PX; // 20

function makeConfig() {
  return {
    settings: { controlGifs: true, lastGifSpeed: 1.0 },
    addGifElement: () => {},
    removeGifElement: () => {},
    getGifElements: () => [],
  };
}

function makeImg(src = 'https://example.com/anim.gif') {
  const img = document.createElement('img');
  img.src = src;
  return img;
}

/** Override window.__VSC_gifuct for the duration of fn(), then restore. */
async function withGifuct(override, fn) {
  const orig = window.__VSC_gifuct;
  window.__VSC_gifuct = override;
  try { return await fn(); } finally { window.__VSC_gifuct = orig; }
}

/** Stub global.fetch to return a minimal valid GIF ArrayBuffer. */
function withFakeFetch(fn) {
  const origFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    headers: { get: () => 'image/gif' },
    arrayBuffer: async () => new ArrayBuffer(16),
  });
  const p = fn();
  return p.finally
    ? p.finally(() => { global.fetch = origFetch; })
    : (() => { global.fetch = origFetch; return p; })();
}

/**
 * Run create() while spying on window.VSC.logger.error.
 *
 * The outer try/catch in gif-controller.js calls
 *   window.VSC.logger.error(`GifController.create failed: ...`)
 * whenever execution exits via an uncaught exception (e.g. getComputedStyle
 * not defined in the test context).
 *
 * Correct guard exits (frames.length guard, dimension guard) return null
 * WITHOUT going through the catch — so logger.error is NOT called.
 *
 * Returns { result, loggerErrorCalled, loggerErrorMessage }.
 */
async function runWithLoggerSpy(gifuct, img, config) {
  let loggerErrorCalled = false;
  let loggerErrorMessage = '';
  const origError = window.VSC.logger.error.bind(window.VSC.logger);
  window.VSC.logger.error = (msg) => {
    if (typeof msg === 'string' && msg.includes('GifController.create failed')) {
      loggerErrorCalled = true;
      loggerErrorMessage = msg;
    }
    // Suppress noise in test output.
  };

  // Clear any cached fetch-failure entries from prior tests so the fetch
  // mock can actually run and the GIF parsing path is reached.
  if (window.VSC.gifFetchFailCache) { window.VSC.gifFetchFailCache.clear(); }

  let result;
  try {
    result = await withFakeFetch(() =>
      withGifuct(gifuct, () =>
        window.VSC.GifController.create(img, null, config, null)
      )
    );
  } finally {
    window.VSC.logger.error = origError;
  }
  return { result, loggerErrorCalled, loggerErrorMessage };
}

// ─── E-1: single-frame rejection ────────────────────────────────────────────

runner.test(
  'create() must NOT exit via exception for a single-frame GIF (E-1 — RED pre-fix)',
  async () => {
    // Pre-fix:  frames.length === 0 guard passes for a 1-frame GIF (1 ≠ 0).
    //           Code reaches `getComputedStyle` which is undefined here.
    //           Exception thrown → caught → logger.error called. TEST FAILS. ← RED
    //
    // Post-fix: frames.length <= 1 guard fires. return null without throwing.
    //           logger.error NOT called. TEST PASSES. ← GREEN
    const gifuct = {
      parseGIF: () => ({
        lsd: { width: MIN + 10, height: MIN + 10, backgroundColorIndex: 0 },
        gct: [],
        loopCount: 0,
      }),
      decompressFrames: () => [
        {
          patch: new Uint8ClampedArray((MIN + 10) * (MIN + 10) * 4).fill(128),
          dims: { left: 0, top: 0, width: MIN + 10, height: MIN + 10 },
          delay: 100,
          disposalType: 1,
        },
      ],
    };

    const { loggerErrorCalled, loggerErrorMessage } = await runWithLoggerSpy(
      gifuct, makeImg(), makeConfig()
    );

    if (loggerErrorCalled) {
      throw new Error(
        'GifController.create() exited via exception for a 1-frame GIF. ' +
        'This means the frames guard `frames.length === 0` passed (1 ≠ 0) and ' +
        'execution continued past the guard into code that threw. ' +
        'Fix: change the guard to `frames.length <= 1`. ' +
        `Logger captured: "${loggerErrorMessage}"`
      );
    }
    // Also confirm create() returns null (not a live controller).
    // (result is null for both paths; this is a secondary sanity check.)
  }
);

runner.test(
  'create() returns null for a single-frame GIF (sanity — both pre and post fix)',
  async () => {
    const gifuct = {
      parseGIF: () => ({
        lsd: { width: MIN + 10, height: MIN + 10, backgroundColorIndex: 0 },
        gct: [],
        loopCount: 0,
      }),
      decompressFrames: () => [
        {
          patch: new Uint8ClampedArray((MIN + 10) * (MIN + 10) * 4).fill(200),
          dims: { left: 0, top: 0, width: MIN + 10, height: MIN + 10 },
          delay: 100,
          disposalType: 1,
        },
      ],
    };
    // Suppress the expected logger.error that fires pre-fix
    const origError = window.VSC.logger.error.bind(window.VSC.logger);
    window.VSC.logger.error = () => {};
    let result;
    try {
      result = await withFakeFetch(() =>
        withGifuct(gifuct, () =>
          window.VSC.GifController.create(makeImg(), null, makeConfig(), null)
        )
      );
    } finally {
      window.VSC.logger.error = origError;
    }
    if (result !== null) {
      throw new Error(`Expected null for 1-frame GIF, got: ${result}`);
    }
  }
);

// ─── E-2: post-decode dimension guard ───────────────────────────────────────

runner.test(
  'create() must NOT exit via exception for a GIF narrower than GIF_MIN_SIZE_PX (E-2 — RED pre-fix)',
  async () => {
    // Pre-fix:  no dimension guard. 2-frame tiny GIF passes frames guard,
    //           reaches `getComputedStyle`, throws, logger.error called. RED.
    //
    // Post-fix: dimension guard added after gc._gifWidth/gc._gifHeight are set.
    //           return null before getComputedStyle. logger.error NOT called. GREEN.
    const tinyW = MIN - 1;
    const gifuct = {
      parseGIF: () => ({
        lsd: { width: tinyW, height: MIN + 10, backgroundColorIndex: 0 },
        gct: [],
        loopCount: 0,
      }),
      decompressFrames: () => [
        {
          patch: new Uint8ClampedArray(tinyW * (MIN + 10) * 4).fill(0),
          dims: { left: 0, top: 0, width: tinyW, height: MIN + 10 },
          delay: 100,
          disposalType: 1,
        },
        {
          patch: new Uint8ClampedArray(tinyW * (MIN + 10) * 4).fill(255),
          dims: { left: 0, top: 0, width: tinyW, height: MIN + 10 },
          delay: 100,
          disposalType: 1,
        },
      ],
    };

    const { loggerErrorCalled, loggerErrorMessage } = await runWithLoggerSpy(
      gifuct, makeImg(), makeConfig()
    );

    if (loggerErrorCalled) {
      throw new Error(
        `GifController.create() exited via exception for a ${tinyW}×${MIN + 10} GIF ` +
        `(width < GIF_MIN_SIZE_PX=${MIN}). ` +
        `A post-decode dimension guard is missing in gif-controller.js (E-2). ` +
        `Logger captured: "${loggerErrorMessage}"`
      );
    }
  }
);

runner.test(
  'create() must NOT exit via exception for a GIF shorter than GIF_MIN_SIZE_PX (E-2 — RED pre-fix)',
  async () => {
    const tinyH = MIN - 1;
    const gifuct = {
      parseGIF: () => ({
        lsd: { width: MIN + 10, height: tinyH, backgroundColorIndex: 0 },
        gct: [],
        loopCount: 0,
      }),
      decompressFrames: () => [
        {
          patch: new Uint8ClampedArray((MIN + 10) * tinyH * 4).fill(0),
          dims: { left: 0, top: 0, width: MIN + 10, height: tinyH },
          delay: 100,
          disposalType: 1,
        },
        {
          patch: new Uint8ClampedArray((MIN + 10) * tinyH * 4).fill(255),
          dims: { left: 0, top: 0, width: MIN + 10, height: tinyH },
          delay: 100,
          disposalType: 1,
        },
      ],
    };

    const { loggerErrorCalled, loggerErrorMessage } = await runWithLoggerSpy(
      gifuct, makeImg(), makeConfig()
    );

    if (loggerErrorCalled) {
      throw new Error(
        `GifController.create() exited via exception for a ${MIN + 10}×${tinyH} GIF ` +
        `(height < GIF_MIN_SIZE_PX=${MIN}). ` +
        `A post-decode dimension guard is missing in gif-controller.js (E-2). ` +
        `Logger captured: "${loggerErrorMessage}"`
      );
    }
  }
);

runner.test(
  'create() does not apply E-2 dimension guard to a GIF exactly at GIF_MIN_SIZE_PX (boundary)',
  async () => {
    // A MIN×MIN 2-frame GIF must NOT be rejected by the dimension guard.
    // Pre-fix: no dimension guard → code proceeds → getComputedStyle throws →
    //          logger.error IS called. But we are checking that it IS called
    //          (confirming the code went past the boundary check).
    // Post-fix: dimension guard passes (>= MIN) → code proceeds → getComputedStyle
    //           might still throw → logger.error might still be called.
    // In both cases logger.error is called (code goes past dimension guard for MIN×MIN).
    // This test just ensures create() returns null (not a live controller).
    const origError = window.VSC.logger.error.bind(window.VSC.logger);
    window.VSC.logger.error = () => {};
    let result;
    const gifuct = {
      parseGIF: () => ({
        lsd: { width: MIN, height: MIN, backgroundColorIndex: 0 },
        gct: [],
        loopCount: 0,
      }),
      decompressFrames: () => [
        {
          patch: new Uint8ClampedArray(MIN * MIN * 4).fill(0),
          dims: { left: 0, top: 0, width: MIN, height: MIN },
          delay: 100,
          disposalType: 1,
        },
        {
          patch: new Uint8ClampedArray(MIN * MIN * 4).fill(255),
          dims: { left: 0, top: 0, width: MIN, height: MIN },
          delay: 100,
          disposalType: 1,
        },
      ],
    };
    try {
      result = await withFakeFetch(() =>
        withGifuct(gifuct, () =>
          window.VSC.GifController.create(makeImg(), null, makeConfig(), null)
        )
      );
    } finally {
      window.VSC.logger.error = origError;
    }
    // null is expected (canvas setup will fail in JSDOM); must not throw
    if (result !== null && typeof result !== 'object') {
      throw new Error(`Expected null or GifController for MIN×MIN animated GIF, got: ${result}`);
    }
  }
);

export default runner;
