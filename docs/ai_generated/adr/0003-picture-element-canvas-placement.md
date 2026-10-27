# Hide `<img>` rather than remove it when replacing a GIF inside a `<picture>` element

When a GIF `<img>` is a child of a `<picture>` element, canvas replacement hides the `<img>` with CSS (`visibility: hidden; position: absolute; width: 0; height: 0; pointer-events: none`) instead of removing it from the DOM, and inserts the replacement `<canvas>` before the `<picture>` element rather than in the `<img>`'s original slot. This preserves the `<picture>` element's `<source>` / `<img>` sibling relationship, which the browser requires for responsive source selection to remain valid. Removing the `<img>` would collapse the `<picture>`'s fallback chain and could break layout on the surrounding page.

## Considered Options

- **Remove `<img>` and insert canvas in its place** — matches the non-`<picture>` canvas replacement path and is simpler, but destroys the `<picture>` element's source-fallback semantics and may leave dangling `<source>` siblings.
- **Hide `<img>` and insert canvas before `<picture>`** — more complex teardown (must restore `cssText` on `remove()`), but keeps the original DOM hierarchy intact and avoids any layout or accessibility regression in the `<picture>` context.

## Consequences

Teardown (`GifController.remove()`) must undo the CSS hiding by restoring the original `style.cssText` captured before the mutation, and must remove the canvas from its position before the `<picture>`. The `_inPicture` flag on `GifController` distinguishes this path from the standard removal path.
