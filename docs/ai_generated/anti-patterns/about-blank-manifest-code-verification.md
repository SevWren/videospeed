# About:blank Injection — Manifest & Code Verification

**Date**: 2026-11-02
**Task**: Prove or disprove that VSC injects scripts into `about:blank` frames.
**Verdict**: VSC **cannot** inject into `about:blank` frames. Three independent proofs below.

---

## 1. Manifest Analysis — Every content_scripts Block

The manifest at `manifest.json` declares three `content_scripts` blocks.

### Block 0 — ISOLATED world (injector.js)

| Field | Value |
|---|---|
| `matches` | `["http://*/*", "https://*/*", "file:///*"]` |
| `match_about_blank` | `false` (explicitly set) |
| `world` | ISOLATED (default; field absent) |
| `js` | `["src/content/injector.js"]` |
| `include_globs` | absent |
| `exclude_globs` | absent |
| `exclude_matches` | `["https://hangouts.google.com/*", "https://meet.google.com/*"]` |

**Can it inject into `about:blank`?** No. `match_about_blank: false` is explicitly set. The `<all_urls>`-equivalent patterns (`http://*/*`, `https://*/*`) do not match `about:blank` without `match_about_blank: true`.

### Block 1 — MAIN world (26 VSC modules + inject.js)

| Field | Value |
|---|---|
| `matches` | `["http://*/*", "https://*/*", "file:///*"]` |
| `match_about_blank` | `false` (explicitly set) |
| `world` | `"MAIN"` |
| `js` | 26 files from `src/utils/constants.js` through `src/content/inject.js` |
| `include_globs` | absent |
| `exclude_globs` | absent |
| `exclude_matches` | `["https://hangouts.google.com/*", "https://meet.google.com/*"]` |

**Can it inject into `about:blank`?** No. `match_about_blank: false` is explicitly set.

### Block 2 — MAIN world (Netflix-specific, netflix.js)

| Field | Value |
|---|---|
| `matches` | `["https://www.netflix.com/*"]` |
| `match_about_blank` | `false` (explicitly set — **added by this fix**) |
| `world` | `"MAIN"` |
| `js` | `["src/site-handlers/scripts/netflix.js"]` |
| `include_globs` | absent |
| `exclude_globs` | absent |

**Can it inject into `about:blank`?** No. `match_about_blank: false` is now explicitly set.
**Gap found (pre-fix):** This block had `match_about_blank` absent entirely. While Chrome MV3 defaults absent to `false`, the key was invisible to reviewers and would not be caught by test coverage. Fixed below.

---

## 2. shouldInjectInCurrentFrame() Code Analysis

File: `src/content/inject.js`, lines 675–706.

### Full logic walkthrough

```
shouldInjectInCurrentFrame():
  1. if (!window.VSC.DomUtils.inIframe())  →  return true   [top-level always injects]
  2. try {
       href = window.location.href
       if not http:// AND not https:// AND not file://  →  return false
     } catch (e) {
       return false   // sandboxed frame, cannot read location
     }
  3. try {
       void window.parent.document   // no throw = same-origin
       return false                  // same-origin parent: skip
     } catch (e) {
       if (e.name === 'SecurityError')  →  return true   // cross-origin player
       return false                                        // unexpected error: skip
     }
```

### How `about:blank` is blocked

When Chrome (hypothetically, despite `match_about_blank: false`) ran VSC in an `about:blank` frame:

- `window.location.href` returns the string `"about:blank"`.
- `"about:blank"` does **not** start with `"http://"`, `"https://"`, or `"file://"`.
- Therefore line 689 (`return false`) fires immediately.
- VSC skips `extension.initialize()`.

This is a second independent guard: even if the manifest let Chrome inject the script, the runtime URL check would block initialization.

The `SecurityError` catch is **not** the mechanism that blocks `about:blank`. It only fires for cross-origin parent access — and that path is never reached because the `http(s)://`/`file://` URL check on line 684–689 exits first for `"about:blank"`.

---

## 3. GIF File Fetcher iframe Analysis

File: `src/content/injector.js`, `setupFileGifFetcherProxy()` (lines 87–146).

The GIF file fetcher creates one hidden `<iframe>` only when `location.href.startsWith('file://')`:

```js
fetcherIframe = document.createElement('iframe');
fetcherIframe.src = chrome.runtime.getURL('src/gif-file-fetcher.html');
```

**Key facts:**

1. The iframe `src` is a `chrome-extension://` URL, **not** `about:blank`. It loads `src/gif-file-fetcher.html` from the extension package.
2. No `sandbox` attribute is set on this iframe. It is a full-capability chrome-extension:// frame that can do XHR to `file://` URLs.
3. This iframe does **not** generate "Blocked script execution in 'about:blank'" messages because its URL is `chrome-extension://...`, not `about:blank`.
4. The iframe is only created on `file://` pages. It never appears on YouTube or any http/https page.

**Conclusion:** The GIF file fetcher iframe is not a source of about:blank console errors.

---

## 4. The Three Independent Proofs

### Proof 1 — Manifest layer (Chrome enforcement)

All three `content_scripts` blocks now explicitly declare `match_about_blank: false`. Chrome's extension injection engine will not inject any VSC script into an `about:blank` frame regardless of what the scripts themselves do. This is enforced by the browser before any JavaScript runs.

### Proof 2 — Runtime URL guard (shouldInjectInCurrentFrame)

Even if Chrome injected VSC into an `about:blank` frame, `shouldInjectInCurrentFrame()` reads `window.location.href` → `"about:blank"` → fails the `http(s)://`/`file://` prefix check → returns `false` → `extension.initialize()` is never called. VSC would be injected but silently dormant.

### Proof 3 — Test suite coverage

The regression test at `tests/unit/manifest/permissions.test.js` asserts `match_about_blank === false` on **every** `content_scripts` block (added by this fix). The test at `tests/unit/content/inject-frame-guard.test.js` asserts `shouldInjectInCurrentFrame()` returns `false` for a same-origin sub-frame and for a non-SecurityError parent access. Together they make any future regression detectable by `npm test`.

---

## 5. What the "Blocked script execution in 'about:blank'" Log Entries Mean

The `www.youtube.com-1793580955578.log` contains repeated entries of:

```
about:blank:1 Blocked script execution in 'about:blank' because the document's frame is
sandboxed and the 'allow-scripts' permission is not set.
```

These appear in three clusters: lines 6–19 (page load), around line 228, and lines 23600–23619 (late in the session). All entries originate from `VM11:1346` or `about:blank:1`. `VM11` is a Chrome DevTools virtual machine identifier for YouTube's own sandboxed iframes. The call stacks show YouTube's own `m=base` and `m=late,app` bundles — not VSC code.

**VSC is not creating these sandboxed `about:blank` frames.** They are YouTube's own internal sandboxed iframes (e.g., ad slots, embedded players). The "Blocked script execution" message is Chrome telling YouTube (not VSC) that a script tried to run in a sandboxed frame without `allow-scripts`.

---

## 6. Gap Found and Fixed

### The Gap

The Netflix `content_scripts` block (Block 2, `matches: ["https://www.netflix.com/*"]`) had **no `match_about_blank` key at all**. The existing test in `permissions.test.js` only checked Block 0 (the ISOLATED world injector). Block 2 was entirely uncovered.

While Chrome's default for absent `match_about_blank` is `false`, the absence was invisible to reviewers and future agents. If a future agent copied this block and added a new one, they might not know the field needs to be set.

### TDD Fix Applied

**RED** — Added test to `tests/unit/manifest/permissions.test.js`:

```js
runner.test('all content_scripts blocks explicitly set match_about_blank:false (no block may inject into about:blank)', () => {
  const contentScripts = manifest.content_scripts ?? [];
  for (const cs of contentScripts) {
    assert.equal(cs.match_about_blank, false, ...);
  }
});
```

The test failed on the Netflix block (Block 2): `match_about_blank` was `undefined`, not `false`.

**Fix** — Added `"match_about_blank": false` to Block 2 in `manifest.json`.

**GREEN** — Test passes. Full suite: 531 tests, 530 passing, 1 pre-existing `[EXPECTED RED]` sentinel (wheel passive listener — unrelated).

---

## 7. Files Changed

- `manifest.json` — added `"match_about_blank": false` to the Netflix `content_scripts` block (Block 2).
- `tests/unit/manifest/permissions.test.js` — added test asserting all blocks explicitly declare `match_about_blank: false`.
