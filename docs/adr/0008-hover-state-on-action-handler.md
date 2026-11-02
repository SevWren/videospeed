# Store hover target state on ActionHandler, not VideoSpeedConfig

`ActionHandler._hoverTargetController` holds the Controller div currently designated as the Hover Target. The field lives on `ActionHandler`, not on `VideoSpeedConfig` (the settings/media-registry singleton).

## Why this is surprising

`VideoSpeedConfig` already owns all other cross-controller state: the media element registry (`mediaElements`), the GIF element set (`gifElements`), and every persisted setting. A reader expecting consistency would put hover state there too. Instead, hover state is local to the object that consumes it — `ActionHandler.runAction()` reads `this._hoverTargetController` directly without going through config.

## Trade-off

- **Hover state on `ActionHandler` (chosen)**: Locality. The only code that reads `_hoverTargetController` is `runAction()` and `runGifAction()`, both on `ActionHandler`. Keeping the field where it is consumed avoids a round-trip through `VideoSpeedConfig` and prevents config from acquiring knowledge of the dispatch mechanism.
- **Hover state on `VideoSpeedConfig`**: Would centralise all cross-controller state in one place, but would couple config to the hover dispatch model — config would need to know that hover targeting is a runtime dispatch concern, not a persisted preference.

## Consequences

Any new dispatch path that needs to respect hover targeting must read from `ActionHandler`, not from `config`. Controllers (`VideoController`, `GifController`) call `actionHandler.setHoverTarget()` directly; they do not write to config.
