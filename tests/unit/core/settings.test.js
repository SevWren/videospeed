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

// ── applySettings (live settings relay — issue #10) ──────────────────────────

runner.test('applySettings merges patch without wiping unrelated fields', () => {
  const config = window.VSC.videoSpeedConfig;
  const originalLastSpeed = config.settings.lastSpeed;
  const originalSpeeds = config.settings.speeds;

  config.applySettings({ rememberSpeed: true });

  assert.equal(config.settings.rememberSpeed, true, 'rememberSpeed should be updated');
  assert.equal(config.settings.lastSpeed, originalLastSpeed, 'lastSpeed must not be wiped');
  assert.equal(config.settings.speeds, originalSpeeds, 'speeds object must not be wiped');
});

runner.test('applySettings updates keyBindings immediately', () => {
  const config = window.VSC.videoSpeedConfig;
  const newBindings = [
    { action: 'faster', key: 70, value: 0.1, force: false, predefined: true },
  ];

  config.applySettings({ keyBindings: newBindings });

  assert.equal(config.settings.keyBindings, newBindings, 'keyBindings reference should be updated');
  assert.equal(config.settings.keyBindings[0].key, 70, 'new key code should be applied');
});

runner.test('applySettings calls logger.setVerbosity when logLevel is in patch', () => {
  const config = window.VSC.videoSpeedConfig;
  let verbositySet = null;
  const origSet = window.VSC.logger.setVerbosity.bind(window.VSC.logger);
  window.VSC.logger.setVerbosity = (level) => { verbositySet = level; origSet(level); };

  config.applySettings({ logLevel: 5 });

  window.VSC.logger.setVerbosity = origSet;
  assert.equal(verbositySet, 5, 'setVerbosity should be called with new logLevel');
});

runner.test('applySettings does NOT call setVerbosity when logLevel absent from patch', () => {
  const config = window.VSC.videoSpeedConfig;
  let setVerbosityCalled = false;
  const origSet = window.VSC.logger.setVerbosity.bind(window.VSC.logger);
  window.VSC.logger.setVerbosity = () => { setVerbosityCalled = true; origSet(); };

  config.applySettings({ rememberSpeed: false });

  window.VSC.logger.setVerbosity = origSet;
  assert.equal(setVerbosityCalled, false, 'setVerbosity must not be called when logLevel not in patch');
});

runner.test('applySettings handles null patch without throwing', () => {
  const config = window.VSC.videoSpeedConfig;
  // Must not throw
  config.applySettings(null);
  config.applySettings(undefined);
  config.applySettings({});
});

runner.test('applySettings mutates this.settings in place (stable reference)', () => {
  const config = window.VSC.videoSpeedConfig;
  const ref = config.settings;

  config.applySettings({ startHidden: true });

  assert.equal(config.settings, ref, 'this.settings must be the same object after applySettings');
  assert.equal(ref.startHidden, true, 'mutation should be visible through original reference');
});

runner.test('applySettings with an array leaves settings unchanged and does not throw', () => {
  const config = window.VSC.videoSpeedConfig;

  const speedBefore = config.settings.lastSpeed;
  const enabledBefore = config.settings.enabled;

  // Array is not a valid settings object — should be a no-op due to Array.isArray guard
  config.applySettings([1, 2, 3]);

  assert.equal(config.settings.lastSpeed, speedBefore, 'lastSpeed should be unchanged');
  assert.equal(config.settings.enabled, enabledBefore, 'enabled should be unchanged');
});

export { runner as settingsTestRunner };