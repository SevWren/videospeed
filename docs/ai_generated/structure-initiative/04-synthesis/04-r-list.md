---
team: Orchestrator (P4 Synthesis)
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
confidence: high
---

# Requirements for the Structure (R-list)

Every structure candidate (Team J) and every scaffold element (Team L) MUST satisfy all R-items marked **MUST**. Items marked **SHOULD** are strong preferences that may be traded off with explicit justification.

Teams J and L consume this list together with the C-list (04-synthesis/05-c-list.md).

---

## R-01 — Protected behaviors must be machine-verifiable [MUST]

**From**: OBS-01, RCC-01
**Finding evidence**: Teams D (distance-3 for P2-P8), E (zero test assertions)

The chosen structure MUST include:
- A structured protected-behavior registry (PBID, rule, code location, test location or "untestable: reason")
- At least one check script that fails if any cited path in the registry does not exist
- Contract test stubs for every protected behavior that has a code location (even if the test is a characterization test that can be upgraded later)

A scaffold element that documents PBs without verifying them is a no-op and fails this requirement.

---

## R-02 — Every cold-start agent entry point must surface critical invariants within 2 hops [MUST]

**From**: OBS-02, OBS-04, OBS-10, RCC-03
**Finding evidence**: Teams D, H, I

The chosen structure MUST include:
- A root entry file (CLAUDE.md and/or AGENTS.md) that, within ≤200 lines:
  - Points directly to the protected-behavior registry
  - Points to the module dependency order contract
  - Points to the `window.VSC` global namespace registry
  - Points to the task-suite runbooks (or the ADR that explains the architecture)
- Maximum 2 hops from the entry file to any critical invariant

A cold agent that reads only the entry file and follows its first link must be able to answer: "what breaks if I modify gif-controller.js?"

---

## R-03 — All 14 protected behaviors must have test coverage or an explicit "untestable + reason" [MUST]

**From**: OBS-03, RCC-01
**Finding evidence**: Team E (P2, P3, P4, P6, P7, P8 untested)

The chosen structure MUST include:
- Contract/characterization tests for PBs P2, P3, P4, P6, P7, P8 (the six with zero coverage)
- For PBs that cannot be unit-tested in JSDOM (P7 pixel-level color — JSDOM Canvas 2D is limited), a documented "untestable in JSDOM: reason + what real-Chrome test would verify"
- These tests must be registered in `tests/run-tests.js` or discoverable by the runner (new files under `tests/unit/` or `tests/integration/` are auto-discovered per CONTRIBUTING.md)

---

## R-04 — The module list must have exactly one source of truth, enforced by a check script [MUST]

**From**: OBS-05, RCC-02
**Finding evidence**: Teams B, G

The chosen structure MUST include:
- A `check:structure` script that verifies: injector.js load order = manifest.json WAR list (accounting for glob expansion) = module registry
- The script must exit non-zero and print the discrepancy if any of the three diverge
- The module registry must be a single authoritative file (not derived from three places)

A structure that adds documentation of the module list without enforcement does not satisfy this requirement.

---

## R-05 — A non-mutating check gate must exist and be the CI gate [MUST]

**From**: OBS-06, RCC-04
**Finding evidence**: Teams E, F, A2

The chosen structure MUST include:
- `npm run check:lint` — ESLint check-only (no --fix)
- `npm run check:format` — Prettier check-only (no --write)
- These entries in package.json `scripts` (allowed write per charter §5)
- A CI proposal (already drafted by F5) that uses these commands

The existing `build` script MUST NOT be used in CI. This requirement can be met without modifying `build` — the check:* scripts are additive.

---

## R-06 — Published policy documents must be verified against code before any structure is committed [MUST]

**From**: OBS-07, RCC-05
**Finding evidence**: Teams C, G

This is a pre-condition for the program, not a scaffold requirement:
- PRIVACY.md must be corrected (cache: force-cache → cache: 'default') before the next Web Store submission
- This correction is NOT in scope for the additive scaffold (it touches PRIVACY.md which is in ZERO-DIFF)
- **Action**: Record as a migration ticket, flag to the human for approval before any release

For the scaffold:
- The `check:docs` script MUST verify that every file cited in agent-facing docs exists at the given path
- Doc provenance labels (Team C lifecycle design) MUST be added to all generated docs going forward

---

## R-07 — The scaffold must not replicate the VSC_SAVE_SETTINGS validation gap [MUST]

**From**: OBS-08, RCC-05, G C-list
**Finding evidence**: Team G

Any new CustomEvent listener introduced by the scaffold (e.g., for check scripts or runbooks) MUST include payload schema validation. The scaffold MUST NOT add new message channels without origin/source checking.

This applies to Team L's check scripts if they use CustomEvent for IPC (they should not — use Node ESM module imports instead).

---

## R-08 — Every scaffold element must earn its context-load cost [SHOULD]

**From**: D navigability rubric
**Finding evidence**: Team D

For each element added by Team L, apply the D rubric:
- Does it change agent behavior vs. the default? (no-op test)
- Does it have a single source of truth?
- Does it cache only what an agent cannot find by looking at the environment?
- Is its always-loaded token cost justified by the navigation improvement it provides?

A module card that merely restates the file path and module name from CLAUDE.md fails this requirement.

---

## R-09 — Structure must be fully additive; zero runtime code changes [MUST]

**From**: Charter §3
**Finding evidence**: All teams

The scaffold branch diff must satisfy:
```
git diff --name-status master...HEAD -- src manifest.json LICENSE PRIVACY.md
```
This must print nothing. Any element that requires touching `src/**` becomes a migration ticket, not a scaffold step.

---

## R-10 — The scaffold must be resumable across sessions [MUST]

**From**: Charter §12.10
**Finding evidence**: H (ephemeral sandbox), HANDOFF.md §16.10

STATE.md must be updated at every gate. Every committed output file must be self-contained enough that a fresh session reading only STATE.md and following its "next three actions" can proceed without this conversation's context.
