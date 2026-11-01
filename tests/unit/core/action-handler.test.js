/**
 * Unit tests for ActionHandler class
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

runner.test('ActionHandler should set video speed', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo();
  mockVideo.vsc = { speedIndicator: { textContent: '1.00' } };
  config.addMediaElement(mockVideo);

  actionHandler.setSpeed(mockVideo, 2.0);

  assert.equal(mockVideo.playbackRate, 2.0);
  assert.equal(mockVideo.vsc.speedIndicator.textContent, '2.00');
  assert.equal(config.settings.lastSpeed, 2.0);
});

runner.test('ActionHandler should handle faster action', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ playbackRate: 1.0 });
  mockVideo.vsc = {
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('faster', 0.1);

  assert.equal(mockVideo.playbackRate, 1.1);
});

runner.test('ActionHandler should handle slower action', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ playbackRate: 1.0 });
  mockVideo.vsc = {
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('slower', 0.1);

  assert.equal(mockVideo.playbackRate, 0.9);
});

runner.test('ActionHandler should respect speed limits', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ playbackRate: 16.0 });
  mockVideo.vsc = {
    div: mockDOM.container,
    speedIndicator: { textContent: '16.00' }
  };
  config.addMediaElement(mockVideo);

  // Should not exceed maximum speed
  actionHandler.runAction('faster', 1.0);
  assert.equal(mockVideo.playbackRate, 16.0);

  // Test minimum speed
  mockVideo.playbackRate = 0.07;
  actionHandler.runAction('slower', 0.1);
  assert.equal(mockVideo.playbackRate, 0.07);
});

runner.test('ActionHandler should handle pause action', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ paused: false });
  mockVideo.vsc = { 
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('pause');

  assert.true(mockVideo.paused);
});

runner.test('ActionHandler should handle mute action', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ muted: false });
  mockVideo.vsc = { 
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('muted');

  assert.true(mockVideo.muted);
});

runner.test('ActionHandler should handle volume actions', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ volume: 0.5 });
  mockVideo.vsc = { 
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('louder', 0.1);
  assert.equal(mockVideo.volume, 0.6);

  actionHandler.runAction('softer', 0.2);
  assert.equal(mockVideo.volume, 0.4);
});

runner.test('ActionHandler should handle seek actions', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ currentTime: 50 });
  mockVideo.vsc = { 
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('advance', 10);
  assert.equal(mockVideo.currentTime, 60);

  actionHandler.runAction('rewind', 5);
  assert.equal(mockVideo.currentTime, 55);
});

runner.test('ActionHandler should handle mark and jump actions', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ currentTime: 30 });
  mockVideo.vsc = { 
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  // Set mark
  actionHandler.runAction('mark');
  assert.equal(mockVideo.vsc.mark, 30);

  // Change time
  mockVideo.currentTime = 50;

  // Jump to mark
  actionHandler.runAction('jump');
  assert.equal(mockVideo.currentTime, 30);
});

runner.test('ActionHandler should work with mark/jump key bindings', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const actionHandler = new window.VSC.ActionHandler(config, null);
  const eventManager = new window.VSC.EventManager(config, actionHandler);
  actionHandler.eventManager = eventManager;

  const mockVideo = createMockVideo({ currentTime: 25 });
  mockVideo.vsc = {
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' },
    mark: undefined
  };
  config.addMediaElement(mockVideo);

  // Verify mark key binding exists (M = 77)
  const markBinding = config.settings.keyBindings.find(kb => kb.action === 'mark');
  assert.exists(markBinding, 'Mark key binding should exist');
  assert.equal(markBinding.key, 77, 'Mark should be bound to M key (77)');

  // Verify jump key binding exists (J = 74)
  const jumpBinding = config.settings.keyBindings.find(kb => kb.action === 'jump');
  assert.exists(jumpBinding, 'Jump key binding should exist');
  assert.equal(jumpBinding.key, 74, 'Jump should be bound to J key (74)');

  // Simulate pressing M key to set mark
  eventManager.handleKeydown({
    keyCode: 77,
    target: document.body,
    getModifierState: () => false,
    preventDefault: () => { },
    stopPropagation: () => { }
  });
  assert.equal(mockVideo.vsc.mark, 25, 'Mark should be set at current time');

  // Change video time
  mockVideo.currentTime = 60;

  // Simulate pressing J key to jump to mark
  eventManager.handleKeydown({
    keyCode: 74,
    target: document.body,
    getModifierState: () => false,
    preventDefault: () => { },
    stopPropagation: () => { }
  });
  assert.equal(mockVideo.currentTime, 25, 'Should jump back to marked time');
});

runner.test('ActionHandler should toggle display visibility', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const video = document.createElement('video');
  const controller = document.createElement('div');
  controller.className = 'vsc-controller';

  // Mock the video controller structure
  video.vsc = {
    div: controller,
    speedIndicator: document.createElement('span')
  };

  config.addMediaElement(video);

  // Initially controller should not be hidden
  assert.false(controller.classList.contains('vsc-hidden'));
  assert.false(controller.classList.contains('vsc-manual'));

  // First toggle - should hide
  actionHandler.runAction('display', null, null);
  assert.true(controller.classList.contains('vsc-hidden'));
  assert.true(controller.classList.contains('vsc-manual'));

  // Second toggle - should show
  actionHandler.runAction('display', null, null);
  assert.false(controller.classList.contains('vsc-hidden'));
  assert.true(controller.classList.contains('vsc-manual'));

  // Third toggle - should hide again
  actionHandler.runAction('display', null, null);
  assert.true(controller.classList.contains('vsc-hidden'));
  assert.true(controller.classList.contains('vsc-manual'));
});

runner.test('ActionHandler should work with videos in nested shadow DOM', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  // Create nested shadow DOM structure
  const host = document.createElement('div');
  const level1Shadow = host.attachShadow({ mode: 'open' });

  const nestedHost = document.createElement('div');
  level1Shadow.appendChild(nestedHost);
  const level2Shadow = nestedHost.attachShadow({ mode: 'open' });

  const mockVideo = createMockVideo({ playbackRate: 1.0 });
  level2Shadow.appendChild(mockVideo);

  document.body.appendChild(host);
  config.addMediaElement(mockVideo);

  // Create a proper mock speedIndicator that behaves like a real DOM element
  const mockSpeedIndicator = {
    textContent: '1.00',
    // Add other properties that might be needed
    nodeType: 1,
    tagName: 'SPAN'
  };

  // Mock video controller structure for shadow DOM video
  mockVideo.vsc = {
    div: mockDOM.container,
    speedIndicator: mockSpeedIndicator,
    // Add remove method to prevent errors during cleanup
    remove: () => { }
  };

  // Test speed change on shadow DOM video
  actionHandler.runAction('faster', 0.2);
  assert.equal(mockVideo.playbackRate, 1.2);

  // Test slower action
  actionHandler.runAction('slower', 0.1);
  assert.equal(mockVideo.playbackRate, 1.1);

  // Test direct speed setting
  actionHandler.setSpeed(mockVideo, 2.5);
  assert.equal(mockVideo.playbackRate, 2.5);
  assert.equal(mockVideo.vsc.speedIndicator.textContent, '2.50');
});

// ---------------------------------------------------------------------------
// T-actions-utils: cover lines 458, 512-533, 542-550, 557-566
// ---------------------------------------------------------------------------

runner.test('ActionHandler blinkController hides video controller after timeout', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const controller = document.createElement('div');
  // Start hidden so the blink branch activates
  controller.classList.add('vsc-hidden');

  const mockVideo = createMockVideo();
  mockVideo.vsc = { div: controller, speedIndicator: { textContent: '1.00' } };
  config.addMediaElement(mockVideo);

  actionHandler.blinkController(controller, 50);

  // After blink the controller must be visible immediately
  assert.false(controller.classList.contains('vsc-hidden'), 'controller should be visible after blink');

  // After the timeout it must be hidden again
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.true(controller.classList.contains('vsc-hidden'), 'controller should be hidden after blink timeout');
});

runner.test('ActionHandler blinkController keeps audio controller visible after blink (no re-hide)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const controller = document.createElement('div');
  controller.classList.add('vsc-hidden');

  // Register an AUDIO element whose vsc.div points to this controller
  const audioEl = document.createElement('audio');
  audioEl.vsc = { div: controller, speedIndicator: { textContent: '1.00' } };
  config.addMediaElement(audioEl);

  actionHandler.blinkController(controller, 50);

  assert.false(controller.classList.contains('vsc-hidden'), 'audio controller should be visible after blink');

  // Audio controllers must NOT be re-hidden — wait past what would be a video timeout
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.false(controller.classList.contains('vsc-hidden'), 'audio controller must remain visible after blink timeout');
});

runner.test('ActionHandler isAudioController returns true for audio element', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const controller = document.createElement('div');
  const audioEl = document.createElement('audio');
  audioEl.vsc = { div: controller };
  config.addMediaElement(audioEl);

  assert.true(actionHandler.isAudioController(controller), 'should return true for audio element controller');
});

runner.test('ActionHandler isAudioController returns false for video element', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const controller = document.createElement('div');
  const mockVideo = createMockVideo();
  mockVideo.vsc = { div: controller, speedIndicator: { textContent: '1.00' } };
  config.addMediaElement(mockVideo);

  assert.false(actionHandler.isAudioController(controller), 'should return false for video element controller');
});

runner.test('ActionHandler isAudioController returns false when no media elements match controller', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const orphanController = document.createElement('div');
  // No media element references this controller
  assert.false(actionHandler.isAudioController(orphanController), 'should return false when no media element matches');
});

runner.test('ActionHandler adjustSpeed increases speed by delta', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  // Clear any previously registered elements so getMediaElements()[0] is our video
  config.mediaElements.length = 0;

  const mockVideo = createMockVideo({ playbackRate: 1.0 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '1.00' } };
  config.addMediaElement(mockVideo);

  actionHandler.adjustSpeed(0.5);

  assert.equal(mockVideo.playbackRate, 1.5);
});

runner.test('ActionHandler adjustSpeed does not exceed MAX speed limit', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  config.mediaElements.length = 0;

  const mockVideo = createMockVideo({ playbackRate: 15.5 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '15.50' } };
  config.addMediaElement(mockVideo);

  actionHandler.adjustSpeed(2.0);

  assert.equal(mockVideo.playbackRate, window.VSC.Constants.SPEED_LIMITS.MAX);
});

runner.test('ActionHandler adjustSpeed does not drop below MIN speed limit', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  config.mediaElements.length = 0;

  const mockVideo = createMockVideo({ playbackRate: 0.1 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '0.10' } };
  config.addMediaElement(mockVideo);

  actionHandler.adjustSpeed(-0.5);

  assert.equal(mockVideo.playbackRate, window.VSC.Constants.SPEED_LIMITS.MIN);
});

runner.test('ActionHandler adjustSpeed does nothing when no media elements exist', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  // No media elements — should not throw
  actionHandler.adjustSpeed(1.0);
  assert.true(true, 'adjustSpeed with no media elements must not throw');
});

runner.test('ActionHandler resetSpeed branches to 1.0 when already at target equal to reset binding', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  config.mediaElements.length = 0;
  const mockVideo = createMockVideo({ playbackRate: 1.5 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '1.50' } };
  config.addMediaElement(mockVideo);

  // Force reset binding to a non-1.0 value so the "target !== 1.0" branch fires.
  // Video is at 1.5, target is 1.5, getKeyBinding('reset') is 1.5 → same as target
  // Branch at line 442: target !== 1.0 → setSpeed(video, 1.0)
  config.setKeyBinding('reset', 1.5);
  actionHandler.resetSpeed(mockVideo, 1.5);

  assert.equal(mockVideo.playbackRate, 1.0, 'should reset to 1.0 when target equals reset binding and target is not 1.0');
});

runner.test('ActionHandler resetSpeed toggles to fast speed when already at 1.0 reset binding (lines 446-448)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  config.mediaElements.length = 0;
  const mockVideo = createMockVideo({ playbackRate: 1.0 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '1.00' } };
  config.addMediaElement(mockVideo);

  // Set reset binding to 1.0 so: playbackRate === target === reset binding === 1.0
  // Line 442: target !== 1.0 is false → line 446-447: setSpeed(video, getKeyBinding('fast'))
  config.setKeyBinding('reset', 1.0);
  const fastSpeed = config.getKeyBinding('fast');
  actionHandler.resetSpeed(mockVideo, 1.0);

  assert.equal(mockVideo.playbackRate, fastSpeed, 'should toggle to fast speed when at 1.0 and reset binding is 1.0');
});

runner.test('ActionHandler resetSpeed toggles to reset binding speed when playbackRate equals target but not reset binding (lines 450-452)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  config.mediaElements.length = 0;
  const mockVideo = createMockVideo({ playbackRate: 2.0 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '2.00' } };
  config.addMediaElement(mockVideo);

  // Set reset binding to something different from the video's current playbackRate
  // playbackRate === target (2.0) but NOT === getKeyBinding('reset') (1.0)
  // Line 449-452: setSpeed(video, getKeyBinding('reset'))
  config.setKeyBinding('reset', 1.0);
  actionHandler.resetSpeed(mockVideo, 2.0);

  assert.equal(mockVideo.playbackRate, 1.0, 'should toggle to reset speed when at target but target differs from reset binding');
});

runner.test('ActionHandler resetSpeed saves current speed to reset binding and sets target when not at target (lines 454-457)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  config.mediaElements.length = 0;
  const mockVideo = createMockVideo({ playbackRate: 1.5 });
  mockVideo.vsc = { div: mockDOM.container, speedIndicator: { textContent: '1.50' } };
  config.addMediaElement(mockVideo);

  // playbackRate (1.5) !== target (2.0) → outer else: save current playbackRate to reset binding, then setSpeed(target)
  actionHandler.resetSpeed(mockVideo, 2.0);

  assert.equal(mockVideo.playbackRate, 2.0, 'should set speed to target when not already at target');
  assert.equal(config.getKeyBinding('reset'), 1.5, 'should save previous playbackRate as reset key binding');
});

runner.test('ActionHandler pause resumes a paused video (line 427)', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  const eventManager = new window.VSC.EventManager(config, null);
  const actionHandler = new window.VSC.ActionHandler(config, eventManager);

  const mockVideo = createMockVideo({ paused: true });
  mockVideo.vsc = {
    div: mockDOM.container,
    speedIndicator: { textContent: '1.00' }
  };
  config.addMediaElement(mockVideo);

  actionHandler.runAction('pause');

  assert.false(mockVideo.paused, 'paused video must be resumed by pause action');
});

export { runner as actionHandlerTestRunner };