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
