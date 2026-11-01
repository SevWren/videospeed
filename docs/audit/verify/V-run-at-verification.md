# V-run-at-verification.md
## Agent: Team 1 Agent 8 — run_at Root-Cause Verification
**Date:** 2026-11-01
**Branch:** fix/path-b-world-main
**Manifest path:** `/home/vercel-sandbox/videospeed/manifest.json`

---

## 1. Full manifest.json (with line numbers)

Lines 1–135 read in full. Key excerpt showing the two world:MAIN content_scripts blocks:

```
Line 57–99  — world:MAIN block (main injected scripts)
  69:       "world": "MAIN",
  70:       "run_at": "document_end",
  ...
  97:       "src/content/inject.js"

Line 100–110 — world:MAIN block (Netflix-specific)
  105:      "world": "MAIN",
  106:      "run_at": "document_end",
  107:      "js": ["src/site-handlers/scripts/netflix.js"]
```

---

## 2. grep -n "document_start|run_at|document_end|document_idle" manifest.json

```
70:      "run_at": "document_end",
106:     "run_at": "document_end",
```

**Result: exactly 2 lines matched. Both are `document_end`. Zero `document_start` matches.**

---

## 3. Confirmation checklist

| Check | Result |
|-------|--------|
| `document_start` is ABSENT (0 matches) | CONFIRMED — 0 matches |
| `run_at: "document_end"` present in world:MAIN block 1 (line 70) | CONFIRMED |
| `run_at: "document_end"` present in world:MAIN block 2 / Netflix (line 106) | CONFIRMED |
| `document_idle` absent | CONFIRMED — 0 matches |
| Total `run_at` entries | 2 (both `document_end`) |

---

## 4. Permissions test: run_at filter

Command: `npm test -- --testPathPattern=permissions 2>&1 | grep -E "run_at|PASS|FAIL"`

Output:
```
✅ all world:MAIN content_scripts blocks declare run_at:"document_end"
```

The specific test **`all world:MAIN content_scripts blocks declare run_at:"document_end"`** PASSED.

---

## 5. Master branch — original setting

Command: `git show master:manifest.json | grep -n "run_at|document_start"`

Output: **No matches** — master branch manifest.json contains no `run_at` key at all.

Command: `git show f29df1c^:manifest.json | grep -n "run_at|document_start|document_end|document_idle"`

Output (from the commit immediately before the fix commit `f29df1c`):
```
70:      "run_at": "document_start",
106:     "run_at": "document_start",
```

**This confirms the root cause:** before fix commit `f29df1c`, both world:MAIN content_scripts blocks declared `run_at: "document_start"`. This caused the extension to execute before `document.head` existed, triggering null-reference errors across constants.js and inject.js.

### Fix commit reference
- **Commit:** `f29df1c`
- **Message:** `fix: remove run_at:document_start; guard document.head in constants.js and inject.js`
- **Change:** `document_start` → `document_end` in both world:MAIN blocks (lines 70 and 106)

---

## 6. Key specific test result

Test: `all world:MAIN content_scripts blocks declare run_at:"document_end"`
**Status: PASSED**

Suite: `unit/manifest/permissions.test.js` — 8/8 passed, 0 failed.

---

## 7. All manifest-related tests

Command: `npm test -- --testPathPattern=manifest 2>&1 | tail -30`

### unit/manifest/permissions.test.js — 8 passed, 0 failed
```
✅ minimum_chrome_version is at least 111 (world:MAIN requires Chrome 111+)
✅ content_scripts has at least one entry with world:"MAIN"
✅ "scripting" is absent from permissions (Path B does not need chrome.scripting)
✅ world:MAIN block includes src/content/inject.js as last entry
✅ world:MAIN block includes src/utils/constants.js as first entry (P11 load order)
✅ all world:MAIN content_scripts blocks declare run_at:"document_end"
✅ Block 0 (injector.js / ISOLATED world) has match_about_blank:false
✅ base-handler.js appears before all other site handler files in world:MAIN js array (regression guard)
```

### unit/manifest/module-loader-dead-code.test.js — 3 passed, 0 failed
```
✅ module-loader.js is absent from all content_scripts js arrays (ISOLATED and MAIN worlds)
✅ module-loader.js is absent from web_accessible_resources (regression guard)
✅ no content_scripts file calls loadModule() or defineModule() — module-loader.js is unreachable
```

### Overall test suite
```
Total Tests: 184
✅ Passed: 184
❌ Failed: 0
📈 Success Rate: 100%
```

---

## Summary

**VERIFICATION COMPLETE — ALL CHECKS PASSED**

1. `run_at: "document_start"` is **completely absent** from the current manifest.json.
2. `run_at: "document_end"` is **correctly present** in both world:MAIN content_scripts blocks (lines 70 and 106).
3. The original root cause was confirmed: before fix commit `f29df1c`, both blocks used `document_start`, causing null `document.head` errors at extension injection time.
4. The master branch had no `run_at` key at all (feature was added with the wrong value during Path B scaffolding).
5. The specific regression test `all world:MAIN content_scripts blocks declare run_at:"document_end"` passes.
6. All 11 manifest-related tests pass; full suite 184/184 green.
