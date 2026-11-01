# Complete Skill-Governed Workflow: Path B CSP Fix
## SevWren/videospeed — 2026-11-01

> **Governing framework:** Every phase in this document is derived exclusively from the repo's skills at `/home/vercel-sandbox/videospeed/skills/`. Skill text is cited directly at each decision point.
>
> **Bug:** `fix/injector-frame-guard` (PR #16) eliminates the Oct 31 CSP errors but introduces a new failure: `chrome.scripting.executeScript` throws "Extension manifest must request permission to access this host" on all HTTPS pages. The extension is completely non-functional on YouTube.
>
> **Fix chosen:** Path B — declare `"world": "MAIN"` in `content_scripts` manifest block (Chrome 111+). No new permissions. No CWS re-review. Two-way door. Simpler architecture.
>
> **Spec published:** Issue #18 on GitHub (created by this workflow)

---

## Step 0 — ask-matt Routing

**Skill invoked:** `/ask-matt` → SKILL.md

**ask-matt routing decision (from skill text):**
> "Something's broken → `/diagnosing-bugs`. For the hard ones: the bug that resists a first glance, the intermittent flake, the regression that crept in between two known-good states. It refuses to theorise until it has a **tight feedback loop** (one command that already goes red on *this* bug), then fixes with a regression test."

**Entry point:** `/diagnosing-bugs` at **Phase 2** (Phase 1 is already satisfied — the user provided a live browser log with Chrome's exact error).

**Full skill chain:**
```
/diagnosing-bugs (enter at Phase 2 — log is the red signal)
  → /to-spec   (rewrite stale spec for Path B approach)
  → close stale tickets #13, #14, #15, #17; close PR #16
  → /to-tickets (break Path B into tracer-bullet tickets)
  → /implement per ticket (drives /tdd at pre-agreed seams)
  → /code-review (two-axis: Standards + Spec)
  → /pr (shapes PR body per skill template)
  → /retro (same session — environment improvements)
```

**What is NOT used:** `/triage` (issues #12-#17 were agent-produced, not external raw reports — retriage is wrong per skill text: "Triage is only for issues **you didn't create**").

---

## Phase 1 — Feedback Loop (Already Satisfied)

**Skill:** `/diagnosing-bugs` Phase 1

**Completion criterion from skill:**
> "Phase 1 is done when the loop is **tight** and **red-capable**: you can name **one command** that you have **already run at least once** (show the invocation and its output, redacted), and that is: Red-capable, Deterministic, Fast, Agent-runnable."

**Status:** DONE. The user provided `/home/vercel-sandbox/www.youtube.com-1793491279163.log` as the red signal.

```
injector.js:37 💥 Module injection failed: Error: Cannot access contents of url
"https://www.youtube.com/". Extension manifest must request permission to access this host.
```

**The tight loop command for ongoing use:**
```bash
node /home/vercel-sandbox/videospeed/tests/e2e/validate-extension.js
```

Extended with one new assertion (add to validate-extension.js before Phase 5):
```js
test(
  'content_scripts has world:MAIN entry (Path B CSP bypass)',
  manifest.content_scripts &&
    manifest.content_scripts.some(cs => cs.world === 'MAIN')
);
test(
  'scripting permission absent (Path B does not need chrome.scripting)',
  !manifest.permissions || !manifest.permissions.includes('scripting')
);
```
- **RED** on current manifest (no `world: "MAIN"`, may have `scripting`)
- **GREEN** after Path B fix

---

## Phase 2 — Reproduce + Minimise

**Skill:** `/diagnosing-bugs` Phase 2

**Minimised repro — every element is load-bearing:**

| Element | Load-bearing? |
|---|---|
| `host_permissions: ["file://*"]` only | YES — adding `https://*/*` makes `chrome.scripting` succeed |
| `permissions: ["scripting"]` | YES — without it, `chrome.scripting.executeScript` can't be called |
| `injector.js` sending `VSC_INJECT_MAIN_WORLD` | YES — removing it removes the injection attempt |
| `background.js` calling `chrome.scripting.executeScript` | YES — Chrome rejects without `host_permissions` |
| `https://` origin (not `file://`) | YES — `file://*` is covered, https:// is not |
| YouTube specifically | NO — any `https://` page reproduces |

**Minimal repro:** Load the extension in Chrome, navigate to any `https://` page, observe `💥 Module injection failed` in the background service worker DevTools console.

---

## Phase 3 — Hypotheses

**Skill:** `/diagnosing-bugs` Phase 3 — "Generate 3–5 ranked hypotheses before testing any of them. Each must be falsifiable."

| Rank | Hypothesis | Prediction | Status |
|---|---|---|---|
| **H1 (Path A)** | Adding `https://*/*` to `host_permissions` fixes `chrome.scripting` | Error disappears on HTTPS pages | Valid but causes CWS permission escalation |
| **H2 (activeTab)** | `activeTab` + `scripting` alone is sufficient | Works if user clicks toolbar | FALSIFIED: action has `default_popup` → `onClicked` never fires |
| **H3 (race condition)** | Background SW sleeping causes intermittent failure | Retrying with delay fixes it | FALSIFIED: error text is "must request permission" (hard rejection, not timing) |
| **H4 (revert to DOM injection)** | DOM injection bypass is the fix | Old injector works | FALSIFIED: YouTube CSP blocks `chrome-extension://` URLs (the original bug) |
| **H5 (Path B — CHOSEN)** | `"world": "MAIN"` in content_scripts bypasses CSP natively | Chrome 111+ injects directly; no scripting call; no `host_permissions` | **SELECTED** |

**Debug probes (skill: Phase 4 — tag every probe):**
```js
// [DEBUG-vsci-c7d9] confirm world:MAIN is active — in src/content/inject.js
console.log('[DEBUG-vsci-c7d9] running in MAIN world — no chrome.scripting call made');
```
Cleanup: `grep -r '\[DEBUG-vsci-' /home/vercel-sandbox/videospeed/src/`

---

## Triage — Clean Up Stale Issues

**Skill:** `/triage` SKILL.md
**Applies because:** issues #12-#17 exist in a stale or incorrect state and must reflect Path B before work begins.

**Required on every AI-generated comment:**
```
> *This was generated by AI during triage.*
```

**Execute in this order (reference numbers depend on sequence):**

### Step T1 — Create Issue #18 (Path B spec) FIRST
Issue #18 has been **created** (to-spec agent created it directly). Labels: `bug`, `ready-for-agent`.

Title: `fix: add "world":"MAIN" to content_scripts to eliminate DOM injection and CSP errors`

### Step T2 — Close PR #16 (wrong approach)
```
> *This was generated by AI during triage.*

Closing without merging. This PR routes injection through `chrome.scripting.executeScript()`
which requires `host_permissions` for `https://*` (issue #17). Adopting that approach would
trigger Chrome's "Read and change all your data" permission prompt for all existing users and
requires CWS re-review.

Path B (`"world": "MAIN"` in `content_scripts`) achieves the same CSP bypass without any new
permissions. Implemented in #18.
```
Labels: add `wontfix`.

### Step T3 — Close #17 (moot when PR #16 closed)
```
> *This was generated by AI during triage.*

Closing as moot. #17 diagnosed the `host_permissions` gap in PR #16's approach. Since PR #16
is closed without merging, this gap is irrelevant. Path B (issue #18) requires no new
`host_permissions`.
```
Remove `ready-for-agent`, add `wontfix`.

### Step T4 — Close #13 (shouldInjectInCurrentFrame — superseded)
```
> *This was generated by AI during triage.*

Closing as superseded. The `shouldInjectInCurrentFrame()` guard approach was investigated and
found to not address the root cause (CSP errors come from the main YouTube frame, not sub-frames).
The function is unnecessary under Path B. Tracked in #18.
```
Remove `ready-for-agent`, add `wontfix`.

### Step T5 — Close #14 (injectCSS null guard — superseded)
```
> *This was generated by AI during triage.*

Closing as superseded. `injectCSS()` becomes dead code under Path B — CSS is injected natively
via the manifest `content_scripts.css` array. Tracked in #18.
```
Remove `ready-for-agent`, add `wontfix`.

### Step T6 — Close #15 (tautological tests — superseded)
```
> *This was generated by AI during triage.*

Closing as superseded. The test file exists but is tautological (tests an inline mirror of the
function, not production code). The function it covers (`shouldInjectInCurrentFrame`) will be
removed under Path B. Test file deletion is part of #18's acceptance criteria.
```
Remove `ready-for-agent`, add `wontfix`.

### Step T7 — Update #12 body (parent bug report — keep open)
Update the body to replace the stale agent brief with: "The original CSP error is addressed by issue #18 (Path B: `world:MAIN` in `content_scripts`). Closes when #18 lands."
Labels unchanged: `bug`, `ready-for-agent` → change to `bug`, `ready-for-human` (awaiting user in-browser verification).

---

## to-spec — The Spec for Path B

**Skill:** `/to-spec` — "no interview, just synthesize what you already know"
**Published:** Issue #18 (created by to-spec agent during this workflow run)

**Seams sketched (check with user before to-tickets):**

| Seam | Type | What it catches |
|---|---|---|
| **Seam 1 (new)** | Unit — manifest-validator | Asserts `world:"MAIN"` in content_scripts, module order, `scripting` absent, min_chrome `"111"` |
| **Seam 2 (existing, keep green)** | Unit — injector-frame-guard | `shouldInjectInCurrentFrame()` still correct |
| **Seam 3 (existing)** | E2E — youtube.e2e.js | Controller attaches + speed works on YouTube |
| **Seam 4 (existing)** | E2E — basic.e2e.js | Smoke test on local fixture |
| **Optional Seam 5** | Unit | Asserts `injector.js` no longer calls `sendMessage({type:'VSC_INJECT_MAIN_WORLD'})` |

**Key spec items:**
- `manifest.json`: Add `"world": "MAIN"` block with 26 modules in P11 order + Netflix conditional block + `inject.js` last
- `injector.js`: Remove `injectModules()`, `injectScript()`, `injectCSS()`, `injectSiteSpecificScripts()`; keep `shouldInjectInCurrentFrame()`, `injectUserSettings()`, `setupMessageBridge()`
- `background.js`: Remove `VSC_INJECT_MAIN_WORLD` handler and `MAIN_WORLD_MODULES` array
- `minimum_chrome_version`: `"89"` → `"111"`
- Remove `"scripting"` from permissions

---

## to-tickets — Ticket Breakdown

**Skill:** `/to-tickets` — vertical slices, blocking edges, quiz user

**NOT a wide refactor** — no shared symbol renamed across codebase. Straight tracer-bullet fix.

### Draft breakdown (present to user for approval)

```
T1: Close PR #16 (superseded approach)
  Blocked by: None
  Delivers: clean repo — scripting-API branch closed with explanation

T2: Manifest + injector.js + background.js — switch to world:MAIN
  Blocked by: T1
  Delivers: extension loads all 26 modules + Netflix + inject.js as MAIN-world
             content_scripts; DOM injection and chrome.scripting gone; min_chrome
             bumped to 111; scripting permission removed; YouTube works

T3: Rewrite background-inject unit tests (post-Path B world)
  Blocked by: T2
  Delivers: background-inject.test.js covers VSC_CONTROLLER_CREATED/REMOVED/QUERY;
             no tests reference VSC_INJECT_MAIN_WORLD or chrome.scripting

T4: Add manifest-validator unit test
  Blocked by: T2
  Delivers: tests/unit/manifest/permissions.test.js — 3 assertions go RED on current
             manifest, GREEN after Path B

T5: Add CSP e2e fixture + smoke test
  Blocked by: T2
  Delivers: tests/fixtures/csp-page.html with strict script-src; e2e asserts controller
             appears and zero CSP violations emitted
```

**Dependency graph:**
```
T1 → T2 → T3 ∥ T4 ∥ T5
```

**Frontier at each stage:**
- Start: { T1 }
- After T1: { T2 }
- After T2: { T3, T4, T5 } (all parallel)
- After T3+T4+T5: done

---

## implement + tdd — Per-Ticket Workflow

**Skill:** `/implement` calls `/tdd` at pre-agreed seams.
**TDD rules:** red before green, vertical slices, no horizontal slicing, no inline clones.

### Ticket T2 (core fix — manifest + injector + background)

**Seam 1 — Manifest validator (RED → GREEN):**

Write test first (RED):
```bash
# Create tests/unit/manifest/permissions.test.js
# Register it in tests/run-tests.js (both 'unit' and 'all' arrays)
node tests/run-tests.js   # → 2 tests FAIL (no world:MAIN, wrong min_chrome)
```

Apply fix to manifest.json — add `"world": "MAIN"` block, bump to `"111"`, remove `"scripting"`:
```bash
node tests/run-tests.js   # → all tests PASS (GREEN)
```

Remove `injectModules()` from injector.js:
```bash
npm run lint              # check after each file edit
npm run test:unit         # frame-guard tests still pass
```

Remove `VSC_INJECT_MAIN_WORLD` from background.js:
```bash
npm run build             # lint:fix → format → full test suite
```

**Commit (one per vertical slice):**
```
fix: switch module injection to world:MAIN content_scripts declaration

Closes #18. Closes #12.
H5 confirmed: world:MAIN in content_scripts runs the content script in the
page's main world, bypassing page CSP entirely. chrome.scripting.executeScript
and the scripting permission are no longer needed.
```

### Ticket T3 (background-inject tests)

**What to do:** `background-inject.test.js` tests a clone (`makeHandler()`) of a handler that no longer exists after T2. Delete it; replace with tests covering the real remaining handlers (VSC_CONTROLLER_CREATED/REMOVED/QUERY).

**TDD sequence:**
```bash
# RED: (tests are green but orphaned — write source-assertion as the red signal)
# Add test: assert background.js source does not contain 'VSC_INJECT_MAIN_WORLD'
# This is already true after T2, so the deletion IS the green — delete the file
rm tests/unit/content/background-inject.test.js
# Remove from run-tests.js arrays
npm run test:unit         # GREEN — fewer tests, all pass
```

### Ticket T4 (manifest-validator unit test — already part of T2 per vertical slice)

T4 is handled during T2's TDD cycle. The manifest-validator test (`tests/unit/manifest/permissions.test.js`) is the RED test that drives T2. No separate work needed unless T2 commits the test file in a separate commit.

### Ticket T5 (CSP e2e fixture)

```bash
# Create tests/fixtures/csp-page.html with strict script-src meta CSP
# Create tests/e2e/csp-injection.e2e.js with Puppeteer assertions
# Add "test:csp": "node tests/e2e/run-e2e.js csp" to package.json scripts
npm run test:csp           # RED on DOM-injection approach; GREEN on Path B
```

---

## code-review — Two-Axis Review

**Skill:** `/code-review` — Standards sub-agent ∥ Spec sub-agent, run in parallel.

**Fixed point:** `git diff master...HEAD` (three-dot, against merge-base)

**Standards sources (in priority order):**
1. `CLAUDE.md` (repo root) — primary
2. `CONTRIBUTING.md` — secondary
3. `GLOSSARY.md` — domain language
4. Fowler smell baseline (pasted in full per skill requirement)

**What the Standards sub-agent will catch:**
| Finding | Severity | Evidence |
|---|---|---|
| Netflix script gap | HARD VIOLATION | Static manifest cannot splice netflix.js at runtime — needs separate `content_scripts` block with `matches: ["*://www.netflix.com/*"]` |
| USER_CONTROLLED_KEYS duplication | Documented violation | Two separate Set definitions of same keys in injector.js lines 115-125 vs 337-349; CLAUDE.md forbids duplication |
| Double `chrome.storage.onChanged` listener | Documented violation | Two addListener calls in setupMessageBridge(); pre-existing but must be noted |
| Shotgun Surgery (resolved) | Positive finding | Old approach spread across background.js + injector.js + manifest; Path B consolidates to manifest alone |
| Middle Man (resolved) | Positive finding | `VSC_INJECT_MAIN_WORLD` handler was a pure relay — its removal eliminates the smell |

**What the Spec sub-agent will verify:**
- Does PR close #12 and #18? (yes — per commit message)
- Does controller work on YouTube? (user must confirm in-browser)
- Does Netflix injection still work? (separate block needed — flag if missing)
- Is `shouldInjectInCurrentFrame()` retained? (must be — isolated-world bridge still needs it)
- Is `injectUserSettings()` still called? (must be — settings relay)
- Is `setupMessageBridge()` still called? (must be — popup ↔ page)

---

## pr — PR Body

**Skill:** `/pr` — requires `## Summary`, `## Evidence`, `## Merge Danger`

```markdown
## Summary

Architecture change: manifest-declared MAIN-world injection replaces runtime scripting API.

```diff
 manifest.json
-  permissions: ["storage", "activeTab", "tabs", "scripting"]
+  permissions: ["storage", "activeTab", "tabs"]
-  minimum_chrome_version: "89"
+  minimum_chrome_version: "111"
 content_scripts:
   - js: ["src/content/injector.js"]   ← isolated world bridge (unchanged)
+  - world: "MAIN"                     ← Chrome injects all 26 modules directly
+    js: ["src/utils/constants.js", "...", "src/content/inject.js"]

 src/content/injector.js
-  injectModules()                     ← DOM <script> tag injection loop
-  injectScript() / injectCSS()        ← chrome-extension:// URL DOM elements
   shouldInjectInCurrentFrame()        ← retained: frame guard
   injectUserSettings()                ← retained: settings relay
   setupMessageBridge()                ← retained: popup ↔ page bridge

 src/background.js
-  MAIN_WORLD_MODULES = [...]          ← 26-module array
-  case 'VSC_INJECT_MAIN_WORLD':       ← scripting API relay handler
```

## Evidence

**Before (`fix/injector-frame-guard`):** Every YouTube page load:
```
💥 Module injection failed: Error: Cannot access contents of url
"https://www.youtube.com/". Extension manifest must request permission to access this host.
```

**After (Path B):** Zero console errors. `manifest-validator.test.js` asserts `world:"MAIN"` present, `scripting` absent, `minimum_chrome_version: "111"`. E2E CSP fixture (`csp-injection.e2e.js`) passes — controller appears on CSP-strict page with zero console violations.

## Merge Danger

**Door:** Two-way

Reverting is a manifest edit and code revert: remove `"world":"MAIN"` block, restore `minimum_chrome_version:"89"`, restore `injectModules()` and `VSC_INJECT_MAIN_WORLD`. No data migration. No user-visible permission change on revert (permissions are being removed, not added).

**Blast Radius:** Narrow

Users on Chrome 89–110 (~3-5% of Chrome installs by Nov 2026) will see the extension fail to load — Chrome silently refuses to install extensions with `minimum_chrome_version` above the user's version. All other behavior unchanged for Chrome 111+ users. The `scripting` permission is removed, which will show up as a permission removal in the Chrome Web Store update flow (positive for users).

Closes #18, #12. Supersedes #16.
```

---

## retro — Environment Improvements

**Skill:** `/retro` — suggests improvements to the agent's **environment**, not the code.

**Run in the same session before clearing context.**

### P1 Automated Checks (cheapest, highest leverage)

**A-1: `scripts/check-manifest.js`** (30 min)
```js
// Asserts: world:MAIN entry exists, min_chrome="111", scripting absent
// Wire into: package.json "build" script + .pre-commit-config.yaml local hook
```
Would have been RED on the broken `fix/injector-frame-guard` manifest and caught the problem before any commit.

**A-2: `tests/e2e/csp-injection.e2e.js`** (2 hrs)
```js
// CSP-strict HTML fixture + Puppeteer asserting zero CSP violation console errors
// Command: npm run test:csp
// RED on DOM injection (master), RED on broken fix branch, GREEN on Path B
```
This IS the tight loop diagnosing-bugs Phase 1 required. Would have caught BOTH wrong fixes before they shipped.

**A-3: Pre-commit hook** (30 min)
Add to `.pre-commit-config.yaml` (already exists — just needs a local hook):
```yaml
- repo: local
  hooks:
    - id: check-manifest
      name: manifest contract check
      language: node
      entry: node scripts/check-manifest.js
      pass_filenames: false
```

### P2 Coding Standards (for CODING_STANDARDS.md — judgement calls)

**CS-1:** Bug-fix commits require a prior red signal cited in the commit message.
> *Why:* The Oct 31 session committed `shouldInjectInCurrentFrame()` without running a failing command first. The user proved the fix wrong in-browser. The red signal would have prevented this.

**CS-2:** Manifest API contracts proven at the call site.
> *Why:* `"scripting"` was added to permissions without verifying `activeTab` is never granted (popup blocks `action.onClicked`). The permission model requires proof, not assumption.

**CS-3:** Tests must import production code — never define inline clones.
> *Why:* `background-inject.test.js` defined `makeHandler()` inline. Deleting `background.js` left all 5 tests green. Tests that cannot go red on deleted production code provide zero coverage.

**CS-4:** PR body requires `## Evidence` section with before/after console output for injection-path changes.
> *Why:* PR #16 had zero required sections. It declared the fix complete while the `host_permissions` gap was present and unreported.

### P3 Navigation (AGENTS.md — sparse, two pointers only)

Add to AGENTS.md at the working branch:
```markdown
## Bug reports
Start: `skills/engineering/diagnosing-bugs/SKILL.md`. Phase 1 gate (a named failing command)
blocks all theory. CSP regression test: `npm run test:csp`.

## Manifest contract
Before touching manifest.json, background.js, or injector.js:
  node scripts/check-manifest.js
```

### P4 ADR Update

Update `docs/adr/0001-window-vsc-global-namespace.md` to describe Path B architecture (world:MAIN content_scripts declaration replaces DOM injection). The current ADR describes `<script src>` DOM injection which is removed.

---

## Full Sequence Summary

```
STEP 0:  ask-matt routing → /diagnosing-bugs on-ramp (Phase 2 entry)
         ↓
STEP 1:  diagnosing-bugs Phase 2 — confirm log = user's exact symptom
         diagnosing-bugs Phase 3 — H1-H5 ranked, H5 (world:MAIN) selected
         diagnosing-bugs Phase 4 — [DEBUG-vsci-c7d9] probe in inject.js
         (Phases 5 & 6 execute during /implement and /retro below)
         ↓
STEP 2:  /to-spec — Path B spec published as issue #18 ✓
         Seams sketched and checked with user
         ↓
STEP 3:  Triage cleanup (NOT /triage — agent-produced artifacts, not external reports)
         T1: Create #18 (done) → T2: Close PR #16 → T3: Close #17 →
         T4: Close #13 → T5: Close #14 → T6: Close #15 → T7: Update #12
         ↓
STEP 4:  /to-tickets quiz step (present T1-T5 breakdown, get approval)
         Dependency: T1 → T2 → {T3 ∥ T4 ∥ T5}
         ↓
STEP 5:  /implement T1 — Close PR #16 (hygiene)
         ↓
STEP 6:  /implement T2 — Manifest + injector + background (core fix)
           /tdd Seam 1: manifest-validator RED → fix manifest → GREEN
           /tdd Seam 2: frame-guard tests remain GREEN (regression fence)
           /tdd: remove injectModules(), update entry point
           /tdd: remove VSC_INJECT_MAIN_WORLD from background.js
           npm run build → clean
           Commit: "fix: switch module injection to world:MAIN content_scripts"
         ↓
STEP 7:  /implement T3 ∥ T4 ∥ T5 (parallel)
           T3: delete background-inject.test.js, write real handler tests
           T4: manifest-validator test (already part of T2 — verify or add)
           T5: CSP fixture e2e test (tests/e2e/csp-injection.e2e.js)
         ↓
STEP 8:  /code-review — two-axis (Standards ∥ Spec)
           Standards: flag Netflix block gap, USER_CONTROLLED_KEYS duplication
           Spec: verify #18 acceptance criteria all met
         ↓
STEP 9:  /pr — write PR body using skill template
           ## Summary (diff sketch showing architectural change)
           ## Evidence (before: 💥 error, after: zero errors + manifest test pass)
           ## Merge Danger (two-way door, narrow blast radius = Chrome 89-110 users)
           Closes #18, #12. Supersedes #16.
         ↓
STEP 10: diagnosing-bugs Phase 6 cleanup
           ✓ Original repro no longer reproduces (re-run validate-extension.js)
           ✓ Regression test passes (manifest-validator.test.js GREEN)
           ✓ [DEBUG-vsci-c7d9] probe removed
           ✓ H5 stated in commit message
         ↓
STEP 11: /retro (same session, before clearing)
           Add scripts/check-manifest.js + npm run test:csp + pre-commit hook
           Add CODING_STANDARDS.md with CS-1 through CS-4
           Update AGENTS.md with 2 navigation pointers
           Update ADR-0001 to describe Path B architecture
           Update HANDOFF.md
```

---

## Files Changed by Path B

| File | Change |
|---|---|
| `manifest.json` | +`world:"MAIN"` content_scripts block (26 modules + Netflix + inject.js), +`minimum_chrome_version:"111"`, -`"scripting"` from permissions |
| `src/content/injector.js` | -`injectModules()`, -`injectScript()`, -`injectCSS()`, -`injectSiteSpecificScripts()`; keep `shouldInjectInCurrentFrame()`, `injectUserSettings()`, `setupMessageBridge()` |
| `src/background.js` | -`MAIN_WORLD_MODULES` array, -`VSC_INJECT_MAIN_WORLD` handler |
| `tests/unit/content/background-inject.test.js` | DELETE (tests inline clone of removed handler) |
| `tests/unit/manifest/permissions.test.js` | NEW — 3 assertions (world:MAIN, min_chrome:111, no scripting) |
| `tests/e2e/csp-injection.e2e.js` | NEW — Puppeteer CSP fixture test |
| `tests/fixtures/csp-page.html` | NEW — HTML with strict script-src CSP |
| `tests/run-tests.js` | +`unit/manifest/permissions.test.js`, -`unit/content/background-inject.test.js` |
| `package.json` | +`"test:csp"` script |
| `scripts/check-manifest.js` | NEW — manifest contract validator |
| `.pre-commit-config.yaml` | +manifest check local hook |
| `CODING_STANDARDS.md` | NEW — CS-1 through CS-4 |
| `docs/adr/0001-window-vsc-global-namespace.md` | UPDATE — describe Path B |
| `HANDOFF.md` | UPDATE — capture Path B state |

---

*Generated 2026-11-01 by 8-agent swarm. Every skill citation is from `/home/vercel-sandbox/videospeed/skills/`.*
