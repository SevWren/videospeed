# V-constants-18 — Evidence Report
## Claim: `constants.js:18 TypeError: Cannot read properties of null (reading 'appendChild')`

**Verdict: CANNOT occur in the current `fix/path-b-world-main` branch.**
The error matches MASTER's code but NOT the current branch.

---

## 1. What Is Line 18 in the Current Branch?

File: `src/utils/constants.js`

```
14:   if (document.head) {
15:     const debugDiv = document.createElement('div');
16:     debugDiv.id = 'vsc-constants-loaded';
17:     debugDiv.style.display = 'none';
18:     debugDiv.textContent = `Constants loaded at ${new Date().toISOString()}`;
19:     document.head.appendChild(debugDiv);
20:   }
```

Line 18 in the current branch is:
```js
debugDiv.textContent = `Constants loaded at ${new Date().toISOString()}`;
```

This line assigns a string to a property of a locally-created DOM element. It cannot throw `TypeError: Cannot read properties of null (reading 'appendChild')` under any circumstance.

---

## 2. What Was Line 18 in MASTER?

`git show master:src/utils/constants.js` (lines 13–19):

```
13:   // Add debug info to DOM for inspection
14:   const debugDiv = document.createElement('div');
15:   debugDiv.id = 'vsc-constants-loaded';
16:   debugDiv.style.display = 'none';
17:   debugDiv.textContent = `Constants loaded at ${new Date().toISOString()}`;
18:   document.head.appendChild(debugDiv);
```

**MASTER's line 18 is:**
```js
document.head.appendChild(debugDiv);
```

This call has **NO null guard** in MASTER. If `document.head` is `null` (e.g., in a sub-frame or sandboxed iframe before `<head>` exists), MASTER throws exactly:
```
TypeError: Cannot read properties of null (reading 'appendChild')
```

**The reported error matches MASTER exactly.**

---

## 3. Execution-Path Analysis in the Current Branch

All paths touching `document.head.appendChild` in the current branch:

| Location | Code | Guarded? |
|---|---|---|
| Line 14 | `if (document.head) {` | YES — explicit null check |
| Line 19 | `document.head.appendChild(debugDiv);` | YES — inside the `if (document.head)` block |

There are no other calls to `document.head.appendChild` in `constants.js`.
The `if (document.head)` guard on line 14 wraps the entire DOM-touching block (lines 14–20). If `document.head` is `null`, the block is skipped entirely.

---

## 4. Node.js Test Results

A test snippet was executed directly using Node.js `new Function` to evaluate `constants.js` with controlled `window` and `document` surrogates:

**Test 1 — `document.head = null` (the crash scenario):**
```
Result: NO THROW — SAFE
```

**Test 2 — `document.head` with a working `appendChild`:**
```
Result: NO THROW — SAFE
DEFAULT_SETTINGS present: true
```

The existing test suite (`tests/unit/utils/constants-deduplication.test.js`) also exercises these paths via `evalConstantsSource` with surrogate documents and passes.

**Full test suite result:**
```
Total Tests: 184
Passed:      184
Failed:        0
Success Rate: 100%
```

---

## 5. Summary of the Fix Applied in This Branch

| Attribute | MASTER | `fix/path-b-world-main` |
|---|---|---|
| Line 18 code | `document.head.appendChild(debugDiv);` | `debugDiv.textContent = ...;` |
| Null guard | None | `if (document.head)` wraps lines 14–20 |
| Can throw on null head? | **YES** | **NO** |

The fix introduced in this branch:
1. Added `if (document.head)` guard before creating or appending the debug div.
2. As a result, line 18 in the current branch is now a safe property assignment, not the `appendChild` call.

---

## 6. Conclusion

**NO** — `constants.js:18` **CANNOT** throw `TypeError: Cannot read properties of null (reading 'appendChild')` in the current `fix/path-b-world-main` branch.

The reported error (`constants.js:18 Uncaught TypeError: Cannot read properties of null (reading 'appendChild')`) **matches MASTER's line 18**, where `document.head.appendChild(debugDiv)` was called without any null guard.

The current branch fixes this by:
- Wrapping the entire debug-div block in `if (document.head)` (line 14).
- Shifting `document.head.appendChild(debugDiv)` to line 19, inside the guard.
- Making line 18 a benign `textContent` assignment that cannot throw this error.

**The bug is fixed in this branch. The reported error is a MASTER-only regression.**
