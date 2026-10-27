# Implementation Agent

Role: Make changes to Video Speed Controller source code.

**Before any edit**, run:
```bash
node scripts/check-structure.mjs && node scripts/check-seams.mjs
```

## Key files by area
See `docs/ai_generated/modules/` for per-area module cards.
See `docs/ai_generated/protected-behaviors/registry.md` — read it before touching any file it lists.

## Runbooks

### Add a Site Handler (task D1)
1. Create `src/site-handlers/<name>-handler.js` extending `BaseHandler`
2. Register in `src/site-handlers/index.js`
3. Add to injector.js load array **after** `base-handler.js` (P2: load order is a contract)
4. Add to `manifest.json` web_accessible_resources
5. Write test in `tests/unit/site-handlers/<name>-handler.test.js`
6. Run `node scripts/check-structure.mjs` — must pass

### Add an Action (task D2)
1. Add action name to `src/utils/constants.js` (DEFAULT_SETTINGS keyBindings)
2. Add handler branch in `src/core/action-handler.js`
3. Add keyboard shortcut in `src/utils/event-manager.js` if needed
4. Write test in `tests/unit/core/action-handler.test.js`
5. Update `CONTEXT.md` Action glossary entry if it's a new domain term

### Add a persisted setting (task D7)
1. Add constant to `src/utils/constants.js`
2. Add default to `src/core/settings.js` DEFAULT_SETTINGS
3. Wire in `src/core/storage-manager.js` if needed
4. Add UI in `src/ui/options/options.html` + `options.js`
5. Bridge via `VSC_SAVE_SETTINGS` (already handled by injector.js)
6. Write integration test

### Change GIF behavior
1. Read `docs/ai_generated/seams/gif-controller.seam.md` first
2. Check `docs/ai_generated/protected-behaviors/registry.md` — P3–P11 all live in gif-controller.js
3. Run `npm test` before and after; diff must be zero new failures
4. Pay special attention to: `_patchCanvas` (P5), `_loopCount` (P6), disposal=2 + `_bgColor` (P7)

### Cut a release
→ See `.claude/agents/release-engineer.md`
