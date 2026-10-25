/**
 * GIF detection utilities for Video Speed Controller
 * Modular architecture using global variables
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
    return /\.gif(\?[^#]*)?(#.*)?$/i.test(src);
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

  const detectGifsInDOM = (doc) => {
    return Array.from(doc.querySelectorAll('img')).filter((img) => {
      if (img.gifController || img.vscGifIgnore) {
        return false;
      }
      if (!isGifElement(img)) {
        return false;
      }
      if (img.naturalWidth > 0 || img.naturalHeight > 0) {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        return w >= window.VSC.Constants.GIF_MIN_SIZE_PX && h >= window.VSC.Constants.GIF_MIN_SIZE_PX;
      }
      return true;
    });
  };

  window.VSC.GifObserver = { isGifSrc, isGifElement, detectGifsInDOM };
}
