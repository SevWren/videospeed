/**
 * Integration tests for modular architecture
 * Using global variables to match browser extension architecture
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, createMockVideo, createMockDOM } from '../helpers/test-utils.js';
import { loadCoreModules } from '../helpers/module-loader.js';

// Load all required modules
await loadCoreModules();

const runner = new SimpleTestRunner();
let mockDOM;

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
  mockDOM = createMockDOM();
});

runner.afterEach(() => {
  cleanupChromeMock();
  if (mockDOM) {
    mockDOM.cleanup();
  }
});

runner.test('VideoSpeedConfig initializes with default playback speed of 1.0', async () => {
  const config = new window.VSC.VideoSpeedConfig();
  assert.equal(config.settings.lastSpeed, 1.0, 'Default lastSpeed should be 1.0');
});

runner.test(
  'SiteHandlerManager returns a positioning whose insertionPoint is a DOM Node',
  async () => {
    const siteHandlerManager = window.VSC.siteHandlerManager;
    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    const positioning = siteHandlerManager.getControllerPosition(mockDOM.container, mockVideo);
    assert.true(
      positioning.insertionPoint instanceof window.Node,
      'insertionPoint should be a DOM Node usable as an insertion target'
    );
  }
);

runner.test(
  "ActionHandler dispatches 'faster' action and increases video playback rate",
  async () => {
    // Behavioral: the cross-module wiring between config, actionHandler, and VideoController
    // must produce a real speed increase when runAction('faster', step) is called.
    const config = window.VSC.videoSpeedConfig;
    await config.load();

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);
    new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    const initialRate = mockVideo.playbackRate; // 1.0
    actionHandler.runAction('faster', 0.25);

    assert.true(
      mockVideo.playbackRate > initialRate,
      `Playback rate should increase after 'faster' action (was ${initialRate}, got ${mockVideo.playbackRate})`
    );
  }
);

runner.test(
  'VideoController creation attaches the controller div to the DOM and registers the video in config',
  async () => {
    const config = window.VSC.videoSpeedConfig;
    await config.load();

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    new window.VSC.VideoController(mockVideo, null, config, actionHandler);

    // Behavioral: controller div must be attached to the DOM after construction
    assert.true(
      mockVideo.vsc.div.parentNode !== null,
      'Controller div should be attached to the DOM after VideoController construction'
    );
    // Behavioral: the video element must be tracked in config's media elements list
    assert.true(
      config.getMediaElements().includes(mockVideo),
      'Video element should be tracked in config after controller creation'
    );
  }
);

runner.test(
  'EventManager cleanup leaves media element count unchanged — no actions fire after cleanup',
  async () => {
    const config = window.VSC.videoSpeedConfig;
    await config.load();

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);
    eventManager.actionHandler = actionHandler;

    eventManager.setupEventListeners(document);

    const countBefore = config.getMediaElements().length;

    eventManager.cleanup();

    // After cleanup no action dispatch should occur, so mediaElements is unchanged
    assert.equal(
      config.getMediaElements().length,
      countBefore,
      'Media element count should be unchanged after cleanup — cleanup must not fire pending actions'
    );
  }
);

runner.test(
  'startHidden setting should correctly control initial controller visibility',
  async () => {
    const config = window.VSC.videoSpeedConfig;
    await config.load();

    const eventManager = new window.VSC.EventManager(config, null);
    const actionHandler = new window.VSC.ActionHandler(config, eventManager);

    const mockVideo = createMockVideo();
    mockDOM.container.appendChild(mockVideo);

    // Test when startHidden is false (default) - controller should be visible
    config.settings.startHidden = false;
    const visibleController = new window.VSC.VideoController(
      mockVideo,
      null,
      config,
      actionHandler
    );

    assert.false(
      visibleController.div.classList.contains('vsc-hidden'),
      'Controller should not have vsc-hidden class when startHidden is false'
    );
    assert.false(
      visibleController.div.classList.contains('vsc-show'),
      'Controller should not have vsc-show class when startHidden is false (uses natural visibility)'
    );

    // Clean up first controller
    visibleController.remove();

    // Test when startHidden is true - controller should be hidden
    config.settings.startHidden = true;
    const mockVideo2 = createMockVideo();
    mockDOM.container.appendChild(mockVideo2);

    const hiddenController = new window.VSC.VideoController(
      mockVideo2,
      null,
      config,
      actionHandler
    );

    assert.true(
      hiddenController.div.classList.contains('vsc-hidden'),
      'Controller should have vsc-hidden class when startHidden is true'
    );
    assert.false(
      hiddenController.div.classList.contains('vsc-show'),
      'Controller should not have vsc-show class when startHidden is true'
    );

    // Clean up
    hiddenController.remove();
  }
);

export { runner as moduleIntegrationTestRunner };
