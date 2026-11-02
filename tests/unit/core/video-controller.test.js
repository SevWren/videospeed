/**
 * Unit tests for VideoController class
 * Using global variables to match browser extension architecture
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, createMockVideo, createMockDOM } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadCoreModules();

const runner = new SimpleTestRunner();
let mockDOM;

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
});

runner.test('VideoController should initialize with video element', async () => {
  // RED: before the constructor set target.vsc and created this.div, controller.video
  // and mockVideo.vsc were both undefined, failing the exists/equal assertions.
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.exists(controller);
  assert.equal(controller.video, mockVideo);
  assert.exists(controller.div);
  assert.exists(mockVideo.vsc);
  assert.equal(mockVideo.vsc, controller);
});

runner.test('VideoController should return existing controller if already attached', async () => {
  // RED: before the early-return guard on target.vsc, constructing a second controller
  // on the same element created a new object, so controller1 !== controller2 and the
  // equality assertion failed.
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller1 = new window.VSC.VideoController(mockVideo, null, config, actionHandler);
  const controller2 = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.equal(controller1, controller2);
});

runner.test('VideoController should initialize speed based on settings', async () => {
  // RED: before initializeSpeed read config.settings.lastSpeed when rememberSpeed was
  // true, playbackRate stayed at 1.0 regardless of lastSpeed, failing the 2.0 assertion.
  const config = window.VSC.videoSpeedConfig;
  await config.load();
  config.settings.rememberSpeed = true;
  config.settings.lastSpeed = 2.0;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.equal(mockVideo.playbackRate, 2.0);
});

runner.test('VideoController should create controller UI', async () => {
  // RED: before initializeControls created and returned a div with class vsc-controller,
  // controller.div was undefined and the classList assertion threw, failing this test.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.exists(controller.div);
  assert.true(controller.div.classList.contains('vsc-controller'));
  assert.exists(controller.speedIndicator);
});

runner.test('VideoController should handle video without source', async () => {
  // RED: before the vsc-nosource class was conditionally applied in initializeControls,
  // sourceless videos showed no special class, failing the classList.contains assertion.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ currentSrc: '' });
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.true(controller.div.classList.contains('vsc-nosource'));
});

runner.test('VideoController should start hidden when configured', async () => {
  // RED: before startHidden was respected in initializeControls, the vsc-hidden class
  // was never applied even when config.settings.startHidden was true, failing this test.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  config.settings.startHidden = true;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  assert.true(controller.div.classList.contains('vsc-hidden'));
});

runner.test('VideoController should clean up properly when removed', async () => {
  // RED: before remove() deleted video.vsc and called config.removeMediaElement,
  // the vsc reference and the media element list were not cleared, failing both assertions.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  // Verify setup
  assert.exists(mockVideo.vsc);
  assert.equal(config.getMediaElements().length, 1);

  // Remove controller
  controller.remove();

  // Verify cleanup
  assert.equal(mockVideo.vsc, undefined);
  assert.equal(config.getMediaElements().length, 0);
});

runner.test('VideoController should track media elements in config', async () => {
  // RED: before the constructor called config.addMediaElement, the config list stayed
  // empty after creating controllers, causing the count assertions to fail.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo1 = createMockVideo();
  const mockVideo2 = createMockVideo();
  mockDOM.container.appendChild(mockVideo1);
  mockDOM.container.appendChild(mockVideo2);

  assert.equal(config.getMediaElements().length, 0);

  new window.VSC.VideoController(mockVideo1, null, config, actionHandler);
  assert.equal(config.getMediaElements().length, 1);

  new window.VSC.VideoController(mockVideo2, null, config, actionHandler);
  assert.equal(config.getMediaElements().length, 2);
});

// ── isVideoVisible (lines 349-367) ──────────────────────────────────────────

runner.test('isVideoVisible returns false when video is not connected to DOM', async () => {
  // RED: before the isConnected check in isVideoVisible, a detached video returned
  // true, causing the assertion to fail.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  // Detach from DOM so isConnected returns false
  mockDOM.container.removeChild(mockVideo);

  const visible = controller.isVideoVisible();
  assert.equal(visible, false, 'isVideoVisible must return false when video is not connected');
});

runner.test('isVideoVisible returns false when video has display:none style', async () => {
  // RED: before the getComputedStyle check, a video with display:none still returned
  // true from isVideoVisible.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  // Override getComputedStyle for this element to simulate display:none
  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el) => {
    if (el === mockVideo) {
      return { display: 'none', visibility: 'visible', opacity: '1' };
    }
    return originalGetComputedStyle(el);
  };

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  let visible;
  try {
    visible = controller.isVideoVisible();
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }

  assert.equal(visible, false, 'isVideoVisible must return false when display is none');
});

runner.test('isVideoVisible returns false when video has zero-width bounding rect', async () => {
  // RED: before the getBoundingClientRect check, a video with zero dimensions still
  // returned true from isVideoVisible.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  // Override getBoundingClientRect to return zero dimensions
  mockVideo.getBoundingClientRect = () => ({ width: 0, height: 0 });

  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el) => {
    if (el === mockVideo) {
      return { display: 'block', visibility: 'visible', opacity: '1' };
    }
    return originalGetComputedStyle(el);
  };

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  let visible;
  try {
    visible = controller.isVideoVisible();
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }

  assert.equal(visible, false, 'isVideoVisible must return false when bounding rect has zero width');
});

runner.test('isVideoVisible returns true when video is visible and has dimensions', async () => {
  // RED: before the connected + computedStyle + rect checks all passed for a normal
  // visible element, isVideoVisible returned false, failing this assertion.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el) => {
    if (el === mockVideo) {
      return { display: 'block', visibility: 'visible', opacity: '1' };
    }
    return originalGetComputedStyle(el);
  };

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  let visible;
  try {
    visible = controller.isVideoVisible();
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }

  // mockVideo.getBoundingClientRect returns {width:640, height:480} — non-zero
  assert.equal(visible, true, 'isVideoVisible must return true for a connected visible video');
});

// ── updateVisibility (lines 374-410) ────────────────────────────────────────

runner.test('updateVisibility hides controller when audio support is disabled (AUDIO branch)', async () => {
  // RED: before the AUDIO branch in updateVisibility checked audioBoolean, calling
  // updateVisibility on an audio controller with audioBoolean=false did not add
  // vsc-hidden, failing the classList assertion.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  config.settings.audioBoolean = false;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  // Create an AUDIO element (tagName === 'AUDIO') using defineProperties with configurable
  const mockAudio = document.createElement('audio');
  Object.defineProperties(mockAudio, {
    playbackRate: { value: 1.0, writable: true, configurable: true },
    currentSrc: { value: 'https://example.com/audio.mp3', writable: true, configurable: true },
    currentTime: { value: 0, writable: true, configurable: true },
    ownerDocument: { value: document, writable: true, configurable: true },
  });
  // Use defineProperty with configurable:true so tests can reassign
  Object.defineProperty(mockAudio, 'getBoundingClientRect', {
    value: () => ({ top: 0, left: 0, width: 640, height: 100 }),
    writable: true,
    configurable: true,
  });
  mockDOM.container.appendChild(mockAudio);

  const controller = new window.VSC.VideoController(mockAudio, null, config, actionHandler);

  // Ensure controller is NOT hidden initially
  controller.div.classList.remove('vsc-hidden');

  controller.updateVisibility();

  assert.true(
    controller.div.classList.contains('vsc-hidden'),
    'updateVisibility must hide audio controller when audioBoolean is false'
  );
});

runner.test('updateVisibility shows audio controller when audio support is enabled', async () => {
  // RED: before the AUDIO audioBoolean branch in updateVisibility showed the controller,
  // calling updateVisibility with audioBoolean=true left a hidden controller still hidden.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  config.settings.audioBoolean = true;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockAudio = document.createElement('audio');
  Object.defineProperties(mockAudio, {
    playbackRate: { value: 1.0, writable: true, configurable: true },
    currentSrc: { value: 'https://example.com/audio.mp3', writable: true, configurable: true },
    currentTime: { value: 0, writable: true, configurable: true },
    ownerDocument: { value: document, writable: true, configurable: true },
  });
  mockAudio.getBoundingClientRect = () => ({ top: 0, left: 0, width: 640, height: 100 });
  mockDOM.container.appendChild(mockAudio);

  const controller = new window.VSC.VideoController(mockAudio, null, config, actionHandler);

  // Force controller into hidden state (not manually hidden)
  controller.div.classList.add('vsc-hidden');
  // Ensure vsc-manual is not set
  controller.div.classList.remove('vsc-manual');

  controller.updateVisibility();

  assert.false(
    controller.div.classList.contains('vsc-hidden'),
    'updateVisibility must show audio controller when audioBoolean is true and not manually hidden'
  );
});

runner.test('updateVisibility hides video controller when video becomes invisible', async () => {
  // RED: before the video visibility branch in updateVisibility added vsc-hidden when
  // isVisible=false, the controller stayed visible even for off-screen videos.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  config.settings.startHidden = false;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el) => {
    if (el === mockVideo) {
      return { display: 'block', visibility: 'visible', opacity: '1' };
    }
    return originalGetComputedStyle(el);
  };

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  // Controller should not be hidden initially
  controller.div.classList.remove('vsc-hidden');

  // Now make the video invisible — zero dimensions
  mockVideo.getBoundingClientRect = () => ({ width: 0, height: 0 });

  let result;
  try {
    controller.updateVisibility();
    result = controller.div.classList.contains('vsc-hidden');
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }

  assert.true(result, 'updateVisibility must add vsc-hidden when video becomes invisible');
});

runner.test('updateVisibility shows video controller when video becomes visible', async () => {
  // RED: before the visibility-show branch in updateVisibility removed vsc-hidden,
  // a visible video that was previously hidden stayed hidden after updateVisibility.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  config.settings.startHidden = false;

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const originalGetComputedStyle = window.getComputedStyle.bind(window);
  window.getComputedStyle = (el) => {
    if (el === mockVideo) {
      return { display: 'block', visibility: 'visible', opacity: '1' };
    }
    return originalGetComputedStyle(el);
  };

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  // Force controller to be hidden (but not manually)
  controller.div.classList.add('vsc-hidden');
  controller.div.classList.remove('vsc-manual');

  let result;
  try {
    controller.updateVisibility();
    result = controller.div.classList.contains('vsc-hidden');
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }

  assert.false(result, 'updateVisibility must remove vsc-hidden when video becomes visible');
});

// ── dispatchControllerEvent error catch (lines 426-427) ─────────────────────

runner.test('dispatchControllerEvent does not throw even if window.dispatchEvent fails', async () => {
  // RED: before the try/catch in dispatchControllerEvent, a broken window.dispatchEvent
  // propagated the error out of the constructor, crashing controller creation.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockDOM.container.appendChild(mockVideo);

  const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

  // Temporarily break window.dispatchEvent to trigger the catch block
  const originalDispatch = window.dispatchEvent.bind(window);
  window.dispatchEvent = () => { throw new Error('dispatch forced failure'); };

  let threw = false;
  try {
    controller.dispatchControllerEvent('VSC_CONTROLLER_REMOVED', {
      controllerId: 'test-id',
      videoSrc: 'https://example.com/video.mp4',
      tagName: 'VIDEO',
    });
  } catch (_e) {
    threw = true;
  } finally {
    window.dispatchEvent = originalDispatch;
  }

  assert.equal(threw, false, 'dispatchControllerEvent must not propagate errors from dispatchEvent');
});

// ── T3: hover-to-activate (mouseenter/mouseleave + dwell timer) ──────────────

// Helper: intercept global setTimeout/clearTimeout (used by production code running
// in Node.js where bare setTimeout resolves to globalThis.setTimeout, not
// window/dom.window.setTimeout).
function makeFakeTimers() {
  const pendingTimers = [];
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;

  globalThis.setTimeout = (fn, ms) => {
    // Reserve a real timer id so clearTimeout works; use a no-op real timer
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
        if (idx !== -1) pendingTimers.splice(idx, 1);
        t.fn();
      });
    },
    restore() {
      globalThis.setTimeout = realSetTimeout;
      globalThis.clearTimeout = realClearTimeout;
    },
  };
}

runner.test(
  'hoverActivatesVideoTarget:true — mouseenter after dwell calls setHoverTarget',
  async () => {
    // RED: mouseenter/mouseleave listeners and HOVER_DWELL_MS dwell do not exist yet.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    let setHoverTargetCalled = false;
    let setHoverTargetArg = null;
    const origSetHoverTarget = actionHandler.setHoverTarget.bind(actionHandler);
    actionHandler.setHoverTarget = (div) => {
      setHoverTargetCalled = true;
      setHoverTargetArg = div;
      origSetHoverTarget(div);
    };

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      controller.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      // Advance past HOVER_DWELL_MS (200ms)
      timers.advance(200);

      assert.true(setHoverTargetCalled, 'setHoverTarget must be called after dwell');
      assert.equal(setHoverTargetArg, controller.div, 'setHoverTarget must receive controller.div');
    } finally {
      timers.restore();
    }
  }
);

runner.test(
  'hoverActivatesVideoTarget:false — mouseenter does NOT call setHoverTarget',
  async () => {
    // RED: even with false the listener (which does not exist yet) would not guard correctly.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = false;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    let setHoverTargetCalled = false;
    actionHandler.setHoverTarget = () => {
      setHoverTargetCalled = true;
    };

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      controller.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      assert.false(
        setHoverTargetCalled,
        'setHoverTarget must NOT be called when hoverActivatesVideoTarget is false'
      );
    } finally {
      timers.restore();
    }
  }
);

runner.test(
  'mouseleave before dwell completes cancels the timer — setHoverTarget not called',
  async () => {
    // RED: no mouseleave listener exists yet to cancel the pending dwell timer.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    let setHoverTargetCalled = false;
    actionHandler.setHoverTarget = () => {
      setHoverTargetCalled = true;
    };

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    const timers = makeFakeTimers();
    try {
      // mouseenter starts dwell
      controller.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      // mouseleave before dwell fires (< 200 ms elapsed)
      controller.div.dispatchEvent(new Event('mouseleave', { bubbles: false }));
      // Advance past 200 ms — timer was cancelled, so setHoverTarget must NOT fire
      timers.advance(200);

      assert.false(
        setHoverTargetCalled,
        'setHoverTarget must NOT be called when mouseleave fires before dwell completes'
      );
    } finally {
      timers.restore();
    }
  }
);

runner.test(
  'conditional focus steal: div.focus() called when !document.hasFocus()',
  async () => {
    // RED: no focus() call exists in setupEventHandlers yet.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    // Mock document.hasFocus to return false (page does not have focus)
    const origHasFocus = document.hasFocus.bind(document);
    document.hasFocus = () => false;

    // Spy on div.focus
    let focusCalled = false;
    controller.div.focus = (opts) => {
      focusCalled = true;
      void opts;
    };

    const timers = makeFakeTimers();
    try {
      controller.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      assert.true(focusCalled, 'div.focus() must be called when !document.hasFocus()');
    } finally {
      document.hasFocus = origHasFocus;
      timers.restore();
    }
  }
);

runner.test(
  'conditional focus steal: div.focus() NOT called when document.hasFocus() is true',
  async () => {
    // RED: no conditional focus logic exists yet.
    const config = new window.VSC.VideoSpeedConfig();
    await config.load();
    config.settings.hoverActivatesVideoTarget = true;

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    const controller = new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    // Mock document.hasFocus to return true (page already has focus)
    const origHasFocus = document.hasFocus.bind(document);
    document.hasFocus = () => true;

    let focusCalled = false;
    controller.div.focus = () => {
      focusCalled = true;
    };

    const timers = makeFakeTimers();
    try {
      controller.div.dispatchEvent(new Event('mouseenter', { bubbles: false }));
      timers.advance(200);

      assert.false(
        focusCalled,
        'div.focus() must NOT be called when document.hasFocus() returns true'
      );
    } finally {
      document.hasFocus = origHasFocus;
      timers.restore();
    }
  }
);

export { runner as videoControllerTestRunner };
