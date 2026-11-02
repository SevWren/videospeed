/**
 * Tests for keyboard shortcuts saving fix
 * Verifies the resolution of the dual storage system issue
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert, wait } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadMinimalModules([
  '../../../src/utils/constants.js',
  '../../../src/utils/logger.js',
  '../../../src/core/storage-manager.js',
  '../../../src/core/settings.js'
]);

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();

  // Reset StorageManager listener and injected-settings state so no stale
  // values carry over from earlier test files in the shared JSDOM environment.
  // _teardownSettingsListener() resets both _listenerSetup and _injectedSettings.
  if (window.VSC && window.VSC.StorageManager) {
    window.VSC.StorageManager._teardownSettingsListener();
  }
});

runner.afterEach(() => {
  cleanupChromeMock();
});

// DEFAULT_SETTINGS keyBindings initialization tests
runner.test('DEFAULT_SETTINGS should have keyBindings populated', () => {
  const defaults = window.VSC.Constants.DEFAULT_SETTINGS;
  
  assert.exists(defaults.keyBindings, 'DEFAULT_SETTINGS.keyBindings should exist');
  assert.equal(defaults.keyBindings.length > 0, true, 'DEFAULT_SETTINGS.keyBindings should not be empty');
  
  // Should have all expected default bindings
  const expectedActions = ['slower', 'faster', 'rewind', 'advance', 'reset', 'fast', 'display', 'mark', 'jump'];
  const actualActions = defaults.keyBindings.map(b => b.action);
  
  expectedActions.forEach(action => {
    assert.equal(actualActions.includes(action), true, `Missing default binding for action: ${action}`);
  });
});

runner.test('DEFAULT_SETTINGS keyBindings should have proper structure', () => {
  const defaults = window.VSC.Constants.DEFAULT_SETTINGS;
  
  defaults.keyBindings.forEach((binding, index) => {
    assert.equal(typeof binding.action, 'string', `Binding ${index}: action should be string`);
    assert.equal(typeof binding.key, 'number', `Binding ${index}: key should be number`);
    assert.equal(typeof binding.value, 'number', `Binding ${index}: value should be number`);
    assert.equal(typeof binding.force, 'boolean', `Binding ${index}: force should be boolean`);
    assert.equal(typeof binding.predefined, 'boolean', `Binding ${index}: predefined should be boolean`);
  });
});

runner.test('Fresh install should not require first-time initialization', async () => {
  // Clear storage to simulate fresh install
  resetMockStorage();
  
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  
  // Should have loaded default bindings without first-time initialization
  assert.exists(config.settings.keyBindings, 'Should have keyBindings on fresh install');
  assert.equal(config.settings.keyBindings.length > 0, true, 'Should have default keyBindings on fresh install');
  
  // Verify count matches the known-good literal (11) from constants.js at authoring time:
  //   slower(Z), faster(C), fast(X), rewind(E), rewind(W), advance(R), advance(T),
  //   reset(S), display(V), mark(M), jump(J)
  // Red signal: if DEFAULT_SETTINGS.keyBindings is accidentally emptied, this fails.
  assert.equal(config.settings.keyBindings.length, 11,
    `Expected 11 default bindings on fresh install, got ${config.settings.keyBindings.length}`);
});

// Storage System Unification tests
runner.test('Should handle existing keyBindings in storage', async () => {
  // Setup existing storage with keyBindings by saving them first
  const existingBindings = [
    { action: 'slower', key: 65, value: 0.2, force: false, predefined: true }, // A key
    { action: 'faster', key: 68, value: 0.2, force: false, predefined: true } // D key
  ];
  
  const config1 = new window.VSC.VideoSpeedConfig();
  await config1.save({ keyBindings: existingBindings });
  
  // Load with new instance to verify persistence
  const config2 = new window.VSC.VideoSpeedConfig();
  await config2.load();
  
  assert.equal(config2.settings.keyBindings.length >= existingBindings.length, true,
    'Should preserve existing keyBindings from storage');
  
  // Verify bindings were loaded correctly
  const slowerBinding = config2.settings.keyBindings.find(b => b.action === 'slower');
  assert.exists(slowerBinding, 'Should have slower binding');
  assert.equal(typeof slowerBinding.force, 'boolean', 'Force should be boolean type');
});

runner.test('Should save keyBindings to storage correctly', async () => {
  const config1 = new window.VSC.VideoSpeedConfig();
  
  const customBindings = [
    { action: 'slower', key: 81, value: 0.15, force: true, predefined: true }, // Q key
    { action: 'faster', key: 69, value: 0.15, force: false, predefined: true } // E key
  ];
  
  await config1.save({ keyBindings: customBindings });
  
  // Verify saved by loading with new instance
  const config2 = new window.VSC.VideoSpeedConfig();
  await config2.load();
  
  assert.exists(config2.settings.keyBindings, 'keyBindings should be loaded from storage');
  assert.equal(config2.settings.keyBindings.length >= customBindings.length, true,
    'Loaded keyBindings should include custom bindings');
});

runner.test('Should maintain consistency across load/save cycles', async () => {
  const originalBindings = [
    { action: 'slower', key: 87, value: 0.25, force: true, predefined: true }, // W key
    { action: 'faster', key: 83, value: 0.25, force: false, predefined: true } // S key
  ];
  
  // Save bindings
  const config1 = new window.VSC.VideoSpeedConfig();
  await config1.save({ keyBindings: originalBindings });
  
  // Load with new instance
  const config2 = new window.VSC.VideoSpeedConfig();
  await config2.load();
  
  const loadedBindings = config2.settings.keyBindings;
  
  // Find our bindings (they might be mixed with defaults)
  const slowerBinding = loadedBindings.find(b => b.action === 'slower');
  const fasterBinding = loadedBindings.find(b => b.action === 'faster');
  
  assert.exists(slowerBinding, 'Slower binding should exist');
  assert.exists(fasterBinding, 'Faster binding should exist');
  
  // Values should be preserved with correct types
  assert.equal(typeof slowerBinding.force, 'boolean', 'Force field should be boolean type');
  assert.equal(typeof fasterBinding.force, 'boolean', 'Force field should be boolean type');
});

// Force Field Data Type Consistency tests
runner.test('Should handle string force values from legacy storage', async () => {
  // This test validates that the force field is always boolean type
  // The actual legacy string conversion happens in options.js save_options
  
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();
  
  // Should have proper boolean types in all bindings
  const bindings = config.settings.keyBindings;
  bindings.forEach((binding, index) => {
    assert.equal(typeof binding.force, 'boolean',
      `Binding ${index} force should be boolean, got ${typeof binding.force}`);
  });
});

// Regression Prevention tests
runner.test('Should never lose all keyboard shortcuts', async () => {
  // This test specifically prevents the original bug from returning
  
  // Test that default shortcuts are always available
  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  // Should always have shortcuts
  assert.equal(config.settings.keyBindings && config.settings.keyBindings.length > 0, true,
    'Should always have keyboard shortcuts available');
  
  // Should have the essential shortcuts
  const requiredActions = ['slower', 'faster', 'display'];
  for (const action of requiredActions) {
    const binding = config.settings.keyBindings.find(b => b.action === action);
    assert.exists(binding, `Should always have ${action} shortcut`);
  }
});

runner.test('Fresh install should always have functional default shortcuts', async () => {
  // Simulate completely fresh install (empty storage)
  resetMockStorage();

  const config = new window.VSC.VideoSpeedConfig();
  await config.load();

  // Known-good keycodes from constants.js (independent literals — NOT re-read from
  // DEFAULT_SETTINGS at test time).  "First binding" per action wins; for actions
  // with two bindings (rewind, advance) we assert the first (lower keycode) entry.
  // Red signal: if any binding is missing or its keycode changes, this test fails.
  //   slower=Z(90), faster=C(67), fast=X(88), rewind=E(69), advance=R(82),
  //   reset=S(83), display=V(86), mark=M(77), jump=J(74)
  const expectedFirstKey = {
    slower:  90, // Z
    faster:  67, // C
    fast:    88, // X
    rewind:  69, // E  (first rewind binding)
    advance: 82, // R  (first advance binding)
    reset:   83, // S
    display: 86, // V
    mark:    77, // M
    jump:    74, // J
  };

  for (const [action, expectedKey] of Object.entries(expectedFirstKey)) {
    const binding = config.settings.keyBindings.find(b => b.action === action);
    assert.exists(binding, `Missing default binding for ${action} on fresh install`);
    assert.equal(binding.key, expectedKey,
      `Default key for '${action}' should be ${expectedKey} (got ${binding.key})`);
  }
});

export default runner;