/**
 * Tests for F13-F24 and special key support
 * Verifies that the expanded keyboard handling works correctly
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

// Load required modules
await loadMinimalModules([
  '../../../src/utils/constants.js',
  '../../../src/utils/logger.js',
  '../../../src/core/storage-manager.js',
  '../../../src/core/settings.js',
  '../../../src/core/action-handler.js',
  '../../../src/utils/event-manager.js'
]);

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
});

runner.afterEach(() => {
  cleanupChromeMock();
});

runner.test('F13-F24 keys should be valid key bindings', async () => {
  const config = new window.VSC.VideoSpeedConfig();

  // Test saving F13-F24 key bindings
  const fKeyBindings = [];
  for (let i = 13; i <= 24; i++) {
    fKeyBindings.push({
      action: 'faster',
      key: 111 + i, // F13=124, F14=125, etc.
      value: 0.1,
      force: false,
      predefined: false
    });
  }

  await config.save({ keyBindings: fKeyBindings });
  await config.load();

  assert.equal(config.settings.keyBindings.length, fKeyBindings.length, 'All F-key bindings should be saved');

  // Verify each F-key binding
  for (let i = 0; i < fKeyBindings.length; i++) {
    const binding = config.settings.keyBindings[i];
    assert.equal(binding.key, fKeyBindings[i].key, `F${i + 13} key should be saved correctly`);
  }
});

runner.test('Special keys beyond standard range should be accepted', async () => {
  const config = new window.VSC.VideoSpeedConfig();

  // Test various special key codes that might exist on different keyboards
  const specialKeys = [
    { keyCode: 144, description: 'NumLock' },
    { keyCode: 145, description: 'ScrollLock' },
    { keyCode: 19, description: 'Pause/Break' },
    { keyCode: 44, description: 'PrintScreen' },
    { keyCode: 173, description: 'Media Mute' },
    { keyCode: 174, description: 'Media Volume Down' },
    { keyCode: 175, description: 'Media Volume Up' },
    { keyCode: 179, description: 'Media Play/Pause' }
  ];

  const specialKeyBindings = specialKeys.map(key => ({
    action: 'pause',
    key: key.keyCode,
    value: 0,
    force: false,
    predefined: false
  }));

  await config.save({ keyBindings: specialKeyBindings });
  await config.load();

  assert.equal(config.settings.keyBindings.length, specialKeyBindings.length,
    'All special key bindings should be saved');

  specialKeys.forEach((specialKey, index) => {
    const binding = config.settings.keyBindings[index];
    assert.equal(binding.key, specialKey.keyCode,
      `${specialKey.description} key should be saved correctly`);
  });
});

// Catches regression: EventManager dispatching an action when a modifier key (Alt, Ctrl, Meta)
// is held, causing a 'faster' binding on keyCode 65 to fire even during Ctrl+A (select-all).
runner.test('Key event with Alt modifier held does not trigger bound action', async () => {
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const actionHandler = new window.VSC.ActionHandler(config, null);
  const eventManager = new window.VSC.EventManager(config, actionHandler);
  actionHandler.eventManager = eventManager;

  config.settings.keyBindings = [{
    action: 'faster',
    key: 65, // A key
    value: 0.5,
    force: false,
    predefined: false,
  }];

  const mockVideo = {
    playbackRate: 1.0,
    paused: false,
    muted: false,
    currentTime: 0,
    duration: 100,
    classList: { contains: () => false },
    vsc: { div: document.createElement('div'), speedIndicator: { textContent: '1.00' } },
  };
  config.addMediaElement(mockVideo);

  // Fire the key with Alt held — should be suppressed by EventManager's modifier check
  eventManager.handleKeydown({
    keyCode: 65,
    target: { nodeName: 'DIV', isContentEditable: false, getRootNode: () => ({ host: null }) },
    getModifierState: (mod) => mod === 'Alt',
    preventDefault: () => {},
    stopPropagation: () => {},
  });

  assert.equal(mockVideo.playbackRate, 1.0, 'Speed should not change when Alt is held');
});

runner.test('EventManager should handle F-keys correctly', async () => {
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const actionHandler = new window.VSC.ActionHandler(config, null);
  const eventManager = new window.VSC.EventManager(config, actionHandler);
  actionHandler.eventManager = eventManager;

  // Add F13 key binding
  config.settings.keyBindings = [{
    action: 'faster',
    key: 124, // F13
    value: 0.1,
    force: false,
    predefined: false
  }];

  // Mock video element
  const mockVideo = {
    playbackRate: 1.0,
    paused: false,
    muted: false,
    currentTime: 0,
    duration: 100,
    classList: {
      contains: (_className) => false  // Mock classList for 'vsc-cancelled' check
    },
    vsc: { div: document.createElement('div'), speedIndicator: { textContent: '1.00' } }
  };
  config.addMediaElement(mockVideo);

  // Create a proper mock target element
  const mockTarget = {
    nodeName: 'DIV',
    isContentEditable: false,
    getRootNode: () => ({ host: null })  // Mock getRootNode for shadow DOM check
  };

  // Trigger F13 key
  const f13Event = {
    keyCode: 124,
    target: mockTarget,
    getModifierState: () => false,
    preventDefault: () => { },
    stopPropagation: () => { }
  };

  eventManager.handleKeydown(f13Event);

  assert.equal(mockVideo.playbackRate, 1.1, 'F13 key should increase speed by 0.1');
});

// Catches regression: EventManager silently ignoring F13-F24 key events due to a key-range
// filter capped at 123, so pressing F14-F24 does nothing even with a configured binding.
runner.test('F13 through F24 keys each trigger their bound action when pressed', async () => {
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const actionHandler = new window.VSC.ActionHandler(config, null);
  const eventManager = new window.VSC.EventManager(config, actionHandler);
  actionHandler.eventManager = eventManager;

  // F13=124 through F24=135
  for (let fNum = 13; fNum <= 24; fNum++) {
    const keyCode = 111 + fNum; // F13=124, ..., F24=135

    const mockVideo = {
      playbackRate: 1.0,
      paused: false,
      muted: false,
      currentTime: 0,
      duration: 100,
      classList: { contains: () => false },
      vsc: { div: document.createElement('div'), speedIndicator: { textContent: '1.00' } },
    };
    config.settings.keyBindings = [{
      action: 'faster',
      key: keyCode,
      value: 0.1,
      force: false,
      predefined: false,
    }];
    config.addMediaElement(mockVideo);

    eventManager.handleKeydown({
      keyCode,
      target: { nodeName: 'DIV', isContentEditable: false, getRootNode: () => ({ host: null }) },
      getModifierState: () => false,
      preventDefault: () => {},
      stopPropagation: () => {},
    });

    assert.equal(
      Math.round(mockVideo.playbackRate * 10) / 10,
      1.1,
      `F${fNum} (keyCode ${keyCode}) should trigger 'faster' and raise speed to 1.1`
    );

    // Clear media elements for next iteration
    config.getMediaElements().length = 0;
  }
});

export default runner;
