/**
 * GIF detection predicates for Video Speed Controller.
 *
 * This module provides two pure detection predicates:
 *   - isGifSrc(src)      — returns true when a URL string identifies a GIF
 *   - isGifElement(el)   — returns true when a DOM element is an animated GIF img
 *
 * These predicates have no side-effects: no MutationObserver, no event
 * listeners, no subscriptions. The name "GifObserver" is kept on
 * window.VSC.GifObserver for backward compatibility with call sites in
 * mutation-observer.js and media-observer.js.
 *
 * Scanning GIFs in the DOM (including shadow roots) is the responsibility of
 * MediaElementObserver.scanForGifs(), which is the canonical implementation.
 *
 * Modular architecture using global variables.
 */

window.VSC = window.VSC || {};

if (!window.VSC.GifObserver) {
  if (!window.VSC.gifFetchFailCache) {
    window.VSC.gifFetchFailCache = new Map();
  }

  const isGifSrc = (src) => {
    if (!src || typeof src !== 'string') {
      return false;
    }
    if (src.startsWith('data:image/gif')) {
      return true;
    }
    return /\.gif([/?#]|$)/i.test(src);
  };

  const isGifElement = (element) => {
    if (!element || element.tagName !== 'IMG') {
      return false;
    }
    if (isGifSrc(element.src)) {
      return true;
    }
    if (element.currentSrc && isGifSrc(element.currentSrc)) {
      return true;
    }
    // Known limitations:
    // - Blob URL GIFs (blob:...) are not detected (no extension)
    // - SVG <image> elements (tagName 'image') are out of scope for v1
    return false;
  };

  // detectGifsInDOM was removed: it had zero production callers and had drifted
  // from MediaElementObserver.scanForGifs(), which is the canonical scan path
  // (including shadow DOM traversal and deduplication).

  window.VSC.GifObserver = { isGifSrc, isGifElement };
}
