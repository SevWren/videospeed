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
  // RED: before DEFAULT_SETTINGS were wired into the constructor, config.settings was
  // undefined and every field access threw, causing this test to fail.
  const config = window.VSC.videoSpeedConfig;
  assert.exists(config.settings);
  assert.equal(config.settings.enabled, true);
  assert.equal(config.settings.lastSpeed, 1.0);
  assert.equal(config.settings.logLevel, 3);
});

runner.test('VideoSpeedConfig should load settings from storage', async () => {
  // RED: before load() read from StorageManager, it returned an empty object and
  // settings.enabled was undefined instead of true, failing the assertion.
  const config = window.VSC.videoSpeedConfig;
  const settings = await config.load();

  assert.exists(settings);
  assert.equal(settings.enabled, true);
  assert.equal(settings.lastSpeed, 1.0);
});

runner.test('VideoSpeedConfig should save settings to storage', async () => {
  // RED: before save() merged the incoming object into this.settings, config.settings
  // retained the old values after the call, failing the equality assertions.
  const config = window.VSC.videoSpeedConfig;
  await config.load();

  await config.save({ lastSpeed: 2.0, enabled: false });

  assert.equal(config.settings.lastSpeed, 2.0);
  assert.equal(config.settings.enabled, false);
});

runner.test('VideoSpeedConfig should handle key bindings', async () => {
  // RED: before getKeyBinding/setKeyBinding were implemented, both calls returned false
  // and the updated value did not persist, causing this test to fail.

  // Use a fresh config loaded via the public load() path (no internal helpers touched).
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const fasterValue = config.getKeyBinding('faster');
  assert.equal(fasterValue, 0.1);

  config.setKeyBinding('faster', 0.2);
  const updatedValue = config.getKeyBinding('faster');
  assert.equal(updatedValue, 0.2);
});

runner.test('VideoSpeedConfig should track media elements', () => {
  // RED: before addMediaElement/removeMediaElement were implemented, getMediaElements()
  // always returned [] regardless of what was added, failing the length assertions.
  const config = window.VSC.videoSpeedConfig;
  const mockVideo = document.createElement('video');

  config.addMediaElement(mockVideo);
  assert.equal(config.getMediaElements().length, 1);
  assert.equal(config.getMediaElements()[0], mockVideo);

  config.removeMediaElement(mockVideo);
  assert.equal(config.getMediaElements().length, 0);
});

runner.test('VideoSpeedConfig should handle invalid key binding requests gracefully', () => {
  // RED: before the try/catch guard in getKeyBinding, requesting a non-existent action
  // threw an uncaught TypeError instead of returning false, failing this test.
  const config = window.VSC.videoSpeedConfig;

  const result = config.getKeyBinding('nonexistent');
  assert.equal(result, false);

  // Should not throw
  config.setKeyBinding('nonexistent', 123);
});

// ── applySettings (live settings relay — issue #10) ──────────────────────────

runner.test('applySettings merges patch without wiping unrelated fields', () => {
  // RED: before Object.assign was used in applySettings, the method replaced this.settings
  // entirely with the patch object, wiping lastSpeed and speeds — assertions failed.
  const config = window.VSC.videoSpeedConfig;
  const originalLastSpeed = config.settings.lastSpeed;
  const originalSpeeds = config.settings.speeds;

  config.applySettings({ rememberSpeed: true });

  assert.equal(config.settings.rememberSpeed, true, 'rememberSpeed should be updated');
  assert.equal(config.settings.lastSpeed, originalLastSpeed, 'lastSpeed must not be wiped');
  assert.equal(config.settings.speeds, originalSpeeds, 'speeds object must not be wiped');
});

runner.test('applySettings updates keyBindings immediately', () => {
  // RED: before applySettings was synchronous, a deferred merge left keyBindings
  // pointing to the old array reference, failing the identity and key-code assertions.
  const config = window.VSC.videoSpeedConfig;
  const newBindings = [
    { action: 'faster', key: 70, value: 0.1, force: false, predefined: true },
  ];

  config.applySettings({ keyBindings: newBindings });

  assert.equal(config.settings.keyBindings, newBindings, 'keyBindings reference should be updated');
  assert.equal(config.settings.keyBindings[0].key, 70, 'new key code should be applied');
});

runner.test('applySettings updates logger verbosity when logLevel is in patch', () => {
  // RED: before applySettings called setVerbosity, logger.verbosity stayed at the old
  // level even after a patch containing logLevel, so this assertion failed.
  const config = window.VSC.videoSpeedConfig;

  config.applySettings({ logLevel: 5 });

  assert.equal(window.VSC.logger.verbosity, 5, 'logger verbosity should reflect new logLevel');
});

runner.test('applySettings leaves logger verbosity unchanged when logLevel absent from patch', () => {
  // RED: an incorrect implementation that always called setVerbosity would change verbosity
  // to undefined here, breaking this observable invariant.
  const config = window.VSC.videoSpeedConfig;
  const verbosityBefore = window.VSC.logger.verbosity;

  config.applySettings({ rememberSpeed: false });

  assert.equal(
    window.VSC.logger.verbosity,
    verbosityBefore,
    'logger verbosity must not change when logLevel is not in the patch'
  );
});

runner.test('applySettings handles null patch without throwing', () => {
  // RED: before the null/undefined guard was added, applySettings(null) called
  // Object.keys(null) which threw a TypeError, failing this test.
  const config = window.VSC.videoSpeedConfig;
  // Must not throw
  config.applySettings(null);
  config.applySettings(undefined);
  config.applySettings({});
});

runner.test('applySettings mutates this.settings in place (stable reference)', () => {
  // RED: before in-place mutation was used, applySettings reassigned this.settings to
  // a new object, breaking the reference held by callers and failing the identity check.
  const config = window.VSC.videoSpeedConfig;
  const ref = config.settings;

  config.applySettings({ startHidden: true });

  assert.equal(config.settings, ref, 'this.settings must be the same object after applySettings');
  assert.equal(ref.startHidden, true, 'mutation should be visible through original reference');
});

export { runner as settingsTestRunner };
