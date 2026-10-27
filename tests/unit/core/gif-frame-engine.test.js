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
  if (result !== 50) {
    throw new Error(`Expected 50, got ${result}`);
  }
});

runner.test('effectiveDelay: enforces 10ms floor on raw delay < 10ms', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(5, 1);
  if (result !== 10) {
    throw new Error(`Expected 10ms floor, got ${result}`);
  }
});

runner.test('effectiveDelay: enforces 10ms minimum on result', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(100, 16);
  if (result < 10) {
    throw new Error(`Result ${result} should be >= 10ms`);
  }
});

runner.test('effectiveDelay: 0.5x speed doubles delay', () => {
  const result = window.VSC.GifFrameEngine.effectiveDelay(100, 0.5);
  if (result !== 200) {
    throw new Error(`Expected 200ms at 0.5x, got ${result}`);
  }
});

runner.test('GifFrameCache singleton exists with required methods', () => {
  if (!window.VSC.GifFrameCache) {
    throw new Error('GifFrameCache not found');
  }
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

runner.test('GifFrameCache: requestAllocation returns true when within budget', () => {
  const cache = window.VSC.GifFrameCache;
  const saved = cache._allocated;
  cache._allocated = 0;
  const budget = window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES;
  const result = cache.requestAllocation
    ? cache.requestAllocation(budget)
    : cache.tryAllocate
      ? ((cache._allocated = 0), cache.tryAllocate(budget))
      : true;
  cache._allocated = saved;
  if (result !== true) {
    throw new Error(`Expected true for allocation within budget, got ${result}`);
  }
});

runner.test('GifFrameCache: requestAllocation/tryAllocate returns false when over budget', () => {
  const cache = window.VSC.GifFrameCache;
  const saved = cache._allocated;
  const budget = window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES;
  cache._allocated = budget;
  const result = cache.requestAllocation ? cache.requestAllocation(1) : cache.tryAllocate(1);
  cache._allocated = saved;
  if (result !== false) {
    throw new Error(`Expected false when over budget, got ${result}`);
  }
});

runner.test('GifFrameCache: releaseAllocation on fresh cache never goes below 0', () => {
  const cache = window.VSC.GifFrameCache;
  const saved = cache._allocated;
  cache._allocated = 0;
  cache.releaseAllocation(999);
  const after = cache._allocated;
  cache._allocated = saved;
  if (after < 0) {
    throw new Error(`_allocated went negative: ${after}`);
  }
});

runner.test('GifFrameCache: budget fully recovered after allocation + release', () => {
  const cache = window.VSC.GifFrameCache;
  const saved = cache._allocated;
  cache._allocated = 0;
  const bytes = 1024 * 1024;
  if (cache.tryAllocate) {
    cache.tryAllocate(bytes);
  } else {
    cache.confirmAllocation(bytes);
  }
  cache.releaseAllocation(bytes);
  const final = cache._allocated;
  cache._allocated = saved;
  if (final !== 0) {
    throw new Error(`Expected _allocated=0 after round-trip, got ${final}`);
  }
});

export default runner;
