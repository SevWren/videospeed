/**
 * Content script that injects the main extension code into the page context
 * This solves the Manifest V3 isolated world issue
 */

// Function to inject script into page context
function injectScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      console.error(`❌ Failed to inject: ${src}`);
      reject(new Error(`Failed to inject ${src}`));
    };
    (document.head || document.documentElement).appendChild(script);
  });
}

// Inject CSS first
function injectCSS() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('src/styles/inject.css');
  document.head.appendChild(link);
}

// Inject all our modules in order
async function injectModules() {
  try {
    // Inject CSS first
    injectCSS();

    const modules = [
      'src/utils/constants.js',
      'src/utils/logger.js',
      'src/utils/debug-helper.js',
      'src/utils/dom-utils.js',
      'src/utils/event-manager.js',
      'src/core/storage-manager.js',
      'src/core/settings.js',
      'src/observers/media-observer.js',
      'src/observers/mutation-observer.js',
      'src/core/action-handler.js',
      'src/core/video-controller.js',
      'src/ui/controls.js',
      'src/ui/drag-handler.js',
      'src/ui/shadow-dom.js',
      'src/site-handlers/base-handler.js',
      'src/site-handlers/netflix-handler.js',
      'src/site-handlers/youtube-handler.js',
      'src/site-handlers/facebook-handler.js',
      'src/site-handlers/amazon-handler.js',
      'src/site-handlers/apple-handler.js',
      'src/site-handlers/index.js',
      'src/lib/gifuct-js.min.js',
      'src/core/gif-frame-engine.js',
      'src/observers/gif-observer.js',
      'src/core/gif-controller.js',
    ];

    // Inject modules with yielding to avoid blocking page load
    for (let i = 0; i < modules.length; i++) {
      const module = modules[i];
      await injectScript(module);

      // Yield control to browser every few modules to avoid blocking
      if (i > 0 && i % 5 === 0) {
        await new Promise((resolve) => {
          if (window.requestIdleCallback) {
            requestIdleCallback(resolve, { timeout: 50 });
          } else {
            setTimeout(resolve, 5);
          }
        });
      }
    }

    // Inject site-specific scripts if needed
    await injectSiteSpecificScripts();

    await injectScript('src/content/inject.js');
    await injectUserSettings();

    // Set up message bridge between popup and injected scripts
    setupMessageBridge();
  } catch (error) {
    console.error('💥 Module injection failed:', error);
  }
}

// Inject site-specific scripts based on current domain
async function injectSiteSpecificScripts() {
  try {
    // Check current domain and inject appropriate scripts
    const hostname = location.hostname;
    if (hostname === 'www.netflix.com') {
      console.log('🎬 Netflix detected, injecting Netflix script...');
      await injectScript('src/site-handlers/scripts/netflix.js');
    }

    // Add other site-specific scripts here as needed
    // if (hostname === 'www.youtube.com') {
    //   await injectScript('src/site-handlers/scripts/youtube.js');
    // }
  } catch (error) {
    console.error('❌ Failed to inject site-specific scripts:', error);
  }
}

const USER_CONTROLLED_KEYS = new Set([
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
]);

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

  // Relay Options-page storage changes to the injected page world
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      try {
        if (area !== 'sync') {
          return;
        }
        const patch = {};
        for (const [key, { newValue }] of Object.entries(changes)) {
          if (USER_CONTROLLED_KEYS.has(key)) {
            patch[key] = newValue;
          }
        }
        if (Object.keys(patch).length === 0) {
          return;
        }
        window.dispatchEvent(new CustomEvent('VSC_USER_SETTINGS', { detail: patch }));
      } catch (innerError) {
        if (!isExtensionContextInvalidated(innerError)) {
          console.error('❌ Error in storage.onChanged relay:', innerError);
        }
      }
    });
  } catch (error) {
    if (!isExtensionContextInvalidated(error)) {
      console.error('❌ Failed to register storage.onChanged listener:', error);
    }
  }

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

// Start injection when DOM is ready
if (document.readyState === 'loading') {
  // Wait for DOMContentLoaded, then defer injection to avoid blocking page load
  document.addEventListener('DOMContentLoaded', () => {
    // Use requestIdleCallback to wait for browser to be less busy
    if (window.requestIdleCallback) {
      requestIdleCallback(injectModules, { timeout: 3000 });
    } else {
      // Fallback with short delay to let page finish initial rendering
      setTimeout(injectModules, 100);
    }
  });
} else if (document.readyState === 'interactive') {
  // Document is still loading, wait a bit more
  if (window.requestIdleCallback) {
    requestIdleCallback(injectModules, { timeout: 2000 });
  } else {
    setTimeout(injectModules, 50);
  }
} else {
  // Document is complete, but still defer to avoid interfering with other scripts
  if (window.requestIdleCallback) {
    requestIdleCallback(injectModules, { timeout: 1000 });
  } else {
    setTimeout(injectModules, 10);
  }
}
