/**
 * Unit tests for GifController
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

runner.test('GifController is exported on window.VSC', () => {
  if (!window.VSC.GifController) { throw new Error('GifController not found on window.VSC'); }
});

runner.test('GifController.create is a static async method', () => {
  if (typeof window.VSC.GifController.create !== 'function') {
    throw new Error('GifController.create is not a function');
  }
});

runner.test('GifController.create returns null when controlGifs is false', async () => {
  const mockConfig = {
    settings: { controlGifs: false, lastGifSpeed: 1.0 },
    addGifElement: () => {},
    removeGifElement: () => {},
    getGifElements: () => [],
  };
  const result = await window.VSC.GifController.create(
    { src: 'test.gif', currentSrc: 'test.gif' }, null, mockConfig, null
  );
  if (result !== null) { throw new Error('Expected null when controlGifs is false'); }
});

runner.test('GifController.create returns null for empty src', async () => {
  const mockConfig = {
    settings: { controlGifs: true, lastGifSpeed: 1.0 },
    addGifElement: () => {},
    removeGifElement: () => {},
    getGifElements: () => [],
  };
  const result = await window.VSC.GifController.create(
    { src: '', currentSrc: '' }, null, mockConfig, null
  );
  if (result !== null) { throw new Error('Expected null for empty src'); }
});

export default runner;
