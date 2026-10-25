/**
 * Unit tests for GifFrameEngine
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

runner.test('GifFrameEngine is exported on window.VSC', () => {
  if (!window.VSC.GifFrameEngine) {
    throw new Error('GifFrameEngine not found on window.VSC');
  }
});

runner.test('effectiveDelay: normal division at 2x', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(100, 2);
  if (result !== 50) { throw new Error(`Expected 50, got ${result}`); }
});

runner.test('effectiveDelay: enforces 10ms floor on raw delay < 10ms', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(5, 1);
  if (result !== 10) { throw new Error(`Expected 10ms floor, got ${result}`); }
});

runner.test('effectiveDelay: enforces 10ms minimum on result', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(100, 16);
  if (result < 10) { throw new Error(`Result ${result} should be >= 10ms`); }
});

runner.test('effectiveDelay: 0.5x speed doubles delay', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(100, 0.5);
  if (result !== 200) { throw new Error(`Expected 200ms at 0.5x, got ${result}`); }
});

runner.test('GifFrameCache singleton exists with required methods', () => {
  if (!window.VSC.GifFrameCache) { throw new Error('GifFrameCache not found'); }
  if (typeof window.VSC.GifFrameCache.requestAllocation !== 'function') {
    throw new Error('requestAllocation is not a function');
  }
  if (typeof window.VSC.GifFrameCache.confirmAllocation !== 'function') {
    throw new Error('confirmAllocation is not a function');
  }
  if (typeof window.VSC.GifFrameCache.releaseAllocation !== 'function') {
    throw new Error('releaseAllocation is not a function');
  }
});

export default runner;
