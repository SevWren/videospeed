/**
 * Apple TV+ handler
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class AppleHandler extends window.VSC.BaseSiteHandler {
  /**
   * Check if this handler applies to Apple TV+
   * @returns {boolean} True if on Apple TV+
   */
  static matches() {
    return location.hostname === 'tv.apple.com';
  }

  /**
   * Get Apple TV+-specific controller positioning.
   * gifMode/CANVAS guard is handled by BaseSiteHandler.getControllerPosition().
   * @param {HTMLElement} parent - Parent element
   * @param {HTMLElement} _video - Video element (guaranteed non-canvas, non-gif)
   * @param {Object} _options - Options
   * @returns {Object} Positioning information
   */
  _getVideoControllerPosition(parent, _video, _options) {
    // Insert before parent to bypass overlay
    return {
      insertionPoint: parent.parentNode,
      insertionMethod: 'firstChild',
      targetParent: parent.parentNode,
    };
  }

  /**
   * Get Apple TV+-specific video container selectors
   * @returns {Array<string>} CSS selectors
   */
  getVideoContainerSelectors() {
    return ['apple-tv-plus-player', '[data-testid="player"]', '.video-container'];
  }

  /**
   * Handle special video detection for Apple TV+
   * @param {Document} document - Document object
   * @returns {Array<HTMLMediaElement>} Additional videos found
   */
  detectSpecialVideos(document) {
    // Apple TV+ uses custom elements that may contain videos
    const applePlayer = document.querySelector('apple-tv-plus-player');
    if (applePlayer && applePlayer.shadowRoot) {
      const videos = applePlayer.shadowRoot.querySelectorAll('video');
      return Array.from(videos);
    }
    return [];
  }
}

// Create singleton instance
window.VSC.AppleHandler = AppleHandler;
