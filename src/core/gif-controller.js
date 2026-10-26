/**
 * GIF Controller for Video Speed Controller
 * Implements canvas replacement approach for GIF speed control.
 * Modular architecture using global variables.
 */

window.VSC = window.VSC || {};

if (!window.VSC.GifController) {
  class GifController {
    constructor(imgElement, parent, config, actionHandler) {
      this._img = imgElement;
      this._parent = parent;
      this._config = config;
      this._actionHandler = actionHandler;
      this._canvas = null;
      this._compositeCanvas = null;
      this._compositeCtx = null;
      this._visibleCtx = null;
      this._frames = null;
      this._parsed = null;
      this._frameIdx = 0;
      this._framesDrawn = 0;
      this._loopCount = 0;
      this._speed = config.settings.lastGifSpeed || 1.0;
      this._rafId = null;
      this._lastFrameTime = 0;
      this._userPaused = false;
      this._visibilityPaused = false;
      this._intersectionObserver = null;
      this._targetObserver = null;
      this._savedPixels = null;
      this._savedRegion = null;
      this._allocatedBytes = 0;
      this._gifWidth = 0;
      this._gifHeight = 0;
      this._rawBuffer = null;
      this._inPicture = false;
      this._positionWrapper = null;
      this._visibilityPauseTimer = null;
      this._patchCanvas = null;
      this._patchCtx = null;
      this.div = null;
      this.fetchFailed = false;
      this._visibilityChangeHandler = null;
      this._origImgCssText = null;
      this._rafRunning = false;
    }

    static async create(imgElement, parent, config, actionHandler) {
      let gc;
      try {
        if (!config.settings.controlGifs) {
          return null;
        }

        // Prefer the URL that actually ends in .gif. currentSrc may be a WebP
        // chosen by the browser from a <picture><source type="image/webp"> element.
        const isGifSrc = window.VSC.GifObserver?.isGifSrc;
        const src =
          (isGifSrc && isGifSrc(imgElement.src) ? imgElement.src : null) ||
          (isGifSrc && isGifSrc(imgElement.currentSrc) ? imgElement.currentSrc : null) ||
          imgElement.src ||
          imgElement.currentSrc ||
          '';
        if (!src) {
          return null;
        }

        // Check per-origin failure cache
        let origin = null;
        let resolvedSrc = src;
        try {
          if (!src.startsWith('data:')) {
            resolvedSrc = new URL(src, document.baseURI).href;
            const rawOrigin = new URL(resolvedSrc).origin;
            // file:// URLs all return the string "null" as their origin.  Using
            // "null" as a cache key would cause one failed local GIF to blacklist
            // every local file for the whole session.  Leave origin=null so the
            // failure cache is simply not consulted for local files.
            origin = (rawOrigin === 'null') ? null : rawOrigin;
            if (origin && window.VSC.gifFetchFailCache && window.VSC.gifFetchFailCache.has(origin)) {
              const entry = window.VSC.gifFetchFailCache.get(origin);
              if (entry && (entry.permanent || (entry.until && Date.now() < entry.until))) {
                return null;
              } else if (entry && !entry.permanent) {
                window.VSC.gifFetchFailCache.delete(origin);
              }
            }
          }
        } catch (_urlErr) {
          // URL.origin fails for data: URIs — handled by the data: check above
        }

        gc = new GifController(imgElement, parent, config, actionHandler);

        // Fetch GIF bytes
        const arrayBuffer = await GifController._fetchGifBytes(resolvedSrc, origin);
        if (!arrayBuffer) {
          gc.fetchFailed = true;
          return null;
        }
        gc._rawBuffer = arrayBuffer;

        // Parse and decompress frames
        let parsed, frames;
        try {
          parsed = window.__VSC_gifuct.parseGIF(arrayBuffer);
        } catch (decodeErr) {
          window.VSC.logger.warn(`GIF decode failed for ${src}: ${decodeErr.message}`);
          gc.fetchFailed = true;
          return null;
        }

        gc._gifWidth = parsed.lsd.width;
        gc._gifHeight = parsed.lsd.height;
        gc._loopCount = parsed.loopCount == null ? 1 : parsed.loopCount;

        // Check per-GIF size limit before allocating (need frame count estimate from parsed)
        // We use parsed.frames.length if available, else defer to after decompressFrames
        const parsedFrameCount = (parsed.frames && parsed.frames.length) || 1;
        const frameBytes = gc._gifWidth * gc._gifHeight * 4 * parsedFrameCount;
        if (frameBytes > window.VSC.Constants.GIF_FRAME_CACHE_LIMIT_BYTES) {
          window.VSC.logger.info(`GIF too large to cache (${Math.round(frameBytes / 1024 / 1024)}MB) for ${src}`);
          return null;
        }
        // Check global memory budget atomically
        if (!window.VSC.GifFrameCache.tryAllocate(frameBytes)) {
          window.VSC.logger.info(`GIF memory budget exceeded for ${src}`);
          return null;
        }
        gc._allocatedBytes = frameBytes;

        try {
          frames = window.__VSC_gifuct.decompressFrames(parsed, true);
        } catch (decodeErr) {
          window.VSC.logger.warn(`GIF decompressFrames failed for ${src}: ${decodeErr.message}`);
          // Release pre-allocation
          window.VSC.GifFrameCache.releaseAllocation(frameBytes);
          gc._allocatedBytes = 0;
          gc.fetchFailed = true;
          return null;
        }

        if (!frames || frames.length === 0) {
          // Static GIF or decode failure - don't replace
          window.VSC.GifFrameCache.releaseAllocation(frameBytes);
          gc._allocatedBytes = 0;
          return null;
        }

        gc._parsed = parsed;
        gc._frames = frames;

        // Capture computed styles BEFORE any DOM mutation
        const computedStyle = getComputedStyle(imgElement);
        const capturedStyles = {
          display: computedStyle.display,
          float: computedStyle.float,
          verticalAlign: computedStyle.verticalAlign,
          margin: computedStyle.margin,
          marginTop: computedStyle.marginTop,
          marginRight: computedStyle.marginRight,
          marginBottom: computedStyle.marginBottom,
          marginLeft: computedStyle.marginLeft,
          maxWidth: computedStyle.maxWidth,
          maxHeight: computedStyle.maxHeight,
        };

        // Create visible canvas
        const canvas = document.createElement('canvas');
        canvas.width = gc._gifWidth;
        canvas.height = gc._gifHeight;
        canvas.style.width = computedStyle.width;
        canvas.style.height = computedStyle.height;
        canvas.style.display =
          capturedStyles.display === 'inline' ? 'inline-block' : capturedStyles.display;
        canvas.style.float = capturedStyles.float;
        canvas.style.verticalAlign = capturedStyles.verticalAlign;
        canvas.style.marginTop = capturedStyles.marginTop;
        canvas.style.marginRight = capturedStyles.marginRight;
        canvas.style.marginBottom = capturedStyles.marginBottom;
        canvas.style.marginLeft = capturedStyles.marginLeft;
        canvas.style.maxWidth = capturedStyles.maxWidth;
        canvas.style.maxHeight = capturedStyles.maxHeight;

        // Accessibility
        if (imgElement.hasAttribute('alt') && imgElement.getAttribute('alt') === '') {
          canvas.setAttribute('role', 'presentation');
        } else {
          canvas.setAttribute('role', 'img');
          canvas.setAttribute(
            'aria-label',
            imgElement.getAttribute('alt') ||
              imgElement.getAttribute('aria-label') ||
              imgElement.getAttribute('title') ||
              'Animated GIF'
          );
        }
        const ariaDescBy = imgElement.getAttribute('aria-describedby');
        if (ariaDescBy) {
          canvas.setAttribute('aria-describedby', ariaDescBy);
        }

        gc._canvas = canvas;
        gc._visibleCtx = canvas.getContext('2d');
        if (!gc._visibleCtx) {
          if (gc._allocatedBytes > 0) { const b = gc._allocatedBytes; gc._allocatedBytes = 0; window.VSC.GifFrameCache?.releaseAllocation(b); }
          return null;
        } // Canvas 2D not available (CSP restriction)

        // Create offscreen composite canvas
        const compCanvas = document.createElement('canvas');
        compCanvas.width = gc._gifWidth;
        compCanvas.height = gc._gifHeight;
        gc._compositeCanvas = compCanvas;
        gc._compositeCtx = compCanvas.getContext('2d');
        if (!gc._compositeCtx) {
          if (gc._allocatedBytes > 0) { const b = gc._allocatedBytes; gc._allocatedBytes = 0; window.VSC.GifFrameCache?.releaseAllocation(b); }
          return null;
        } // Canvas 2D not available (CSP restriction)

        // DOM insertion
        const isPicture =
          imgElement.parentElement && imgElement.parentElement.tagName === 'PICTURE';
        if (isPicture) {
          gc._inPicture = true;
          gc._origImgCssText = imgElement.style.cssText;
          imgElement.style.cssText +=
            '; visibility: hidden !important; position: absolute !important; width: 0 !important; height: 0 !important; pointer-events: none !important;';
          imgElement.parentElement.parentNode.insertBefore(canvas, imgElement.parentElement);
        } else {
          imgElement.parentNode.insertBefore(canvas, imgElement);
          imgElement.parentNode.removeChild(imgElement);
        }

        // Position wrapper for unpositioned ancestors
        if (!isPicture) {
          const offsetParent = canvas.offsetParent;
          if (
            !offsetParent ||
            offsetParent === document.body ||
            offsetParent === document.documentElement
          ) {
            const wrapper = document.createElement('span');
            wrapper.style.cssText = 'position: relative; display: inline-block;';
            canvas.parentNode.insertBefore(wrapper, canvas);
            wrapper.appendChild(canvas);
            gc._positionWrapper = wrapper;
          }
        }

        // Register with config
        config.addGifElement(imgElement);
        imgElement.gifController = gc;

        // Set up controls overlay
        gc._initializeControls();

        if (!gc.div) {
          if (gc._allocatedBytes > 0) {
            const b = gc._allocatedBytes; gc._allocatedBytes = 0;
            window.VSC.GifFrameCache?.releaseAllocation(b);
          }
          if (gc._canvas && gc._canvas.parentNode) gc._canvas.parentNode.removeChild(gc._canvas);
          if (gc._positionWrapper && gc._positionWrapper.parentNode) gc._positionWrapper.parentNode.removeChild(gc._positionWrapper);
          return null;
        }

        // Set up canvas.vsc adapter for DragHandler
        canvas.vsc = { div: gc.div };

        // Set up IntersectionObserver for memory management
        gc._setupIntersectionObserver();

        // Set up src mutation observer
        gc._setupTargetObserver();

        // Start animation loop
        gc._lastFrameTime = performance.now();
        gc._startRafLoop();

        gc._visibilityChangeHandler = () => {
          if (document.visibilityState === 'visible' && !gc._userPaused && !gc._visibilityPaused) {
            gc._lastFrameTime = performance.now();
            gc._startRafLoop();
          }
        };
        document.addEventListener('visibilitychange', gc._visibilityChangeHandler);

        // Dispatch controller created event
        window.dispatchEvent(
          new CustomEvent('VSC_CONTROLLER_CREATED', {
            detail: { controllerId: `gif-${Date.now()}` },
          })
        );

        return gc;
      } catch (error) {
        window.VSC.logger.error(`GifController.create failed: ${error.message}`);
        try {
          if (typeof gc !== 'undefined' && gc._allocatedBytes > 0) {
            const b = gc._allocatedBytes; gc._allocatedBytes = 0;
            window.VSC.GifFrameCache?.releaseAllocation(b);
          }
        } catch(_) {}
        return null;
      }
    }

    static async _fetchGifBytes(src, origin) {
      try {
        // Data URI bypass
        const lower = src.toLowerCase();
        if (lower.startsWith('data:image/gif;base64,')) {
          const base64 = src.split(',')[1];
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes.buffer;
        }

        // Local file:// URLs — injected page scripts run in the null origin of a
        // file:// page and cannot XHR other file:// resources directly.  Route the
        // request through the content script bridge (injector.js), which runs in the
        // extension's isolated world and CAN access file:// resources when the user
        // has enabled "Allow access to file URLs" in chrome://extensions/.
        if (src.startsWith('file://')) {
          return new Promise((resolve) => {
            const requestId = `vsc-gif-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
            let timeoutHandle;

            const messageHandler = (event) => {
              if (
                event.data?.type === 'VSC_GIF_BYTES_RESPONSE' &&
                event.data.requestId === requestId
              ) {
                clearTimeout(timeoutHandle);
                window.removeEventListener('message', messageHandler);
                if (event.data.success && event.data.bytes) {
                  resolve(event.data.bytes);
                } else {
                  if (event.data.error === 'blocked') {
                    window.VSC.logger.warn(
                      `Local GIF blocked — enable "Allow access to file URLs" in chrome://extensions/ to use GIF speed control on local files (${src})`
                    );
                  } else if (event.data.error === 'timeout') {
                    window.VSC.logger.debug(
                      `Local GIF fetch timed out after 8 s — file may be on a slow or disconnected drive (${src})`
                    );
                  }
                  resolve(null);
                }
              }
            };

            window.addEventListener('message', messageHandler);

            // Ask the content script bridge to fetch the bytes.
            window.dispatchEvent(
              new CustomEvent('VSC_FETCH_GIF_BYTES', { detail: { url: src, requestId } })
            );

            // 10 s outer timeout: guard against the bridge never responding (e.g.
            // injector.js was not loaded, or the content script world was torn down).
            timeoutHandle = setTimeout(() => {
              window.removeEventListener('message', messageHandler);
              window.VSC.logger.debug(`Local GIF bridge timed out (no response) for ${src}`);
              resolve(null);
            }, 10000);
          });
        }

        const response = await fetch(src, { mode: 'cors', cache: 'default' });
        if (!response.ok) {
          if (origin && window.VSC.gifFetchFailCache) {
            const permanent = response.status === 403;
            window.VSC.gifFetchFailCache.set(origin, {
              permanent,
              until: permanent ? null : Date.now() + 60000,
            });
          }
          return null;
        }

        // Content-type check (catches Imgur .gif -> MP4 redirect)
        const contentType = response.headers.get('content-type') || '';
        if (
          !contentType.includes('image/gif') &&
          !contentType.includes('application/octet-stream')
        ) {
          window.VSC.logger.warn(`GIF URL returned unexpected content-type: ${contentType}`);
          return null;
        }

        return await response.arrayBuffer();
      } catch (err) {
        if (origin && window.VSC.gifFetchFailCache) {
          window.VSC.gifFetchFailCache.set(origin, { permanent: false, until: Date.now() + 60000 });
        }
        window.VSC.logger.debug(`GIF fetch failed for ${src}: ${err.message}`);
        return null;
      }
    }

    _drawFrame(frameIndex) {
      const frame = this._frames[frameIndex];

      // Apply the previous frame's disposal before drawing the current frame.
      if (frameIndex > 0 || this._framesDrawn >= this._frames.length) {
        const prevIndex = frameIndex === 0 ? this._frames.length - 1 : frameIndex - 1;
        const prev = this._frames[prevIndex];
        if (prev.disposalType === 2) {
          // Restore to background. The GIF spec says to use the LSD backgroundColorIndex,
          // but Chrome/Firefox/Safari all treat disposal=2 as "restore to transparent"
          // regardless of that index value — virtually every web-optimised GIF relies on
          // this non-spec convention. Filling with the GCT background colour (often index 0
          // = black) instead produces opaque-black artifacts wherever the next frame's
          // transparent pixels leave that filled region exposed (source-over compositing
          // preserves it instead of overwriting it). Always clear to transparent.
          this._compositeCtx.clearRect(
            prev.dims.left,
            prev.dims.top,
            prev.dims.width,
            prev.dims.height
          );
        } else if (prev.disposalType === 3 && this._savedPixels) {
          this._compositeCtx.putImageData(
            this._savedPixels,
            this._savedRegion.left,
            this._savedRegion.top
          );
          this._savedPixels = null;
        }
        // Disposal types 0 and 1: do nothing -- previous pixels remain.
      }

      // Save region for disposal=3 frames before drawing them.
      if (frame.disposalType === 3) {
        this._savedPixels = this._compositeCtx.getImageData(
          frame.dims.left,
          frame.dims.top,
          frame.dims.width,
          frame.dims.height
        );
        this._savedRegion = { ...frame.dims };
      }

      // Draw sub-image via an offscreen patch canvas so source-over compositing is
      // used. putImageData() writes raw RGBA bytes and ignores globalCompositeOperation,
      // meaning transparent pixels in the patch (alpha=0, "show previous layer") would
      // erase the underlying composite pixels — producing black artifacts wherever a
      // partial GIF frame is transparent. Drawing through a temp canvas with drawImage()
      // uses source-over, leaving underlying pixels intact where the patch is transparent.
      if (!this._patchCanvas) {
        this._patchCanvas = document.createElement('canvas');
        this._patchCtx = this._patchCanvas.getContext('2d');
      }
      if (this._patchCanvas.width !== frame.dims.width) {
        this._patchCanvas.width = frame.dims.width;
      }
      if (this._patchCanvas.height !== frame.dims.height) {
        this._patchCanvas.height = frame.dims.height;
      }
      const imageData = new ImageData(frame.patch, frame.dims.width, frame.dims.height);
      this._patchCtx.putImageData(imageData, 0, 0);
      this._compositeCtx.drawImage(this._patchCanvas, frame.dims.left, frame.dims.top);

      // Copy composite to the visible canvas.
      this._visibleCtx.clearRect(0, 0, this._gifWidth, this._gifHeight);
      this._visibleCtx.drawImage(this._compositeCanvas, 0, 0);
    }

    _tick(timestamp) {
      this._rafId = null;
      if (!this._visibleCtx || !this._compositeCtx) { return; }
      if (!Number.isFinite(timestamp)) { this._rafId = requestAnimationFrame((ts) => this._tick(ts)); return; }
      if (this._userPaused || this._visibilityPaused) {
        return;
      }
      if (!this._frames || this._frames.length === 0) {
        return;
      }

      const rawElapsed = timestamp - this._lastFrameTime;

      const frame = this._frames[this._frameIdx];
      const effectiveDelay = window.VSC.GifFrameEngine.effectiveDelay(frame.delay, this._speed);

      if (rawElapsed >= effectiveDelay) {
        this._drawFrame(this._frameIdx);
        this._frameIdx = (this._frameIdx + 1) % this._frames.length;
        this._framesDrawn++;

        if (this._loopCount !== 0 && this._framesDrawn >= this._loopCount * this._frames.length) {
          this._rafRunning = false;
          return; // finite loop complete; final frame remains visible
        }

        // Cap overshoot to one effectiveDelay to prevent burst playback after tab backgrounding
        const overshoot = rawElapsed - effectiveDelay;
        this._lastFrameTime = timestamp - Math.min(overshoot, effectiveDelay);
      }

      if (!this._userPaused && !this._visibilityPaused) {
        this._rafId = requestAnimationFrame((ts) => this._tick(ts));
      }
    }

    _startRafLoop() {
      if (this._rafRunning) return;
      this._rafRunning = true;
      this._lastFrameTime = performance.now();
      this._rafId = requestAnimationFrame((ts) => this._tick(ts));
    }

    _stopRafLoop() {
      this._rafRunning = false;
      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }

    setSpeed(speed) {
      this._speed = speed;
      this._lastFrameTime = performance.now();
      // Update speed indicator in shadow DOM
      if (this.div) {
        const indicator = this.div.shadowRoot && this.div.shadowRoot.querySelector('.draggable');
        if (indicator) {
          indicator.textContent = speed.toFixed(2);
        }
      }
    }

    pause() {
      this._userPaused = true;
      this._stopRafLoop();
    }

    resume() {
      this._userPaused = false;
      this._startRafLoop();
    }

    _initializeControls() {
      try {
        const targetEl = this._positionWrapper || this._canvas;

        // Create controller wrapper div
        const div = document.createElement('div');
        div.classList.add('vsc-controller');
        if (this._config.settings.startHidden) {
          div.classList.add('vsc-hidden');
          div.style.display = 'none';
          div.style.visibility = 'hidden';
          div.style.opacity = '0';
        }
        div.setAttribute('aria-hidden', 'true');

        // Insert controller div adjacent to canvas
        const parent = targetEl.parentNode || document.body;
        parent.insertBefore(div, targetEl.nextSibling || null);
        this.div = div;

        // Create shadow DOM
        const shadow = window.VSC.ShadowDOMManager.createShadowDOM(div, {
          top: '0px',
          left: '0px',
          speed: this._speed.toFixed(2),
          opacity: this._config.settings.controllerOpacity,
          buttonSize: this._config.settings.controllerButtonSize,
          isGif: true,
        });

        // Wire control events with speed callback
        const cm = new window.VSC.ControlsManager(this._actionHandler, this._config);
        cm.setupControlEvents(shadow, this._canvas, (delta) => {
          const newSpeed = Math.min(
            Math.max(this._speed + delta, window.VSC.Constants.SPEED_LIMITS.MIN),
            window.VSC.Constants.SPEED_LIMITS.MAX
          );
          this.setSpeed(newSpeed);
          if (this._actionHandler && typeof this._actionHandler._saveGifSpeedDebounced === 'function') {
            this._actionHandler._saveGifSpeedDebounced(newSpeed);
          }
        });
      } catch (err) {
        window.VSC.logger.error(`GifController._initializeControls failed: ${err.message}`);
      }
    }

    _setupIntersectionObserver() {
      try {
        this._intersectionObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                // Off-screen: pause after 30s to save memory
                if (this._visibilityPauseTimer) {
                  clearTimeout(this._visibilityPauseTimer);
                  this._visibilityPauseTimer = null;
                }
                this._visibilityPauseTimer = setTimeout(() => {
                  this._visibilityPaused = true;
                  this._stopRafLoop();
                  // Release decoded frames but keep raw buffer for re-decode
                  if (this._allocatedBytes > 0) {
                    window.VSC.GifFrameCache.releaseAllocation(this._allocatedBytes);
                    this._allocatedBytes = 0;
                  }
                  this._frames = null;
                }, 30000);
              } else {
                // Back on screen
                if (this._visibilityPauseTimer) {
                  clearTimeout(this._visibilityPauseTimer);
                  this._visibilityPauseTimer = null;
                }
                if (this._visibilityPaused) {
                  this._visibilityPaused = false;
                  // Re-decode if frames were evicted
                  if (!this._frames && this._rawBuffer) {
                    try {
                      const parsed = window.__VSC_gifuct.parseGIF(this._rawBuffer);
                      const frames = window.__VSC_gifuct.decompressFrames(parsed, true);
                      if (frames && frames.length > 0) {
                        const bytes = this._gifWidth * this._gifHeight * 4 * frames.length;
                        if (bytes > window.VSC.Constants.GIF_FRAME_CACHE_LIMIT_BYTES) {
                          // GIF too large to re-cache
                        } else if (window.VSC.GifFrameCache.tryAllocate(bytes)) {
                          this._allocatedBytes = bytes;
                          this._frames = frames;
                          this._parsed = parsed;
                          this._frameIdx = 0; this._framesDrawn = 0;
                          this._savedPixels = null; this._savedRegion = null;
                          if (this._compositeCtx) this._compositeCtx.clearRect(0, 0, this._gifWidth, this._gifHeight);
                        }
                      }
                    } catch (_redecodeErr) {
                      // Re-decode failed: GIF stays paused off-screen
                    }
                  }
                  if (!this._userPaused && this._frames) {
                    this._startRafLoop();
                  }
                }
              }
            });
          },
          { threshold: 0.01 }
        );
        this._intersectionObserver.observe(this._canvas);
      } catch (_ioErr) {
        // IntersectionObserver not supported — GIF plays without memory eviction
      }
    }

    _setupTargetObserver() {
      try {
        this._targetObserver = new MutationObserver(() => {
          // src changed: teardown and let mutation observer re-attach
          this._img._vscTeardownSrc = this._img.src;
          this.remove();
        });
        if (this._inPicture) {
          // For <picture> elements, observe the <picture> parent for source changes
          this._targetObserver.observe(this._img.parentElement || this._img, {
            attributes: true,
            attributeFilter: ['src', 'srcset'],
            subtree: true,
          });
        } else {
          this._targetObserver.observe(this._img, { attributes: true, attributeFilter: ['src'] });
        }
      } catch (_moErr) {
        // MutationObserver setup failed — src changes won't trigger teardown
      }
    }

    remove() {
      try {
        // 1. Stop rAF loop
        this._stopRafLoop();
        // 2. Disconnect IntersectionObserver
        if (this._intersectionObserver) {
          this._intersectionObserver.disconnect();
          this._intersectionObserver = null;
        }
        // 3. Clear visibility pause timer
        if (this._visibilityPauseTimer) {
          clearTimeout(this._visibilityPauseTimer);
          this._visibilityPauseTimer = null;
        }
        if (this._visibilityChangeHandler) {
          document.removeEventListener('visibilitychange', this._visibilityChangeHandler);
          this._visibilityChangeHandler = null;
        }
        // 4. Disconnect target mutation observer
        if (this._targetObserver) {
          this._targetObserver.disconnect();
          this._targetObserver = null;
        }
        // 5. Null frame data
        this._frames = null;
        this._savedPixels = null;
        this._rawBuffer = null;
        this._visibleCtx = null;
        this._compositeCtx = null;
        this._compositeCanvas = null;
        this._patchCanvas = null;
        this._patchCtx = null;
        // 6. Release memory budget
        if (this._allocatedBytes > 0) {
          const bytesToRelease = this._allocatedBytes;
          this._allocatedBytes = 0;
          window.VSC.GifFrameCache?.releaseAllocation(bytesToRelease);
        }
        // 7. Set ignore flag BEFORE re-inserting img
        if (!this._img._vscTeardownSrc) { this._img._vscTeardownSrc = this._img.src || ''; }
        this._img.vscGifIgnore = true;
        // 8. Re-insert original img / undo picture hiding
        if (this._inPicture) {
          this._img.style.cssText = this._origImgCssText !== null ? this._origImgCssText : '';
          if (this._canvas && this._canvas.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
          }
        } else if (this._positionWrapper) {
          const wrapperParent = this._positionWrapper.parentNode;
          if (wrapperParent) wrapperParent.insertBefore(this._img, this._positionWrapper);
          if (this._canvas && this._canvas.parentNode) this._canvas.parentNode.removeChild(this._canvas);
          if (this._positionWrapper.parentNode) this._positionWrapper.parentNode.removeChild(this._positionWrapper);
          this._positionWrapper = null;
        } else if (this._canvas) {
          const canvasParent = this._canvas.parentNode;
          if (canvasParent) { canvasParent.insertBefore(this._img, this._canvas); canvasParent.removeChild(this._canvas); }
        }
        // 10. Remove controller div
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
        }
        // 11. Remove from config tracking
        this._config.removeGifElement(this._img);
        // 12. Delete gifController reference
        delete this._img.gifController;
        // 13. Dispatch removed event
        window.dispatchEvent(
          new CustomEvent('VSC_CONTROLLER_REMOVED', {
            detail: { controllerId: 'gif' },
          })
        );
      } catch (err) {
        window.VSC.logger.error(`GifController.remove failed: ${err.message}`);
      }
    }
  }

  window.VSC.GifController = GifController;
}
