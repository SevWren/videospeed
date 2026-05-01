/**
 * Event management system for Video Speed Controller
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class EventManager {
  constructor(config, actionHandler) {
    this.config = config;
    this.actionHandler = actionHandler;
    this.listeners = new Map();
    this.coolDown = false;
    this.timer = null;

    // Event deduplication to prevent duplicate key processing
    this.lastKeyEventSignature = null;
  }

  /**
   * Log targeted diagnostics for a key while debugging live shortcut failures.
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} True when diagnostics should be logged
   * @private
   */
  shouldLogKeyBindingDiagnostic(event) {
    const keyCode = Number(event.keyCode || event.which);
    const key = typeof event.key === 'string' ? event.key.toUpperCase() : '';
    const code = typeof event.code === 'string' ? event.code : '';

    return (
      keyCode === 82 ||
      keyCode === 84 ||
      key === 'R' ||
      key === 'T' ||
      code === 'KeyR' ||
      code === 'KeyT'
    );
  }

  /**
   * Write keybinding diagnostics directly to the console so they are visible
   * regardless of the configured extension log level.
   * @param {string} stage - Diagnostic stage label
   * @param {Object} details - Diagnostic payload
   * @private
   */
  logKeyBindingDiagnostic(stage, details = {}) {
    const payload = {
      stage,
      timestamp: new Date().toISOString(),
      source: 'page',
      details,
    };

    window.VSC.keyBindingDiagnostics = window.VSC.keyBindingDiagnostics || [];
    window.VSC.keyBindingDiagnostics.push(payload);

    if (window.VSC.keyBindingDiagnostics.length > 50) {
      window.VSC.keyBindingDiagnostics.shift();
    }

    console.warn(`[VSC keybinding diagnostic] ${stage}`, details);

    window.dispatchEvent(
      new CustomEvent('VSC_KEYBINDING_DIAGNOSTIC', {
        detail: payload,
      })
    );
  }

  /**
   * Create a compact, console-friendly element summary.
   * @param {Element} element - DOM element to summarize
   * @returns {Object|null} Element summary
   * @private
   */
  summarizeElement(element) {
    if (!element) {
      return null;
    }

    return {
      nodeName: element.nodeName,
      id: element.id || '',
      className: typeof element.className === 'string' ? element.className : '',
      isContentEditable: Boolean(element.isContentEditable),
    };
  }

  /**
   * Summarize bindings that matter for a keypress investigation.
   * @param {number} keyCode - Numeric keyboard event code
   * @returns {Object} Binding summary
   * @private
   */
  getKeyBindingDiagnosticSummary(keyCode) {
    const loadedBindings = this.config.settings.keyBindings || [];
    const defaultBindings = window.VSC.Constants.DEFAULT_SETTINGS.keyBindings || [];

    return {
      keyCode,
      loadedKeyBindingsCount: loadedBindings.length,
      loadedBindingsForKey: loadedBindings.filter((item) => item.key === keyCode),
      loadedAdvanceBindings: loadedBindings.filter((item) => item.action === 'advance'),
      defaultBindingsForKey: defaultBindings.filter((item) => item.key === keyCode),
      defaultAdvanceBindings: defaultBindings.filter((item) => item.action === 'advance'),
    };
  }

  /**
   * Set up all event listeners
   * @param {Document} document - Document to attach events to
   */
  setupEventListeners(document) {
    this.setupKeyboardShortcuts(document);
    this.setupRateChangeListener(document);
  }

  /**
   * Set up keyboard shortcuts
   * @param {Document} document - Document to attach events to
   */
  setupKeyboardShortcuts(document) {
    const docs = [document];

    try {
      if (window.VSC.inIframe()) {
        docs.push(window.top.document);
      }
    } catch (e) {
      // Cross-origin iframe - ignore
    }

    docs.forEach((doc) => {
      const keydownHandler = (event) => this.handleKeydown(event);
      doc.addEventListener('keydown', keydownHandler, true);

      // Store reference for cleanup
      if (!this.listeners.has(doc)) {
        this.listeners.set(doc, []);
      }
      this.listeners.get(doc).push({
        type: 'keydown',
        handler: keydownHandler,
        useCapture: true,
      });
    });
  }

  /**
   * Handle keydown events
   * @param {KeyboardEvent} event - Keyboard event
   * @private
   */
  handleKeydown(event) {
    const keyCode = event.keyCode;
    const logDiagnostic = this.shouldLogKeyBindingDiagnostic(event);

    if (logDiagnostic) {
      this.logKeyBindingDiagnostic('keydown received', {
        key: event.key,
        code: event.code,
        keyCode,
        which: event.which,
        type: event.type,
        repeat: event.repeat,
        isTrusted: event.isTrusted,
        defaultPrevented: event.defaultPrevented,
        eventPhase: event.eventPhase,
        target: this.summarizeElement(event.target),
        activeElement: this.summarizeElement(document.activeElement),
        ...this.getKeyBindingDiagnosticSummary(keyCode),
      });
    }

    window.VSC.logger.verbose(`Processing keydown event: key=${event.key}, keyCode=${keyCode}`);

    // Event deduplication - prevent same key event from being processed multiple times
    const eventSignature = `${keyCode}_${event.timeStamp}_${event.type}`;

    if (this.lastKeyEventSignature === eventSignature) {
      if (logDiagnostic) {
        this.logKeyBindingDiagnostic('ignored as duplicate keydown event', {
          eventSignature,
          lastKeyEventSignature: this.lastKeyEventSignature,
        });
      }
      return;
    }

    this.lastKeyEventSignature = eventSignature;

    // Ignore if following modifier is active
    if (this.hasActiveModifier(event)) {
      if (logDiagnostic) {
        this.logKeyBindingDiagnostic('ignored because a modifier key is active', {
          alt: event.getModifierState && event.getModifierState('Alt'),
          control: event.getModifierState && event.getModifierState('Control'),
          fn: event.getModifierState && event.getModifierState('Fn'),
          meta: event.getModifierState && event.getModifierState('Meta'),
          hyper: event.getModifierState && event.getModifierState('Hyper'),
          os: event.getModifierState && event.getModifierState('OS'),
        });
      }
      window.VSC.logger.debug(`Keydown event ignored due to active modifier: ${keyCode}`);
      return;
    }

    // Ignore keydown event if typing in an input box
    if (this.isTypingContext(event.target)) {
      if (logDiagnostic) {
        this.logKeyBindingDiagnostic('ignored because target is a typing context', {
          target: this.summarizeElement(event.target),
        });
      }
      return false;
    }

    // Ignore keydown event if no media elements are present
    const mediaElements = this.config.getMediaElements();
    if (!mediaElements.length) {
      if (logDiagnostic) {
        this.logKeyBindingDiagnostic('ignored because no media elements are tracked', {
          mediaCount: mediaElements.length,
        });
      }
      return false;
    }

    // Find matching key binding
    const keyBinding = this.config.settings.keyBindings.find((item) => item.key === keyCode);

    if (keyBinding) {
      if (logDiagnostic) {
        this.logKeyBindingDiagnostic('matched loaded key binding and dispatching action', {
          keyBinding,
          mediaCount: mediaElements.length,
        });
      }

      this.actionHandler.runAction(keyBinding.action, keyBinding.value, event);

      if (keyBinding.force === true || keyBinding.force === 'true') {
        if (logDiagnostic) {
          this.logKeyBindingDiagnostic('preventing page shortcut because binding is forced', {
            keyBinding,
          });
        }

        // Disable website's key bindings
        event.preventDefault();
        event.stopPropagation();
      }
    } else {
      if (logDiagnostic) {
        this.logKeyBindingDiagnostic('no loaded key binding matched this keyCode', {
          ...this.getKeyBindingDiagnosticSummary(keyCode),
          probableCause: [
            'The live extension is using chrome.storage keyBindings',
            'that do not contain keyCode 84.',
          ].join(' '),
        });
      }

      window.VSC.logger.verbose(`No key binding found for keyCode: ${keyCode}`);
    }

    return false;
  }

  /**
   * Check if any modifier keys are active
   * @param {KeyboardEvent} event - Keyboard event
   * @returns {boolean} True if modifiers are active
   * @private
   */
  hasActiveModifier(event) {
    return (
      !event.getModifierState ||
      event.getModifierState('Alt') ||
      event.getModifierState('Control') ||
      event.getModifierState('Fn') ||
      event.getModifierState('Meta') ||
      event.getModifierState('Hyper') ||
      event.getModifierState('OS')
    );
  }

  /**
   * Check if user is typing in an input context
   * @param {Element} target - Event target
   * @returns {boolean} True if typing context
   * @private
   */
  isTypingContext(target) {
    return (
      target.nodeName === 'INPUT' || target.nodeName === 'TEXTAREA' || target.isContentEditable
    );
  }

  /**
   * Set up rate change event listener
   * @param {Document} document - Document to attach events to
   */
  setupRateChangeListener(document) {
    const rateChangeHandler = (event) => this.handleRateChange(event);
    document.addEventListener('ratechange', rateChangeHandler, true);

    // Store reference for cleanup
    if (!this.listeners.has(document)) {
      this.listeners.set(document, []);
    }
    this.listeners.get(document).push({
      type: 'ratechange',
      handler: rateChangeHandler,
      useCapture: true,
    });
  }

  /**
   * Handle rate change events
   * @param {Event} event - Rate change event
   * @private
   */
  handleRateChange(event) {
    if (this.coolDown) {
      window.VSC.logger.info('Speed event propagation blocked');
      event.stopImmediatePropagation();
    }

    // Get the actual video element (handle shadow DOM)
    const video = event.composedPath()[0];

    // Handle forced last saved speed
    if (this.config.settings.forceLastSavedSpeed) {
      if (event.detail && event.detail.origin === 'videoSpeed') {
        video.playbackRate = event.detail.speed;
        this.updateSpeedFromEvent(video);
      } else {
        video.playbackRate = this.config.settings.lastSpeed;
      }
      event.stopImmediatePropagation();
    } else {
      this.updateSpeedFromEvent(video);
    }
  }

  /**
   * Update speed indicators and storage when rate changes
   * @param {HTMLMediaElement} video - Video element
   * @private
   */
  updateSpeedFromEvent(video) {
    // Check if video has a controller attached
    if (!video.vsc) {
      return;
    }

    const speedIndicator = video.vsc.speedIndicator;
    const src = video.currentSrc;
    const speed = Number(video.playbackRate.toFixed(2));

    window.VSC.logger.info(`Playback rate changed to ${speed}`);

    // Update controller display
    window.VSC.logger.debug('Updating controller with new speed');
    speedIndicator.textContent = speed.toFixed(2);

    // Store speed for this source
    this.config.settings.speeds[src] = speed;

    // Store as last speed for remember feature
    window.VSC.logger.debug('Storing lastSpeed in settings for the rememberSpeed feature');
    this.config.settings.lastSpeed = speed;

    // Save to Chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      window.VSC.logger.debug('Syncing chrome settings for lastSpeed');
      chrome.storage.sync.set({ lastSpeed: speed }, () => {
        window.VSC.logger.debug(`Speed setting saved: ${speed}`);
      });
    } else {
      window.VSC.logger.debug('Chrome storage not available, skipping speed sync');
    }

    // Show controller briefly if hidden
    this.actionHandler.runAction('blink', null, null);
  }

  /**
   * Start cooldown period to prevent event spam
   */
  refreshCoolDown() {
    window.VSC.logger.debug('Begin refreshCoolDown');

    if (this.coolDown) {
      clearTimeout(this.coolDown);
    }

    this.coolDown = setTimeout(() => {
      this.coolDown = false;
    }, 1000);

    window.VSC.logger.debug('End refreshCoolDown');
  }

  /**
   * Show controller temporarily
   * @param {Element} controller - Controller element
   */
  showController(controller) {
    // Respect startHidden setting - don't show controllers that should stay hidden
    // unless they've been manually toggled by the user (have vsc-manual class)
    if (this.config.settings.startHidden && !controller.classList.contains('vsc-manual')) {
      window.VSC.logger.info(
        `Controller hidden by default - not showing temporarily (startHidden: ${this.config.settings.startHidden}, manual: ${controller.classList.contains('vsc-manual')})`
      );
      return;
    }

    window.VSC.logger.info(
      `Showing controller temporarily (startHidden: ${this.config.settings.startHidden}, manual: ${controller.classList.contains('vsc-manual')})`
    );
    controller.classList.add('vsc-show');

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      controller.classList.remove('vsc-show');
      this.timer = null;
      window.VSC.logger.debug('Hiding controller');
    }, 2000);
  }

  /**
   * Clean up all event listeners
   */
  cleanup() {
    this.listeners.forEach((eventList, doc) => {
      eventList.forEach(({ type, handler, useCapture }) => {
        try {
          doc.removeEventListener(type, handler, useCapture);
        } catch (e) {
          window.VSC.logger.warn(`Failed to remove event listener: ${e.message}`);
        }
      });
    });

    this.listeners.clear();

    if (this.coolDown) {
      clearTimeout(this.coolDown);
      this.coolDown = false;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

// Create singleton instance
window.VSC.EventManager = EventManager;
