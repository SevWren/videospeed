/**
 * Tests for gif-observer.js after detectGifsInDOM removal.
 *
 * Seams under test:
 *   1. window.VSC.GifObserver does NOT export detectGifsInDOM (structural)
 *   2. isGifSrc behavioural correctness (pure predicate)
 *   3. isGifElement behavioural correctness (pure predicate)
 *
 * These replace the detectGifsInDOM tests that were in gif-observer.test.js.
 */
import { SimpleTestRunner } from '../../helpers/test-utils.js';
import { loadGifModules } from '../../helpers/module-loader.js';

await loadGifModules();

const runner = new SimpleTestRunner();

// ─── Change 1: detectGifsInDOM must NOT be exported ───────────────────────────

runner.test('GifObserver does NOT export detectGifsInDOM (dead code removed)', () => {
  if (typeof window.VSC.GifObserver.detectGifsInDOM !== 'undefined') {
    throw new Error(
      'detectGifsInDOM must NOT be exported from GifObserver — it is dead code with zero production callers'
    );
  }
});

// ─── isGifSrc behavioural (unchanged) ─────────────────────────────────────────

runner.test('isGifSrc: returns true for plain .gif URL', () => {
  if (!window.VSC.GifObserver.isGifSrc('https://example.com/anim.gif')) {
    throw new Error('Expected true for .gif URL');
  }
});

runner.test('isGifSrc: returns true for .gif URL with query string', () => {
  if (!window.VSC.GifObserver.isGifSrc('https://example.com/anim.gif?v=1')) {
    throw new Error('Expected true for .gif URL with query');
  }
});

runner.test('isGifSrc: returns true for .gif URL with hash', () => {
  if (!window.VSC.GifObserver.isGifSrc('https://example.com/anim.gif#section')) {
    throw new Error('Expected true for .gif URL with hash');
  }
});

runner.test('isGifSrc: returns true for data:image/gif URI', () => {
  if (!window.VSC.GifObserver.isGifSrc('data:image/gif;base64,R0lGOD')) {
    throw new Error('Expected true for data URI');
  }
});

runner.test('isGifSrc: returns false for .gifx (no word boundary match)', () => {
  if (window.VSC.GifObserver.isGifSrc('https://example.com/file.gifx')) {
    throw new Error('Expected false for .gifx');
  }
});

runner.test('isGifSrc: returns false for .mp4', () => {
  if (window.VSC.GifObserver.isGifSrc('https://example.com/video.mp4')) {
    throw new Error('Expected false for .mp4');
  }
});

runner.test('isGifSrc: returns false for null', () => {
  if (window.VSC.GifObserver.isGifSrc(null)) {
    throw new Error('Expected false for null');
  }
});

runner.test('isGifSrc: returns false for empty string', () => {
  if (window.VSC.GifObserver.isGifSrc('')) {
    throw new Error('Expected false for empty string');
  }
});

// ─── isGifElement behavioural (unchanged) ─────────────────────────────────────

runner.test('isGifElement: returns true for IMG with .gif src', () => {
  const img = document.createElement('img');
  Object.defineProperty(img, 'src', { value: 'https://example.com/anim.gif', configurable: true });
  if (!window.VSC.GifObserver.isGifElement(img)) {
    throw new Error('Expected true for IMG with .gif src');
  }
});

runner.test('isGifElement: returns true when src is non-gif but currentSrc is .gif (picture element)', () => {
  const img = document.createElement('img');
  Object.defineProperty(img, 'src', { value: 'https://example.com/image.png', configurable: true });
  Object.defineProperty(img, 'currentSrc', { value: 'https://example.com/anim.gif', configurable: true });
  if (!window.VSC.GifObserver.isGifElement(img)) {
    throw new Error('Expected true when currentSrc is .gif');
  }
});

runner.test('isGifElement: returns false when both src and currentSrc are non-gif', () => {
  const img = document.createElement('img');
  Object.defineProperty(img, 'src', { value: 'https://example.com/photo.png', configurable: true });
  Object.defineProperty(img, 'currentSrc', { value: 'https://example.com/photo.png', configurable: true });
  if (window.VSC.GifObserver.isGifElement(img)) {
    throw new Error('Expected false when neither src nor currentSrc is gif');
  }
});

runner.test('isGifElement: returns false for non-IMG element (DIV)', () => {
  if (window.VSC.GifObserver.isGifElement({ tagName: 'DIV', src: 'test.gif' })) {
    throw new Error('Expected false for DIV element');
  }
});

runner.test('isGifElement: returns false for null', () => {
  if (window.VSC.GifObserver.isGifElement(null)) {
    throw new Error('Expected false for null');
  }
});

export default runner;
