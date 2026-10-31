# Contributing

Video Speed Controller is an open source Chrome WebExtension (MV3) licensed under the MIT license. Contributions are welcome.

## Get started

1. Fork this repo and clone your fork
2. Create a branch from `main-copy` (the active development branch):
   ```sh
   git checkout -b fix/123-describe-your-change
   ```
3. Read `AGENTS.md` — it is the cold-start entry point for this repo and covers the two-world architecture, protected behaviors, and coding standards
4. Make your changes
5. Run the validation gate before pushing (see below)
6. Open a pull request and fill out the PR template

## Required reading before you change `src/`

| File | Why |
|---|---|
| `CLAUDE.md` | Build commands, coding style, test conventions |
| `CONTEXT.md` | Canonical vocabulary — use these terms in all names, comments, and PR descriptions |
| `docs/ai_generated/protected-behaviors/registry.md` | 14 behaviors that must not break — check every row that covers a file you touched |

Also check: if `FORENSIC_REPORT.md` exists at the repo root, read it before touching any `src/` file. It documents known defects with exact code locations.

## Validation gate

Run this before every PR:

```sh
npm run build
```

This runs lint (with auto-fix), Prettier formatting, and the full unit + integration test suite.

**Also required in specific cases:**

```sh
# When touching src/core/gif-controller.js, src/core/gif-frame-engine.js,
# or src/observers/gif-observer.js:
npm run test:gif

# When changing popup, options page, or Controller overlay UI:
npm run test:e2e
```

**Pre-edit structure check** — run before any `src/` change:

```sh
node scripts/check-structure.mjs && node scripts/check-seams.mjs
```

## Manual browser verification

Load the extension unpacked in Chrome/Chromium before opening a PR for any change that affects observable browser behavior:

1. `Settings > Extensions > Manage Extensions` — enable Developer mode
2. Click **Load unpacked** and select the repo root folder
3. Confirm `src/lib/gifuct-js.min.js` is present — if absent, GIF decoding silently fails

Manual verification is required for changes to the Controller overlay, popup, options page, Key Bindings behavior, or GIF speed control. It is not required for pure logic changes fully covered by unit tests.

## PR standards

Fill out the PR template completely. The template enforces:

- Which test commands were run
- Which protected behaviors (P1–P14) were checked, grouped by file area
- Test quality: independent expected values, red-before-green evidence, seam discipline
- Domain vocabulary from `CONTEXT.md`
- No changes to `src/lib/`
- Security gates for P13 and P14
- Documentation update triggers

### Issue requirements

**Bug fixes** — reference or create a GitHub issue before opening the PR. Minimum issue content: title, one-sentence description of the bug, affected file and function.

**Feature additions** (new capability, new Site Handler, new Action, new persisted setting) — create a GitHub issue and wait for human acknowledgment before writing any implementation code. The issue must describe what the feature does, why it is needed, which files will be touched, and any compatibility constraints.

**Refactors, docs, and test-only changes** — reference or create a minimal issue; no acknowledgment wait required.

### Handoff content

Do not commit a `HANDOFF.md` file. Session context and handoff information belongs in the PR description body, not a committed file.

## Testing

Run the full suite:

```sh
npm test
```

GIF-specific integration tests (required when touching GIF files):

```sh
npm run test:gif
```

### Manual GIF testing

To verify GIF speed control end-to-end:

1. Load a GIF-heavy page (giphy.com, tenor.com, reddit.com)
2. The extension replaces `<img>` GIF elements with `<canvas>` elements — confirm the speed overlay appears
3. Test controls on a GIF overlay:
   - **Z** — slower
   - **C** — faster
   - **S** — reset to 1.0x
   - **Mouse wheel** on overlay — adjust speed
4. Note: the seek Key Bindings (**E / W / R / T**) are video-only and have no effect on GIFs
5. Known intentional exclusions (out of scope — do not file bugs):
   - `blob:` URL GIFs
   - GIFs served as MP4 (e.g., Imgur redirects)
   - SVG `<image>` elements
6. To disable GIF control for a session, turn off `controlGifs` in the extension options page

### Test quality requirements

Tests must satisfy all three of these before a PR can be opened:

1. **Independent expected values** — assert against known-good literals, not values computed the same way as the implementation
2. **Red-before-green** — at least one test must fail without the code change
3. **Seam discipline** — test at the module's public interface, not against private methods or internal state

If a surface is untestable in JSDOM (e.g., P7 canvas pixel compositing, P13 origin validation), declare it explicitly in the PR and cite the entry in `docs/ai_generated/protected-behaviors/registry.md` or `docs/ai_generated/structure-initiative/06-tests/E-tests.md`.

## Coding standards

Full standards are in `.claude/rules/coding-standards.md`. Key rules:

- No ES `import`/`export` in `src/` — modules communicate via `window.VSC.*` globals (ADR-0001)
- Never call `chrome.*` from page main world files (`src/core/`, `src/observers/`, `src/ui/`, `src/site-handlers/`, `src/utils/`, `src/content/inject.js`)
- Never modify `src/lib/gifuct-js.min.js` — it is vendored and untouchable without thorough real-Chrome testing (P1)
- Use `CONTEXT.md` vocabulary in all names, comments, and PR descriptions

## Commit format

Favor concise, imperative commits with prefixes: `fix:`, `feat:`, `chore:`, `docs:`, `test:`, or short action phrases.

## Pre-commit hooks

Install [pre-commit](https://pre-commit.com/) to run formatting and basic checks automatically on every commit:

```sh
pre-commit install
```

Run manually at any time:

```sh
pre-commit run --all-files
```

## Scope boundaries (wontfix)

The following are intentionally out of scope. Do not open PRs implementing them without first opening an issue and receiving explicit acknowledgment:

- `blob:` URL GIF support
- SVG `<image>` element speed control
- GIFs served as MP4 (Imgur-style redirects)
- Firefox / non-Chromium browser support (no MV3→MV2 shim exists)
