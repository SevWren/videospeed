/**
 * Media element observer for finding and tracking video/audio elements
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class MediaElementObserver {
  constructor(config, siteHandler) {
    this.config = config;
    this.siteHandler = siteHandler;
  }

  /**
   * Scan document for existing media elements.
   *
   * The `includeShadow` flag controls shadow DOM traversal.  Pass
   * `{ includeShadow: false }` for a cheap initial scan (e.g. at page load
   * before expensive traversal is justified).  The default is `true`.
   *
   * @param {Document} doc - Document to scan
   * @param {Object}  [options]
   * @param {boolean} [options.includeShadow=true] - Whether to traverse shadow roots
   * @returns {Array<HTMLMediaElement>} Found media elements
   */
  scanForMedia(doc, { includeShadow = true } = {}) {
    const mediaElements = [];
    const audioEnabled = this.config.settings.audioBoolean;
    const mediaTagSelector = audioEnabled ? 'video,audio' : 'video';

    // Find regular media elements
    const regularMedia = Array.from(doc.querySelectorAll(mediaTagSelector));
    mediaElements.push(...regularMedia);

    if (includeShadow) {
      // Find media elements in shadow DOMs recursively
      const shadowMedia = this._findShadowMedia(doc, mediaTagSelector);
      mediaElements.push(...shadowMedia);
    }

    // Find site-specific media elements
    const siteSpecificMedia = this.siteHandler.detectSpecialVideos(doc);
    mediaElements.push(...siteSpecificMedia);

    // Filter out ignored videos
    const filteredMedia = mediaElements.filter((media) => {
      return !this.siteHandler.shouldIgnoreVideo(media);
    });

    window.VSC.logger.info(
      `Found ${filteredMedia.length} media elements` +
      ` (${mediaElements.length} total, ${mediaElements.length - filteredMedia.length} filtered out,` +
      ` includeShadow=${includeShadow})`
    );
    return filteredMedia;
  }

  /**
   * Scan iframes for media elements.
   * @param {Document} doc - Document to scan
   * @returns {Array<HTMLMediaElement>} Found media elements in iframes
   * @private
   */
  _scanIframes(doc) {
    const mediaElements = [];
    const frameTags = doc.getElementsByTagName('iframe');

    Array.prototype.forEach.call(frameTags, (frame) => {
      // Ignore frames we don't have permission to access (different origin)
      try {
        const childDocument = frame.contentDocument;
        if (childDocument) {
          const iframeMedia = this.scanForMedia(childDocument);
          mediaElements.push(...iframeMedia);
          window.VSC.logger.debug(`Found ${iframeMedia.length} media elements in iframe`);
        }
      } catch (e) {
        window.VSC.logger.debug(`Cannot access iframe content (cross-origin): ${e.message}`);
      }
    });

    return mediaElements;
  }

  /**
   * Get media elements using site-specific container selectors.
   * @param {Document} doc - Document to scan
   * @returns {Array<HTMLMediaElement>} Found media elements
   * @private
   */
  _scanSiteSpecificContainers(doc) {
    const mediaElements = [];
    const containerSelectors = this.siteHandler.getVideoContainerSelectors();
    const audioEnabled = this.config.settings.audioBoolean;

    containerSelectors.forEach((selector) => {
      try {
        const containers = doc.querySelectorAll(selector);
        containers.forEach((container) => {
          const containerMedia = window.VSC.DomUtils.findMediaElements(container, audioEnabled);
          mediaElements.push(...containerMedia);
        });
      } catch (e) {
        window.VSC.logger.warn(`Invalid selector "${selector}": ${e.message}`);
      }
    });

    return mediaElements;
  }

  /**
   * Comprehensive scan for all media elements: regular, shadow, site-specific
   * containers, and iframes.  Call this as a fallback when a light scan returns
   * nothing.
   * @param {Document} doc - Document to scan
   * @returns {Array<HTMLMediaElement>} All found media elements
   */
  scanAll(doc) {
    const allMedia = [];

    // Regular scan including shadow DOM
    const regularMedia = this.scanForMedia(doc);
    allMedia.push(...regularMedia);

    // Site-specific container scan
    const containerMedia = this._scanSiteSpecificContainers(doc);
    allMedia.push(...containerMedia);

    // Iframe scan
    const iframeMedia = this._scanIframes(doc);
    allMedia.push(...iframeMedia);

    // Remove duplicates
    const uniqueMedia = [...new Set(allMedia)];

    window.VSC.logger.info(`Total unique media elements found: ${uniqueMedia.length}`);
    return uniqueMedia;
  }

  /**
   * Find media elements inside shadow DOMs recursively.
   * @param {Document|ShadowRoot} root - Root to search
   * @param {string} selector - CSS selector
   * @returns {Array} Found elements
   * @private
   */
  _findShadowMedia(root, selector) {
    const results = [];
    results.push(...root.querySelectorAll(selector));
    root.querySelectorAll('*').forEach((element) => {
      if (element.shadowRoot) {
        results.push(...this._findShadowMedia(element.shadowRoot, selector));
      }
    });
    return results;
  }

  /**
   * Check if media element is valid for controller attachment.
   * @param {HTMLMediaElement} media - Media element to check
   * @returns {boolean} True if valid
   */
  isValidMediaElement(media) {
    if (!media || (media.tagName !== 'VIDEO' && media.tagName !== 'AUDIO')) {
      return false;
    }
    // Skip videos that are not in the DOM
    if (!media.isConnected) {
      window.VSC.logger.debug('Video not in DOM');
      return false;
    }

    // Skip audio elements when audio support is disabled
    if (media.tagName === 'AUDIO' && !this.config.settings.audioBoolean) {
      window.VSC.logger.debug('Audio element rejected - audioBoolean disabled');
      return false;
    }

    // Let site handler have final say on whether to ignore this video
    if (this.siteHandler.shouldIgnoreVideo(media)) {
      window.VSC.logger.debug('Video ignored by site handler');
      return false;
    }

    // Accept all connected media elements that pass site handler validation
    // Visibility and size will be handled by controller initialization
    return true;
  }

  /**
   * Check if media element should start with hidden controller.
   * @param {HTMLMediaElement} media - Media element to check
   * @returns {boolean} True if controller should start hidden
   */
  shouldStartHidden(media) {
    // For audio elements, only hide controller if audio support is disabled
    // Audio players are often intentionally invisible but still functional
    if (media.tagName === 'AUDIO') {
      if (!this.config.settings.audioBoolean) {
        window.VSC.logger.debug('Audio controller hidden - audio support disabled');
        return true;
      }

      // Audio elements can be functional even when invisible
      // Only hide if the audio element is explicitly disabled or has no functionality
      if (media.disabled || media.style.pointerEvents === 'none') {
        window.VSC.logger.debug('Audio controller hidden - element disabled or no pointer events');
        return true;
      }

      // Keep audio controllers visible even for hidden audio elements
      window.VSC.logger.debug(
        'Audio controller will start visible (audio elements can be invisible but functional)'
      );
      return false;
    }

    // For video elements, check visibility - only hide controllers for truly invisible media elements
    const style = window.getComputedStyle(media);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      window.VSC.logger.debug('Video not visible, controller will start hidden');
      return true;
    }

    // All visible media elements get visible controllers regardless of size
    return false;
  }

  /**
   * Scan document for GIF image elements (including shadow roots).
   * This is the canonical GIF scan implementation. detectGifsInDOM in
   * gif-observer.js was removed as dead code; this method supersedes it.
   * @param {Document} doc - Document to scan
   * @returns {Array<HTMLImageElement>} Found GIF elements
   */
  scanForGifs(doc) {
    if (!window.VSC.GifObserver) {
      return [];
    }
    const lightImgs = Array.from(doc.querySelectorAll('img'));
    const shadowImgs = this._findShadowMedia(doc, 'img');
    const imgs = [...new Set([...lightImgs, ...shadowImgs])];
    return imgs.filter((img) => {
      if (img.gifController || img.vscGifIgnore) {
        return false;
      }
      if (!window.VSC.GifObserver.isGifElement(img)) {
        return false;
      }
      // Only apply size filter when image has loaded (naturalWidth > 0).
      // naturalWidth = 0 means the image hasn't decoded yet — allow it through
      // so the GIF controller can attach; tiny tracker pixels are excluded once loaded.
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;
        return (
          w >= window.VSC.Constants.GIF_MIN_SIZE_PX && h >= window.VSC.Constants.GIF_MIN_SIZE_PX
        );
      }
      return true;
    });
  }

  /**
   * Find the best parent element for controller positioning.
   * @param {HTMLMediaElement} media - Media element
   * @returns {HTMLElement} Parent element for positioning
   */
  findControllerParent(media) {
    const positioning = this.siteHandler.getControllerPosition(media.parentElement, media);
    return positioning.targetParent || media.parentElement;
  }
}

// Create singleton instance
window.VSC.MediaElementObserver = MediaElementObserver;
