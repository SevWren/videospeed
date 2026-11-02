# V-frame-guard-660 — Frame Guard Verification Report
## Team 1, Agent 3 — Verification pass
## Repo: `fix/path-b-world-main` | Date: 2026-11-01

---

## Mission

Verify that the frame guard at `inject.js:660` prevents initialization in frames where
`document.head === null`, and explain why errors appear **twice** in the user's console.

---

## 1. What Is Actually at inject.js Line 660

The prior T1-A3 audit (filed at `docs/audit/team1/T1-A3-frame-guard.md`) described line 660
as an unconditional `extension.initialize()` call with no frame guard. That was the state of
the code **before** the fix was applied.

The branch `fix/path-b-world-main` **has been updated** since that audit. Reading the current
file confirms:

```
inject.js:659   window.addEventListener('beforeunload', () => {
inject.js:660     extension.cleanup();
inject.js:661   });
```

Line 660 is now `extension.cleanup()` inside a `beforeunload` handler — not `initialize()`.
The `extension.initialize()` call has moved to line 713, guarded by
`shouldInjectInCurrentFrame()`:

```
inject.js:712   if (shouldInjectInCurrentFrame()) {
inject.js:713     extension.initialize().catch((error) => {
inject.js:714       console.error(`Extension initialization failed: ${error.message}`);
inject.js:715       window.VSC?.logger?.error(`Extension initialization failed: ${error.message}`);
inject.js:716     });
inject.js:717   }
```

The frame guard **has been implemented**.

---

## 2. shouldInjectInCurrentFrame() — Complete Logic (lines 675–706)

```js
function shouldInjectInCurrentFrame() {
  // Top-level document: always inject
  if (!window.VSC.DomUtils.inIframe()) {
    return true;
  }

  // Sub-frame: skip non-HTTP(S)/file frames
  try {
    const href = window.location.href;
    if (
      !href.startsWith('http://') &&
      !href.startsWith('https://') &&
      !href.startsWith('file://')
    ) {
      return false;
    }
  } catch (e) {
    return false; // Cannot read location (sandboxed) — skip
  }

  // Same-origin parent: void window.parent.document succeeds (no SecurityError) — skip.
  // Cross-origin parent: throws SecurityError — inject (independent embedded player).
  try {
    void window.parent.document;
    return false; // same-origin parent — top-level frame handles it
  } catch (e) {
    if (e.name === 'SecurityError') {
      return true; // cross-origin embedded player
    }
    return false; // unexpected error — skip injection
  }
}

// Expose for testability
window.VSC._shouldInjectInCurrentFrame = shouldInjectInCurrentFrame;
```

The function delegates to `window.VSC.DomUtils.inIframe()` (correct path, not the broken
`window.VSC.inIframe()` path that was present in `event-manager.js`). `inIframe()` is
implemented at `src/utils/dom-utils.js:68–74`:

```js
window.VSC.DomUtils.inIframe = function () {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
};
```

---

## 3. Frame-by-Frame Decision Trace for a YouTube Page

### 3.1 Top frame (`youtube.com/watch?v=...`)

- `inIframe()`: `window.self === window.top` → returns `false`
- Guard: `!false` → `true` → **return true**
- Result: `extension.initialize()` is called. Correct.

### 3.2 Same-origin ad or embed sub-frame (`www.youtube.com/embed/...` or `www.youtube.com/pagead/...`)

- `inIframe()`: `window.self !== window.top` → returns `true`
- Guard enters URL check: `window.location.href` starts with `https://` → passes URL check
- Guard enters parent probe: `void window.parent.document` — same-origin parent, no
  SecurityError → **return false**
- Result: `extension.initialize()` is NOT called. Correct.

### 3.3 Cross-origin embedded player (e.g., `www.youtube.com/embed/...` inside `example.com`)

- `inIframe()`: returns `true`
- URL check: starts with `https://` → passes
- Parent probe: `void window.parent.document` throws `SecurityError` (cross-origin) →
  `e.name === 'SecurityError'` → **return true**
- Result: `extension.initialize()` IS called. Correct — this is the legitimate use-case.

### 3.4 Cross-origin sub-domain cookie frame (`accounts.youtube.com/RotateCookiesPage`)

- `inIframe()`: returns `true`
- URL check: starts with `https://` → passes
- Parent probe: `void window.parent.document` — `accounts.youtube.com` vs `www.youtube.com`
  are different origins → throws `SecurityError` → **return true**
- Result: `extension.initialize()` IS called. This is an edge case — see Section 6.

### 3.5 Frame where `document.head === null` (sandboxed `about:blank`, SVG document)

Two sub-cases:

**Sub-case A: sandboxed `about:blank` frame**

- `window.location.href` returns `"about:blank"` (readable — no SecurityError for
  same-origin about:blank)
- URL check: `"about:blank"` does not start with `http://`, `https://`, or `file://`
- Guard: **return false**
- Result: `extension.initialize()` is NOT called.
- The null-head frame is protected by the URL scheme check, not by an explicit
  `document.head` check.

**Sub-case B: sandboxed frame where `window.location.href` throws (cross-origin sandboxed)**

- `window.location.href` access throws (SecurityError or similar)
- Guard: catch block → **return false**
- Result: `extension.initialize()` is NOT called.

**Conclusion:** The guard prevents initialization in null-head contexts via the URL scheme
check (about:blank filtered) and the location-access catch block (cross-origin sandboxed
filtered). The `document.head` null check at line 732 is a secondary, belt-and-suspenders
guard that only applies to the E2E test indicator `<div>` — it is not the primary guard for
`initialize()`.

---

## 4. manifest.json — match_about_blank

From `manifest.json`:

```json
{
  "all_frames": true,
  "matches": ["http://*/*", "https://*/*", "file:///*"],
  "match_about_blank": false,
  ...
  "world": "MAIN",
  "js": [ ... "src/content/inject.js" ]
}
```

`match_about_blank: false` is set on **both** content_scripts blocks (the ISOLATED world
injector block and the MAIN world scripts block). This means Chrome will not inject
`inject.js` into bare `about:blank` frames at all — the script never runs there, so the
guard for `about:blank` inside `shouldInjectInCurrentFrame()` is a redundant safety net
rather than the primary line of defense.

For frames that are not `about:blank` (e.g., `https://` frames with null `document.head`
due to being SVG documents or early-lifecycle sandboxed contexts), the URL check and parent
probe still function correctly.

---

## 5. Frame Guard Test Results

Running `npm test -- --testPathPattern=inject-frame-guard`:

```
Running unit/content/inject-frame-guard.test.js...
  Test 1 [GREEN]  DomUtils.inIframe() returns false when window.self === window.top (top frame)
  Test 1b [GREEN] DomUtils.inIframe() returns true when window.self !== window.top (sub-frame)
  Test 2  [GREEN] inject.js must NOT call extension.initialize() when running in an iframe
  Test 3  [GREEN] inject.js MUST call extension.initialize() when running in the top frame

Results: 4 passed, 0 failed, 0 skipped
```

All four tests pass. Test 2 was previously RED (the guard did not exist); it is now GREEN,
confirming the fix has been applied and the guard is exposed at
`window.VSC._shouldInjectInCurrentFrame`.

Full suite: 184 tests, 184 passed, 0 failed.

---

## 6. Why Errors Appear TWICE

The duplicate error output is caused by **two independent issues**, both present in the
current code.

### Issue A: Duplicate VSC_USER_SETTINGS listener registration

`inject.js` registers the same event listener **twice** on `window`:

- **First registration: lines 643–656** — a well-guarded listener that checks
  `extension.initialized` and validates the patch object before calling
  `extension.config.applySettings(patch)`.

- **Second registration: lines 724–729** — a shorter, less-guarded listener that checks
  `extension?.initialized` and calls `extension.config.applySettings(event.detail)` directly.

Both listeners are wired unconditionally at module load time (neither is gated by
`shouldInjectInCurrentFrame()`). Every `VSC_USER_SETTINGS` event therefore triggers both
handlers in the same frame. If `applySettings` throws, the error propagates from both
handlers independently. If a settings change produces a console log inside `applySettings`,
it fires twice.

### Issue B: Two frames both pass the guard — cross-origin sub-domain frames

The guard does not distinguish "legitimate cross-origin embedded players" from
"cross-origin sub-domain auxiliary frames" (e.g., `accounts.youtube.com/RotateCookiesPage`).
Both pass the SecurityError branch and both call `extension.initialize()`.

On a typical YouTube watch page, this produces:

| Frame | Guard result | initialize() called |
|---|---|---|
| `www.youtube.com/watch?v=...` (top frame) | `true` — `inIframe()` is false | YES |
| `accounts.youtube.com/RotateCookiesPage` | `true` — cross-origin SecurityError | YES |

Both frames reach `extension.initialize()`. Both frames register their own error handler
via the `.catch()` on the `initialize()` call at line 713–716:

```js
extension.initialize().catch((error) => {
  console.error(`Extension initialization failed: ${error.message}`);
  window.VSC?.logger?.error(`Extension initialization failed: ${error.message}`);
});
```

If `initialize()` throws in either frame, a console error is emitted from that frame's
context. Chrome DevTools prefixes same-page frame console output with the frame URL, but
the messages are indistinguishable if both frames encounter the same error string.

### Combined effect

When both frames are active and encounter an initialization error (e.g., a `chrome.storage`
IPC failure or a missing `window.VSC` dependency), the error is logged:

1. Once by the top-frame's `.catch()` handler (line 714)
2. Once by the `accounts.youtube.com` sub-frame's `.catch()` handler (line 714)

And additionally, if the error propagates through the `VSC_USER_SETTINGS` path:

3. Once by the first listener (lines 643–656) in whichever frame processes it
4. Once by the second (duplicate) listener (lines 724–729) in the same frame

The most likely explanation for a simple "appears twice" report (rather than four times) is
the **two-frame scenario**: the top frame and one cross-origin sub-frame both running
`initialize()` and both hitting the same failure.

---

## 7. Does the Frame Guard Prevent Initialization in Null-Head Contexts?

**Yes, with the following precise mechanism:**

- `about:blank` frames: `match_about_blank: false` in both manifest content_scripts blocks
  prevents injection entirely. The guard never runs.

- Non-HTTP(S)/file frames (SVG documents served with a non-http scheme, `data:` URIs,
  `blob:` URLs with non-http schemes): the URL scheme check in `shouldInjectInCurrentFrame()`
  catches these and returns `false`.

- Sandboxed cross-origin frames where `window.location.href` throws: the catch block
  returns `false`.

- Same-origin frames (where `document.head` might be null during early document lifecycle):
  the parent probe (`void window.parent.document` succeeds without SecurityError) returns
  `false`.

The only path to `initialize()` for a frame with `document.head === null` that is not
covered by the guard is a cross-origin HTTP(S) frame where the document is in an
intermediate state with no `<head>` element. In practice, `document_end` run timing (set in
`manifest.json`) means `inject.js` does not run until the document has parsed, at which
point `document.head` is present for all normal HTML documents.

The secondary guard at line 732 (`if (document.head) { ... }`) covers only the E2E test
indicator element and is not related to the `initialize()` call path.

**Bottom line:** The frame guard at the `shouldInjectInCurrentFrame()` call site (line 712)
prevents `initialize()` in null-head contexts via scheme filtering and sandboxed-location
catch, not via an explicit `document.head` null check. The guard is present, tested, and
passing. The remaining gap is the duplicate `VSC_USER_SETTINGS` listener and the
cross-origin sub-domain auxiliary frame case (Issue B above).

---

## 8. Key File Locations

| File | Relevant Lines | Notes |
|---|---|---|
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 660 | `extension.cleanup()` in `beforeunload` — NOT `initialize()` |
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 675–706 | `shouldInjectInCurrentFrame()` implementation |
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 709 | `window.VSC._shouldInjectInCurrentFrame = shouldInjectInCurrentFrame` (testability hook) |
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 712–717 | Guarded `extension.initialize()` call |
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 643–656 | First `VSC_USER_SETTINGS` listener |
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 724–729 | Second (duplicate) `VSC_USER_SETTINGS` listener |
| `/home/vercel-sandbox/videospeed/src/content/inject.js` | 732–737 | `document.head` null guard for E2E test indicator only |
| `/home/vercel-sandbox/videospeed/src/utils/dom-utils.js` | 68–74 | `window.VSC.DomUtils.inIframe()` implementation |
| `/home/vercel-sandbox/videospeed/manifest.json` | 45, 64 | `match_about_blank: false` on both content_scripts blocks |
| `/home/vercel-sandbox/videospeed/tests/unit/content/inject-frame-guard.test.js` | 1–248 | 4 frame guard tests — all GREEN |

---

## 9. Conclusion

| Question | Answer |
|---|---|
| Does the frame guard at inject.js:660 exist? | Line 660 is `extension.cleanup()`. The guard is at line 712, wrapping line 713's `extension.initialize()`. |
| Does the guard prevent initialization where `document.head === null`? | Yes. About:blank frames are excluded by `match_about_blank:false`. Other null-head contexts are excluded by the URL scheme check or the sandboxed-location catch block. |
| Why do errors appear TWICE? | Two independent causes: (1) duplicate `VSC_USER_SETTINGS` listener registration (lines 643 and 724) fires both handlers per event in the same frame; (2) two frames pass the guard — the top frame and any cross-origin sub-domain frame (e.g., `accounts.youtube.com`) — so an initialization error in both produces one console error per frame. |
| Are the frame guard tests passing? | Yes. All 4 tests in `inject-frame-guard.test.js` are GREEN. Full suite: 184/184 passed. |
| Remaining gaps? | Duplicate `VSC_USER_SETTINGS` listener (cosmetic/correctness issue); cross-origin sub-domain auxiliary frames pass the guard unnecessarily (these are not embedded players but are treated as such). |

---

*Generated 2026-11-01 by Team 1 Agent 3 — verification sweep of `fix/path-b-world-main`.*
*All findings derived from source files in `/home/vercel-sandbox/videospeed/`.*
*Prior audit reference: `/home/vercel-sandbox/videospeed/docs/audit/team1/T1-A3-frame-guard.md`.*
