/**
 * Unit tests for ActionHandler GIF actions
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

runner.test('ActionHandler has runGifAction method', () => {
  const ah = new window.VSC.ActionHandler(
    { settings: { controlGifs: true, gifSpeedStep: 0.1 }, getGifElements: () => [], getMediaElements: () => [], save: () => {} },
    { showController: () => {} }
  );
  if (typeof ah.runGifAction !== 'function') {
    throw new Error('runGifAction is not a function');
  }
});

runner.test('ActionHandler has executeGifAction method', () => {
  const ah = new window.VSC.ActionHandler(
    { settings: { controlGifs: true, gifSpeedStep: 0.1 }, getGifElements: () => [], getMediaElements: () => [], save: () => {} },
    { showController: () => {} }
  );
  if (typeof ah.executeGifAction !== 'function') {
    throw new Error('executeGifAction is not a function');
  }
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

runner.test('ActionHandler has _saveGifSpeedDebounced method', () => {
  const ah = new window.VSC.ActionHandler(
    { settings: { controlGifs: true, gifSpeedStep: 0.1 }, getGifElements: () => [], getMediaElements: () => [], save: () => {} },
    { showController: () => {} }
  );
  if (typeof ah._saveGifSpeedDebounced !== 'function') {
    throw new Error('_saveGifSpeedDebounced is not a function');
  }
});

export default runner;
