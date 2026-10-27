# A2 Baseline — Test & Tooling Audit

**Agent**: A2 Baseline Runner
**Base SHA**: e904370863d69a2b5d853af62745141953c4860d
**Date**: 2026-10-27
**Working directory**: /home/vercel-sandbox/videospeed

---

## 1. Tool Versions

### Node version (`node --version`)
```
v24.14.1
```

### npm version (`npm --version`)
```
11.11.0
```

---

## 2. package-lock.json (`ls -la package-lock.json 2>/dev/null`)
```
-rw-rw-r-- 1 vercel-sandbox vercel-sandbox 108161 Oct 27 01:07 /home/vercel-sandbox/videospeed/package-lock.json
```
VERIFIED: package-lock.json exists (108161 bytes).

---

## 3. .gitignore (`ls -la .gitignore 2>/dev/null && cat .gitignore 2>/dev/null | head -30`)
```
-rw-rw-r-- 1 vercel-sandbox vercel-sandbox 205 Oct 26 22:24 /home/vercel-sandbox/videospeed/.gitignore
.DS_Store
.cursor
local
dist
tests/e2e/screenshots
node_modules
.idea
.agents/
.claude/
.grok/
chrome_console_log_events_1.txt
skills-lock.json
gh_app_token.py
maton_ai_prompt.txt
sevwrenai.private-key.pem
```
VERIFIED: .gitignore exists with 15 entries.

---

## 4. npm test — Run 1

```
> video-speed-controller@0.9.1 test
> node tests/run-tests.js

Video Speed Controller - CLI Test Runner

Running 17 test suites...

[unit/core/settings.test.js]           6 passed, 0 failed
[unit/core/action-handler.test.js]    12 passed, 0 failed
[unit/core/video-controller.test.js]   8 passed, 0 failed
[unit/core/icon-integration.test.js]   4 passed, 0 failed
[unit/core/keyboard-shortcuts-saving.test.js]  9 passed, 0 failed
[unit/core/f-keys.test.js]             5 passed, 0 failed
[unit/observers/mutation-observer.test.js]     6 passed, 0 failed
[unit/observers/audio-size-handling.test.js]   5 passed, 0 failed
[unit/content/inject.test.js]          3 passed, 0 failed
[unit/utils/recursive-shadow-dom.test.js]     14 passed, 0 failed
[unit/utils/blacklist-regex.test.js]   6 passed, 0 failed
[unit/core/gif-frame-engine.test.js]  10 passed, 0 failed
[unit/observers/gif-observer.test.js] 14 passed, 0 failed
[unit/core/gif-controller.test.js]    12 passed, 0 failed
  (includes: WARNING:Local GIF blocked — enable "Allow access to file URLs" in chrome://extensions/ to use GIF speed control on local files (file:///D:/blocked.gif))
[unit/core/action-handler-gif.test.js] 4 passed, 0 failed
[integration/module-integration.test.js] 6 passed, 0 failed
[integration/gif-integration.test.js]  9 passed, 0 failed

Test Summary
================
Total Tests: 133
Passed: 133
Failed: 0
Success Rate: 100%

All tests passed!
```

**Run 1 total: 133 passed, 0 failed**

---

## 5. npm test — Run 2

```
> video-speed-controller@0.9.1 test
> node tests/run-tests.js

Video Speed Controller - CLI Test Runner

Running 17 test suites...

[unit/core/settings.test.js]           6 passed, 0 failed
[unit/core/action-handler.test.js]    12 passed, 0 failed
[unit/core/video-controller.test.js]   8 passed, 0 failed
[unit/core/icon-integration.test.js]   4 passed, 0 failed
[unit/core/keyboard-shortcuts-saving.test.js]  9 passed, 0 failed
[unit/core/f-keys.test.js]             5 passed, 0 failed
[unit/observers/mutation-observer.test.js]     6 passed, 0 failed
[unit/observers/audio-size-handling.test.js]   5 passed, 0 failed
[unit/content/inject.test.js]          3 passed, 0 failed
[unit/utils/recursive-shadow-dom.test.js]     14 passed, 0 failed
[unit/utils/blacklist-regex.test.js]   6 passed, 0 failed
[unit/core/gif-frame-engine.test.js]  10 passed, 0 failed
[unit/observers/gif-observer.test.js] 14 passed, 0 failed
[unit/core/gif-controller.test.js]    12 passed, 0 failed
  (includes: WARNING:Local GIF blocked — enable "Allow access to file URLs" in chrome://extensions/ to use GIF speed control on local files (file:///D:/blocked.gif))
[unit/core/action-handler-gif.test.js] 4 passed, 0 failed
[integration/module-integration.test.js] 6 passed, 0 failed
[integration/gif-integration.test.js]  9 passed, 0 failed

Test Summary
================
Total Tests: 133
Passed: 133
Failed: 0
Success Rate: 100%

All tests passed!
```

**Run 2 total: 133 passed, 0 failed**

---

## 6. npm test — Run 3

```
> video-speed-controller@0.9.1 test
> node tests/run-tests.js

Video Speed Controller - CLI Test Runner

Running 17 test suites...

[unit/core/settings.test.js]           6 passed, 0 failed
[unit/core/action-handler.test.js]    12 passed, 0 failed
[unit/core/video-controller.test.js]   8 passed, 0 failed
[unit/core/icon-integration.test.js]   4 passed, 0 failed
[unit/core/keyboard-shortcuts-saving.test.js]  9 passed, 0 failed
[unit/core/f-keys.test.js]             5 passed, 0 failed
[unit/observers/mutation-observer.test.js]     6 passed, 0 failed
[unit/observers/audio-size-handling.test.js]   5 passed, 0 failed
[unit/content/inject.test.js]          3 passed, 0 failed
[unit/utils/recursive-shadow-dom.test.js]     14 passed, 0 failed
[unit/utils/blacklist-regex.test.js]   6 passed, 0 failed
[unit/core/gif-frame-engine.test.js]  10 passed, 0 failed
[unit/observers/gif-observer.test.js] 14 passed, 0 failed
[unit/core/gif-controller.test.js]    12 passed, 0 failed
  (includes: WARNING:Local GIF blocked — enable "Allow access to file URLs" in chrome://extensions/ to use GIF speed control on local files (file:///D:/blocked.gif))
[unit/core/action-handler-gif.test.js] 4 passed, 0 failed
[integration/module-integration.test.js] 6 passed, 0 failed
[integration/gif-integration.test.js]  9 passed, 0 failed

Test Summary
================
Total Tests: 133
Passed: 133
Failed: 0
Success Rate: 100%

All tests passed!
```

**Run 3 total: 133 passed, 0 failed**

---

## 7. Flakiness Verdict

**STABLE** — All three `npm test` runs produced identical results: 17 suites, 133 tests, 133 passed, 0 failed, exit code 0. No ordering differences, no intermittent failures.

---

## 8. npm run test:unit

```
> video-speed-controller@0.9.1 test:unit
> node tests/run-tests.js unit

Video Speed Controller - CLI Test Runner

Running 15 test suites...

[unit/core/settings.test.js]           6 passed, 0 failed
[unit/core/action-handler.test.js]    12 passed, 0 failed
[unit/core/video-controller.test.js]   8 passed, 0 failed
[unit/core/icon-integration.test.js]   4 passed, 0 failed
[unit/core/keyboard-shortcuts-saving.test.js]  9 passed, 0 failed
[unit/core/f-keys.test.js]             5 passed, 0 failed
[unit/observers/mutation-observer.test.js]     6 passed, 0 failed
[unit/observers/audio-size-handling.test.js]   5 passed, 0 failed
[unit/content/inject.test.js]          3 passed, 0 failed
[unit/utils/recursive-shadow-dom.test.js]     14 passed, 0 failed
[unit/utils/blacklist-regex.test.js]   6 passed, 0 failed
[unit/core/gif-frame-engine.test.js]  10 passed, 0 failed
[unit/observers/gif-observer.test.js] 14 passed, 0 failed
[unit/core/gif-controller.test.js]    12 passed, 0 failed
  (includes: WARNING:Local GIF blocked...)
[unit/core/action-handler-gif.test.js] 4 passed, 0 failed

Test Summary
================
Total Tests: 118
Passed: 118
Failed: 0
Success Rate: 100%

All tests passed!
```

**Result: 15 suites, 118 tests, 118 passed, 0 failed. Exit 0.**

---

## 9. npm run test:integration

```
> video-speed-controller@0.9.1 test:integration
> node tests/run-tests.js integration

Video Speed Controller - CLI Test Runner

Running 2 test suites...

[integration/module-integration.test.js] 6 passed, 0 failed
[integration/gif-integration.test.js]  9 passed, 0 failed

Test Summary
================
Total Tests: 15
Passed: 15
Failed: 0
Success Rate: 100%

All tests passed!
```

**Result: 2 suites, 15 tests, 15 passed, 0 failed. Exit 0.**

---

## 10. npm run test:gif

```
> video-speed-controller@0.9.1 test:gif
> node tests/run-tests.js gif

Video Speed Controller - CLI Test Runner

Running 17 test suites...

(all 17 suites — same full suite as npm test; "gif" filter runs all suites)

Test Summary
================
Total Tests: 133
Passed: 133
Failed: 0
Success Rate: 100%

All tests passed!
```

**Result: 17 suites, 133 tests, 133 passed, 0 failed. Exit 0.**

NOTE: The `gif` filter in `tests/run-tests.js` does NOT narrow to only GIF-specific test files; it falls through to running all 17 suites (same as `npm test`). This appears to be intended behavior in the current runner implementation.

---

## 11. npm run lint

```
> video-speed-controller@0.9.1 lint
> eslint src/**/*.js tests/**/*.js


/home/vercel-sandbox/videospeed/src/content/inject.js
  242:43  error  Expected { after 'if' condition  curly
  247:35  error  Expected { after 'if' condition  curly
  372:17  error  Expected { after 'if' condition  curly
  565:26  error  Empty block statement            no-empty

/home/vercel-sandbox/videospeed/src/content/injector.js
  184:47  error  Expected { after 'if' condition  curly
  191:26  error  Expected { after 'if' condition  curly
  214:58  error  Expected { after 'if' condition  curly
  215:56  error  Expected { after 'if' condition  curly
  224:61  error  Expected { after 'if' condition  curly

/home/vercel-sandbox/videospeed/src/core/action-handler.js
  47:27  error  'index' is defined but never used. Allowed unused args must match /^_/u  no-unused-vars

/home/vercel-sandbox/videospeed/src/core/gif-controller.js
  120:43  error  Expected '===' and instead saw '=='                       eqeqeq
  127:18  error  Expected '!==' and instead saw '!='                       eqeqeq
  287:52  error  Expected { after 'if' condition                           curly
  288:70  error  Expected { after 'if' condition                           curly
  335:20  error  Empty block statement                                     no-empty
  362:17  error  'timeoutHandle' is never reassigned. Use 'const' instead  prefer-const
  549:29  error  Expected { after 'if' condition                           curly
  776:30  error  Expected { after 'if' condition                           curly
  777:56  error  Expected { after 'if' condition                           curly
  778:49  error  Expected { after 'if' condition                           curly

/home/vercel-sandbox/videospeed/src/lib/gifuct-js.min.js
  0:0  warning  File ignored because of a matching ignore pattern. Use "--no-ignore" to override

/home/vercel-sandbox/videospeed/src/site-handlers/amazon-handler.js
  48:46  error  Expected { after 'if' condition  curly

/home/vercel-sandbox/videospeed/src/site-handlers/facebook-handler.js
   64:41  error  Expected { after 'if' condition  curly
  110:46  error  Expected { after 'if' condition  curly

/home/vercel-sandbox/videospeed/src/site-handlers/netflix-handler.js
  82:46  error  Expected { after 'if' condition  curly

/home/vercel-sandbox/videospeed/src/ui/drag-handler.js
  17:28  error  Expected { after 'if' condition  curly

/home/vercel-sandbox/videospeed/src/utils/dom-utils.js
  123:23  error  Expected { after 'if' condition  curly

/home/vercel-sandbox/videospeed/tests/integration/gif-integration.test.js
  87:20   error  Expected { after 'if' condition  curly
  95:152  error  Expected { after 'if' condition  curly
  97:31   error  Expected { after 'if' condition  curly

30 problems (29 errors, 1 warning)
  23 errors and 0 warnings potentially fixable with the --fix option.
```

**Exit code: 1**

Summary of lint errors:
- 29 errors across 10 files (src and tests)
- 1 warning (gifuct-js.min.js ignored by pattern)
- Dominant error type: `curly` (missing braces after if conditions) — 23 occurrences
- Other errors: `no-empty` (2), `eqeqeq` (2), `no-unused-vars` (1), `prefer-const` (1)
- 23 of 29 errors are auto-fixable with `--fix`

Files with lint errors:
- `src/content/inject.js` (4 errors)
- `src/content/injector.js` (5 errors)
- `src/core/action-handler.js` (1 error)
- `src/core/gif-controller.js` (10 errors)
- `src/site-handlers/amazon-handler.js` (1 error)
- `src/site-handlers/facebook-handler.js` (2 errors)
- `src/site-handlers/netflix-handler.js` (1 error)
- `src/ui/drag-handler.js` (1 error)
- `src/utils/dom-utils.js` (1 error)
- `tests/integration/gif-integration.test.js` (3 errors)

---

## 12. Format check (`npx prettier --check "src/**/*.js" "tests/**/*.js"`)

```
Checking formatting...
[warn] src/background.js
[warn] src/content/inject.js
[warn] src/content/injector.js
[warn] src/core/action-handler.js
[warn] src/core/gif-controller.js
[warn] src/core/settings.js
[warn] src/core/storage-manager.js
[warn] src/core/video-controller.js
[warn] src/module-loader.js
[warn] src/observers/gif-observer.js
[warn] src/observers/media-observer.js
[warn] src/observers/mutation-observer.js
[warn] src/site-handlers/scripts/netflix.js
[warn] src/ui/options/options.js
[warn] src/ui/popup/popup.js
[warn] src/utils/event-manager.js
[warn] tests/integration/gif-integration.test.js
[warn] tests/run-tests.js
[warn] tests/test-config.js
[warn] tests/unit/content/inject.test.js
[warn] tests/unit/core/action-handler-gif.test.js
[warn] tests/unit/core/action-handler.test.js
[warn] tests/unit/core/f-keys.test.js
[warn] tests/unit/core/gif-controller.test.js
[warn] tests/unit/core/gif-frame-engine.test.js
[warn] tests/unit/core/icon-integration.test.js
[warn] tests/unit/core/keyboard-shortcuts-saving.test.js
[warn] tests/unit/core/settings.test.js
[warn] tests/unit/core/video-controller.test.js
[warn] tests/unit/observers/audio-size-handling.test.js
[warn] tests/unit/observers/gif-observer.test.js
[warn] tests/unit/observers/mutation-observer.test.js
[warn] tests/unit/utils/blacklist-regex.test.js
[warn] tests/unit/utils/recursive-shadow-dom.test.js
Code style issues found in 34 files. Run Prettier with --write to fix.
```

**Exit code: 1**

34 files have formatting issues. No files were written (check-only mode).

---

## 13. npm run zip

```
> video-speed-controller@0.9.1 zip
> rm -rf dist && mkdir -p dist/videospeed && cp -r manifest.json src *.md dist/videospeed/ && cd dist && zip -r videospeed.zip videospeed && cd .. && echo 'Extension packaged at dist/videospeed.zip'

sh: line 1: zip: command not found
EXIT_CODE:127
```

**Exit code: 127 — FAILED**

The `zip` CLI utility is not installed in this environment. The script did successfully:
1. Remove and recreate `dist/`
2. Create `dist/videospeed/`
3. Copy `manifest.json`, `src/`, and all `*.md` files into `dist/videospeed/`

But it failed at the `zip -r videospeed.zip videospeed` step because `zip` is not available.

Contents staged in `dist/videospeed/` before the failure:
```
dist/videospeed/
  manifest.json
  src/           (full source tree)
  CLAUDE.md
  CONTEXT.md
  CONTRIBUTING.md
  HANDOFF.md
  PRIVACY.md
  README.md
```

NOTE: `node_modules/` is not included (correct — not in the glob pattern). `tests/`, `docs/`, `package.json`, `package-lock.json` are also not included.

`dist/videospeed.zip` was NOT produced. No zip file exists at `dist/videospeed.zip`.

---

## Summary Table

| Command | Exit Code | Result |
|---|---|---|
| `npm test` (run 1) | 0 | 133/133 passed |
| `npm test` (run 2) | 0 | 133/133 passed |
| `npm test` (run 3) | 0 | 133/133 passed |
| `npm run test:unit` | 0 | 118/118 passed |
| `npm run test:integration` | 0 | 15/15 passed |
| `npm run test:gif` | 0 | 133/133 passed (runs all suites) |
| `npm run lint` | 1 | 29 errors, 1 warning |
| `npx prettier --check ...` | 1 | 34 files with formatting issues |
| `npm run zip` | 127 | FAILED — `zip` not installed |
| `node --version` | — | v24.14.1 |
| `npm --version` | — | 11.11.0 |
| `package-lock.json` exists | — | YES (108161 bytes) |
| `.gitignore` exists | — | YES (15 entries) |
| Flakiness | — | STABLE |
