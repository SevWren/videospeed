/**
 * VSC GIF File Fetcher
 *
 * This page runs inside a hidden iframe at chrome-extension:// origin.
 * Because the origin is chrome-extension:// (not null), Chrome's CORS
 * policy allows XHR to file:// URLs when the user has enabled
 * "Allow access to file URLs" in chrome://extensions/.
 *
 * Protocol:
 *   Receives:  { type: 'VSC_GIF_FETCH_REQUEST', url: 'file://...', requestId }
 *   Sends:     { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success, bytes?, error? }
 *   Sends:     { type: 'VSC_GIF_FETCHER_READY' }  (once, on load)
 */
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'VSC_GIF_FETCH_REQUEST') {
    return;
  }
  const { url, requestId } = data;
  if (!url || !requestId || !url.startsWith('file://')) {
    return;
  }

  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  // 8-second timeout: guards against stalled network drives or ejected USB.
  xhr.timeout = 8000;

  xhr.onload = () => {
    // file:// XHR reports status 0 on success (no HTTP status codes).
    if (
      (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) &&
      xhr.response &&
      xhr.response.byteLength > 0
    ) {
      window.parent.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: true, bytes: xhr.response },
        '*',
        [xhr.response]
      );
    } else {
      window.parent.postMessage(
        { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false, error: 'empty' },
        '*'
      );
    }
  };

  xhr.onerror = () => {
    // This fires if "Allow access to file URLs" is disabled or the file path is wrong.
    window.parent.postMessage(
      { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false, error: 'blocked' },
      '*'
    );
  };

  xhr.ontimeout = () => {
    window.parent.postMessage(
      { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false, error: 'timeout' },
      '*'
    );
  };

  try {
    xhr.send();
  } catch (e) {
    window.parent.postMessage(
      { type: 'VSC_GIF_BYTES_RESPONSE', requestId, success: false, error: e.message },
      '*'
    );
  }
});

// Signal parent that the iframe is ready to receive requests.
window.parent.postMessage({ type: 'VSC_GIF_FETCHER_READY' }, '*');
