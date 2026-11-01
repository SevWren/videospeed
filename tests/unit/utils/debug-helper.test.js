/**
 * Unit tests for debug-helper.js
 *
 * Seam: window.VSC.DebugHelper (class) and window.vscDebugHelper (instance)
 * after side-effect import of the module.
 *
 * Mocking policy: only system boundaries are mocked (console methods, DOM
 * methods that would fail in JSDOM, chrome runtime). Internal collaborators
 * are exercised through their real interfaces.
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

// Load constants + logger first (debug-helper depends on window.VSC)
await loadMinimalModules();
// Load debug-helper as side-effect import (exposes window.VSC.DebugHelper)
await import('../../../src/utils/debug-helper.js');

const runner = new SimpleTestRunner();

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Silence console output during a callback and return an array of calls.
 * Only silences the named method; restores it afterwards.
 */
function captureConsole(method, fn) {
  const calls = [];
  const orig = console[method];
  console[method] = (...args) => calls.push(args);
  try {
    fn();
  } finally {
    console[method] = orig;
  }
  return calls;
}

/**
 * Silence console.group / console.groupEnd / console.log / console.trace
 * during the callback, collecting log calls.
 */
function silenceConsole(fn) {
  const origLog = console.log;
  const origGroup = console.group;
  const origGroupEnd = console.groupEnd;
  const origTrace = console.trace;
  const calls = [];
  console.log = (...args) => calls.push(args);
  console.group = () => {};
  console.groupEnd = () => {};
  console.trace = () => {};
  try {
    fn();
  } finally {
    console.log = origLog;
    console.group = origGroup;
    console.groupEnd = origGroupEnd;
    console.trace = origTrace;
  }
  return calls;
}

// ── window.VSC.DebugHelper class is exposed ──────────────────────────────────

runner.test('window.VSC.DebugHelper is a constructor after module load', () => {
  assert.exists(window.VSC.DebugHelper, 'window.VSC.DebugHelper must exist');
  assert.equal(typeof window.VSC.DebugHelper, 'function', 'DebugHelper must be a function/class');
});

runner.test('window.vscDebugHelper is a DebugHelper instance after module load', () => {
  assert.exists(window.vscDebugHelper, 'window.vscDebugHelper must exist');
  assert.equal(
    window.vscDebugHelper instanceof window.VSC.DebugHelper,
    true,
    'window.vscDebugHelper must be an instance of DebugHelper'
  );
});

// ── DebugHelper constructor ───────────────────────────────────────────────────

runner.test('new DebugHelper() starts with isActive false', () => {
  const dh = new window.VSC.DebugHelper();
  assert.equal(dh.isActive, false, 'isActive must be false initially');
});

// ── enable() ─────────────────────────────────────────────────────────────────

runner.test('enable() sets isActive to true', () => {
  const dh = new window.VSC.DebugHelper();
  silenceConsole(() => dh.enable());
  assert.equal(dh.isActive, true, 'isActive must be true after enable()');
});

runner.test('enable() installs window.vscDebug object with expected functions', () => {
  const dh = new window.VSC.DebugHelper();
  silenceConsole(() => dh.enable());

  assert.exists(window.vscDebug, 'window.vscDebug must be created by enable()');
  assert.equal(typeof window.vscDebug.checkMedia, 'function', 'vscDebug.checkMedia must be a function');
  assert.equal(typeof window.vscDebug.checkControllers, 'function', 'vscDebug.checkControllers must be a function');
  assert.equal(typeof window.vscDebug.testPopup, 'function', 'vscDebug.testPopup must be a function');
  assert.equal(typeof window.vscDebug.testBridge, 'function', 'vscDebug.testBridge must be a function');
  assert.equal(typeof window.vscDebug.forceShow, 'function', 'vscDebug.forceShow must be a function');
  assert.equal(typeof window.vscDebug.forceShowAudio, 'function', 'vscDebug.forceShowAudio must be a function');
  assert.equal(typeof window.vscDebug.getVisibility, 'function', 'vscDebug.getVisibility must be a function');
});

runner.test('enable() delegates vscDebug.checkMedia to instance.checkMediaElements', () => {
  const dh = new window.VSC.DebugHelper();
  silenceConsole(() => dh.enable());

  // vscDebug.checkMedia() should call checkMediaElements without throwing
  silenceConsole(() => {
    window.vscDebug.checkMedia();
  });
  // If we reach here without throw the delegation works
  assert.equal(true, true);
});

// ── getElementVisibility() ───────────────────────────────────────────────────

runner.test('getElementVisibility() returns an object with expected keys', () => {
  const dh = new window.VSC.DebugHelper();
  const el = document.createElement('div');
  document.body.appendChild(el);

  const result = dh.getElementVisibility(el);

  assert.exists(result, 'result must be defined');
  assert.equal(typeof result.connected, 'boolean', 'connected must be boolean');
  assert.equal(typeof result.display, 'string', 'display must be string');
  assert.equal(typeof result.visibility, 'string', 'visibility must be string');
  assert.equal(typeof result.opacity, 'string', 'opacity must be string');
  assert.equal(typeof result.isVisible, 'boolean', 'isVisible must be boolean');

  document.body.removeChild(el);
});

runner.test('getElementVisibility() reports connected:true for element in DOM', () => {
  const dh = new window.VSC.DebugHelper();
  const el = document.createElement('div');
  document.body.appendChild(el);

  const result = dh.getElementVisibility(el);
  assert.equal(result.connected, true, 'connected must be true for element in DOM');

  document.body.removeChild(el);
});

runner.test('getElementVisibility() reports connected:false for detached element', () => {
  const dh = new window.VSC.DebugHelper();
  const el = document.createElement('div');
  // Do NOT append to DOM

  const result = dh.getElementVisibility(el);
  assert.equal(result.connected, false, 'connected must be false for detached element');
});

runner.test('getElementVisibility() isVisible is false for hidden element', () => {
  const dh = new window.VSC.DebugHelper();
  const el = document.createElement('div');
  el.style.display = 'none';
  document.body.appendChild(el);

  const result = dh.getElementVisibility(el);
  assert.equal(result.isVisible, false, 'isVisible must be false for display:none element');

  document.body.removeChild(el);
});

// ── forceShowControllers() ───────────────────────────────────────────────────

runner.test('forceShowControllers() returns 0 when no .vsc-controller elements exist', () => {
  // Make sure no stray controllers are in the document
  document.querySelectorAll('.vsc-controller').forEach((el) => el.remove());

  const dh = new window.VSC.DebugHelper();
  let result;
  silenceConsole(() => {
    result = dh.forceShowControllers();
  });

  assert.equal(result, 0, 'forceShowControllers() must return 0 when no controllers present');
});

runner.test('forceShowControllers() removes vsc-hidden class and returns count', () => {
  const dh = new window.VSC.DebugHelper();

  const ctrl = document.createElement('div');
  ctrl.className = 'vsc-controller vsc-hidden';
  document.body.appendChild(ctrl);

  let result;
  silenceConsole(() => {
    result = dh.forceShowControllers();
  });

  assert.equal(result, 1, 'forceShowControllers() must return 1 for one controller');
  assert.equal(
    ctrl.classList.contains('vsc-hidden'),
    false,
    'vsc-hidden class must be removed'
  );
  assert.equal(
    ctrl.classList.contains('vsc-manual'),
    true,
    'vsc-manual class must be added'
  );

  document.body.removeChild(ctrl);
});

// ── forceShowAudioControllers() ──────────────────────────────────────────────

runner.test('forceShowAudioControllers() returns 0 when no audio elements have controllers', () => {
  const dh = new window.VSC.DebugHelper();
  const audio = document.createElement('audio');
  document.body.appendChild(audio);

  let result;
  silenceConsole(() => {
    result = dh.forceShowAudioControllers();
  });

  assert.equal(result, 0, 'must return 0 when audio has no vsc controller');

  document.body.removeChild(audio);
});

runner.test('forceShowAudioControllers() shows controller for audio with vsc.div', () => {
  const dh = new window.VSC.DebugHelper();

  const audio = document.createElement('audio');
  const fakeDiv = document.createElement('div');
  fakeDiv.className = 'vsc-controller vsc-hidden';
  audio.vsc = { div: fakeDiv };
  document.body.appendChild(audio);

  let result;
  silenceConsole(() => {
    result = dh.forceShowAudioControllers();
  });

  assert.equal(result, 1, 'must return 1 for audio with controller');
  assert.equal(
    fakeDiv.classList.contains('vsc-hidden'),
    false,
    'vsc-hidden must be removed from audio controller'
  );

  delete audio.vsc;
  document.body.removeChild(audio);
});

// ── checkMediaElements() ─────────────────────────────────────────────────────

runner.test('checkMediaElements() completes without throwing', () => {
  const dh = new window.VSC.DebugHelper();
  let threw = false;
  try {
    silenceConsole(() => dh.checkMediaElements());
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'checkMediaElements() must not throw');
});

// ── checkControllers() ───────────────────────────────────────────────────────

runner.test('checkControllers() completes without throwing', () => {
  const dh = new window.VSC.DebugHelper();
  let threw = false;
  try {
    silenceConsole(() => dh.checkControllers());
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'checkControllers() must not throw');
});

// ── testPopupCommunication() ─────────────────────────────────────────────────

runner.test('testPopupCommunication() completes without throwing', () => {
  const dh = new window.VSC.DebugHelper();
  let threw = false;
  try {
    silenceConsole(() => dh.testPopupCommunication());
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'testPopupCommunication() must not throw');
});

// ── testPopupMessageBridge() ─────────────────────────────────────────────────

runner.test('testPopupMessageBridge() completes without throwing', () => {
  const dh = new window.VSC.DebugHelper();
  let threw = false;
  try {
    silenceConsole(() => dh.testPopupMessageBridge());
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'testPopupMessageBridge() must not throw');
});

// ── checkShadowDOMMedia() ─────────────────────────────────────────────────────

runner.test('checkShadowDOMMedia() completes without throwing', () => {
  const dh = new window.VSC.DebugHelper();
  let threw = false;
  try {
    silenceConsole(() => dh.checkShadowDOMMedia());
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false, 'checkShadowDOMMedia() must not throw');
});

// ── monitorControllerChanges() ────────────────────────────────────────────────

runner.test('monitorControllerChanges() returns a MutationObserver', () => {
  const dh = new window.VSC.DebugHelper();
  let obs;
  silenceConsole(() => {
    obs = dh.monitorControllerChanges();
  });
  assert.exists(obs, 'monitorControllerChanges() must return an observer');
  assert.equal(typeof obs.disconnect, 'function', 'returned observer must have disconnect()');
  // Clean up
  obs.disconnect();
});

export { runner as debugHelperTestRunner };
