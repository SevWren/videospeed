---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# gif-observer.seam.md

**File**: `src/observers/gif-observer.js`
**World**: page-main (injected at position 24 in load order, before `gif-controller.js`)
**window.VSC registration**: `window.VSC.GifObserver` (line 56), `window.VSC.gifFetchFailCache` (line 10)
**LOC**: 57

---

## window.VSC Depends On

| Global | Used for |
|--------|----------|
| `window.VSC.Constants.GIF_MIN_SIZE_PX` | Minimum dimension (20 px) for `detectGifsInDOM` size filter |

---

## Exposes

### `window.VSC.GifObserver` (object with 3 functions)

| Function | Called by | Behavior |
|----------|-----------|----------|
| `isGifSrc(src)` | `gif-controller.js:59`, `mutation-observer.js:112,238` | Returns `true` if `src` is a GIF: matches `data:image/gif` prefix OR regex `/\.gif([/?#]|$)/i`. Does NOT match blob: URLs (known limitation). |
| `isGifElement(element)` | `gif-controller.js:create()`, `mutation-observer.js` | Returns `true` if `element.tagName === 'IMG'` AND (`isGifSrc(element.src)` OR `isGifSrc(element.currentSrc)`). `currentSrc` check handles `<picture><source>` elements where browser chose WebP but `.src` still ends in .gif. |
| `detectGifsInDOM(doc)` | `inject.js:deferredMediaScan`, `action-handler.js` | Returns array of `<img>` elements that: (a) have no `gifController` or `vscGifIgnore`, (b) pass `isGifElement`, (c) if natural dimensions known, both width AND height >= `GIF_MIN_SIZE_PX` (20 px). If natural dimensions are both 0 (not yet loaded), passes through. |

### `window.VSC.gifFetchFailCache` (Map)

Per-origin GIF fetch failure cache. Key: URL origin string (or null for file:// — not used as cache key). Value: `{ permanent: bool, until: timestamp }`.

Initialized here but written/read by `gif-controller.js`.

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P2 (read side) | `detectGifsInDOM` excludes elements with `img.vscGifIgnore` (line 41) — prevents re-scanning elements being torn down | line 41 |
| P14 (owns cache) | `gifFetchFailCache` — file:// URLs leave `origin = null` so their entries are never put in the cache (prevents one failed local GIF from blocking all local GIFs) | `gif-controller.js:82` (reader); `gif-observer.js:10` (initializer) |

---

## Common Tasks

- **D1: GIF not detected on a page** — check `isGifSrc` regex against the actual `src`/`currentSrc` value; check `naturalWidth`/`naturalHeight` filter in `detectGifsInDOM`; check `vscGifIgnore` flag
- **D3: Blob-URL GIFs not detected** — known limitation; `isGifSrc` does not handle `blob:` URLs (documented in file comment at line 33–36)

---

## Gotchas

- **`detectGifsInDOM` requires BOTH dimensions ≥ GIF_MIN_SIZE_PX**, not OR. An image with `naturalWidth=25` and `naturalHeight=15` is rejected. A `naturalWidth=0, naturalHeight=0` image (not yet loaded) passes through to let the caller handle lazy-loaded detection. This prevents filtering out tiny spinners while still allowing unloaded images. (HANDOFF.md §6.6)

- **`currentSrc` vs `src` for `<picture>` elements.** `isGifElement` checks both. Some `<picture>` elements serve WebP via `<source type="image/webp">` but the `<img src>` still has the `.gif` extension. `isGifSrc(element.src)` catches this case. `gif-controller.js` similarly prefers `.src` over `.currentSrc` when resolving the actual URL to fetch.

- **`isGifSrc` regex uses `[/?#]` word boundary**, not `\b`, to avoid matching `.gifx` filenames. The pattern `/\.gif([/?#]|$)/i` correctly handles query strings (`?v=2`), fragments (`#section`), and directory-like paths (`/gif/`). Do not simplify to `/\.gif/i`.
