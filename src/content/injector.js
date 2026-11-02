/**
 * Content script (isolated world) — bridges chrome.* APIs to the page world.
 *
 * WHY THIS APPROACH (Path B):
 * All main-world modules (VSC core, UI, handlers, inject.js) are now declared
 * directly in manifest.json under content_scripts with "world": "MAIN". Chrome
 * injects them natively, bypassing the page's Content Security Policy entirely.
 * No DOM <script> injection and no chrome.scripting.executeScript call is needed.
 *
 * This file runs in the ISOLATED world and provides the chrome.* API bridge:
 * - injectUserSettings(): reads chrome.storage.sync, fires VSC_USER_SETTINGS event
 * - setupMessageBridge(): relays popup messages, storage changes, controller events,
 *   save-settings requests, and the file:// GIF byte-fetch proxy
 *
 * See: manifest.json content_scripts[1] (world:"MAIN", 26 modules + inject.js)
 *      manifest.json content_scripts[2] (world:"MAIN", Netflix-specific script)
 */
// Set up message bridge between extension popup and injected page
function setupMessageBridge() {
  const isExtensionContextInvalidated = (error) => {
    try {
      const message = typeof error === 'string' ? error : error?.message;
      return typeof message === 'string' && message.includes('Extension context invalidated');
    } catch (innerError) {
      // Accessing error fields can also fail while the extension context is tearing down.
      return true;
    }
  };

  // Listen for messages from popup (in content script context)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward message to injected page context
    if (message && message.type && message.type.startsWith('VSC_')) {
      // Dispatch custom event to page context
      window.dispatchEvent(
        new CustomEvent('VSC_MESSAGE', {
          detail: message,
        })
      );

      sendResponse({ success: true });
      return true;
    }
  });

  // Listen for save settings requests from injected page context
  window.addEventListener('VSC_SAVE_SETTINGS', async (event) => {
    try {
      // Save to Chrome storage (available in content script context)
      await new Promise((resolve, reject) => {
        chrome.storage.sync.set(event.detail, () => {
          try {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
              return;
            }
            resolve();
          } catch (callbackError) {
            reject(callbackError);
          }
        });
      });
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        return;
      }
      console.error('❌ Failed to save settings to Chrome storage:', error);
    }
  });

  // ── File:// GIF byte fetch proxy ─────────────────────────────────────────
  // PROBLEM: every XHR/fetch on a file:// page — whether from a page script
  // or a content script — runs with origin 'null'.  Chrome blocks cross-origin
  // XHR from null origin to file:// URLs with a CORS error.
  //
  // SOLUTION: embed a hidden <iframe> whose src is a chrome-extension:// page
  // (src/gif-file-fetcher.html).  That page runs at chrome-extension:// origin,
  // which IS in Chrome's allowed list.  The iframe performs the XHR and posts
  // the ArrayBuffer back to the parent window via window.parent.postMessage,
  // where gif-controller.js's existing 'message' listener receives it.
  //
  // Protocol (defined in gif-file-fetcher.js):
  //   injector → iframe : { type:'VSC_GIF_FETCH_REQUEST', url, requestId }
  //   iframe → parent  : { type:'VSC_GIF_BYTES_RESPONSE', requestId, success, bytes? }
  //   iframe → parent  : { type:'VSC_GIF_FETCHER_READY' }  (once, on DOMContentLoaded)
  // Only needed on file:// pages
  (function setupFileGifFetcherProxy() {
    if (!location.href.startsWith('file://')) {
      return;
    }

    let fetcherIframe = null;
    let iframeReady = false;
    const pending = []; // Requests that arrived before iframe finished loading

    function ensureIframe() {
      if (fetcherIframe) {
        return;
      }
      fetcherIframe = document.createElement('iframe');
      fetcherIframe.src = chrome.runtime.getURL('src/gif-file-fetcher.html');
      fetcherIframe.style.cssText =
        'display:none!important;position:absolute!important;' +
        'width:0!important;height:0!important;border:0!important;' +
        'pointer-events:none!important;';
      fetcherIframe.setAttribute('aria-hidden', 'true');
      (document.body || document.documentElement).appendChild(fetcherIframe);
    }

    function dispatchToIframe(url, requestId) {
      fetcherIframe.contentWindow.postMessage(
        { type: 'VSC_GIF_FETCH_REQUEST', url, requestId },
        '*' // iframe at chrome-extension:// validates type internally
      );
    }

    // Handle the iframe's ready signal and flush pending queue.
    // VSC_GIF_BYTES_RESPONSE messages are NOT re-dispatched here — they arrive
    // on the page window directly from iframe.postMessage(parent) and are
    // handled by gif-controller.js's window.addEventListener('message').
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') {
        return;
      }
      if (event.data.type !== 'VSC_GIF_FETCHER_READY') {
        return;
      }
      iframeReady = true;
      pending.forEach(({ url, requestId }) => dispatchToIframe(url, requestId));
      pending.length = 0;
    });

    // Receive requests from the page world (gif-controller.js).
    window.addEventListener('VSC_FETCH_GIF_BYTES', (event) => {
      const { url, requestId } = event.detail || {};
      if (!url || !requestId || !url.startsWith('file://')) {
        return;
      }
      ensureIframe();
      if (iframeReady) {
        dispatchToIframe(url, requestId);
      } else {
        pending.push({ url, requestId });
      }
    });
  })();

  // Listen for controller lifecycle events from injected page context
  window.addEventListener('VSC_CONTROLLER_CREATED', (event) => {
    // Forward controller creation to background script for icon management
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'VSC_CONTROLLER_CREATED',
          controllerId: event.detail?.controllerId || 'default',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      // Silently ignore extension context invalidation errors
      if (!isExtensionContextInvalidated(error)) {
        console.warn('Failed to send controller created message:', error);
      }
    }
  });

  window.addEventListener('VSC_CONTROLLER_REMOVED', (event) => {
    // Forward controller removal to background script for icon management
    try {
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'VSC_CONTROLLER_REMOVED',
          controllerId: event.detail?.controllerId || 'default',
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      // Silently ignore extension context invalidation errors
      if (!isExtensionContextInvalidated(error)) {
        console.warn('Failed to send controller removed message:', error);
      }
    }
  });

  // ── Live settings relay (issue #10) ──────────────────────────────────────
  // When the Options page (or popup) saves to chrome.storage.sync, push the
  // changed user-controlled keys into the page world via VSC_USER_SETTINGS so
  // that already-open tabs pick them up without a reload.
  //
  // Keys omitted from this set are intentionally NOT relayed:
  //   lastSpeed, lastGifSpeed, speeds — runtime state; changes are high-freq
  //   controlGifs   — handled by the dedicated VSC_ENABLE/DISABLE_GIF_CONTROL
  //                   message channel that performs full GIF controller teardown
  //   displayKeyCode — legacy; the display key lives inside keyBindings already
  //
  // The relay reads values directly from the `changes` argument — no
  // chrome.storage.sync.get(null) re-fetch — so there is exactly one IPC call
  // per onChanged invocation regardless of how many frames are on the page.
  const _VSC_USER_CONTROLLED_KEYS = new Set([
    'keyBindings',
    'rememberSpeed',
    'forceLastSavedSpeed',
    'audioBoolean',
    'startHidden',
    'controllerOpacity',
    'controllerButtonSize',
    'logLevel',
    'blacklist',
    'enabled',
    'gifSpeedStep',
    'hoverActivatesVideoTarget',
    'hoverActivatesGifTarget',
  ]);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    try {
      if (areaName !== 'sync') {
        return;
      }
      const patch = {};
      for (const key of _VSC_USER_CONTROLLED_KEYS) {
        if (Object.prototype.hasOwnProperty.call(changes, key)) {
          patch[key] = changes[key].newValue;
        }
      }
      if (Object.keys(patch).length === 0) {
        return;
      }
      window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', { detail: patch }));
    } catch (error) {
      if (!isExtensionContextInvalidated(error)) {
        console.warn('VSC live settings relay error:', error);
      }
    }
  });
}

// Fetch user settings from Chrome storage and inject into page context
async function injectUserSettings() {
  try {
    // Get user settings from Chrome storage (available in content script context)
    const userSettings = await new Promise((resolve) => {
      chrome.storage.sync.get(null, (settings) => {
        resolve(settings);
      });
    });

    // Write settings to window property BEFORE dispatching the event so that
    // storage-manager.js can recover them even if the VSC_USER_SETTINGS event
    // fires before its listener is registered (race condition fix — Option A).
    window.__VSC_injectedSettings = userSettings;

    // Inject settings into page context via custom event
    window.dispatchEvent(
      new CustomEvent('VSC_USER_SETTINGS', {
        detail: userSettings,
      })
    );
  } catch (error) {
    console.error('❌ Failed to inject user settings:', error);
  }
}

// Set up the chrome.* API bridge when DOM is ready.
// Main-world modules (all 26 + inject.js) are loaded by Chrome natively via
// the "world":"MAIN" content_scripts declaration in manifest.json — this file
// only needs to bridge chrome.storage, chrome.runtime messaging, and the
// file:// GIF byte-fetch proxy.
async function initBridge() {
  await injectUserSettings();
  setupMessageBridge();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (window.requestIdleCallback) {
      requestIdleCallback(initBridge, { timeout: 3000 });
    } else {
      setTimeout(initBridge, 100);
    }
  });
} else if (document.readyState === 'interactive') {
  if (window.requestIdleCallback) {
    requestIdleCallback(initBridge, { timeout: 2000 });
  } else {
    setTimeout(initBridge, 50);
  }
} else {
  if (window.requestIdleCallback) {
    requestIdleCallback(initBridge, { timeout: 1000 });
  } else {
    setTimeout(initBridge, 10);
  }
}
