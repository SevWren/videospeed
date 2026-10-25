/**
 * Integration tests for GIF speed control feature
 */
import { SimpleTestRunner } from '../helpers/test-utils.js';
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
  if (!Array.isArray(config.gifElements) || config.gifElements.length !== 0) {
    throw new Error('gifElements should be an empty array');
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

runner.test('GifFrameCache is available', () => {
  if (!window.VSC.GifFrameCache) {
    throw new Error('GifFrameCache not found');
  }
});

runner.test('GifObserver is available', () => {
  if (!window.VSC.GifObserver) {
    throw new Error('GifObserver not found');
  }
});

export default runner;
