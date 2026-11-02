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

runner.test('detectGifsInDOM: img with naturalWidth=0 and naturalHeight=0 passes through (unknown size)', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  document.body.appendChild(img);
  const results = window.VSC.GifObserver.detectGifsInDOM(document);
  document.body.removeChild(img);
  if (!results.includes(img)) throw new Error('Expected img with unknown size to pass through');
});

runner.test('detectGifsInDOM: img with both naturalWidth=15 and naturalHeight=100 is filtered (width < MIN)', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  Object.defineProperty(img, 'naturalWidth', { value: 15, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true });
  document.body.appendChild(img);
  const results = window.VSC.GifObserver.detectGifsInDOM(document);
  document.body.removeChild(img);
  if (results.includes(img)) throw new Error('Expected img with naturalWidth=15 to be filtered');
});

runner.test('detectGifsInDOM: img with naturalWidth=25 and naturalHeight=25 passes size check', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  Object.defineProperty(img, 'naturalWidth', { value: 25, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: 25, configurable: true });
  document.body.appendChild(img);
  const results = window.VSC.GifObserver.detectGifsInDOM(document);
  document.body.removeChild(img);
  if (!results.includes(img)) throw new Error('Expected img with 25x25 to pass size check');
});

// --- Lines 31-36: isGifElement currentSrc branch and explicit false return ---

runner.test('isGifElement: returns true when src is not gif but currentSrc is gif URL', () => {
  // Exercises the currentSrc branch (lines 30-32) — src is non-gif, currentSrc is .gif
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

runner.test('isGifElement: returns false when src and currentSrc are both non-gif (exercises line 36 return false)', () => {
  // Exercises the final return false path (line 36): neither src nor currentSrc is a gif
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

// --- Lines 42-43: detectGifsInDOM — gifController/vscGifIgnore early exit ---

runner.test('detectGifsInDOM: img with gifController is excluded (line 42 early-exit)', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  img.gifController = {}; // truthy — triggers the early-exit on line 42
  document.body.appendChild(img);
  const results = window.VSC.GifObserver.detectGifsInDOM(document);
  document.body.removeChild(img);
  if (results.includes(img)) {
    throw new Error('Expected img with gifController to be excluded from detectGifsInDOM results');
  }
});

runner.test('detectGifsInDOM: img with vscGifIgnore is excluded (line 42-43 branch)', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/anim.gif';
  img.vscGifIgnore = true; // truthy — triggers the early-exit on line 42-43
  document.body.appendChild(img);
  const results = window.VSC.GifObserver.detectGifsInDOM(document);
  document.body.removeChild(img);
  if (results.includes(img)) {
    throw new Error('Expected img with vscGifIgnore to be excluded from detectGifsInDOM results');
  }
});

// --- Lines 45-46: detectGifsInDOM — !isGifElement early exit ---

runner.test('detectGifsInDOM: non-gif img is excluded via !isGifElement check (lines 45-46)', () => {
  const img = document.createElement('img');
  img.src = 'https://example.com/photo.png'; // not a gif
  document.body.appendChild(img);
  const results = window.VSC.GifObserver.detectGifsInDOM(document);
  document.body.removeChild(img);
  if (results.includes(img)) {
    throw new Error('Expected non-gif img to be excluded from detectGifsInDOM results');
  }
});

export default runner;
