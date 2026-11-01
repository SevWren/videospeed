# Netflix seek via window.postMessage instead of video.currentTime

`NetflixHandler.handleSeek()` fires `window.postMessage({ action: 'videospeed-seek', seekMs: seekSeconds * 1000 }, 'https://www.netflix.com')` rather than setting `video.currentTime` directly. Every other site handler (including `BaseSiteHandler`) uses direct `currentTime` assignment.

## Why direct currentTime does not work on Netflix

Netflix's player intercepts direct writes to `video.currentTime` — the property is reassigned but the player ignores the value and snaps back to its own internal position. The `postMessage`-based seek is the mechanism Netflix's own player exposes for external time control.

## Considered options

- **Direct `video.currentTime` assignment**: Works on every other supported site. Broken on Netflix: player overrides the value.
- **`window.postMessage` to `https://www.netflix.com` (chosen)**: Targets Netflix's player listener directly. Requires knowing and trusting the Netflix origin, but the handler is Netflix-specific by definition.

## Consequences

Any future change to Netflix's internal message format or origin would silently break seeking on Netflix without any error in VSC. The `postMessage` target origin is hard-coded to `'https://www.netflix.com'`.
