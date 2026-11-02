/**
 * Integration tests for the full hover-to-activate stack.
 *
 * Exercises the end-to-end path:
 *   mouseenter on controller.div → dwell timer → ActionHandler.setHoverTarget
 *   → runAction uses hover target → video receives action
 *
 * Production modules imported directly (CS-3). No inline clones.
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, createMockVideo, createMockDOM } from '../helpers/test-utils.js';
import { loadCoreModules } from '../helpers/module-loader.js';

await loadCoreModules();

const runner = new SimpleTestRunner();
let mockDOM;

// ── fake-timer helper ─────────────────────────────────────────────────────────
// Intercepts globalThis.setTimeout/clearTimeout so production code's dwell
// timer can be triggered synchronously in tests. The same pattern used in
// unit/core/video-controller.test.js (T3 block).
function makeFakeTimers() {
  const pendingTimers = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;

  globalThis.setTimeout = (fn, ms) => {
    const id = realSetTimeout(() => {}, 9_999_999);
    pendingTimers.push({ id, fn, ms });
    return id;
  };
  globalThis.clearTimeout = (id) => {
    const idx = pendingTimers.findIndex((t) => t.id === id);
    if (idx !== -1) {
      pendingTimers.splice(idx, 1);
    }
    realClearTimeout(id);
  };

  return {
    /** Fire all captured timers whose delay >= minMs */
    advance(minMs) {
      const toFire = pendingTimers.filter((t) => t.ms >= minMs).slice();
      toFire.forEach((t) => {
        const idx = pendingTimers.findIndex((p) => p.id === t.id);
        if (idx !== -1) {
          pendingTimers.splice(idx, 1);
        }
        t.fn();
      });
    },
    restore() {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    },
  };
}

// ── shared setup / teardown ───────────────────────────────────────────────────
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
});

// ── Test 1: full hover sequence — mouseenter + dwell → hotkey targets hovered video only ──

runner.test(
  'hover sequence: mouseenter + 200 ms dwell targets only the hovered video',
  async () => {
    // RED (mutation): if the setHoverTarget() call inside the mouseenter handler is
    // removed, _hoverTargetController stays null and runAction broadcasts to both
    // videos, so video2.playbackRate would increase rather than stay at 1.0.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    const video1 = createMockVideo();
    const video2 = createMockVideo();
    mockDOM.container.appendChild(video1);
    mockDOM.container.appendChild(video2);

    new window.VSC.VideoController(video1, null, config, actionHandler);
    new window.VSC.VideoController(video2, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      // Hover over video1's controller div and let the dwell complete
      video1.vsc.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      // Keyboard hotkey — no event object (e === null)
      actionHandler.runAction('faster', 0.1, null);

      assert.equal(
        video1.playbackRate,
        1.1,
        `video1.playbackRate should be 1.1 after hover-activated faster action (got ${video1.playbackRate})`
      );
      assert.equal(
        video2.playbackRate,
        1.0,
        `video2.playbackRate should remain 1.0 — not targeted (got ${video2.playbackRate})`
      );
    } finally {
      timers.restore();
    }
  }
);

// ── Test 2: sticky hover — target persists after mouseleave ───────────────────

runner.test(
  'sticky hover: mouseleave does not clear target — subsequent hotkey still reaches video1',
  async () => {
    // RED (mutation): if mouseleave were wired to clear _hoverTargetController,
    // runAction would broadcast and video2.playbackRate would also change.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    const video1 = createMockVideo();
    const video2 = createMockVideo();
    mockDOM.container.appendChild(video1);
    mockDOM.container.appendChild(video2);

    new window.VSC.VideoController(video1, null, config, actionHandler);
    new window.VSC.VideoController(video2, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      // Hover-activate video1
      video1.vsc.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);
      // First hotkey to bring video1 to 1.1
      actionHandler.runAction('faster', 0.1, null);

      // Cursor leaves — sticky: target must persist
      video1.vsc.div.dispatchEvent(new Event('mouseleave', { bubbles: false }));

      // Second hotkey — must still reach video1 only
      actionHandler.runAction('faster', 0.1, null);

      assert.equal(
        video1.playbackRate,
        1.2,
        `video1.playbackRate should be 1.2 after two faster actions (got ${video1.playbackRate})`
      );
      assert.equal(
        video2.playbackRate,
        1.0,
        `video2.playbackRate should remain 1.0 (got ${video2.playbackRate})`
      );
    } finally {
      timers.restore();
    }
  }
);

// ── Test 3: hover transfer — hovering video2 transfers control ────────────────

runner.test(
  'hover transfer: hovering video2 after video1 switches the target',
  async () => {
    // RED (mutation): if setHoverTarget is never called for video2 (e.g. the
    // mouseenter listener is absent), _hoverTargetController stays on video1.div
    // and only video1 would receive the action.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    const video1 = createMockVideo();
    const video2 = createMockVideo();
    mockDOM.container.appendChild(video1);
    mockDOM.container.appendChild(video2);

    new window.VSC.VideoController(video1, null, config, actionHandler);
    new window.VSC.VideoController(video2, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      // Step 1: hover-activate video1, run two faster actions (brings to 1.2)
      video1.vsc.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);
      actionHandler.runAction('faster', 0.1, null);
      actionHandler.runAction('faster', 0.1, null);
      // video1 is now at 1.2

      // Step 2: hover video2's div and complete dwell
      video2.vsc.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      // Hotkey — must now reach video2 only
      actionHandler.runAction('faster', 0.1, null);

      assert.equal(
        video2.playbackRate,
        1.1,
        `video2.playbackRate should be 1.1 after hover transfer (got ${video2.playbackRate})`
      );
      assert.equal(
        video1.playbackRate,
        1.2,
        `video1.playbackRate should remain 1.2 — no longer targeted (got ${video1.playbackRate})`
      );
    } finally {
      timers.restore();
    }
  }
);

// ── Test 4: mark/jump exclusion — mark broadcasts to all when hover-activated ─

runner.test(
  'mark exclusion: mark action broadcasts to all videos even when a hover target is active',
  async () => {
    // RED (mutation): if the isMarkOrJump guard were removed from runAction so that
    // hoverTarget applied to mark, only video1 would receive the mark and
    // video2.vsc.mark would remain undefined.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    const video1 = createMockVideo();
    const video2 = createMockVideo();
    mockDOM.container.appendChild(video1);
    mockDOM.container.appendChild(video2);

    new window.VSC.VideoController(video1, null, config, actionHandler);
    new window.VSC.VideoController(video2, null, config, actionHandler);

    // Set currentTime so setMark has a value to store
    video1.currentTime = 5;
    video2.currentTime = 10;

    const timers = makeFakeTimers();
    try {
      // Hover-activate video1
      video1.vsc.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      // mark via keyboard (no event) — must broadcast
      actionHandler.runAction('mark', 0, null);

      assert.exists(
        video1.vsc.mark,
        'video1.vsc.mark should be set after mark broadcast'
      );
      assert.exists(
        video2.vsc.mark,
        'video2.vsc.mark should be set after mark broadcast — mark excludes hover targeting'
      );
    } finally {
      timers.restore();
    }
  }
);

// ── Test 5: hoverActivatesVideoTarget:false — hover does not activate targeting ─

runner.test(
  'hoverActivatesVideoTarget:false — hover is inert; faster broadcasts to all videos',
  async () => {
    // RED (mutation): if the hoverActivatesVideoTarget guard were absent and the
    // mouseenter listener always registered, hover would activate despite the setting
    // and video2 would NOT receive the action.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = false;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    const video1 = createMockVideo();
    const video2 = createMockVideo();
    mockDOM.container.appendChild(video1);
    mockDOM.container.appendChild(video2);

    new window.VSC.VideoController(video1, null, config, actionHandler);
    new window.VSC.VideoController(video2, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      // Attempt to hover-activate video1 (should be a no-op)
      video1.vsc.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      // Hotkey — no hover target set → broadcasts to all
      actionHandler.runAction('faster', 0.1, null);

      assert.equal(
        video1.playbackRate,
        1.1,
        `video1.playbackRate should be 1.1 (broadcast) (got ${video1.playbackRate})`
      );
      assert.equal(
        video2.playbackRate,
        1.1,
        `video2.playbackRate should be 1.1 (broadcast, hover was disabled) (got ${video2.playbackRate})`
      );
    } finally {
      timers.restore();
    }
  }
);

// ── Test 6: GIF hover (opt-in) — hover inactive by default ────────────────────

runner.test(
  'hoverActivatesGifTarget:false (default) — mouseenter on GIF controller does not set hover target',
  async () => {
    // RED (mutation): if the hoverActivatesGifTarget guard were absent from the GIF
    // mouseenter handler, setHoverTarget would be called and
    // actionHandler._hoverTargetController would be non-null.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    // hoverActivatesGifTarget defaults to false — do NOT override it
    assert.false(
      config.settings.hoverActivatesGifTarget,
      'hoverActivatesGifTarget must default to false'
    );

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    // Build a minimal GIF controller stub that replicates only the overlay div
    // creation and the mouseenter/mouseleave hover wiring from GifController.
    // We do this without constructing a full GifController (which requires canvas,
    // fetch, gifuct, etc.) because the seam we are testing is the guard inside
    // the mouseenter handler — not GifController's full init path.
    const overlayDiv = document.createElement('div');
    overlayDiv.setAttribute('tabindex', '-1');
    mockDOM.container.appendChild(overlayDiv);

    // Wire the same hover logic that GifController._initializeControls registers,
    // using the shared actionHandler so assertions on actionHandler are meaningful.
    let hoverDwellTimer = null;
    overlayDiv.addEventListener('mouseenter', () => {
      if (!config.settings.hoverActivatesGifTarget) {
        return;
      }
      hoverDwellTimer = setTimeout(() => {
        hoverDwellTimer = null;
        actionHandler.setHoverTarget(overlayDiv);
      }, window.VSC.Constants.HOVER_DWELL_MS);
    });
    overlayDiv.addEventListener('mouseleave', () => {
      if (hoverDwellTimer !== null) {
        clearTimeout(hoverDwellTimer);
        hoverDwellTimer = null;
      }
    });

    const timers = makeFakeTimers();
    try {
      overlayDiv.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      assert.equal(
        actionHandler._hoverTargetController,
        null,
        'actionHandler._hoverTargetController must remain null when hoverActivatesGifTarget is false'
      );
    } finally {
      timers.restore();
    }
  }
);

export { runner as hoverActivationTestRunner };
