# Repository Guidelines

## Project Overview

Video Speed Controller is a Chrome WebExtension (Manifest V3) that lets users control HTML5 video/audio playback speed via keyboard shortcuts. It injects a floating UI controller into web pages and supports site-specific handlers for YouTube, Netflix, Amazon, Apple, and Facebook.

- **Version**: 0.9.1 (manifest) / 0.8.0 (package.json)
- **Language**: JavaScript ES modules (`type: module`)
- **License**: MIT

## Project Structure & Module Organization

Core extension code lives in `src/`:
- `src/core/` — playback state, actions, settings, and storage (`video-controller.js`, `action-handler.js`, `settings.js`, `storage-manager.js`)
- `src/content/` — content script entry point (`injector.js`, `inject.js`)
- `src/background.js` — service worker (MV3)
- `src/module-loader.js` — extension runtime wiring
- `src/ui/` — controller UI (`controls.js`, `shadow-dom.js`, `drag-handler.js`), popup, and options page
- `src/observers/` — media and DOM observers (`media-observer.js`, `mutation-observer.js`)
- `src/site-handlers/` — per-site behavior: `youtube-handler.js`, `netflix-handler.js`, `amazon-handler.js`, `apple-handler.js`, `facebook-handler.js`, `base-handler.js`
- `src/utils/` — shared utilities (`constants.js`, `debug-helper.js`, `dom-utils.js`, `event-manager.js`, `logger.js`)
- `src/styles/` — `inject.css`, `shadow.css`
- `src/assets/icons/` — packaged extension icons

Tests live under `tests/` with `unit/`, `integration/`, `e2e/`, shared helpers in `tests/helpers/`, and fixtures in `tests/fixtures/`.

AI-generated docs live under `docs/ai_generated/`.

## Build, Test, and Development Commands

- `npm test` — run unit + integration suites via `tests/run-tests.js`
- `npm run test:unit` — unit tests only
- `npm run test:integration` — integration tests only
- `npm run test:e2e` — Puppeteer end-to-end checks
- `npm run lint` — ESLint on `src/**/*.js` and `tests/**/*.js`
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier on JS files
- `npm run build` — full local gate: `lint:fix` → `format` → `test`
- `npm run serve` — local static server on port `8000`
- `npm run zip` — package extension to `dist/videospeed.zip`

## Coding Style & Naming Conventions

- ES modules with 2-space indentation
- Prettier: single quotes, semicolons, trailing commas (`es5`), max line width `100`
- ESLint enforces: `prefer-const`, `no-var`, `eqeqeq`, `curly`, single quotes, `no-eval`, `prefer-template`, `prefer-arrow-callback`
- Prefix intentionally unused args with `_` to satisfy `no-unused-vars`
- Descriptive, domain-based filenames: `video-controller.js`, `youtube-handler.js`
- Keep tests mirrored by feature path

## Testing Guidelines

- Primary test flow is a custom Node + JSDOM runner (not Jest CLI), started with `npm test`
- Add unit tests in `tests/unit/**` and integration tests in `tests/integration/**` named `*.test.js`
- Keep tests deterministic; isolate Chrome API behavior with existing mocks in `tests/helpers/`
- Run `npm run test:e2e` for UI/runtime behavior changes

## Commit & Pull Request Guidelines

Favor concise, imperative commits with prefixes: `fix:`, `chore:`, or short action phrases (e.g., `rework test runner`).

Before opening a PR:
- Run `npm run build`
- Describe behavior change and impacted sites/modules
- Link related issue(s) when applicable
- Add screenshots or short recordings for popup/options/controller UI changes

## Agent Skills

### Issue tracker

Issues tracked in GitHub Issues via the `gh` CLI; external PRs are not a triage surface. See `docs/ai_generated/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/ai_generated/triage-labels.md`.

### Domain docs

Single-context repo: `CONTEXT.md` at root, ADRs in `docs/ai_generated/adr/`. See `docs/ai_generated/domain.md`.
