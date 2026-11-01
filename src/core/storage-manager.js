/**
 * Chrome storage management utilities
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

// Skip loading if already loaded to prevent redeclaration errors
if (!window.VSC.StorageManager) {
  class StorageManager {
    // Cache for user settings injected from content script
    static _injectedSettings = null;

    // Listen for injected settings from content script
    static _setupSettingsListener() {
      if (typeof window !== 'undefined' && !this._listenerSetup) {
        this._settingsListener = (event) => {
          window.VSC.logger.debug('Received user settings from content script');
          this._injectedSettings = event.detail;
        };
        window.addEventListener('VSC_USER_SETTINGS', this._settingsListener);
        this._listenerSetup = true;
      }
    }

    // Remove the VSC_USER_SETTINGS listener — called by tests to prevent stale
    // listeners from persisting across test cases in a shared JSDOM environment.
    static _teardownSettingsListener() {
      if (this._settingsListener) {
        window.removeEventListener('VSC_USER_SETTINGS', this._settingsListener);
        this._settingsListener = null;
      }
      this._listenerSetup = false;
    }
    /**
     * Get settings from Chrome storage
     * @param {Object} defaults - Default values
     * @returns {Promise<Object>} Storage data
     */
    static async get(defaults = {}) {
      // Set up listener for injected settings
      this._setupSettingsListener();

      // Check if Chrome APIs are available (content script context)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        return new Promise((resolve) => {
          chrome.storage.sync.get(defaults, (storage) => {
            window.VSC.logger.debug('Retrieved settings from storage');
            resolve(storage);
          });
        });
      } else {
        // Fallback for injected page context - use injected settings if available
        if (this._injectedSettings) {
          window.VSC.logger.debug('Using injected user settings');
          window.VSC.logger.debug('Using injected user settings from content script');
          // Merge injected settings with defaults
          return Promise.resolve({ ...defaults, ...this._injectedSettings });
        } else {
          window.VSC.logger.debug('Chrome storage not available, using default settings');
          return Promise.resolve(defaults);
        }
      }
    }

    /**
     * Wait for injected settings to become available
     * @param {Object} defaults - Default values
     * @returns {Promise<Object>} Settings when available
     */
    static async waitForInjectedSettings(defaults = {}) {
      this._setupSettingsListener();

      // Check the window property set by injector.js before dispatching the event.
      // This recovers settings even when the VSC_USER_SETTINGS event fired before
      // the listener was registered (race condition fix — Option A).
      if (window.__VSC_injectedSettings) {
        this._injectedSettings = window.__VSC_injectedSettings;
        const merged = { ...defaults, ...this._injectedSettings };
        window.VSC.logger.debug('Using injected settings from window property');
        return Promise.resolve(merged);
      }

      if (this._injectedSettings) {
        const merged = { ...defaults, ...this._injectedSettings };
        window.VSC.logger.debug('Using available injected settings');
        return Promise.resolve(merged);
      }

      return new Promise((resolve) => {
        const deadline = setTimeout(() => {
          window.VSC.logger.warn(
            'waitForInjectedSettings: timed out after 5000ms, resolving with defaults'
          );
          resolve({ ...defaults });
        }, 5000);

        const checkSettings = () => {
          // Also check window.__VSC_injectedSettings in the poll loop in case
          // injector.js sets it after waitForInjectedSettings() was first called.
          if (window.__VSC_injectedSettings && !this._injectedSettings) {
            this._injectedSettings = window.__VSC_injectedSettings;
          }
          if (this._injectedSettings) {
            clearTimeout(deadline);
            const merged = { ...defaults, ...this._injectedSettings };
            window.VSC.logger.debug('Injected settings now available');
            resolve(merged);
          } else {
            setTimeout(checkSettings, 10);
          }
        };
        checkSettings();
      });
    }

    /**
     * Set settings in Chrome storage
     * @param {Object} data - Data to store
     * @returns {Promise<void>}
     */
    static async set(data) {
      // Check if Chrome APIs are available (content script context)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        return new Promise((resolve) => {
          chrome.storage.sync.set(data, () => {
            window.VSC.logger.debug('Settings saved to storage');
            resolve();
          });
        });
      } else {
        // Fallback for injected page context - send save request to content script
        window.VSC.logger.debug('Sending save request to content script');
        window.VSC.logger.debug('Sending settings save request to content script');

        // Send data to content script via custom event
        window.dispatchEvent(
          new CustomEvent('VSC_SAVE_SETTINGS', {
            detail: data,
          })
        );

        // Update injected settings cache
        this._injectedSettings = { ...this._injectedSettings, ...data };

        return Promise.resolve();
      }
    }

    /**
     * Remove keys from Chrome storage
     * @param {Array<string>} keys - Keys to remove
     * @returns {Promise<void>}
     */
    static async remove(keys) {
      return new Promise((resolve) => {
        chrome.storage.sync.remove(keys, () => {
          window.VSC.logger.debug('Keys removed from storage');
          resolve();
        });
      });
    }

    /**
     * Clear all Chrome storage
     * @returns {Promise<void>}
     */
    static async clear() {
      return new Promise((resolve) => {
        chrome.storage.sync.clear(() => {
          window.VSC.logger.debug('Storage cleared');
          resolve();
        });
      });
    }

    /**
     * Listen for storage changes
     * @param {Function} callback - Callback function for changes
     */
    static onChanged(callback) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'sync') {
          callback(changes);
        }
      });
    }
  }

  // Create singleton instance
  window.VSC.StorageManager = StorageManager;
} // End conditional loading check
