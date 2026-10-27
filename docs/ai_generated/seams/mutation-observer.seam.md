---
team: Team-L
agent: L3 Seam Card
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
---

# mutation-observer.seam.md

**File**: `src/observers/mutation-observer.js`
**World**: page-main (injected at position 9 in load order)
**window.VSC registration**: `window.VSC.VideoMutationObserver` (line 351)
**LOC**: 352

---

## window.VSC Depends On

| Global | Used for |
|--------|----------|
| `window.VSC.GifObserver.isGifSrc` | Detect GIF src-attribute changes (line 112, 238) |
| `window.VSC.GifObserver.isGifElement` | Classify added IMG nodes as GIF (line ~109) |
| `window.VSC.DomUtils` | Utilities used in video node processing |
| `window.VSC.logger` | Structured logging |

---

## Exposes

### `VideoMutationObserver` constructor

```
new VideoMutationObserver(
  config,         // VideoSpeedConfig instance
  onVideoFound,   // callback(videoEl)
  onVideoRemoved, // callback(videoEl)
  mediaObserver,  // MediaElementObserver instance
  onGifFound,     // callback(img, parent) — optional
  onGifRemoved    // callback(img) — optional
)
```

The 4-argument form (without GIF callbacks) still works for backward compatibility.

| Method | Called by | Purpose |
|--------|-----------|---------|
| `start(document)` | `inject.js` | Attaches `MutationObserver` with `rIC` (2s timeout) processing |
| `stop()` | `inject.js:cleanup()` | Disconnects main observer + all shadow observers |
| `checkForVideoAndShadowRoot(node, parent, added)` | `processChildListMutation()` | Core routing: dispatches to `onVideoFound`/`onGifFound`/`onVideoRemoved`/`onGifRemoved` |
| `processAttributeMutation(mutation)` | `processMutations()` | Handles `src` changes on IMG elements |

---

## Protected Behaviors Implemented

| PB | Behavior | Key location |
|----|----------|--------------|
| P2 | IMG removal branch skips `onGifRemoved` if `node.vscGifIgnore && !srcChangedSinceTeardown` — prevents tearing down a controller that just completed canvas-replacement | lines 106–107, 239–240 |
| P4 (read side) | IMG removal skips `onGifRemoved` if `node.gifController.pending === true` (sentinel phase) | line 214, 247 |
| P6 (guard) | IMG removal skips `onGifRemoved` if `node.gifController._canvas` is still in the DOM — canvas alive means intentional canvas-replacement removal, not a real GIF disappearance | lines 250–251 |

### Canvas-Replacement Teardown Guard (P6)

The key invariant in the IMG removal branch:

```
If img was removed from DOM AND:
  img.gifController exists (real, not sentinel)
  AND img.gifController._canvas exists
  AND document.body.contains(gif-controller._canvas)
→ SKIP onGifRemoved (canvas replacement in progress; img removal is intentional)

Otherwise (canvas gone too, or no controller, or sentinel):
  → call onGifRemoved(node)
```

This guard was added in commit `9a5de5e` to fix: MutationObserver fires for `<img>` removal
during canvas-replacement (rIC delay up to 2s). By the time it fires, `img.gifController` is
a real object with `.remove()`. Without the guard, the observer tears down the new controller.
(HANDOFF.md §4.6 Root cause 1)

---

## shadowObservers (Map)

Changed from `Set` to `Map` (`shadowRoot → observer instance`) in this session so that
`stop()` can call `obs.disconnect()` on each shadow observer. Previously, `stop()` could
not disconnect shadow observers, causing leaked observers after extension cleanup.

Key references: `constructor:17` (initialization), `stop():341–344` (iteration + disconnect).

---

## Common Tasks

- **D12: Debug unexpected GIF teardown** — look at `checkForVideoAndShadowRoot()` IMG removal branch; verify the canvas-alive guard is not being bypassed
- **D9: DOM observation not catching a new GIF** — check `processAttributeMutation()` for src-change handling; check `_vscTeardownSrc` and `vscGifIgnore` logic

---

## Gotchas

- **rIC delay is up to 2 seconds.** The `MutationObserver` callback is deferred via `requestIdleCallback(..., { timeout: 2000 })`. GIF canvas-replacement removes the `<img>` from the DOM synchronously, but the observer may not fire until 2 seconds later. The canvas-alive guard (P6) is specifically designed for this window. Reducing the rIC timeout may reduce its effectiveness.

- **`vscGifIgnore` + `_vscTeardownSrc` interaction.** `processAttributeMutation()` uses `srcChangedSinceTeardown` to distinguish "same src, still ignoring" from "new src, re-attach allowed". Do not simplify to only `vscGifIgnore` — that breaks GIF re-attach after a src change.

- **`shadowObservers` is a Map, not a Set.** Code that iterates or checks `shadowObservers` should use Map methods (`.has`, `.get`, `.set`, `.forEach`), not Set methods (`.add`). This was changed during the session; any code using old Set APIs will fail silently.
