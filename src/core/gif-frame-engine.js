/**
 * GIF Frame Engine for Video Speed Controller
 * Handles frame timing, memory budgeting, and compositing pipeline setup.
 * Modular architecture using global variables.
 */

window.VSC = window.VSC || {};

if (!window.VSC.GifFrameCache) {
  window.VSC.GifFrameCache = {
    _allocated: 0,
    requestAllocation(bytes) {
      return this._allocated + bytes <= window.VSC.Constants.GIF_GLOBAL_MEMORY_BUDGET_BYTES;
    },
    confirmAllocation(bytes) {
      this._allocated += bytes;
    },
    releaseAllocation(bytes) {
      this._allocated = Math.max(0, this._allocated - bytes);
    },
  };
}

if (!window.VSC.GifFrameEngine) {
  class GifFrameEngine {
    /**
     * Calculate effective frame delay in ms given raw delay and speed multiplier.
     * Enforces a 10ms floor on both the raw delay and the result.
     * @param {number} rawDelayMs - Raw GIF frame delay in milliseconds
     * @param {number} speed - Playback speed multiplier
     * @returns {number} Effective delay in ms
     */
    static effectiveDelay(rawDelayMs, speed) {
      const safeSpeed = speed > 0 ? speed : 1.0;
      const base = rawDelayMs < 10 ? 10 : rawDelayMs;
      return Math.max(10, Math.round(base / safeSpeed));
    }
  }

  window.VSC.GifFrameEngine = GifFrameEngine;
}
