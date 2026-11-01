/**
 * Unit tests for ShadowDOMManager (src/ui/shadow-dom.js)
 * Chartered seam: window.VSC.ShadowDOMManager — shadow root creation function
 *
 * Uncovered lines targeted:
 *   195-196  getControls
 *   213-214  getButtons
 *   222-226  updateSpeedDisplay (including the guard branch when speedIndicator absent)
 *   isGif=true path in createShadowDOM (lines 156/159 branch)
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

await loadCoreModules();

const runner = new SimpleTestRunner();

// ── lifecycle ─────────────────────────────────────────────────────────────────

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
});

runner.afterEach(() => {
  cleanupChromeMock();
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const wrapper = document.createElement('div');
  document.body.appendChild(wrapper);
  return wrapper;
}

// ── tests ─────────────────────────────────────────────────────────────────────

runner.test('ShadowDOMManager is registered on window.VSC', () => {
  assert.exists(window.VSC.ShadowDOMManager, 'ShadowDOMManager should be on window.VSC');
});

runner.test('createShadowDOM returns a shadow root with #controller', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper);

  const controller = shadow.querySelector('#controller');
  assert.exists(controller, '#controller should exist in created shadow DOM');
});

runner.test('createShadowDOM applies top/left/opacity from options', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, {
    top: '15px',
    left: '30px',
    opacity: 0.7,
  });

  const controller = shadow.querySelector('#controller');
  assert.exists(controller);
  assert.true(controller.style.top === '15px', 'top should be 15px');
  assert.true(controller.style.left === '30px', 'left should be 30px');
  assert.true(controller.style.opacity === '0.7', 'opacity should be 0.7');
});

runner.test('createShadowDOM sets speed text on .draggable', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, { speed: '2.00' });

  const draggable = shadow.querySelector('.draggable');
  assert.exists(draggable);
  assert.equal(draggable.textContent, '2.00');
});

runner.test('createShadowDOM (isGif=false) includes rewind and advance buttons', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, { isGif: false });

  const actions = Array.from(shadow.querySelectorAll('button')).map((b) =>
    b.getAttribute('data-action')
  );
  assert.true(actions.includes('rewind'), 'should include rewind button when isGif=false');
  assert.true(actions.includes('advance'), 'should include advance button when isGif=false');
});

runner.test('createShadowDOM (isGif=true) omits rewind and advance buttons', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, { isGif: true });

  const actions = Array.from(shadow.querySelectorAll('button')).map((b) =>
    b.getAttribute('data-action')
  );
  assert.false(actions.includes('rewind'), 'should omit rewind button when isGif=true');
  assert.false(actions.includes('advance'), 'should omit advance button when isGif=true');
  assert.true(actions.includes('slower'), 'should still include slower button');
  assert.true(actions.includes('faster'), 'should still include faster button');
  assert.true(actions.includes('display'), 'should still include display button');
});

runner.test('getController returns #controller element', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper);

  const controller = window.VSC.ShadowDOMManager.getController(shadow);
  assert.exists(controller);
  assert.equal(controller.id, 'controller');
});

runner.test('getControls returns #controls element', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper);

  const controls = window.VSC.ShadowDOMManager.getControls(shadow);
  assert.exists(controls, 'getControls should return #controls element');
  assert.equal(controls.id, 'controls');
});

runner.test('getSpeedIndicator returns .draggable element', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper);

  const indicator = window.VSC.ShadowDOMManager.getSpeedIndicator(shadow);
  assert.exists(indicator);
  assert.true(indicator.classList.contains('draggable'));
});

runner.test('getButtons returns all button elements', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, { isGif: false });

  const buttons = window.VSC.ShadowDOMManager.getButtons(shadow);
  // non-GIF mode has: rewind, slower, faster, advance, display = 5 buttons
  assert.equal(buttons.length, 5, 'should return 5 buttons for non-GIF mode');
});

runner.test('getButtons returns 3 buttons in GIF mode', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, { isGif: true });

  const buttons = window.VSC.ShadowDOMManager.getButtons(shadow);
  // GIF mode: slower, faster, display = 3 buttons
  assert.equal(buttons.length, 3, 'should return 3 buttons for GIF mode');
});

runner.test('updateSpeedDisplay updates .draggable textContent', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, { speed: '1.00' });

  window.VSC.ShadowDOMManager.updateSpeedDisplay(shadow, 1.5);

  const indicator = shadow.querySelector('.draggable');
  assert.equal(indicator.textContent, '1.50', 'updateSpeedDisplay should update speed text');
});

runner.test('updateSpeedDisplay formats to 2 decimal places', () => {
  const wrapper = makeWrapper();
  const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper);

  window.VSC.ShadowDOMManager.updateSpeedDisplay(shadow, 2);

  const indicator = shadow.querySelector('.draggable');
  assert.equal(indicator.textContent, '2.00');
});

runner.test('updateSpeedDisplay does not throw when speedIndicator is absent', () => {
  // Build a shadow without a .draggable element
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  // No .draggable inside

  let threw = false;
  try {
    window.VSC.ShadowDOMManager.updateSpeedDisplay(shadow, 1.5);
  } catch (_e) {
    threw = true;
  }
  assert.false(threw, 'updateSpeedDisplay should not throw when .draggable is absent');
});

runner.test('calculatePosition returns top and left as px strings', () => {
  const video = document.createElement('video');
  document.body.appendChild(video);

  const pos = window.VSC.ShadowDOMManager.calculatePosition(video);
  assert.exists(pos.top, 'position should have top');
  assert.exists(pos.left, 'position should have left');
  assert.true(pos.top.endsWith('px'), 'top should be a px value');
  assert.true(pos.left.endsWith('px'), 'left should be a px value');
});

export { runner as shadowDomTestRunner };
