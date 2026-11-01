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

export { runner as videoControllerTestRunner };
