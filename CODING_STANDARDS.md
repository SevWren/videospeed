# Coding Standards

Standards enforced during code review. These are judgement calls that tooling cannot substitute for.

## CS-1: Bug-fix commits require a prior red signal

Before writing any fix for a reported behavioral bug, the session must first name one command
that was run and produced a failure matching the symptom. Include in the commit or PR body:
`Feedback loop: <command> → <one-line failure output>`.

**Why:** The Oct 31 2026 session committed `shouldInjectInCurrentFrame()` without running a
failing command first. The user proved the fix wrong in-browser. The red signal
(`node tests/e2e/validate-extension.js`) would have prevented this.

**Review rule:** Any PR fixing a behavioral bug without a cited failing command fails review.

## CS-2: Manifest API contracts proven at the call site

Before calling any Chrome extension API that requires both a `permissions` entry and a
`host_permissions` entry, verify both are present. Check Chrome's documentation for the
specific API. For `chrome.scripting.executeScript()`: requires `"scripting"` AND either
`activeTab` (user gesture only) or matching `host_permissions`. The `content_scripts.matches`
field does NOT satisfy this requirement.

**Why:** The Oct 31 session added `"scripting"` to permissions without verifying `activeTab`
is never granted (action has a popup, `onClicked` never fires). Chrome threw "Extension
manifest must request permission to access this host" on every YouTube page load.

**Review rule:** Any PR adding a `chrome.scripting` call must include in the body the
`host_permissions` entry that covers the target, or a note that Path B (`world:MAIN`) is
used instead.

## CS-3: Tests must import production code — never define inline clones

A test file that re-implements the function it is supposed to test gives zero coverage.
Any test that defines a function with the same name or logic as a production function,
without importing that production module, is tautological and must be rewritten.

**Why:** `background-inject.test.js` defined `makeHandler()` inline. Deleting `background.js`
left all 5 tests green. These tests could not catch any regression in real production code.

**Review rule:** Every test file covering behavior in a named production module must have
at least one `import` from that module. Tests that define clones of production functions
fail review.

## CS-3 Exception — content scripts

A test file for a file that runs in Chrome's isolated world (a content script that cannot be loaded as an ES module in JSDOM) may mirror production logic inline, provided:
1. The test file's opening comment names the production file it mirrors and explains why a direct import is not possible.
2. The mirrored constants are kept identical to the production copy — any divergence is itself a regression, caught by Seam B tests or manual diff.
3. Where the regression guard requires asserting structural properties of the production file (e.g., listener count), a **structural source test** must be used instead of an inline behavioral clone: read the production file via `readFileSync` and assert on its content.

This exception applies only to content-script files. All other production modules must be imported directly.

## CS-4: PR body must include `## Evidence` for injection-path changes

Any PR that changes the extension injection behavior, manifest permissions, or module load
order must include an `## Evidence` section with console output (or description) before and
after the change. For the injection path specifically, the evidence should confirm:
- No `"Unsafe attempt to load URL chrome-extension://"` errors
- No `"Cannot access contents of url"` errors
- Speed controller appears on YouTube

**Why:** PR #16 had zero required sections. It declared the fix complete while the
`host_permissions` gap was present and unreported.

**Review rule:** Behavioral PRs without `## Evidence` fail review.

## CS-5: A module-level constant used by exactly one statement is a co-location smell

If a named constant is only ever referenced by a single downstream statement — especially
a single event-listener callback — it should be defined immediately adjacent to that
statement (inline or as a `const` directly above its only use). A constant that floats
above multiple listeners with no clear owner is a signal that one of those listeners may
be stale or duplicated.

**Why:** In `injector.js`, `USER_CONTROLLED_KEYS` was defined at module level but was only
consumed by a stale first `chrome.storage.onChanged` listener. The surviving second listener
used its own adjacent `_VSC_USER_CONTROLLED_KEYS`. The mismatch between constant ownership
and listener count was the only visible structural signal of the duplication, and it was not
caught across multiple review sessions.

**Review rule:** Any PR that defines a constant used by only one listener or callback in
the same scope should be flagged: verify there is exactly one owner.

## CS-6: Dwell-timer tests must intercept `globalThis.setTimeout`, not `window.setTimeout`

In JSDOM, `window.setTimeout` and `globalThis.setTimeout` are two different objects.
Production browser code that calls `setTimeout(fn, ms)` at module scope (no explicit
`window.` prefix) resolves to `globalThis.setTimeout` in JSDOM — not `window.setTimeout`.
A test that replaces `window.setTimeout` will not capture those timers, so the test will
silently fail to exercise the dwell path.

**Why:** Discovered during T3 of the hover-to-activate feature. The `makeFakeTimers()`
helper in `tests/integration/hover-activation.test.js` intercepts `globalThis.setTimeout`
and `globalThis.clearTimeout` explicitly. Any test for a dwell timer or debounce timer
must follow this pattern.

**Review rule:** Any test that stubs `setTimeout`/`clearTimeout` must target `globalThis`,
not `window`. A test that replaces only `window.setTimeout` and asserts a timer-dependent
behavior fails review.

## CS-7: Constructor parameters beyond 3 must use options objects

When a constructor or factory function requires more than 3 parameters, use a single options
object instead of positional params. This prevents callers from miscounting arguments, makes
IDE autocompletion useful, and allows future parameter additions without a breaking API change.

**Why:** `VideoMutationObserver`'s 6-positional-parameter constructor was identified as a
depth-reducing interface choice in the codebase-design session. A caller passing 6 positional
arguments has no local documentation of which argument is which; an options object makes each
parameter self-describing at the call site.

**Review rule:** Any PR adding a constructor or function with more than 3 positional parameters
must either justify the choice in the PR body or use an options object.
