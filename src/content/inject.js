/**
 * Video Speed Controller - Main Content Script
 * Modular architecture using global variables loaded via script array
 */

class VideoSpeedExtension {
  constructor() {
    this.config = null;
    this.actionHandler = null;
    this.eventManager = null;
    this.mutationObserver = null;
    this.mediaObserver = null;
    this.initialized = false;
    this._docInitialized = false;
  }

  /**
   * Initialize the extension
   */
  async initialize() {
    try {
      // Access global modules
      this.VideoController = window.VSC.VideoController;
      this.ActionHandler = window.VSC.ActionHandler;
      this.EventManager = window.VSC.EventManager;
      this.logger = window.VSC.logger;
      this.isBlacklisted = window.VSC.DomUtils.isBlacklisted;
      this.initializeWhenReady = window.VSC.DomUtils.initializeWhenReady;
      this.siteHandlerManager = window.VSC.siteHandlerManager;
      this.VideoMutationObserver = window.VSC.VideoMutationObserver;
      this.MediaElementObserver = window.VSC.MediaElementObserver;
      this.MESSAGE_TYPES = window.VSC.Constants.MESSAGE_TYPES;

      this.logger.info('Video Speed Controller starting...');

      // Load configuration
      this.config = window.VSC.videoSpeedConfig;
      await this.config.load();

      // Check if extension is enabled
      if (!this.config.settings.enabled) {
        this.logger.info('Extension is disabled');
        return;
      }

      // Check if site is blacklisted
      if (this.isBlacklisted(this.config.settings.blacklist)) {
        this.logger.info('Site is blacklisted');
        return;
      }

      // Initialize site handler
      this.siteHandlerManager.initialize(document);

      // Add domain-specific class to body for CSS targeting
      this.addDomainClass();

      // Create action handler and event manager
      this.eventManager = new this.EventManager(this.config, null);
      this.actionHandler = new this.ActionHandler(this.config, this.eventManager);
      this.eventManager.actionHandler = this.actionHandler; // Set circular reference

      // Set up observers
      this.setupObservers();

      // Initialize when document is ready
      this.initializeWhenReady(document, (doc) => {
        this.initializeDocument(doc);
      });

      this.logger.info('Video Speed Controller initialized successfully');
      this.initialized = true;

      // Page visibility — stop all GIF loops when tab is backgrounded
      document.addEventListener('visibilitychange', () => {
        const hidden = document.visibilityState === 'hidden';
        if (this.config && typeof this.config.getGifElements === 'function') {
          this.config.getGifElements().forEach((img) => {
            const gc = img.gifController;
            if (!gc || typeof gc._stopRafLoop !== 'function') {
              return;
            }
            if (hidden) {
              gc._stopRafLoop();
            } else if (!gc._userPaused && !gc._visibilityPaused) {
              gc._startRafLoop();
            }
          });
        }
      });
    } catch (error) {
      console.error(`❌ Failed to initialize Video Speed Controller: ${error.message}`);
      console.error('📋 Full error details:', error);
      console.error('🔍 Error stack:', error.stack);
    }
  }

  /**
   * Initialize for a specific document
   * @param {Document} document - Document to initialize
   */
  initializeDocument(document) {
    try {
      // Prevent double initialization
      if (this._docInitialized) { return; } this._docInitialized = true;

      if (document.body) {
        document.body.classList.add('vsc-initialized');
        this.logger.debug('vsc-initialized added to document body');
      }

      // Set up event listeners
      this.eventManager.setupEventListeners(document);

      // Set up CSS for non-main documents
      if (document !== window.document) {
        this.setupDocumentCSS(document);
      }

      // Defer expensive operations to avoid blocking page load
      this.deferExpensiveOperations(document);

      this.logger.debug('Document initialization completed');
    } catch (error) {
      this.logger.error(`Failed to initialize document: ${error.message}`);
    }
  }

  /**
   * Defer expensive operations to avoid blocking page load
   * @param {Document} document - Document to defer operations for
   */
  deferExpensiveOperations(document) {
    // Use requestIdleCallback with a longer timeout to avoid blocking critical page load
    const callback = () => {
      try {
        // Start mutation observer after page load is complete
        if (this.mutationObserver) {
          this.mutationObserver.start(document);
          this.logger.debug('Mutation observer started for document');
        }

        // Defer media scanning to avoid blocking page load
        this.deferredMediaScan(document);
      } catch (error) {
        this.logger.error(`Failed to complete deferred operations: ${error.message}`);
      }
    };

    // Use requestIdleCallback if available, with reasonable timeout
    if (window.requestIdleCallback) {
      requestIdleCallback(callback, { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(callback, 100);
    }
  }

  /**
   * Perform media scanning in a non-blocking way
   * @param {Document} document - Document to scan
   */
  deferredMediaScan(document) {
    // Split media scanning into smaller chunks to avoid blocking
    const performChunkedScan = () => {
      try {
        // Use a lighter initial scan - avoid expensive shadow DOM traversal initially
        const lightMedia = this.mediaObserver.scanForMediaLight(document);

        lightMedia.forEach((media) => {
          this.onVideoFound(media, media.parentElement || media.parentNode);
        });

        // GIF scan
        let gifImgs = [];
        if (this.config.settings.controlGifs) {
          gifImgs = this.mediaObserver.scanForGifs
            ? this.mediaObserver.scanForGifs(document)
            : [];
          let gifIdx = 0;
          const attachNextGif = () => {
            if (gifIdx >= gifImgs.length) {
              return;
            }
            const img = gifImgs[gifIdx++];
            try { this.onGifFound(img, img.parentElement || img.parentNode); } catch(e) { this.logger.error(`GIF attach error: ${e.message}`); }
            if (window.requestIdleCallback) {
              requestIdleCallback(attachNextGif, { timeout: 500 });
            } else {
              setTimeout(attachNextGif, 0);
            }
          };
          if (gifImgs.length > 0) {
            attachNextGif();
          }
        }

        this.logger.info(
          `Attached controllers to ${lightMedia.length} media elements (light scan)`
        );

        // Only do comprehensive scan if BOTH video AND gif scans found nothing.
        // The previous || caused a redundant 1-second re-scan on every file://
        // GIF page (no videos → lightMedia.length===0 always true).
        if (lightMedia.length === 0 && gifImgs.length === 0) {
          this.scheduleComprehensiveScan(document);
        }
      } catch (error) {
        this.logger.error(`Failed to scan media elements: ${error.message}`);
      }
    };

    // Use requestIdleCallback for the scan as well
    if (window.requestIdleCallback) {
      requestIdleCallback(performChunkedScan, { timeout: 3000 });
    } else {
      setTimeout(performChunkedScan, 200);
    }
  }

  /**
   * Schedule a comprehensive scan if the light scan didn't find anything
   * @param {Document} document - Document to scan comprehensively
   */
  scheduleComprehensiveScan(document) {
    // Only do comprehensive scan if we didn't find any media with light scan
    setTimeout(() => {
      try {
        const comprehensiveMedia = this.mediaObserver.scanAll(document);

        comprehensiveMedia.forEach((media) => {
          // Skip if already has controller
          if (!media.vsc) {
            this.onVideoFound(media, media.parentElement || media.parentNode);
          }
        });

        if (this.config.settings.controlGifs) {
          const gifImgs = this.mediaObserver.scanForGifs ? this.mediaObserver.scanForGifs(document) : [];
          let gifIdx = 0;
          const attachNextGif = () => {
            if (gifIdx >= gifImgs.length) return;
            const img = gifImgs[gifIdx++];
            try { this.onGifFound(img, img.parentElement || img.parentNode); } catch(e) { this.logger.error(`GIF attach error: ${e.message}`); }
            if (window.requestIdleCallback) { requestIdleCallback(attachNextGif, { timeout: 500 }); } else { setTimeout(attachNextGif, 0); }
          };
          if (gifImgs.length > 0) attachNextGif();
        }

        this.logger.info(
          `Comprehensive scan found ${comprehensiveMedia.length} additional media elements`
        );
      } catch (error) {
        this.logger.error(`Failed comprehensive media scan: ${error.message}`);
      }
    }, 1000); // Wait 1 second before comprehensive scan
  }

  /**
   * Add domain-specific class to body for CSS targeting
   */
  addDomainClass() {
    try {
      const hostname = window.location.hostname;
      // Convert domain to valid CSS class name
      const domainClass = `vsc-domain-${hostname.replace(/\./g, '-')}`;

      if (document.body) {
        document.body.classList.add(domainClass);
        this.logger.debug(`Added domain class: ${domainClass}`);
      }
    } catch (error) {
      this.logger.error(`Failed to add domain class: ${error.message}`);
    }
  }

  /**
   * Set up observers for DOM changes and video detection
   */
  setupObservers() {
    // Media element observer
    this.mediaObserver = new this.MediaElementObserver(this.config, this.siteHandlerManager);

    // Mutation observer for dynamic content
    this.mutationObserver = new this.VideoMutationObserver(
      this.config,
      (video, parent) => this.onVideoFound(video, parent),
      (video) => this.onVideoRemoved(video),
      this.mediaObserver,
      (img, parent) => this.onGifFound(img, parent),
      (img) => this.onGifRemoved(img)
    );
  }

  /**
   * Handle newly found video element
   * @param {HTMLMediaElement} video - Video element
   * @param {HTMLElement} parent - Parent element
   */
  onVideoFound(video, parent) {
    try {
      if (this.mediaObserver && !this.mediaObserver.isValidMediaElement(video)) {
        this.logger.debug('Video element is not valid for controller attachment');
        return;
      }

      if (video.vsc) {
        this.logger.debug('Video already has controller attached');
        return;
      }

      // Check if controller should start hidden based on video visibility/size
      const shouldStartHidden = this.mediaObserver
        ? this.mediaObserver.shouldStartHidden(video)
        : false;

      this.logger.debug(
        'Attaching controller to new video element',
        shouldStartHidden ? '(starting hidden)' : ''
      );
      video.vsc = new this.VideoController(
        video,
        parent,
        this.config,
        this.actionHandler,
        shouldStartHidden
      );
    } catch (error) {
      console.error('💥 Failed to attach controller to video:', error);
      this.logger.error(`Failed to attach controller to video: ${error.message}`);
    }
  }

  /**
   * Handle removed video element
   * @param {HTMLMediaElement} video - Video element
   */
  onVideoRemoved(video) {
    try {
      if (video.vsc) {
        this.logger.debug('Removing controller from video element');
        video.vsc.remove();
      }
    } catch (error) {
      this.logger.error(`Failed to remove video controller: ${error.message}`);
    }
  }

  /**
   * Handle newly found GIF element
   * @param {HTMLImageElement} img - GIF image element
   * @param {HTMLElement} parent - Parent element
   */
  async onGifFound(img, parent) {
    try {
      if (!this.config.settings.controlGifs) { return; }
      if (img.vscGifFailed) { return; }
      if (img.gifController) { return; }
      if (img._vscTeardownSrc !== undefined) {
        if (img.src === img._vscTeardownSrc) { return; }
        delete img._vscTeardownSrc;
        delete img.vscGifIgnore;
      } else if (img.vscGifIgnore) {
        delete img.vscGifIgnore;
        return;
      }
      const sentinel = { pending: true, _cancelled: false };
      sentinel.remove = function() { this._cancelled = true; };
      img.gifController = sentinel;
      const gc = await window.VSC.GifController.create(img, parent, this.config, this.actionHandler);
      if (sentinel._cancelled) {
        if (gc) gc.remove();
        return;
      }
      if (!gc) {
        img.vscGifFailed = true;
        delete img.gifController;
      } else if (!document.body?.contains(img)) {
        // GifController.create() removes the img from the DOM (canvas replacement).
        // Only tear down if the canvas is also missing — that means the page
        // navigated away while creation was in progress.
        if (!(gc._canvas && document.body?.contains(gc._canvas))) {
          gc.remove();
        }
      }
    } catch (error) {
      delete img.gifController;
      this.logger.error(`Failed to attach GIF controller: ${error.message}`);
    }
  }

  /**
   * Handle removed GIF element
   * @param {HTMLImageElement} img - GIF image element
   */
  onGifRemoved(img) {
    try {
      if (img.gifController && typeof img.gifController.remove === 'function') {
        img.gifController.remove();
      }
    } catch (error) {
      this.logger.error(`Failed to remove GIF controller: ${error.message}`);
    }
  }

  /**
   * Set up CSS for iframe documents
   * @param {Document} document - Document to set up CSS for
   */
  setupDocumentCSS(document) {
    const link = document.createElement('link');
    link.href =
      typeof chrome !== 'undefined' && chrome.runtime
        ? chrome.runtime.getURL('src/styles/inject.css')
        : '/src/styles/inject.css';
    link.type = 'text/css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    this.logger.debug('CSS injected into iframe document');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    try {
      if (this.mutationObserver) {
        this.mutationObserver.stop();
      }

      if (this.eventManager) {
        this.eventManager.cleanup();
      }

      if (this.actionHandler) {
        this.actionHandler.cleanup();
      }

      this.siteHandlerManager.cleanup();

      // Clean up all video controllers
      if (this.config) {
        this.config.getMediaElements().forEach((video) => {
          if (video.vsc) {
            video.vsc.remove();
          }
        });
      }

      // Clean up all GIF controllers
      if (this.config && typeof this.config.getGifElements === 'function') {
        this.config
          .getGifElements()
          .slice()
          .forEach((img) => {
            try {
              if (img.gifController && typeof img.gifController.remove === 'function') {
                img.gifController.remove();
              }
            } catch (err) {
              this.logger.error(`GIF cleanup error: ${err.message}`);
            }
          });
      }

      this.initialized = false;
      this.logger.info('Video Speed Controller cleaned up');
    } catch (error) {
      this.logger.error(`Failed to cleanup: ${error.message}`);
    }
  }
}

// Message handler for popup communication via bridge
// Listen for messages from content script bridge
window.addEventListener('VSC_MESSAGE', (event) => {
  const message = event.detail;

  // Handle namespaced VSC message types
  if (typeof message === 'object' && message.type && message.type.startsWith('VSC_')) {
    const videos = document.querySelectorAll('video, audio');

    switch (message.type) {
      case window.VSC.Constants.MESSAGE_TYPES.SET_SPEED:
        if (message.payload && typeof message.payload.speed === 'number') {
          const targetSpeed = message.payload.speed;
          videos.forEach((video) => {
            if (video.vsc) {
              extension.actionHandler.setSpeed(video, targetSpeed);
            } else {
              video.playbackRate = targetSpeed;
            }
          });
          // GIF elements
          if (window.VSC.videoSpeedConfig?.settings?.controlGifs) {
            window.VSC.videoSpeedConfig.getGifElements?.()?.forEach?.((img) => {
              if (img.gifController && typeof img.gifController.setSpeed === 'function') {
                img.gifController.setSpeed(targetSpeed);
              }
            });
          }
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.ADJUST_SPEED:
        if (message.payload && typeof message.payload.delta === 'number') {
          const delta = message.payload.delta;
          videos.forEach((video) => {
            const newSpeed = Math.min(Math.max(video.playbackRate + delta, 0.07), 16);
            if (video.vsc) {
              extension.actionHandler.setSpeed(video, newSpeed);
            } else {
              video.playbackRate = newSpeed;
            }
          });
          // GIF elements
          if (window.VSC.videoSpeedConfig?.settings?.controlGifs) {
            window.VSC.videoSpeedConfig.getGifElements?.()?.forEach?.((img) => {
              const gc = img.gifController;
              if (gc && typeof gc.setSpeed === 'function' && typeof gc._speed === 'number') {
                gc.setSpeed(
                  Math.min(
                    Math.max(gc._speed + delta, window.VSC.Constants.SPEED_LIMITS.MIN),
                    window.VSC.Constants.SPEED_LIMITS.MAX
                  )
                );
              }
            });
          }
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.RESET_SPEED:
        videos.forEach((video) => {
          if (video.vsc) {
            extension.actionHandler.resetSpeed(video, 1.0);
          } else {
            video.playbackRate = 1.0;
          }
        });
        // GIF elements
        if (window.VSC.videoSpeedConfig?.settings?.controlGifs) {
          window.VSC.videoSpeedConfig.getGifElements?.()?.forEach?.((img) => {
            if (img.gifController && typeof img.gifController.setSpeed === 'function') {
              img.gifController.setSpeed(1.0);
            }
          });
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.TOGGLE_DISPLAY:
        if (extension.actionHandler) {
          extension.actionHandler.runAction('display', null, null);
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.DISABLE_GIF_CONTROL:
        if (extension.config) {
          extension.config.settings.controlGifs = false;
          (extension.config.getGifElements?.() || []).slice().forEach((img) => {
            try {
              if (img.gifController && typeof img.gifController.remove === 'function') {
                img.gifController.remove();
              }
            } catch (_e) {}
          });
        }
        break;

      case window.VSC.Constants.MESSAGE_TYPES.ENABLE_GIF_CONTROL:
        if (extension.config) {
          extension.config.settings.controlGifs = true;
        }
        if (extension.mediaObserver && extension.config) {
          const gifImgs = extension.mediaObserver.scanForGifs
            ? extension.mediaObserver.scanForGifs(document)
            : [];
          gifImgs.forEach((img) => {
            if (!img.gifController) {
              extension.onGifFound(img, img.parentElement || img.parentNode);
            }
          });
        }
        break;
    }
  }
});

// Create and initialize extension instance
const extension = new VideoSpeedExtension();

// Live settings relay receiver (issue #10).
// The content script dispatches VSC_USER_SETTINGS on window whenever
// user-controlled keys change in chrome.storage.sync.  Apply the patch
// to the live config so the next keydown, rate-change, or GIF action
// uses the updated values without a page reload.
//
// Guard: skip the initial VSC_USER_SETTINGS dispatch that fires during
// startup (before extension.initialize() completes), which is handled
// by StorageManager.waitForInjectedSettings() and VideoSpeedConfig.load().
window.addEventListener('VSC_USER_SETTINGS', (event) => {
  if (!extension.initialized) return;
  const patch = event.detail;
  if (!patch || typeof patch !== 'object') return;
  try {
    extension.config.applySettings(patch);
  } catch (error) {
    window.VSC?.logger?.error(`Live settings relay apply failed: ${error.message}`);
  }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  extension.cleanup();
});

// Auto-initialize - settings loading will wait for injected settings if needed
extension.initialize().catch((error) => {
  console.error(`Extension initialization failed: ${error.message}`);
  window.VSC?.logger?.error(`Extension initialization failed: ${error.message}`);
});

// Export for testing
window.VideoSpeedExtension = VideoSpeedExtension;
window.videoSpeedExtension = extension;

// Add test indicator for E2E tests
const testIndicator = document.createElement('div');
testIndicator.id = 'vsc-test-indicator';
testIndicator.style.display = 'none';
document.head.appendChild(testIndicator);
