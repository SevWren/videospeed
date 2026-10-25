/**
 * Unit tests for GifObserver
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

runner.test('GifObserver is exported on window.VSC', () => {
  if (!window.VSC.GifObserver) { throw new Error('GifObserver not found on window.VSC'); }
});

runner.test('isGifSrc: returns true for .gif URLs', () => {
  if (!window.VSC.GifObserver.isGifSrc('https://example.com/anim.gif')) {
    throw new Error('Expected true for .gif URL');
  }
});

runner.test('isGifSrc: returns true for data:image/gif URIs', () => {
  if (!window.VSC.GifObserver.isGifSrc('data:image/gif;base64,R0lGODlh')) {
    throw new Error('Expected true for data URI');
  }
});

runner.test('isGifSrc: returns true for .gif with query string', () => {
  if (!window.VSC.GifObserver.isGifSrc('https://example.com/anim.gif?v=1')) {
    throw new Error('Expected true for .gif URL with query');
  }
});

runner.test('isGifSrc: returns false for .mp4 URLs', () => {
  if (window.VSC.GifObserver.isGifSrc('https://example.com/video.mp4')) {
    throw new Error('Expected false for .mp4 URL');
  }
});

runner.test('isGifSrc: returns false for null/undefined/empty', () => {
  if (window.VSC.GifObserver.isGifSrc(null)) { throw new Error('Expected false for null'); }
  if (window.VSC.GifObserver.isGifSrc(undefined)) { throw new Error('Expected false for undefined'); }
  if (window.VSC.GifObserver.isGifSrc('')) { throw new Error('Expected false for empty string'); }
});

runner.test('isGifElement: returns false for non-IMG element', () => {
  if (window.VSC.GifObserver.isGifElement({ tagName: 'DIV', src: 'test.gif' })) {
    throw new Error('Expected false for DIV element');
  }
});

runner.test('isGifElement: returns false for null', () => {
  if (window.VSC.GifObserver.isGifElement(null)) { throw new Error('Expected false for null'); }
});

export default runner;
