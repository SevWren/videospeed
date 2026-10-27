---
area: site-handlers
module-card: true
base-sha: e904370863d69a2b5d853af62745141953c4860d
---

# site-handlers — per-site behavior adapters

**Mission**: Provide thin per-site overrides for element detection and video filtering so the core
extension can adapt to site-specific DOM structures without branching in core code.

---

## Files

| File | LOC | Role |
|------|-----|------|
| `src/site-handlers/base-handler.js` | 96 | Base class `BaseSiteHandler`; defines the `detectSpecialVideos` / `shouldIgnoreVideo` interface |
| `src/site-handlers/index.js` | 128 | `SiteHandlerManager`: registers all handlers, routes `detectSpecialVideos` calls; exposes `window.VSC.siteHandlerManager` |
| `src/site-handlers/youtube-handler.js` | 120 | YouTube-specific detection and filtering |
| `src/site-handlers/netflix-handler.js` | 100 | Netflix-specific detection; also injects `scripts/netflix.js` into the page via `window.postMessage` |
| `src/site-handlers/amazon-handler.js` | 69 | Amazon Prime Video-specific filtering |
| `src/site-handlers/apple-handler.js` | 60 | Apple TV+-specific detection |
| `src/site-handlers/facebook-handler.js` | 142 | Facebook Watch-specific detection |
| `src/site-handlers/scripts/netflix.js` | 7 | Tiny Netflix player bridge (injected at runtime, not in injector load order) |

---

## Key invariants (protected behaviors)

| PB | Rule | Code location |
|----|------|--------------|
| P12 | Each site handler must register itself via `SiteHandlerManager.register()` inside `index.js`; `check:structure` validates handler count against SEAM-INDEX | `site-handlers/index.js` |

---

## Seam: what this area exposes / consumes

**Exposes:**
- `window.VSC.BaseSiteHandler` — base class consumed by all handler subclasses
- `window.VSC.NetflixHandler`, `YouTubeHandler`, `FacebookHandler`, `AmazonHandler`, `AppleHandler` — consumed by `index.js`
- `window.VSC.siteHandlerManager` — consumed by `inject.js:29`

**Consumes:**
- `window.VSC.Constants`, `window.VSC.logger`
- `window.VSC.BaseSiteHandler` (each handler extends it)

**Note on Netflix:** `netflix-handler.js:44` sends `window.postMessage` to Netflix's own player —
this is a site-specific adapter message, NOT a VSC protocol crossing. Do not confuse it with the
VSC IPC event channels.

---

## Common D-tasks landing here

| Task | Entry point |
|------|------------|
| D2 — video not detected on a specific site | Relevant `*-handler.js::shouldIgnoreVideo` or `detectSpecialVideos` |
| D11 — Firefox porting | `netflix-handler.js` (uses `window.postMessage` which is cross-browser safe); check `chrome.*` calls in handlers |

---

## Pattern for adding a new site handler

1. Create `src/site-handlers/<site>-handler.js` extending `BaseSiteHandler`.
2. Register it in `src/site-handlers/index.js`.
3. Add a seam card under `docs/ai_generated/seams/<site>-handler.seam.md` (required by `check:seams`).
4. Add glob coverage is automatic via `manifest.json` WAR pattern `src/site-handlers/*.js`.

---

## Notes

- `src/site-handlers/scripts/netflix.js` (7 LOC) is conditionally injected at runtime by
  `netflix-handler.js`, NOT by `injector.js`. It is absent from the injector module list.
  Its `window.VSC` registrations (if any) are not verified in the base architecture pass.
- All five handler files are loaded via the WAR glob `src/site-handlers/*.js` and injected
  sequentially by `injector.js` after `base-handler.js`.
