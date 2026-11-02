/**
 * Base class for site-specific handlers
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class BaseSiteHandler {
  constructor() {
    this.hostname = location.hostname;
  }

  /**
   * Check if this handler applies to the current site
   * @returns {boolean} True if handler applies
   */
  static matches() {
    return false; // Override in subclasses
  }

  /**
   * Get the site-specific positioning for the controller.
   *
   * Canonical gifMode/CANVAS guard: GIF canvases always use the generic
   * firstChild positioning regardless of site-specific overrides. This guard
   * is the single authoritative place for that short-circuit — subclasses
   * must NOT duplicate it.
   *
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} video - Video or canvas element
   * @param {Object} options - Options including gifMode flag
   * @returns {Object} Positioning information
   */
  getControllerPosition(parent, video, options = {}) {
    if (options.gifMode || (video && video.tagName === 'CANVAS')) {
      return {
        insertionPoint: parent,
        insertionMethod: 'firstChild',
        targetParent: parent,
      };
    }
    return this._getVideoControllerPosition(parent, video, options);
  }

  /**
   * Site-specific positioning hook. Override in subclasses instead of
   * getControllerPosition(). The gifMode/CANVAS guard has already been
   * applied before this is called.
   *
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} video - Video element (guaranteed non-canvas, non-gif)
   * @param {Object} options - Options
   * @returns {Object} Positioning information
   */
  _getVideoControllerPosition(parent, _video, _options) {
    return {
      insertionPoint: parent,
      insertionMethod: 'firstChild',
      targetParent: parent,
    };
  }

  /**
   * Handle site-specific seeking functionality
   * @param {HTMLMediaElement} video - Video element
   * @param {number} seekSeconds - Seconds to seek
   * @returns {boolean} True if handled, false for default behavior
   */
  handleSeek(video, seekSeconds) {
    // Default implementation - use standard seeking with bounds checking (original logic)
    if (video.currentTime !== undefined && video.duration) {
      const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seekSeconds));
      video.currentTime = newTime;
    } else {
      // Fallback for videos without duration
      video.currentTime += seekSeconds;
    }
    return true;
  }

  /**
   * Handle site-specific initialization
   * @param {Document} document - Document object
   */
  initialize(_document) {
    window.VSC.logger.debug(`Initializing ${this.constructor.name} for ${this.hostname}`);
  }

  /**
   * Handle site-specific cleanup
   */
  cleanup() {
    window.VSC.logger.debug(`Cleaning up ${this.constructor.name}`);
  }

  /**
   * Check if video element should be ignored
   * @param {HTMLMediaElement} video - Video element
   * @returns {boolean} True if video should be ignored
   */
  shouldIgnoreVideo(_video) {
    return false;
  }

  /**
   * Get site-specific CSS selectors for video containers
   * @returns {Array<string>} CSS selectors
   */
  getVideoContainerSelectors() {
    return [];
  }

  /**
   * Handle special video detection logic
   * @param {Document} document - Document object
   * @returns {Array<HTMLMediaElement>} Additional videos found
   */
  detectSpecialVideos(_document) {
    return [];
  }
}

// Create singleton instance
window.VSC.BaseSiteHandler = BaseSiteHandler;
