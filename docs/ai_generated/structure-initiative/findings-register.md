# Findings Register

**Program**: AI-Driven Development Scaffold
**Base SHA**: `e904370863d69a2b5d853af62745141953c4860d`
**Updated at**: G3 (P4 Synthesis complete)

Evidence classes: VERIFIED (command run) / OBSERVED (code/doc read) / INFERRED (reasoned) / UNVERIFIED
Severity: Blocker / High / Medium / Low
Status: OPEN / VERIFIED / REFUTED / OUT_OF_SCOPE

---

## Register

| ID | Title | Class | Evidence | Severity | Confidence | Agent impact | Fix direction | Regression risk | R-item | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| F-A-001 | npm run lint exits 1 (29 errors) at baseline | VERIFIED | A2: `npm run lint` exit code 1, 29 errors across 10 files | Medium | High | Agent running lint will see non-zero exit | Add check:lint; fix errors or adjust config | Low | R-05 | OPEN |
| F-A-002 | zip binary absent in sandbox | VERIFIED | A2: exit 127 on npm run zip | Low | High | Release packaging unverifiable in sandbox | CI step or human action required | Low | — | OPEN |
| F-A-003 | npm run test:gif runs all 133 tests, not GIF-only | VERIFIED | A2: 133 pass with filter "gif" | Medium | High | Misleads agent/CI into thinking targeted subset ran | Fix package.json test:gif or document | Low | R-05 | OPEN |
| F-A-004 | Prettier check fails on 34 files at baseline | VERIFIED | A2: prettier --check exit 1, 34 files | Medium | High | CI fails on format check with current baseline | Run format once, then add CI check | Low | R-05 | OPEN |
| F-A-005 | gif-controller.js in 61% of bug-fix commits | VERIFIED | A3: 14/23 fix: commits | High | High | Highest structural risk file; agents edit it often | Protected-behavior registry + tests | High | R-01, R-03 | OPEN |
| F-B-001 | StorageManager.onChanged has zero callers | VERIFIED | B: grep finds 0 callers in src/ | High | High | Agents assume settings propagate live; they don't | Document in registry; R-02 entry point | Medium | R-02 | OPEN |
| F-B-002 | src/module-loader.js is dead code in WAR | VERIFIED | B: 0 callers; manifest.json includes it | Medium | High | Confuses agents; expands WAR surface unnecessarily | Migration ticket: remove with WAR update | Medium | R-04 | OPEN |
| F-B-003 | window.VSC has 29 properties; no registry | OBSERVED | B: manual count from injector.js | High | High | Agent adding module must know exact registration pattern | Module registry document (L2) | Medium | R-04 | OPEN |
| F-C-001 | PRIVACY.md cache claim is FALSE (published policy) | VERIFIED | C+G: PRIVACY.md:17 vs gif-controller.js:405 | Blocker | High | Store compliance defect; false published policy | Fix PRIVACY.md before Web Store submission | High | R-06 | OPEN |
| F-C-002 | CONTEXT.md blank GIF_SPEED_SAVE_DEBOUNCE_MS | VERIFIED | C: grep constants.js = 500ms | Medium | High | Agents may assume wrong debounce timing | Fill in 500ms value (evidence-backed glossary fix) | Low | R-02 | OPEN |
| F-C-003 | 5 candidate ADRs undocumented | OBSERVED | C: iframe proxy, patchCanvas, sentinel, load-order, skills-location | High | High | Agents re-derive or violate these decisions | L3 candidate ADR drafts | Medium | R-02 | OPEN |
| F-C-004 | CONTRIBUTING.md stale: test:gif claim | VERIFIED | A2+C: test:gif runs all 133 | Low | High | Misleads contributors | Update CONTRIBUTING.md | Low | R-05 | OPEN |
| F-D-001 | HANDOFF.md (~8800 tokens) never auto-loaded, no entry pointer | VERIFIED | D: wc -c = 35242; CLAUDE.md has no link | High | High | Cold agents miss all 14 PBs and 10 gotchas | Add pointer to CLAUDE.md (H3); L2 module cards | High | R-02 | OPEN |
| F-D-002 | PBs P2-P6 all at invariant-locality distance 3 | VERIFIED | D: grep shows doc in HANDOFF.md, code in src/, no test | High | High | No safety net for invariants; agent edits break them silently | L3 registry + E3 contract tests | High | R-01, R-03 | OPEN |
| F-D-003 | Task D7 (persisted setting) blasts across 7 reads / 4 dirs | INFERRED | D: traced constants→settings→storage→injector→options | Medium | High | New-feature tasks require reading 7+ files with no guide | Module card or seam document for settings flow | Low | R-02 | OPEN |
| F-D-004 | CLAUDE/ tree 63 files / ~60k tokens never auto-loaded | VERIFIED | D+H: wc; no pointer in CLAUDE.md | Medium | High | Skills invisible; 22/65 have disable-model-invocation | Add pointer (single line); H3 entry-point design | Low | R-02 | OPEN |
| F-E-001 | 59% of src files have zero test coverage | VERIFIED | E: coverage map; 12+ uncovered modules | High | High | Refactoring any untested module has no safety net | L3 contract tests for PBs; characterization tests | High | R-03 | OPEN |
| F-E-002 | build script mutates files before testing | VERIFIED | E+F: package.json lint:fix→format→test | Medium | High | Unfit for CI; modifies tree it judges | Add check:lint, check:format scripts | Low | R-05 | OPEN |
| F-E-003 | Shared mockStorage not reset between test suites | OBSERVED | E: chrome-mock.js module-level state | Low | Medium | Latent cross-suite test pollution | Reset mockStorage in beforeEach or teardown | Low | — | OPEN |
| F-F-001 | Dead ESLint config in package.json (silently overridden by .eslintrc.json) | VERIFIED | F: eslintrc exists; package.json config missing 10 rules | Medium | High | Developers see weaker rules in package.json | Remove dead config or consolidate | Low | — | OPEN |
| F-F-002 | Root .md files ship in extension zip (CLAUDE.md, HANDOFF.md, CONTEXT.md) | VERIFIED | F: npm run zip script = `cp *.md dist/` | High | High | AI agent instructions ship in extension package to Web Store | Exclude from zip; migration ticket | Low | R-06 | OPEN |
| F-F-003 | Unquoted globs in lint/format may miss deeply nested files | INFERRED | F: shell globstar required for `src/**/*.js` without quotes | Medium | Medium | Some files silently not linted | Quote globs in scripts | Low | R-05 | OPEN |
| F-G-001 | VSC_SAVE_SETTINGS: no payload validation | VERIFIED | G: injector.js:148; any page script can write chrome.storage | High | High | Security: arbitrary storage writes from page scripts | Add key allowlist (migration ticket; C-4) | High | R-07 | OPEN |
| F-G-002 | WAR glob wildcards auto-expose new files | OBSERVED | G: manifest.json `src/core/*.js` pattern | High | High | Adding a file to src/core/ silently makes it web-accessible | Document; check:structure warns on new file | Medium | R-04 | OPEN |
| F-H-001 | .claude/ excluded from .gitignore | VERIFIED | H: .gitignore includes `.claude/` | High | High | Agent definitions written to .claude/ lost on re-clone | Remove .claude/ from .gitignore (pre-condition for L5) | Low | R-02, C-20 | OPEN |
| F-H-002 | No AGENTS.md at root (Codex/OpenCode have no orientation) | VERIFIED | H: ls AGENTS.md → not found | Medium | High | Non-Claude-Code agents have no entry point | L2: create AGENTS.md | Low | R-02 | OPEN |
| F-I-001 | ADR-0001 overstates MV3 prohibition (PARTIALLY CONFIRMED) | VERIFIED | I: MV3 module scripts DO work in isolated world | Medium | High | Agents may over-constrain design options | Amend ADR-0001 with nuance | Low | — | OPEN |
| F-I-002 | "No source maps" in ADR-0001 is engineering choice not hard constraint | VERIFIED | I: bundler+sourcemaps would also satisfy debuggability | Medium | High | J4 Build-step is a valid design candidate | Amend ADR-0001; allow J4 in Design Lab | Low | — | OPEN |

---

## Summary Counts

| Gate | Total | Blocker | High | Medium | Low | Verified | Open |
|---|---|---|---|---|---|---|---|
| G0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| G1 | 5 | 0 | 1 | 3 | 1 | 5 | 5 |
| G2 | 28 | 1 | 15 | 10 | 2 | 26 | 28 |
| G3 | 28 | 1 | 15 | 10 | 2 | 26 | 28 |
