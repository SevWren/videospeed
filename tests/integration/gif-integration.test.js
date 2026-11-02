/**
 * Integration tests for GIF speed control feature
 */
import { SimpleTestRunner, assert } from '../helpers/test-utils.js';
import { loadGifModules } from '../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

runner.test('controlGifs defaults to true in new VideoSpeedConfig', () => {
  if (typeof window.VSC.VideoSpeedConfig !== 'function') {
    throw new Error('VideoSpeedConfig not found');
  }
  const config = new window.VSC.VideoSpeedConfig();
  if (config.settings.controlGifs !== true) {
    throw new Error(`Expected controlGifs=true, got ${config.settings.controlGifs}`);
  }
});

runner.test('gifElements initializes as empty array', () => {
  const config = new window.VSC.VideoSpeedConfig();
  if (!(config.gifElements instanceof Set) || config.gifElements.size !== 0) {
    throw new Error('gifElements should be an empty Set');
  }
});

runner.test('addGifElement/removeGifElement work correctly', () => {
  const config = new window.VSC.VideoSpeedConfig();
  const mockImg = { src: 'test.gif' };
  config.addGifElement(mockImg);
  if (!config.getGifElements().includes(mockImg)) {
    throw new Error('addGifElement failed');
  }
  config.removeGifElement(mockImg);
  if (config.getGifElements().includes(mockImg)) {
    throw new Error('removeGifElement failed');
  }
});

runner.test('addGifElement is idempotent', () => {
  const config = new window.VSC.VideoSpeedConfig();
  const mockImg = { src: 'test.gif' };
  config.addGifElement(mockImg);
  config.addGifElement(mockImg);
  if (config.getGifElements().length !== 1) {
    throw new Error(`Expected 1 element, got ${config.getGifElements().length}`);
  }
});

runner.test('VideoMutationObserver accepts 4 arguments (backward compat)', () => {
  if (!window.VSC.VideoMutationObserver) {
    return;
  }
  const obs = new window.VSC.VideoMutationObserver(
    { settings: { controlGifs: false }, getMediaElements: () => [], getGifElements: () => [] },
    () => {},
    () => {},
    null
  );
  if (obs.onGifFound !== null) {
    throw new Error('onGifFound should default to null');
  }
});

runner.test('GifFrameCache rejects an allocation that would exceed the global memory budget', () => {
  const cache = window.VSC.GifFrameCache;
  const budget = window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES;
  const saved = cache._allocated;
  cache._allocated = budget; // already at limit
  const overBudgetResult = cache.tryAllocate(1);
  cache._allocated = saved;
  assert.false(overBudgetResult, 'tryAllocate should return false when allocation would exceed budget');
});

runner.test('GifObserver identifies an img element with a .gif src as a GIF element', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/animation.gif';
  assert.true(
    window.VSC.GifObserver.isGifElement(img),
    'An img with a .gif URL should be detected as a GIF element'
  );
});

runner.test('GifFrameCache is idempotent for addGifElement (no duplicate entries)', () => {
  const config = window.VSC.videoSpeedConfig;
  const img = document.createElement('img');
  config.addGifElement(img);
  config.addGifElement(img);
  config.addGifElement(img);
  const elements = config.getGifElements();
  const count = elements.filter((el) => el === img).length;
  config.removeGifElement(img);
  if (count !== 1) {
    throw new Error(`Expected exactly 1 entry for duplicate addGifElement, got ${count}`);
  }
});

runner.test('GifFrameCache allows allocation when remaining budget is exactly met', () => {
  const cache = window.VSC.GifFrameCache;
  const budget = window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES;
  const saved = cache._allocated;
  cache._allocated = budget - 100; // 100 bytes remain
  const result = cache.tryAllocate(100);
  cache._allocated = saved;
  assert.true(result, 'tryAllocate should return true when bytes requested exactly fit remaining budget');
});

export default runner;
