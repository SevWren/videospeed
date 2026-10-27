---
team: C
domain: docs-truth
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
author: AI-generated (Team-C)
provenance: AI-generated — not reviewed by human
---

# C — Documentation and Glossary Truth

## C1: Claim Verification

| # | Claim | Source | Verdict | Evidence |
|---|-------|--------|---------|----------|
| C1-1 | Version is 0.8.0 | CLAUDE.md:7 | **STALE** | CLAUDE.md line 7 reads `0.9.1 (manifest) / 0.8.0 (package.json)` — acknowledges the discrepancy. Actual `package.json` version field is `"0.9.1"` (VERIFIED: `grep -n "version" package.json` → line 3: `"version": "0.9.1"`). The claim that package.json holds 0.8.0 was true at a prior commit; it has since been updated. CLAUDE.md's statement about the discrepancy is itself now stale. OBSERVED: `package.json:3@e904370`. |
| C1-2 | GIF fetches use `cache: force-cache` | PRIVACY.md:17 | **FALSE** | `src/core/gif-controller.js` line 405 uses `fetch(src, { mode: 'cors', cache: 'default' })`. The value `force-cache` does not appear anywhere in `gif-controller.js`. OBSERVED: `src/core/gif-controller.js:405@e904370`. PRIVACY.md:17 states `cache: force-cache`; the code uses `cache: 'default'`. Direct contradiction. |
| C1-3 | CONTEXT.md leaves `GIF_SPEED_SAVE_DEBOUNCE_MS` blank | CONTEXT.md:91 | **VERIFIED-TRUE (gap confirmed)** | CONTEXT.md constants table row for `GIF_SPEED_SAVE_DEBOUNCE_MS` has value `—` (em-dash placeholder). Actual value in `src/utils/constants.js:118@e904370` is `500` (ms). The blank is a real documentation gap, not a placeholder meaning "zero" or "undefined". VERIFIED: `grep -n "GIF_SPEED_SAVE_DEBOUNCE_MS" src/utils/constants.js` → `118: window.VSC.Constants.GIF_SPEED_SAVE_DEBOUNCE_MS = 500;` |
| C1-4 | HANDOFF.md §16.9 "gh CLI is not installed in this sandbox" | HANDOFF.md:587 | **EPHEMERAL** | This is an ephemeral-environment claim, not a durable code invariant. Whether `gh` is installed depends on sandbox provisioning state, which can change between sessions. It is not a claim about code behaviour. Classification: ephemeral-snapshot. It belongs in a session-state section, not in a "gotchas for the next LLM" list that implies permanent validity. INFERRED: premises — (1) sandbox is a Vercel VM provisioned fresh per session; (2) CLI tool availability is environment-state, not repo-state. |
| C1-5 | README.md: "refresh the page after changing settings" | README.md:27 | **VERIFIED-TRUE (user instruction, not code enforcement)** | README.md line 27 says "remember to refresh the video viewing page for them to take effect." No `location.reload()` or `chrome.runtime.reload()` calls exist in `src/`. VERIFIED: `grep -rn "reload\|location\.reload\|chrome\.runtime\.reload" src/` returned no output. The claim is accurate as a user-facing instruction — settings take effect only after a page reload because the content script reads settings at injection time via `VSC_USER_SETTINGS`. However, `storage-manager.js` does expose `StorageManager.onChanged()` (line 153), which could theoretically enable live updates. The README claim is true in practice but misleadingly absolute — it implies no live-update path exists when one is architecturally possible. |
| C1-6 | CONTRIBUTING.md says `npm run test:gif` runs GIF tests only | CONTRIBUTING.md:98 | **STALE** | CONTRIBUTING.md lines 93-101 state the command "exercises GIF decoding and playback speed scenarios that are not covered by the general suite." This implies a small, focused subset. VERIFIED: running `node tests/run-tests.js gif` produces `Passed: 133 / 133` — the full suite of 133 tests, not a GIF-only subset. `package.json:11` confirms `"test:gif": "node tests/run-tests.js gif"`. The runner's `gif` argument does not filter to GIF-only files; it runs all tests. The claim that the command is a targeted GIF subset is false — it runs the full 133-test suite. OBSERVED: Team-A finding corroborated. |

---

## C2: Glossary Audit

### 2a. All Terms Defined in CONTEXT.md

| Term | Defined at | _Avoid_ synonyms listed |
|------|-----------|------------------------|
| Action | CONTEXT.md:8 | command, event, operation |
| Blacklist | CONTEXT.md:12 | blocklist, exclusion list, ignore list, denylist |
| Canvas Replacement | CONTEXT.md:16 | canvas swap, image substitution, canvas injection |
| Cancelled Element | CONTEXT.md:20 | ignored element, disabled element, skipped element |
| controlGifs (setting) | CONTEXT.md:25 | — |
| Controller | CONTEXT.md:28 | widget, overlay, badge, panel |
| GIF Controller | CONTEXT.md:32 | gif handler, gif widget, gif overlay |
| GIF Element | CONTEXT.md:36 | animated image, gif image, gif tag |
| GIF Frame Cache | CONTEXT.md:40 | frame store, gif cache, frame buffer |
| GIF Frame Engine | CONTEXT.md:44 | frame calculator, delay engine, timing engine |
| gifSpeedStep | CONTEXT.md:48 | — |
| Key Binding | CONTEXT.md:51 | shortcut, keybind, hotkey |
| lastGifSpeed | CONTEXT.md:55 | — |
| Marker | CONTEXT.md:58 | bookmark, timestamp, checkpoint, saved position |
| Media Element | CONTEXT.md:62 | video element, player, media node |
| Playback Rate | CONTEXT.md:67 | speed value, rate, velocity, multiplier |
| Preferred Speed | CONTEXT.md:72 | fast speed, custom speed, saved speed |
| Site Handler | CONTEXT.md:76 | adapter, plugin, integration, site override |
| Speed Indicator | CONTEXT.md:80 | speed display, rate label, speed readout |

### 2b. _Avoid_ Term Violations Found in src/

| Avoid-term | Found at | CONTEXT.md entry violated | Notes |
|------------|----------|--------------------------|-------|
| `shortcut` | `src/ui/popup/popup.html:44` (HTML title attribute) | Key Binding (_Avoid_: shortcut) | User-facing UI string. Not a code identifier. Low severity — UI copy, not domain logic. |
| `shortcut` | `src/utils/event-manager.js:30` (JSDoc comment `/** Set up keyboard shortcuts */`) | Key Binding (_Avoid_: shortcut) | Comment-only; not an identifier or exported symbol. Low severity. |
| `adapter` | `src/core/gif-controller.js:292` (inline comment `// Set up canvas.vsc adapter for DragHandler`) | Site Handler (_Avoid_: adapter, plugin, integration, site override) | Comment-only; not an identifier. The use of "adapter" here describes a compatibility shim for DragHandler, not a Site Handler — arguably a different concept not yet in the glossary. Low severity. |

No violations found for: `blocklist`, `hotkey`.

### 2c. GIF_SPEED_SAVE_DEBOUNCE_MS Gap

CONTEXT.md constants table (line 91) lists `GIF_SPEED_SAVE_DEBOUNCE_MS` with value `—`. Actual value is `500` ms (OBSERVED: `src/utils/constants.js:118@e904370`). This is a documentation gap: the constant is defined, named, and used in production code, but its value is absent from the canonical domain reference.

### 2d. Terms Used in Code with No CONTEXT.md Entry

| Term (as used in code) | Location | Gap assessment |
|------------------------|----------|----------------|
| `vscGifIgnore` (flag on img) | `src/core/gif-controller.js`, `mutation-observer.js` | No CONTEXT.md entry. Related to Cancelled Element, but uses a distinct mechanism (`img.vscGifIgnore = true` vs `vsc-cancelled` CSS class). CONTEXT.md notes the distinction in the Cancelled Element definition but does not give `vscGifIgnore` its own entry. |
| `_vscTeardownSrc` (flag on img) | `src/core/gif-controller.js`, `mutation-observer.js`, `inject.js` | No CONTEXT.md entry. A protocol-level property that coordinates src-change re-attach logic. Has no glossary term. |
| Sentinel pattern (`{ pending: true, _cancelled: false }`) | `src/content/inject.js`, `mutation-observer.js` | No CONTEXT.md entry. HANDOFF.md §13 documents it in state-machine terms. No canonical glossary term. |
| `gifFetchFailCache` (per-origin failure map) | `src/observers/gif-observer.js`, `gif-controller.js` | No CONTEXT.md entry. Distinct from GIF Frame Cache. |
| `_positionWrapper` (span wrapping canvas) | `src/core/gif-controller.js` | No CONTEXT.md entry. DOM structure concept with no glossary term. |

---

## C3: ADR Audit

### 3a. Existing ADR Assessment

| ADR | Title | Hard to reverse? | Surprising? | Real trade-off documented? | Premises still true? | Overall |
|-----|-------|-----------------|-------------|---------------------------|----------------------|---------|
| ADR-0001 | Use `window.VSC` global namespace instead of ES modules | YES — removing globals requires refactoring all inter-module references | YES — global namespace is unusual in modern JS; needs justification | YES — bundler alternative explicitly considered and deferred with stated reason | YES — MV3 still prohibits ES module scope sharing across dynamically injected page scripts at `e904370`. The injector pattern (sequential `<script>` injection via `web_accessible_resources`) remains unchanged. | PASSES three-part test. Premises verified. |
| ADR-0002 | Render controller inside Shadow DOM | YES — switching to iframe isolation would require cross-frame messaging rewrites | YES — most extensions use plain DOM injection; Shadow DOM is non-obvious | YES — iframe alternative explicitly weighed and rejected with specific reasons (positioning, messaging overhead) | YES — GIF controller scope exclusion is clearly stated in the ADR header: "this ADR covers HTML media element controllers only." Shadow DOM is still the mechanism for video/audio controllers. GIF controllers use canvas replacement as documented. | PASSES three-part test. Premises verified. |

### 3b. Candidate New ADRs

The following decisions are documented in HANDOFF.md §7–8 but have no formal ADR. Each meets the three-part test (hard to reverse, surprising, real trade-off).

| Candidate ADR | Justification | Evidence in HANDOFF.md |
|---------------|--------------|------------------------|
| **ADR-0003: iframe proxy for file:// GIF fetches** | Hard to reverse: three prior approaches (direct page XHR, content-script XHR, content-script bridge) all failed; replacing iframe proxy would require a fourth approach with no viable candidate. Surprising: using a hidden extension-page iframe as a CORS origin elevator is non-obvious. Trade-off: requires `host_permissions: ["file://*"]` in manifest (broader permission) and user must enable "Allow access to file URLs". Documented in HANDOFF.md §4.5 and §7. | HANDOFF.md:183–197, §7 |
| **ADR-0004: Patch-canvas compositing (drawImage vs putImageData)** | Hard to reverse: reverting to `putImageData()` directly on composite canvas reintroduces black artifacts on all GIFs using partial-frame updates. Surprising: the indirection through `_patchCanvas` + `drawImage()` exists solely to invoke source-over blending — not obvious from the code structure. Trade-off: extra canvas allocation per GIF controller vs. correct transparency. Documented in HANDOFF.md §4.4 and §7. | HANDOFF.md:419–423, §16.4 |
| **ADR-0005: Sentinel pattern for async GIF create** | Hard to reverse: removing the sentinel would reintroduce double-attach and zombie controller bugs (HANDOFF.md §4.6). Surprising: using a plain object `{ pending: true, _cancelled: false }` as a placeholder on `img.gifController` before the real instance exists is non-obvious. Trade-off: adds a cooperative cancel protocol between `onGifFound` and `mutation-observer`; any future caller of `img.gifController` must handle the sentinel case. | HANDOFF.md:205–209, §13, §16.3, §16.5 |
| **ADR-0006: Load-order contract for injected modules** | Hard to reverse: the 24-module injection sequence in `injector.js` is load-order-dependent (each module may read globals set by prior modules). Surprising: sequential script injection as a dependency management strategy is unconventional. Trade-off: explicit load order vs. a bundler (deferred by ADR-0001). The load-order contract is mentioned in HANDOFF.md §16.8 but has no ADR. | HANDOFF.md:314–319, §16.8 |
| **ADR-0007: Agent-skills location (CLAUDE/ vs .claude/skills/)** | Hard to reverse: changing the skills directory path would break any agent framework that looks for skills at the old path. Surprising: the choice of `.claude/` vs `CLAUDE/` vs `docs/` is not self-evident. Trade-off: visibility (root-level directory) vs. convention (hidden dotdir). Currently undocumented beyond CLAUDE.md directory listings. | CLAUDE.md:71–83 |

---

## C4: Doc Lifecycle Classification

### 4a. Classification Table

| Document | Lifecycle class | Rationale |
|----------|----------------|-----------|
| `README.md` | **durable-reference** | User-facing installation and usage instructions. Should remain accurate across versions. Contains one stale claim (settings refresh) and one terminology violation (uses "shortcut" in user copy). |
| `CLAUDE.md` | **durable-reference** (with embedded ephemeral data) | Agent instructions intended to persist. Contains one stale version claim (package.json version described as 0.8.0, now 0.9.1) that should be updated. Otherwise structurally durable. |
| `CONTEXT.md` | **durable-reference** | Canonical domain glossary. Designed to be the single authoritative vocabulary source. Has one gap (`GIF_SPEED_SAVE_DEBOUNCE_MS` value blank) and five undocumented code terms. |
| `CONTRIBUTING.md` | **durable-reference** (with one stale claim) | Process instructions for contributors. Stable content. One stale claim: `npm run test:gif` described as GIF-only when it runs all 133 tests. |
| `HANDOFF.md` | **HYBRID — durable-invariants mixed with ephemeral-snapshot** | §12–16 (gotchas, architecture notes, constants, DOM properties, protocol reference) are durable invariants that belong in CONTEXT.md or ADRs. §1–11 (session overview, commit log, current state, open issues) are ephemeral session state that expires after one session. These should be separated. |
| `PRIVACY.md` | **durable-reference** | Published policy document. Contains one FALSE claim (`cache: force-cache` vs actual `cache: 'default'`). High stakes: a published privacy policy with a technically incorrect statement about network behaviour. |
| `docs/ai_generated/adr/0001-window-vsc-global-namespace.md` | **decision** | Canonical ADR. Premises verified true. Passes three-part test. |
| `docs/ai_generated/adr/0002-shadow-dom-controller-isolation.md` | **decision** | Canonical ADR. Premises verified true. Passes three-part test. |
| `docs/ai_generated/domain.md` | **generated** | Meta-doc: instructions for agents on how to consume domain docs. Not a glossary or decision record. Durable as a process guide but contains no verifiable claims. |
| `docs/ai_generated/pip-research/` (5 files) | **research** | Exploratory research on Picture-in-Picture API access. Explicitly NOT implemented (HANDOFF.md §15). Ephemeral research output — should be labelled as speculative/not-implemented. |

### 4b. Provenance Label Design

Two orthogonal labels are recommended for every doc:

**Label 1 — Authorship origin:**

| Label | Meaning | Application |
|-------|---------|-------------|
| `AI-generated` | Document was produced entirely by an AI agent without human editing | `docs/ai_generated/**`, HANDOFF.md (large portions) |
| `human-authored` | Document was written by a human contributor | README.md, CONTRIBUTING.md, PRIVACY.md (original versions) |
| `AI-assisted` | Substantial AI contribution with human review or editing | CONTEXT.md, CLAUDE.md (mixed session) |

**Label 2 — Review status:**

| Label | Meaning |
|-------|---------|
| `reviewed-by-human` | A human contributor has read and approved the content as accurate |
| `AI-unreviewed` | Produced by AI agent; no human review on record |
| `stale-unreviewed` | Previously reviewed but now contains at least one known divergence from code |

**Recommended front-matter field** (add to all docs):

```yaml
---
provenance: AI-generated | human-authored | AI-assisted
review-status: reviewed-by-human | AI-unreviewed | stale-unreviewed
last-verified-sha: <git SHA>
---
```

**Priority review targets** (highest risk, currently AI-unreviewed):

1. `PRIVACY.md` — published policy with a FALSE technical claim. Must be reviewed by a human and corrected (`cache: 'default'` not `force-cache`).
2. `CONTEXT.md` — canonical vocabulary with a blank constant value and five undocumented code terms.
3. `HANDOFF.md` — ephemeral session state mixed with durable invariants; durable portions should be migrated to CONTEXT.md or new ADRs before the next session.
