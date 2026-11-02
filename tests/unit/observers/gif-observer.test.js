/**
 * Unit tests for GifObserver — isGifSrc and isGifElement predicates.
 *
 * detectGifsInDOM was removed from GifObserver (zero production callers).
 * Its scan logic lives in MediaElementObserver.scanForGifs(), which is the
 * canonical path and is tested through the media observer seam.
 * Structural proof that detectGifsInDOM is no longer exported lives in
 * tests/unit/observers/gif-predicates.test.js.
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

runner.test('isGifSrc: matches example.com/file.gif?token=abc', () => {
  const result = window.VSC.GifObserver.isGifSrc('https://example.com/file.gif?token=abc');
  if (result !== true) throw new Error(`Expected true, got ${result}`);
});

runner.test('isGifSrc: does NOT match example.com/file.gifx', () => {
  const result = window.VSC.GifObserver.isGifSrc('https://example.com/file.gifx');
  if (result !== false) throw new Error(`Expected false for .gifx, got ${result}`);
});

runner.test('isGifSrc: matches data:image/gif;base64 URI', () => {
  const result = window.VSC.GifObserver.isGifSrc('data:image/gif;base64,R0lGOD');
  if (result !== true) throw new Error(`Expected true for data URI, got ${result}`);
});

runner.test('isGifElement: returns true when src is not gif but currentSrc is gif URL', () => {
  const img = document.createElement('img');
  Object.defineProperty(img, 'src', { value: 'https://example.com/image.png', configurable: true });
  Object.defineProperty(img, 'currentSrc', {
    value: 'https://example.com/anim.gif',
    configurable: true,
  });
  const result = window.VSC.GifObserver.isGifElement(img);
  if (result !== true) {
    throw new Error(`Expected true when currentSrc is gif, got ${result}`);
  }
});

runner.test('isGifElement: returns false when src and currentSrc are both non-gif', () => {
  const img = document.createElement('img');
  Object.defineProperty(img, 'src', { value: 'https://example.com/photo.png', configurable: true });
  Object.defineProperty(img, 'currentSrc', {
    value: 'https://example.com/photo.png',
    configurable: true,
  });
  const result = window.VSC.GifObserver.isGifElement(img);
  if (result !== false) {
    throw new Error(`Expected false when neither src nor currentSrc is gif, got ${result}`);
  }
});

export default runner;
