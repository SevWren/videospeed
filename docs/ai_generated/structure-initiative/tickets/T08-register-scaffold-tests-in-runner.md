# T08: Register scaffold tests in run-tests.js

**Finding**: S-12 (run-tests.js uses an explicit file list; new test files under tests/unit/scaffold/ are not auto-discovered)
**Type**: feature / cleanup
**Prerequisite tickets**: none (but this ticket enables the prerequisite characterization tests required by T03, T04, and T05 to actually run)
**Human approval required**: YES — this ticket modifies `tests/run-tests.js`, which is an existing file under `tests/**`. While the charter (§4) protects existing `tests/**` files from modification, this is a functional runner change. The runner is sensitive: adding the wrong path or a malformed entry can silently drop all tests or cause false-pass results. Human review of the exact file list addition is warranted.

## Problem

`tests/run-tests.js` maintains an explicit list of test files to run (per S-12 findings from the scaffold analysis). Files added to `tests/unit/scaffold/` or other new subdirectories are NOT automatically discovered and run. This means:

1. Any characterization tests written as prerequisites to T03, T04, and T05 will be silently ignored by `npm test` unless they are explicitly registered here.
2. New scaffold tests written during the structure initiative (e.g., `tests/unit/scaffold/`) are invisible to the test runner.
3. Developers and agents may write tests that never execute, creating false confidence.

This is a Medium severity issue. The runner's explicit-list design is intentional (per S-12 — it prevents accidental test inclusion), but new subdirectory patterns must be explicitly added.

## Proposed change

File: `tests/run-tests.js`

Add `tests/unit/scaffold/` to the explicit test file list in the runner. The exact syntax must match how other directories are registered in the file. Common patterns:

**Option A** — add a directory glob entry:
```javascript
// Add alongside existing entries:
...globSync('tests/unit/scaffold/**/*.test.js'),
```

**Option B** — add individual file entries (if the runner lists files explicitly one by one):
```javascript
'tests/unit/scaffold/module-loader-callers.test.js',
```

Use whichever pattern matches the existing runner code. Read `tests/run-tests.js` at implementation time to determine the correct pattern before making the change.

Additionally, if `tests/unit/core/` contains new scaffold-authored test files, add them as well. Verify against the actual directory contents at implementation time.

## Verification command

```bash
# Confirm the scaffold/ path is now in the runner
grep -n "scaffold" tests/run-tests.js

# Run tests and confirm the scaffold tests execute (count should increase from 133)
npm test
# Expected: ≥ 133 passing (133 baseline + any scaffold tests added)

# Confirm no previously passing tests were broken
npm test 2>&1 | grep -E "passing|failing"
```

## Expected diff

```
tests/run-tests.js | 2 ++
1 file changed, 2 insertions(+)
```

## Rollback

```bash
git revert HEAD
```

Removing the scaffold path entry from the runner has no effect on the scaffold test files themselves; they will simply not run again until re-registered.

## Constraints

- Charter §4 ZERO-DIFF note: `tests/run-tests.js` is an **existing** file under `tests/**`. The charter protects existing test files from modification. This ticket modifies an existing file and therefore requires human approval.
- The charter §5 allowed writes lists "New files under `tests/unit/**` or `tests/integration/**`" — this covers creating new scaffold test files but is silent on modifying the runner. Confirm with human owner.
- Do NOT change the runner's overall execution strategy (sequential vs. parallel, timeout values, output format). Add only the new path registration.
- After this ticket lands, the characterization test prerequisites for T03, T04, and T05 can be written and will automatically run. Document this unblocking in those tickets.
- F-A-003 (test:gif runs all 133 tests, not GIF-only): that is a separate finding (out of scope for this ticket) but worth noting — the runner's explicit list is the same mechanism behind both issues.
