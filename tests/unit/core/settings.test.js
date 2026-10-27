/**
 * Unit tests for settings management
 * Using global variables to match browser extension architecture
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, wait } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadMinimalModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();

  // Clear any injected settings for clean tests
  if (window.VSC && window.VSC.StorageManager) {
    window.VSC.StorageManager._injectedSettings = null;
  }
});

runner.afterEach(() => {
  cleanupChromeMock();
});

runner.test('VideoSpeedConfig should initialize with default settings', () => {
  // Access VideoSpeedConfig from global scope
  const config = window.VSC.videoSpeedConfig;
  assert.exists(config.settings);
  assert.equal(config.settings.enabled, true);
  assert.equal(config.settings.lastSpeed, 1.0);
  assert.equal(config.settings.logLevel, 3);
});

runner.test('VideoSpeedConfig should load settings from storage', async () => {
  const config = window.VSC.videoSpeedConfig;
  const settings = await config.load();

  assert.exists(settings);
  assert.equal(settings.enabled, true);
  assert.equal(settings.lastSpeed, 1.0);
});

runner.test('VideoSpeedConfig should save settings to storage', async () => {
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  await config.save({ lastSpeed: 2.0, enabled: false });

  assert.equal(config.settings.lastSpeed, 2.0);
  assert.equal(config.settings.enabled, false);
});

runner.test('VideoSpeedConfig should handle key bindings', async () => {
  // Clear any injected settings for clean test
  window.VSC.StorageManager._injectedSettings = null;

  // Create fresh config instance
  const config = new window.VSC.VideoSpeedConfig();

  // Force load with defaults only
  const storage = await window.VSC.StorageManager.get(window.VSC.Constants.DEFAULT_SETTINGS);
  config.settings.keyBindings = [];
  await config.initializeDefaultKeyBindings(storage);

  const fasterValue = config.getKeyBinding('faster');
  assert.equal(fasterValue, 0.1);

  config.setKeyBinding('faster', 0.2);
  const updatedValue = config.getKeyBinding('faster');
  assert.equal(updatedValue, 0.2);
});

runner.test('VideoSpeedConfig should track media elements', () => {
  const config = window.VSC.videoSpeedConfig;
  const mockVideo = document.createElement('video');

  config.addMediaElement(mockVideo);
  assert.equal(config.getMediaElements().length, 1);
  assert.equal(config.getMediaElements()[0], mockVideo);

  config.removeMediaElement(mockVideo);
  assert.equal(config.getMediaElements().length, 0);
});

runner.test('VideoSpeedConfig should handle invalid key binding requests gracefully', () => {
  const config = window.VSC.videoSpeedConfig;

  const result = config.getKeyBinding('nonexistent');
  assert.equal(result, false);

  // Should not throw
  config.setKeyBinding('nonexistent', 123);
});

runner.test('applySettings merges patch without wiping unrelated fields', async () => {
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const originalEnabled = config.settings.enabled;
  const originalLastSpeed = config.settings.lastSpeed;

  config.applySettings({ rememberSpeed: true });

  assert.equal(config.settings.rememberSpeed, true, 'rememberSpeed should be updated');
  assert.equal(config.settings.enabled, originalEnabled, 'enabled should be unchanged');
  assert.equal(config.settings.lastSpeed, originalLastSpeed, 'lastSpeed should be unchanged');
});

runner.test('applySettings calls logger.setVerbosity when patch includes logLevel', async () => {
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  let verbositySet = null;
  const origSetVerbosity = window.VSC.logger.setVerbosity;
  window.VSC.logger.setVerbosity = (level) => { verbositySet = level; };

  try {
    config.applySettings({ logLevel: 5 });
    assert.equal(config.settings.logLevel, 5, 'logLevel should be updated');
    assert.equal(verbositySet, 5, 'setVerbosity should have been called with new logLevel');
  } finally {
    window.VSC.logger.setVerbosity = origSetVerbosity;
  }
});

runner.test('applySettings handles null patch without throwing', () => {
  const config = window.VSC.videoSpeedConfig;

  // Should not throw for null
  config.applySettings(null);

  // Should not throw for empty object
  config.applySettings({});
});

export { runner as settingsTestRunner };