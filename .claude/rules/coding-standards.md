---
paths:
  - "src/**/*.js"
  - "tests/**/*.js"
---

# Coding Standards — Video Speed Controller

## Module system

- **No ES `import`/`export` in `src/` files.** All `src/` modules are injected as plain `<script>` tags by `injector.js` and communicate via `window.VSC.*` globals. Using `import`/`export` breaks MV3 content script injection (see ADR-0001).
- **Every module that registers on `window.VSC` must guard against double-load:**
  ```js
  window.VSC = window.VSC || {};
  if (!window.VSC.MyClass) {
    window.VSC.MyClass = class MyClass { ... };
  }
  ```
- **Never capture `window.VSC.*` references at top-level parse time.** Read them lazily inside functions. The dependency may not be registered yet when the script is parsed.
- **Load order is load-bearing.** If you add a new module to `injector.js`, place it after every global it reads and before every global that reads it. Run `node scripts/check-structure.mjs` to verify.

## Runtime worlds — which file belongs where

| World | Files | Has `chrome.*` | Has `window.VSC` |
|---|---|---|---|
| Isolated world | `src/content/injector.js` | yes | no |
| Page main world | All other `src/` files | no | yes |
| Service worker | `src/background.js` | yes | no |

Never call `chrome.*` from page main world files. Never read `window.VSC` from `injector.js` or `background.js`.

## Style

- 2-space indentation
- Single quotes, semicolons required, trailing commas (`es5` style), max line width 100
- `const` over `let`; never `var`
- Strict equality: `===` and `!==` only
- Always use braces on `if`/`else`/`for`/`while` blocks (`curly` rule)
- Arrow functions for callbacks (`prefer-arrow-callback`)
- Template literals over string concatenation (`prefer-template`)
- Prefix intentionally unused function parameters with `_` to satisfy `no-unused-vars`

Run `npm run lint:fix && npm run format` to auto-apply Prettier and ESLint fixes locally. In CI, use `npm run build` (which runs fix + format + tests).

## Naming

- Filenames: kebab-case, domain-based — `video-controller.js`, `youtube-handler.js`, `gif-frame-engine.js`
- Classes: PascalCase — `GifController`, `VideoSpeedConfig`, `SiteHandlerManager`
- Use the canonical terms from `CONTEXT.md` in all identifiers, comments, and commit messages. The `_Avoid:` synonyms in `CONTEXT.md` must not appear in new code (e.g., use `keyBindings` not `shortcuts`, `controller` not `overlay`, `mediaElement` not `videoElement`)

## `src/lib/` — untouchable

`src/lib/gifuct-js.min.js` is vendored. **Never modify or replace it** without thorough real-Chrome GIF rendering validation. It is not on npm. Any change risks silent frame-parsing failures (P1).

## Testing

- Test runner: custom Node + JSDOM via `npm test`. Not Jest CLI — do not use Jest-specific APIs.
- Unit tests: `tests/unit/**/*.test.js` mirroring the `src/` path (e.g., `src/core/gif-controller.js` → `tests/unit/core/gif-controller.test.js`)
- Integration tests: `tests/integration/**/*.test.js`
- Chrome APIs are mocked in `tests/helpers/chrome-mock.js`. Use existing mocks; do not add new `chrome.*` stubs without updating the mock helper.
- `tests/run-tests.js` uses an **explicit file list**. New test files in new subdirectories must be registered there or they will be silently ignored (T08).
- Tests must be deterministic. No `setTimeout` delays, no network calls, no filesystem reads in unit tests.

### Test quality requirements (enforced in PR checklist)

1. **Independent expected values.** Never assert `expect(fn(x)).toBe(fn(x))` or compute the expected value the same way the implementation does. Use known-good literals or worked examples from the spec.
2. **Red-before-green.** At least one test must fail without the implementation change.
3. **Seam discipline.** Test at the module's public interface. Do not assert on private methods, internal state, or implementation details that a refactor would change without changing behavior.
4. **Untestable surfaces must be declared.** If JSDOM cannot exercise a behavior (P7 canvas compositing, P13 origin checks), declare it explicitly in the PR and cite the registry entry. "Untestable" requires evidence — see `docs/ai_generated/protected-behaviors/registry.md` and `docs/ai_generated/structure-initiative/06-tests/E-tests.md`.

## Protected behaviors pre-check

Before editing any `src/` file, run:

```sh
node scripts/check-structure.mjs && node scripts/check-seams.mjs
```

Then check `docs/ai_generated/protected-behaviors/registry.md` for any P-number whose code location is in the file you are about to change. Do not proceed until you have read every relevant P-row.
