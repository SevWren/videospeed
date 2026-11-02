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

// ── getKeyBinding / setKeyBinding error-path catch blocks (lines 139-141, 156-157) ──

runner.test('getKeyBinding returns false when keyBindings is null (catch branch)', () => {
  // RED: before the try/catch in getKeyBinding was present, setting keyBindings to null
  // and calling getKeyBinding would throw a TypeError instead of returning false.
  const config = new window.VSC.VideoSpeedConfig();
  // Force keyBindings to null to trigger the catch path (lines 139-141)
  config.settings.keyBindings = null;

  const result = config.getKeyBinding('faster');

  assert.equal(result, false, 'getKeyBinding should return false when keyBindings is null');
});

runner.test('setKeyBinding does not throw when keyBindings is null (catch branch)', () => {
  // RED: before the try/catch in setKeyBinding was present, setting keyBindings to null
  // and calling setKeyBinding would throw a TypeError instead of silently catching.
  const config = new window.VSC.VideoSpeedConfig();
  // Force keyBindings to null to trigger the catch path (lines 156-157)
  config.settings.keyBindings = null;

  // Must not throw
  config.setKeyBinding('faster', 0.5);
});

// ── initializeDefaultKeyBindings (lines 166-269) ────────────────────────────

runner.test('initializeDefaultKeyBindings builds key bindings from legacy storage values', async () => {
  // RED: before initializeDefaultKeyBindings populated keyBindings from the storage
  // legacy fields, calling it with legacy values yielded an empty keyBindings array.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const legacyStorage = {
    slowerKeyCode: 65,   // 'A'
    fasterKeyCode: 68,   // 'D'
    speedStep: 0.25,
    rewindKeyCode: 82,   // 'R'
    rewindTime: 15,
    advanceKeyCode: 70,  // 'F'
    advanceTime: 20,
    resetKeyCode: 83,    // 'S'
    fastKeyCode: 71,     // 'G'
    fastSpeed: 2.0,
  };

  await config.initializeDefaultKeyBindings(legacyStorage);

  // 'slower' binding should use legacy slowerKeyCode and speedStep
  const slowerKey = config.settings.keyBindings.find((b) => b.action === 'slower');
  assert.exists(slowerKey, 'slower binding must exist');
  assert.equal(slowerKey.key, 65, 'slower key must be legacy slowerKeyCode 65');
  assert.equal(slowerKey.value, 0.25, 'slower value must be legacy speedStep 0.25');

  // 'faster' binding
  const fasterKey = config.settings.keyBindings.find((b) => b.action === 'faster');
  assert.exists(fasterKey, 'faster binding must exist');
  assert.equal(fasterKey.key, 68, 'faster key must be legacy fasterKeyCode 68');

  // 'reset' binding always has value 1.0
  const resetKey = config.settings.keyBindings.find((b) => b.action === 'reset');
  assert.exists(resetKey, 'reset binding must exist');
  assert.equal(resetKey.value, 1.0, 'reset binding value must be 1.0');
});

runner.test('initializeDefaultKeyBindings uses fallback defaults when storage has no legacy keys', async () => {
  // RED: before the || fallback literals were in place, calling with an empty storage
  // object yielded NaN for all key codes, failing the number assertions.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  await config.initializeDefaultKeyBindings({});

  // Fallback key codes per source: slower=90, faster=67, rewind=69, advance=82, reset=83, fast=88
  const slowerKey = config.settings.keyBindings.find((b) => b.action === 'slower');
  assert.exists(slowerKey, 'slower binding must exist with fallback key');
  assert.equal(slowerKey.key, 90, 'slower fallback key must be 90 (Z)');

  const fasterKey = config.settings.keyBindings.find((b) => b.action === 'faster');
  assert.equal(fasterKey.key, 67, 'faster fallback key must be 67 (C)');
});

runner.test('initializeDefaultKeyBindings includes hardcoded W/T/M/J bindings', async () => {
  // RED: before the W/T/M/J entries were added in initializeDefaultKeyBindings, the
  // returned keyBindings lacked those actions.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  await config.initializeDefaultKeyBindings({});

  const allActions = config.settings.keyBindings.map((b) => b.action);

  // W key (87) — extra rewind
  const rewindBindings = config.settings.keyBindings.filter((b) => b.action === 'rewind');
  assert.true(rewindBindings.length >= 2, 'must have at least two rewind bindings (E and W)');
  const wRewind = rewindBindings.find((b) => b.key === 87);
  assert.exists(wRewind, 'rewind binding with key 87 (W) must exist');
  assert.equal(wRewind.value, 120, 'W rewind value must be 120');

  // T key (84) — extra advance
  const advanceBindings = config.settings.keyBindings.filter((b) => b.action === 'advance');
  assert.true(advanceBindings.length >= 2, 'must have at least two advance bindings (R and T)');
  const tAdvance = advanceBindings.find((b) => b.key === 84);
  assert.exists(tAdvance, 'advance binding with key 84 (T) must exist');

  // M key (77) — mark
  assert.true(allActions.includes('mark'), 'mark action must be present');
  const markBinding = config.settings.keyBindings.find((b) => b.action === 'mark');
  assert.equal(markBinding.key, 77, 'mark key must be 77 (M)');

  // J key (74) — jump
  assert.true(allActions.includes('jump'), 'jump action must be present');
  const jumpBinding = config.settings.keyBindings.find((b) => b.action === 'jump');
  assert.equal(jumpBinding.key, 74, 'jump key must be 74 (J)');
});

runner.test('initializeDefaultKeyBindings sets version to 0.5.3', async () => {
  // RED: before the version assignment on line 250, config.settings.version was not
  // set by this method, causing this assertion to fail.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  await config.initializeDefaultKeyBindings({});

  assert.equal(config.settings.version, '0.5.3', 'version must be set to 0.5.3 after migration');
});

runner.test('initializeDefaultKeyBindings persists bindings via StorageManager.set', async () => {
  // RED: before the StorageManager.set call at the end of initializeDefaultKeyBindings,
  // chrome.storage.sync.set was never called, so keyBindings were not persisted.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const savedCalls = [];
  const originalSet = window.VSC.StorageManager.set.bind(window.VSC.StorageManager);
  window.VSC.StorageManager.set = async (data) => {
    savedCalls.push(data);
    return originalSet(data);
  };

  try {
    await config.initializeDefaultKeyBindings({});
  } finally {
    window.VSC.StorageManager.set = originalSet;
  }

  assert.true(savedCalls.length >= 1, 'StorageManager.set must be called at least once');
  const savedData = savedCalls[savedCalls.length - 1];
  assert.exists(savedData.keyBindings, 'persisted data must include keyBindings');
  assert.equal(savedData.version, '0.5.3', 'persisted data must include version 0.5.3');
});

// ── gif element tracking (addGifElement / removeGifElement / getGifElements) ──

runner.test('VideoSpeedConfig tracks GIF elements via add/remove/getGifElements', () => {
  // RED: before addGifElement/removeGifElement/getGifElements were implemented, the
  // gifElements Set was not managed and getGifElements() always returned [].
  const config = new window.VSC.VideoSpeedConfig();
  const fakeImg = document.createElement('img');

  config.addGifElement(fakeImg);
  assert.equal(config.getGifElements().length, 1, 'one GIF element must be tracked after add');
  assert.equal(config.getGifElements()[0], fakeImg, 'tracked element must be the added img');

  config.removeGifElement(fakeImg);
  assert.equal(config.getGifElements().length, 0, 'no GIF elements must remain after remove');
});

runner.test('VideoSpeedConfig addGifElement does not duplicate elements', () => {
  // RED: if addGifElement used an Array.push instead of Set.add, the same element
  // could be added twice, causing the length assertion to fail.
  const config = new window.VSC.VideoSpeedConfig();
  const fakeImg = document.createElement('img');

  config.addGifElement(fakeImg);
  config.addGifElement(fakeImg); // second add of same element

  assert.equal(config.getGifElements().length, 1, 'Set must deduplicate; length must remain 1');
});

// ── T1: hoverActivatesVideoTarget / hoverActivatesGifTarget defaults (issue #32) ──

runner.test('DEFAULT_SETTINGS.hoverActivatesVideoTarget must be true', () => {
  // RED: fails until hoverActivatesVideoTarget: true is added to DEFAULT_SETTINGS.
  const defaults = window.VSC.Constants.DEFAULT_SETTINGS;
  assert.equal(
    defaults.hoverActivatesVideoTarget,
    true,
    'DEFAULT_SETTINGS.hoverActivatesVideoTarget must be true (hover-to-activate is on by default)',
  );
});

runner.test('DEFAULT_SETTINGS.hoverActivatesGifTarget must be false', () => {
  // RED: fails until hoverActivatesGifTarget: false is added to DEFAULT_SETTINGS.
  const defaults = window.VSC.Constants.DEFAULT_SETTINGS;
  assert.equal(
    defaults.hoverActivatesGifTarget,
    false,
    'DEFAULT_SETTINGS.hoverActivatesGifTarget must be false (hover-to-activate for GIFs is off by default)',
  );
});

// ---------------------------------------------------------------------------
// Change 3 RED: VideoSpeedConfig.update(patch)
// These tests will be RED until update() is added to VideoSpeedConfig.
// ---------------------------------------------------------------------------

runner.test('config.update sets config.settings.lastSpeed AND calls save with the patch', async () => {
  // RED: update() method does not exist yet — calling it throws TypeError.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const savedPatches = [];
  const originalSet = window.VSC.StorageManager.set.bind(window.VSC.StorageManager);
  window.VSC.StorageManager.set = async (data) => {
    savedPatches.push(data);
    return originalSet(data);
  };

  try {
    await config.update({ lastSpeed: 2.0 });
  } finally {
    window.VSC.StorageManager.set = originalSet;
  }

  assert.equal(config.settings.lastSpeed, 2.0, 'config.settings.lastSpeed must be updated');
  assert.true(savedPatches.length >= 1, 'StorageManager.set must have been called');
});

runner.test('config.update with multiple keys updates all of them atomically', async () => {
  // RED: update() method does not exist yet.
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  const originalSet = window.VSC.StorageManager.set.bind(window.VSC.StorageManager);
  window.VSC.StorageManager.set = async (data) => originalSet(data);

  try {
    await config.update({ lastSpeed: 3.0, rememberSpeed: true });
  } finally {
    window.VSC.StorageManager.set = originalSet;
  }

  assert.equal(config.settings.lastSpeed, 3.0, 'lastSpeed must be updated atomically');
  assert.equal(config.settings.rememberSpeed, true, 'rememberSpeed must be updated atomically in the same call');
});

export { runner as settingsTestRunner };
