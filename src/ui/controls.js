/**
 * Control button interactions and event handling
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class ControlsManager {
  constructor(actionHandler, config) {
    this.actionHandler = actionHandler;
    this.config = config;
  }

  /**
   * Set up control button event listeners
   * @param {ShadowRoot} shadow - Shadow root containing controls
   * @param {HTMLVideoElement} video - Associated video element
   */
  setupControlEvents(shadow, video, onSpeedChange = null) {
    this.setupDragHandler(shadow, video);
    this.setupButtonHandlers(shadow);
    this.setupWheelHandler(shadow, video, onSpeedChange);
    this.setupClickPrevention(shadow);
  }

  /**
   * Set up drag handler for speed indicator.
   * DragHandler (src/ui/drag-handler.js) had one call site and one adapter —
   * a hypothetical seam per codebase-design deletion test. Logic inlined here.
   * @param {ShadowRoot} shadow - Shadow root
   * @param {HTMLVideoElement|HTMLCanvasElement} video - Media element whose vsc.div is the controller
   * @private
   */
  setupDragHandler(shadow, video) {
    const draggable = shadow.querySelector('.draggable');

    draggable.addEventListener(
      'mousedown',
      (e) => {
        const controller = video.vsc.div;
        const shadowController = controller.shadowRoot?.querySelector('#controller');
        if (!shadowController) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }

        // Find nearest parent of same size as video parent
        const parentElement = window.VSC.DomUtils.findVideoParent(controller);

        video.classList.add('vcs-dragging');
        shadowController.classList.add('dragging');

        const initialMouseXY = [e.clientX, e.clientY];
        const initialControllerXY = [
          parseInt(shadowController.style.left) || 0,
          parseInt(shadowController.style.top) || 0,
        ];

        const startDragging = (moveEvent) => {
          const style = shadowController.style;
          const dx = moveEvent.clientX - initialMouseXY[0];
          const dy = moveEvent.clientY - initialMouseXY[1];
          style.left = `${initialControllerXY[0] + dx}px`;
          style.top = `${initialControllerXY[1] + dy}px`;
        };

        const stopDragging = () => {
          parentElement.removeEventListener('mousemove', startDragging);
          parentElement.removeEventListener('mouseup', stopDragging);
          parentElement.removeEventListener('mouseleave', stopDragging);
          shadowController.classList.remove('dragging');
          video.classList.remove('vcs-dragging');
          window.VSC.logger.debug('Drag operation completed');
        };

        parentElement.addEventListener('mouseup', stopDragging);
        parentElement.addEventListener('mouseleave', stopDragging);
        parentElement.addEventListener('mousemove', startDragging);

        window.VSC.logger.debug('Drag operation started');

        e.stopPropagation();
        e.preventDefault();
      },
      true
    );
  }

  /**
   * Set up button click handlers
   * @param {ShadowRoot} shadow - Shadow root
   * @private
   */
  setupButtonHandlers(shadow) {
    shadow.querySelectorAll('button').forEach((button) => {
      // Click handler
      button.addEventListener(
        'click',
        (e) => {
          this.actionHandler.runAction(
            e.target.dataset['action'],
            this.config.getKeyBinding(e.target.dataset['action']),
            e
          );
          e.stopPropagation();
        },
        true
      );

      // Touch handler to prevent conflicts
      button.addEventListener(
        'touchstart',
        (e) => {
          e.stopPropagation();
        },
        { capture: true, passive: true }
      );
    });
  }

  /**
   * Set up mouse wheel handler for speed control
   * @param {ShadowRoot} shadow - Shadow root
   * @param {HTMLVideoElement} video - Video element
   * @private
   */
  setupWheelHandler(shadow, video, onSpeedChange) {
    const controller = shadow.querySelector('#controller');

    // { passive: false } is required because this handler calls event.preventDefault()
    // to prevent page scrolling when the user wheels over the controller.
    // This generates a Chrome [Violation] warning. The path to removing it is documented
    // in docs/coverage/untestable.md: replace preventDefault() with CSS touch-action:none.
    controller.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();

        const delta = Math.sign(event.deltaY);
        const step = 0.1;

        if (onSpeedChange) {
          // GIF path: delegate to callback; callback handles clamping and indicator update
          onSpeedChange(delta < 0 ? step : -step);
        } else {
          // Video path: existing behavior unchanged
          let newSpeed = video.playbackRate + (delta < 0 ? step : -step);
          newSpeed = Math.min(
            Math.max(newSpeed, window.VSC.Constants.SPEED_LIMITS.MIN),
            window.VSC.Constants.SPEED_LIMITS.MAX
          );
          video.playbackRate = newSpeed;
          const speedIndicator = shadow.querySelector('.draggable');
          if (speedIndicator) {
            speedIndicator.textContent = newSpeed.toFixed(2);
          }
          window.VSC.logger.debug(`Wheel control: speed changed to ${newSpeed.toFixed(2)}`);
        }
      },
      { passive: false }
    );
  }

  /**
   * Set up click prevention for controller container
   * @param {ShadowRoot} shadow - Shadow root
   * @private
   */
  setupClickPrevention(shadow) {
    const controller = shadow.querySelector('#controller');

    // Prevent clicks from bubbling up to page
    controller.addEventListener('click', (e) => e.stopPropagation(), false);
    controller.addEventListener('mousedown', (e) => e.stopPropagation(), false);
  }
}

// Create singleton instance
window.VSC.ControlsManager = ControlsManager;
