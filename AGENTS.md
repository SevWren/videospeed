# Repository Guidelines

## Project Structure & Module Organization
Core extension code lives in `src/`:
- `src/core/` for playback state, actions, settings, and storage.
- `src/content/`, `src/background.js`, and `src/module-loader.js` for extension runtime wiring.
- `src/ui/` for controller UI, popup, and options page.
- `src/observers/` for media and DOM observers.
- `src/site-handlers/` for per-site behavior (YouTube, Netflix, etc.).
- `src/styles/` and `src/assets/icons/` for CSS and packaged assets.

Tests are under `tests/` with `unit/`, `integration/`, `e2e/`, plus shared helpers in `tests/helpers/` and fixtures in `tests/fixtures/`.

## Build, Test, and Development Commands
- `npm test`: run unit + integration suites via `tests/run-tests.js`.
- `npm run test:unit`: run only unit tests.
- `npm run test:integration`: run integration tests.
- `npm run test:e2e`: run Puppeteer end-to-end checks.
- `npm run lint`: run ESLint on `src/**/*.js` and `tests/**/*.js`.
- `npm run lint:fix`: auto-fix lint issues where possible.
- `npm run format`: run Prettier on JS files.
- `npm run build`: full local gate (`lint:fix`, `format`, `test`).
- `npm run serve`: start local static server on port `8000`.

## Coding Style & Naming Conventions
Use modern ES modules (`type: module`) and 2-space indentation. Prettier settings: single quotes, semicolons, trailing commas (`es5`), max line width `100`.
ESLint enforces `prefer-const`, `no-var`, `eqeqeq`, `curly`, and single quotes. Prefix intentionally unused args with `_` to satisfy `no-unused-vars`.
Use descriptive, domain-based filenames (e.g., `video-controller.js`, `youtube-handler.js`), and keep tests mirrored by feature path.

## Testing Guidelines
Primary test flow is custom Node + JSDOM runner (not Jest CLI), started with `npm test`. Add unit tests in `tests/unit/**` and integration tests in `tests/integration/**` named `*.test.js`.
Keep tests deterministic and isolate Chrome API behavior with existing mocks in `tests/helpers/`.
Run `npm run test:e2e` for UI/runtime behavior changes.

## Commit & Pull Request Guidelines
Recent history favors concise, imperative commits, often with prefixes like `fix:`, `chore/`, or short action phrases (e.g., `rework test runner`).
Before opening a PR:
- Run `npm run build`.
- Include a clear description of behavior change and impacted sites/modules.
- Link related issue(s) when applicable.
- Add screenshots or short recordings for popup/options/controller UI changes.

## Agent skills

### Issue tracker

Issues tracked in GitHub Issues via the `gh` CLI; external PRs are not a triage surface. See `docs/ai_generated/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/ai_generated/triage-labels.md`.

### Domain docs

Single-context repo: `CONTEXT.md` at root, ADRs in `docs/ai_generated/adr/`. See `docs/ai_generated/domain.md`.
