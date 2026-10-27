---
area: observers
module-card: true
base-sha: e904370863d69a2b5d853af62745141953c4860d
---

# observers — DOM and media scanning

**Mission**: Detect media elements and GIF images in the page DOM, watch for dynamic additions
and src-attribute changes, and notify the core orchestrator (`inject.js`) when elements appear
or disappear.

---

## Files

| File | LOC | Role |
|------|-----|------|
| `src/observers/mutation-observer.js` | 351 | MEDIUM — `VideoMutationObserver`: watches DOM mutations for new video/audio/img elements and shadow roots; routes GIF src-attribute changes to gif-observer utilities |
| `src/observers/media-observer.js` | 290 | MEDIUM — `MediaElementObserver`: scans for video/audio elements and GIFs; size/visibility gating heuristics; `shouldStartHidden` logic |
| `src/observers/gif-observer.js` | 57 | SHALLOW — three pure detection utilities: `isGifSrc`, `isGifElement`, `detectGifsInDOM`; owns `window.VSC.gifFetchFailCache` Map |

---

## Key invariants (protected behaviors)

| PB | Rule | Code location |
|----|------|--------------|
| P2 | `img.vscGifIgnore` and `img._vscTeardownSrc` must be checked before treating a src-change as a new GIF attachment target; gif-observer utilities are the canonical detection gate | `gif-observer.js::isGifElement`, `mutation-observer.js` GIF src-change path |
| P5 | `vscGifIgnore` + `_vscTeardownSrc` interaction: if `_vscTeardownSrc === img.src`, the src did not actually change — do not re-attach | `mutation-observer.js` attribute mutation handler |
| P12 | `mutation-observer.js` must continue scanning shadow roots recursively so that video/GIF elements inside shadow DOM are discovered | `mutation-observer.js` shadow root tracking |

---

## Seam: what this area exposes / consumes

**Exposes (via `window.VSC.*`):**
- `window.VSC.VideoMutationObserver` — consumed by `inject.js:30`
- `window.VSC.MediaElementObserver` — consumed by `inject.js:31`
- `window.VSC.GifObserver` (3 functions) — consumed by `gif-controller.js:59`, `mutation-observer.js:112,238`
- `window.VSC.gifFetchFailCache` (Map) — consumed by `gif-controller.js:82,87,407,429`

**Consumes:**
- `window.VSC.Constants`, `window.VSC.logger`
- `window.VSC.GifObserver` (mutation-observer reads gif-observer utilities)

---

## Common D-tasks landing here

| Task | Entry point |
|------|------------|
| D2 — GIF not detected on lazy-loaded src swap | `mutation-observer.js` attribute mutation handler + P5 |
| D12 — mutation observer protected behavior judgment | `mutation-observer.js` + P2/P5/P12 invariants |

---

## Notes

- `gif-observer.js` is intentionally thin (57 LOC, 3 pure functions + 1 Map). Any detection
  heuristic changes (e.g., add `.webp` support) should go here first to keep `mutation-observer.js`
  and `media-observer.js` decoupled from detection logic.
- `media-observer.js` contains size/visibility gating heuristics (`shouldStartHidden`, minimum
  dimension checks) that may need site-specific overrides. Those overrides belong in site handlers,
  not in the observer itself.
