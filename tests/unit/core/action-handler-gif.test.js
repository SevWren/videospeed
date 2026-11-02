/**
 * Unit tests for ActionHandler GIF actions
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

// Catches regression: runGifAction not iterating GIF elements or not calling setSpeed on the controller
runner.test('runGifAction calls setSpeed on gif controller when controlGifs is true', () => {
  let setSpeedCalled = false;
  let setSpeedValue = null;
  const fakeGc = {
    setSpeed: (s) => { setSpeedCalled = true; setSpeedValue = s; },
    _speed: 1.0,
    div: document.createElement('div'),
    fetchFailed: false,
  };
  const fakeImg = { gifController: fakeGc, vscGifIgnore: false };
  const ah = new window.VSC.ActionHandler(
    {
      settings: { controlGifs: true, gifSpeedStep: 0.1, lastGifSpeed: 1.0 },
      getGifElements: () => [fakeImg],
      getMediaElements: () => [],
      save: () => {},
    },
    { showController: () => {} }
  );
  ah.runGifAction('faster', 0.5, null);
  if (!setSpeedCalled) { throw new Error('setSpeed was not called on the gif controller'); }
  if (setSpeedValue !== 1.5) { throw new Error(`Expected setSpeed(1.5) but got setSpeed(${setSpeedValue})`); }
});

// Catches regression: executeGifAction not applying the slower delta to the gif controller speed
runner.test('executeGifAction slower reduces gif controller speed by the given value', () => {
  let capturedSpeed = null;
  const fakeGc = {
    setSpeed: (s) => { capturedSpeed = s; },
    _speed: 2.0,
    fetchFailed: false,
  };
  const fakeImg = { gifController: fakeGc };
  const ah = new window.VSC.ActionHandler(
    {
      settings: { controlGifs: true, gifSpeedStep: 0.1, lastGifSpeed: 2.0 },
      getGifElements: () => [],
      getMediaElements: () => [],
      save: () => {},
    },
    { showController: () => {} }
  );
  ah.executeGifAction('slower', 0.5, fakeImg, null);
  if (capturedSpeed !== 1.5) { throw new Error(`Expected setSpeed(1.5) but got setSpeed(${capturedSpeed})`); }
});

runner.test('runGifAction returns early when controlGifs is false', () => {
  let called = false;
  const ah = new window.VSC.ActionHandler(
    { settings: { controlGifs: false, gifSpeedStep: 0.1 }, getGifElements: () => { called = true; return []; }, getMediaElements: () => [], save: () => {} },
    { showController: () => {} }
  );
  ah.runGifAction('faster', 0.1, null);
  if (called) { throw new Error('getGifElements should not be called when controlGifs is false'); }
});

// Catches regression: gif speed not being flushed to settings.lastGifSpeed when cleanup is called
// (e.g., tab hidden before debounce fires, leaving stale lastGifSpeed in storage)
runner.test('gif speed is persisted to lastGifSpeed when cleanup flushes pending debounce', () => {
  const settings = { controlGifs: true, gifSpeedStep: 0.1, lastGifSpeed: 1.0 };
  const fakeGc = {
    setSpeed: () => {},
    _speed: 1.0,
    fetchFailed: false,
  };
  const fakeImg = { gifController: fakeGc };
  const ah = new window.VSC.ActionHandler(
    {
      settings,
      getGifElements: () => [],
      getMediaElements: () => [],
      save: () => {},
    },
    { showController: () => {} }
  );
  // Directly call executeGifAction to queue a debounced save at speed 1.0 (reset)
  ah.executeGifAction('reset', null, fakeImg, null);
  // Flush via cleanup (simulates tab becoming hidden before the debounce timer fires)
  ah.cleanup();
  if (settings.lastGifSpeed !== 1.0) {
    throw new Error(`Expected lastGifSpeed 1.0 after cleanup but got ${settings.lastGifSpeed}`);
  }
});

export default runner;
