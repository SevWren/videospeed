## Summary

<!-- What does this PR do and why? One to three bullet points. -->

-

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / cleanup
- [ ] Documentation only
- [ ] Tests only
- [ ] CI / tooling
- [ ] Release

## Related issue

<!--
Bug fixes: reference or create an issue before opening this PR.
  Closes #___

Feature additions (new capability, new Site Handler, new Action, new setting):
  An issue must exist AND have received human acknowledgment before implementation starts.
  Closes #___

Ambiguous changes (refactors, docs, tests): reference or create a minimal issue.
  Closes #___

Do not commit a HANDOFF.md file. Session context belongs in this PR description, not a file.
-->

## Validation

Commands run before opening this PR:

- [ ] `npm run build` — always required (lint + format + full test suite)
- [ ] `npm run test:gif` — required when any of these files were touched: `src/core/gif-controller.js`, `src/core/gif-frame-engine.js`, `src/observers/gif-observer.js`
- [ ] `npm run test:e2e` — required when popup, options page, or Controller overlay UI was changed
- [ ] Not applicable — explain: ___

## Manual Chrome verification

- [ ] Loaded the extension unpacked in Chrome/Chromium (`Settings > Extensions > Developer mode > Load unpacked`) and verified the change works end-to-end in the browser
- [ ] Not required — this PR contains no change to user-visible browser behavior (internal logic, tests, or documentation only)

## Protected behaviors

Check every group that applies to files you changed. Leave groups unchecked only if you did not touch any file in that group.

**Any `src/` file changed:**
- [ ] P1 — `src/lib/gifuct-js.min.js` was not modified (see also: dedicated `src/lib/` gate below)

**`src/content/injector.js` changed:**
- [ ] P10 — Every module that registers on `window.VSC` guards with `if (!window.VSC.X)` to prevent double-load; no module captures `window.VSC.*` references at top-level parse time
- [ ] P11 — Module load order in `injector.js` (lines 37–63) was not reordered or parallelized
- [ ] P14 — `VSC_SAVE_SETTINGS` CustomEvent listener was not expanded with new payload fields (expanding requires human approval + payload schema validation per T04)

**`src/content/inject.js` changed:**
- [ ] P4 — `img.gifController` sentinel `{ pending: true, _cancelled: false }` is still set synchronously before the first `await` in `onGifFound`
- [ ] P8 — Per-GIF memory is checked against `GIF_FRAME_CACHE_LIMIT_BYTES` (50 MB) and global budget via `GifFrameCache.tryAllocate()` before any frame allocation

**`src/core/gif-controller.js` changed:**
- [ ] P2 — After `gc.remove()`, `img.vscGifIgnore` is set to `true` before the `<img>` is re-inserted into the DOM
- [ ] P3 — `disposal=2` frames fill the composite canvas with `_bgColor` via `fillRect`, not `clearRect`
- [ ] P5 — `loopCount == null` (from gifuct) defaults to `0` (infinite), not `1`
- [ ] P6 — `gc.remove()` completes all 13 teardown steps in order
- [ ] P7 — Frame patches are routed through `_patchCanvas` then `drawImage()` (source-over); `putImageData()` is never called directly on the composite canvas
- [ ] P8 — Per-GIF memory budget checked before frame allocation (see inject.js group above)
- [ ] P13 — `VSC_GIF_BYTES_RESPONSE` postMessage handler validates `requestId` against the in-flight request and ignores messages with mismatched IDs

**`src/core/gif-frame-engine.js` changed:**
- [ ] P8 — Memory budget checked via `GifFrameCache.tryAllocate()` before allocating frame data
- [ ] P9 — `effectiveDelay()` enforces a 10 ms floor on both the raw delay input and the final result; speed multiplier defaults to 1.0 if zero

**`src/observers/mutation-observer.js` changed:**
- [ ] P8 — Memory budget check still in place for GIF operations in this observer

**`src/core/storage-manager.js` changed:**
- [ ] Settings propagation contract is preserved — confirm `StorageManager.set()` callers handle write failures (Bug A: missing `lastError` check is a known open defect; do not widen the gap)

## Test quality

- [ ] Each test added or modified in this PR uses independent expected values — not values computed the same way as the implementation (no tautological assertions; expected values come from a known-good literal, a worked example, or the spec)
- [ ] At least one test in this PR would go red (fail) if this PR's source code change were reverted — not just "the test suite passes"
- [ ] Tests are written at the module's public interface (seam), not against internal implementation details or private methods

**If TDD was not applied to a specific surface:**
- [ ] TDD was skipped because a surface is 100% verified untestable in the test environment (not "difficult" — untestable)
  - [ ] The untestable surface is: ___
  - [ ] It is untestable because: ___
  - [ ] Confirmed in `docs/ai_generated/protected-behaviors/registry.md` as untestable (P7 or P13) **OR** in `docs/ai_generated/structure-initiative/06-tests/E-tests.md` under "Files with zero test infrastructure"

## Domain vocabulary

- [ ] All names, comments, and this PR description use terms from `CONTEXT.md` — not the avoided synonyms listed there (e.g., "Controller" not "overlay", "Key Binding" not "shortcut", "Media Element" not "video element", "Blacklist" not "blocklist")

## Source library gate

- [ ] No files in `src/lib/` were modified (`gifuct-js.min.js` is vendored and must not be changed without thorough real-Chrome testing — P1)

## Security gates

- [ ] This PR does **not** expand the `VSC_SAVE_SETTINGS` CustomEvent payload with new fields (P14 — schema validation gap is unresolved; any expansion requires human approval per T04)
- [ ] This PR does **not** add a new `postMessage` handler without validating both `requestId` and message origin (P13 — known origin-check gap; do not replicate the pattern per MT-001)

## Documentation updates

Check every item that applies:

- [ ] New domain term introduced in code or PR → `CONTEXT.md` updated (and `GLOSSARY.md` to match)
- [ ] Architectural decision made (irreversible and cross-cutting) → new ADR added to `docs/adr/`
- [ ] File added, deleted, or renamed in `src/`, `tests/`, or `scripts/` → `npm run map:repo` run to regenerate `REPO_MAP.md`
- [ ] `window.VSC.*` registration added/removed, or module load order changed → `SEAM-INDEX.md` updated manually
- [ ] Default Key Binding, user-configurable setting, or user-visible behavior changed → `README.md` updated
- [ ] `package.json` scripts changed, or GIF file list changed → `CONTRIBUTING.md` updated
- [ ] Not applicable — no documentation triggers apply to this PR

## AI-generated PR

*Complete this section only if this PR was authored by an AI coding agent. Leave blank otherwise.*

- [ ] I read `CLAUDE.md`, `CONTEXT.md`, `docs/ai_generated/protected-behaviors/registry.md`, and `skills/engineering/pr/SKILL.md` before starting work
- [ ] I checked whether `FORENSIC_REPORT.md` exists at the repo root and, if present, informed the user of its contents and relevance before proceeding
- [ ] I ran `node scripts/check-structure.mjs && node scripts/check-seams.mjs` before making any `src/` edit
- [ ] This PR references an issue (see Related issue above)
- [ ] For feature PRs: the issue received human acknowledgment before any implementation code was written

## Test plan

<!-- Describe what you ran and what you observed. For behavioral changes, include before/after evidence. -->
