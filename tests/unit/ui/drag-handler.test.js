/**
 * Unit tests for DragHandler (src/ui/drag-handler.js)
 * Chartered seam: window.VSC.DragHandler.handleDrag — mouse event simulation
 */

import { installChromeMock, cleanupChromeMock, resetMockStorage } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';

await loadCoreModules();

const runner = new SimpleTestRunner();

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build the minimal video + controller DOM structure that DragHandler expects.
 *
 *  video.vsc.div  ← the controller wrapper element with a shadow root
 *  shadow #controller ← the draggable inner element whose style is mutated
 *
 * Returns { video, wrapper, shadowController, parentElement, cleanup }
 */
function buildDragFixture(initialLeft = 0, initialTop = 0) {
  // Parent element that receives delegated mousemove / mouseup events
  const parentElement = document.createElement('div');
  parentElement.style.width = '640px';
  parentElement.style.height = '480px';
  document.body.appendChild(parentElement);

  // Controller wrapper — this is what video.vsc.div points to
  const wrapper = document.createElement('div');
  parentElement.appendChild(wrapper);

  // Attach shadow root and create #controller inside it
  const shadow = wrapper.attachShadow({ mode: 'open' });
  const shadowController = document.createElement('div');
  shadowController.id = 'controller';
  shadowController.style.left = `${initialLeft}px`;
  shadowController.style.top = `${initialTop}px`;
  shadow.appendChild(shadowController);

  // Video element pointing back at the wrapper
  const video = document.createElement('video');
  video.vsc = { div: wrapper };
  parentElement.appendChild(video);

  const cleanup = () => {
    if (parentElement.parentNode) {
      parentElement.parentNode.removeChild(parentElement);
    }
  };

  return { video, wrapper, shadow, shadowController, parentElement, cleanup };
}

// ── lifecycle ─────────────────────────────────────────────────────────────────

runner.beforeEach(() => {
  installChromeMock();
  resetMockStorage();
});

runner.afterEach(() => {
  cleanupChromeMock();
  // Clean up body children added during tests
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

// ── tests ─────────────────────────────────────────────────────────────────────

runner.test('DragHandler is registered on window.VSC', () => {
  assert.exists(window.VSC.DragHandler, 'DragHandler should be on window.VSC');
});

runner.test('DragHandler.handleDrag adds dragging class to video and shadowController on mousedown', () => {
  const { video, shadowController, cleanup } = buildDragFixture();

  const mousedown = new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true });
  window.VSC.DragHandler.handleDrag(video, mousedown);

  assert.true(
    video.classList.contains('vcs-dragging'),
    'video should have vcs-dragging class after handleDrag'
  );
  assert.true(
    shadowController.classList.contains('dragging'),
    'shadowController should have dragging class after handleDrag'
  );

  cleanup();
});

runner.test('DragHandler.handleDrag moves the controller on mousemove', () => {
  const { video, shadowController, parentElement, cleanup } = buildDragFixture(10, 20);

  // Start drag at (50, 60)
  const mousedown = new MouseEvent('mousedown', { clientX: 50, clientY: 60, bubbles: true });
  window.VSC.DragHandler.handleDrag(video, mousedown);

  // Move by (+30, +15)
  const mousemove = new MouseEvent('mousemove', { clientX: 80, clientY: 75, bubbles: true });
  parentElement.dispatchEvent(mousemove);

  // Expected: initialLeft(10) + dx(30) = 40, initialTop(20) + dy(15) = 35
  assert.equal(shadowController.style.left, '40px', 'left should update by dx');
  assert.equal(shadowController.style.top, '35px', 'top should update by dy');

  cleanup();
});

runner.test('DragHandler.handleDrag removes dragging classes on mouseup', () => {
  const { video, shadowController, parentElement, cleanup } = buildDragFixture();

  const mousedown = new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true });
  window.VSC.DragHandler.handleDrag(video, mousedown);

  const mouseup = new MouseEvent('mouseup', { clientX: 50, clientY: 50, bubbles: true });
  parentElement.dispatchEvent(mouseup);

  assert.false(
    video.classList.contains('vcs-dragging'),
    'vcs-dragging should be removed after mouseup'
  );
  assert.false(
    shadowController.classList.contains('dragging'),
    'dragging class should be removed after mouseup'
  );

  cleanup();
});

runner.test('DragHandler.handleDrag stops tracking mousemove after mouseup', () => {
  const { video, shadowController, parentElement, cleanup } = buildDragFixture(0, 0);

  const mousedown = new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true });
  window.VSC.DragHandler.handleDrag(video, mousedown);

  // Stop drag
  const mouseup = new MouseEvent('mouseup', { clientX: 0, clientY: 0, bubbles: true });
  parentElement.dispatchEvent(mouseup);

  // Move after stop — position must not change
  const mousemove = new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true });
  parentElement.dispatchEvent(mousemove);

  assert.equal(shadowController.style.left, '0px', 'left should not change after mouseup');
  assert.equal(shadowController.style.top, '0px', 'top should not change after mouseup');

  cleanup();
});

runner.test('DragHandler.handleDrag removes dragging classes on mouseleave', () => {
  const { video, shadowController, cleanup } = buildDragFixture();

  const mousedown = new MouseEvent('mousedown', { clientX: 50, clientY: 50, bubbles: true });
  window.VSC.DragHandler.handleDrag(video, mousedown);

  // In JSDOM all offset dimensions are 0, so findVideoParent walks all the way
  // up to document.documentElement. Dispatch mouseleave there.
  const mouseleave = new MouseEvent('mouseleave', { bubbles: false });
  document.documentElement.dispatchEvent(mouseleave);

  assert.false(
    video.classList.contains('vcs-dragging'),
    'vcs-dragging should be removed on mouseleave'
  );
  assert.false(
    shadowController.classList.contains('dragging'),
    'dragging class should be removed on mouseleave'
  );

  cleanup();
});

runner.test('DragHandler.handleDrag returns early when #controller is absent from shadow root', () => {
  // A wrapper whose shadow root has NO #controller element
  const wrapper = document.createElement('div');
  const shadow = wrapper.attachShadow({ mode: 'open' });
  // deliberately empty shadow — no #controller

  const video = document.createElement('video');
  video.vsc = { div: wrapper };

  // Should not throw
  const mousedown = new MouseEvent('mousedown', { clientX: 0, clientY: 0, bubbles: true });
  let threw = false;
  try {
    window.VSC.DragHandler.handleDrag(video, mousedown);
  } catch (_e) {
    threw = true;
  }
  assert.false(threw, 'handleDrag should return early without throwing when #controller is missing');
});

runner.test('DragHandler.handleDrag computes position relative to initial mouse position', () => {
  // initialLeft=5, initialTop=10; drag from (100,200) to (110,215) → dx=10, dy=15
  const { video, shadowController, parentElement, cleanup } = buildDragFixture(5, 10);

  window.VSC.DragHandler.handleDrag(
    video,
    new MouseEvent('mousedown', { clientX: 100, clientY: 200, bubbles: true })
  );

  parentElement.dispatchEvent(
    new MouseEvent('mousemove', { clientX: 110, clientY: 215, bubbles: true })
  );

  assert.equal(shadowController.style.left, '15px');
  assert.equal(shadowController.style.top, '25px');

  cleanup();
});

export { runner as dragHandlerTestRunner };
