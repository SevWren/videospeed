---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# settings.seam.md

**File**: `src/core/settings.js`
**World**: page-main (injected at position 7 in load order)
**window.VSC registration**: `window.VSC.videoSpeedConfig` (instance, line 304), `window.VSC.VideoSpeedConfig` (class, line 307)
**LOC**: 310

---

## window.VSC Depends On

| Global | Used for |
|--------|----------|
| `window.VSC.Constants.DEFAULT_SETTINGS` | Default values for all settings keys |
| `window.VSC.StorageManager.waitForInjectedSettings()` | In page-world context: poll for `VSC_USER_SETTINGS` payload |
| `window.VSC.StorageManager.get()` | In extension-page context (options.js): read directly from `chrome.storage.sync` |
| `window.VSC.StorageManager.set()` | Write merged settings back to `chrome.storage.sync` (via `VSC_SAVE_SETTINGS` CustomEvent bridge) |
| `window.VSC.logger` | Structured logging |

---

## Exposes

| API | Called by | Purpose |
|-----|-----------|---------|
| `window.VSC.videoSpeedConfig` (instance) | `inject.js:37,495` | Shared settings instance; `config.settings` read by all modules |
| `VideoSpeedConfig.load()` | `inject.js:38` | Async: loads settings; in page world waits for `VSC_USER_SETTINGS`; in options page reads `chrome.storage` directly |
| `VideoSpeedConfig.save(newSettings)` | `inject.js`, `action-handler.js`, `gif-controller.js` | Merges `newSettings` into `this.settings` then calls `StorageManager.set(this.settings)` |
| `config.addGifElement(img)` | `gif-controller.js:create()` | Registers `<img>` in the GIF element Set |
| `config.removeGifElement(img)` | `gif-controller.js:remove()` | Removes `<img>` from the GIF element Set |
| `config.addMediaElement(el)` / `config.removeMediaElement(el)` | `video-controller.js` | Video/audio element registry |
| `config.settings.controlGifs` | `gif-controller.js:create()`, `inject.js:onGifFound` | Boolean: GIF speed control enabled |
| `config.settings.lastGifSpeed` | `gif-controller.js:constructor` | Persisted GIF playback speed |

---

## Settings Save Path

```
Page-world speed change (action-handler.js or gif-controller.js)
  ↓ calls config.save(newSettings)
  ↓ VideoSpeedConfig.save() → StorageManager.set(this.settings)
  ↓ StorageManager.set() → window.dispatchEvent(new CustomEvent('VSC_SAVE_SETTINGS', { detail: data }))
  ↓ injector.js:144 → chrome.storage.sync.set(event.detail)
  ↓ chrome.storage.sync persisted

On next page load:
  injector.js:injectUserSettings() → chrome.storage.sync.get(null)
  ↓ dispatches VSC_USER_SETTINGS → StorageManager._injectedSettings cached
  ↓ settings.load() → waitForInjectedSettings() → returns settings
```

Key file references:
- `StorageManager.set()`: `src/core/storage-manager.js:109` (dispatches `VSC_SAVE_SETTINGS`)
- `injector.js` VSC_SAVE_SETTINGS listener: `src/content/injector.js:144`
- `settings.load()`: `src/core/settings.js:21`
- `settings.save()`: `src/core/settings.js:91`

---

## Protected Behaviors

Settings.js itself does not directly implement any numbered PB, but:
- It owns `config.settings.controlGifs` (read by P2, P3, P4, P8 guard in `gif-controller.js`)
- It owns the element registries (`addGifElement`/`removeGifElement`) that P6 teardown must call
- `StorageManager.onChanged` (defined at `storage-manager.js:153`) has **zero callers** — live settings changes from the options page are not propagated to running content scripts

---

## Common Tasks

- **D5: Add a new settings key** — add default to `DEFAULT_SETTINGS` in `constants.js`, add to `save()` in settings.js, handle in `load()`, update options UI
- **D6: Settings not persisting after speed change** — trace from `config.save()` → `StorageManager.set()` → `VSC_SAVE_SETTINGS` CustomEvent → `injector.js:144` → `chrome.storage.sync.set()`

---

## Gotchas

- **Two load paths.** In the page world (normal tab), `load()` calls `StorageManager.waitForInjectedSettings()` — it polls `_injectedSettings` until `VSC_USER_SETTINGS` fires (5 s timeout). In extension pages (options.js), `chrome.storage` is available, so `StorageManager.get()` is called directly. Never assume `chrome.storage` is available from `settings.js` running in the page world.

- **`StorageManager.onChanged` is dead.** Options-page saves do NOT propagate to running tabs. A user changing settings in options must reload the page for the new settings to take effect. This is a known gap, not a bug to "fix" without understanding the full IPC chain.

- **Element registry mixes two concerns.** `VideoSpeedConfig` owns both settings persistence and the media/GIF element registry (`mediaElements`, `gifElements`). The element registry is used by `inject.js` for cleanup but is unrelated to key-binding storage. Do not confuse the two concerns when editing this file.
