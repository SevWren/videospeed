---
team: Orchestrator (P4 Synthesis)
base-sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
confidence: high
---

# Contradiction Log

Where two teams' evidence disagrees — and how each was resolved.

---

## CON-01: ADR-0001 premise — "MV3 prohibits ES-module scope sharing"

**Team B** (OBSERVED from injector.js): The pattern is correct — no `import`/`export` used; `window.VSC` serves as shared namespace. B accepts the premise as stated.

**Team I** (VERIFIED from Chrome docs): The premise is PARTIALLY CONFIRMED. MV3 content scripts WITH `"type": "module"` CAN form a module graph in the isolated world. The prohibition applies to the MAIN-world injection pattern this repo uses, not to content scripts generally.

**Resolution**: ADR-0001's premise is **correct for its stated context** (main-world injection via web_accessible_resources script tags). It overstates the constraint as a universal prohibition. The ADR should be amended to add this nuance. Additionally, Team I confirmed that "no source maps" is an engineering preference, not a hard MV3 constraint — a bundler with source maps would also satisfy debuggability in DevTools. **This opens J4 (Build-step) as a valid design candidate** as long as the ADR is amended.

---

## CON-02: PRIVACY.md cache claim vs. code

**Team C** (OBSERVED from PRIVACY.md): Claims `cache: force-cache`.
**Team G** (VERIFIED from gif-controller.js:405): Code uses `cache: 'default'`.

**Resolution**: Code wins. PRIVACY.md is a published policy document with a **FALSE claim** (F-severity for store compliance). This is not a design contradiction — it's a doc defect. Required action: amend PRIVACY.md before next Chrome Web Store submission. Recorded as Blocker finding F-C-001.

---

## CON-03: npm run test:gif scope

**CONTRIBUTING.md** claims: runs GIF-specific tests only.
**Team A (A2)** (VERIFIED by running it): Runs all 133 tests. `gif` filter matches no branch condition in run-tests.js, so the runner executes everything.

**Resolution**: Code wins. CONTRIBUTING.md is STALE. Recorded as Medium finding. Not a blocking issue for this program but must be fixed in a doc-lifecycle step.

---

## CON-04: StorageManager.onChanged callers

**HANDOFF.md §12** (message protocol): Describes `VSC_USER_SETTINGS` as the settings propagation mechanism, suggesting live updates work.
**Team B** (VERIFIED by grep): `StorageManager.onChanged` has zero callers in production code — settings changes from the options page do NOT propagate to already-open tabs. The README says users must refresh the page after changing settings, which is consistent with this architecture.

**Resolution**: No contradiction — HANDOFF.md doesn't claim live propagation; it only documents the initial injection event. The zero-caller state is the designed (if incomplete) behavior. Recorded as Medium finding, not a regression. Team D noted this as a navigation obstacle (agents may assume it propagates).

---

## CON-05: src/module-loader.js status

**manifest.json web_accessible_resources** (OBSERVED): Lists `src/module-loader.js` — it's web-accessible.
**Team B** (VERIFIED by grep): Zero callers anywhere in production. Its three exported globals (`window.VSC_MODULES`, `window.defineModule`, `window.loadModule`) are never used.

**Resolution**: Dead code that is web-accessible and ships in the extension package. Net effect: exposed attack surface with no functionality. Recorded as Medium finding. Migration ticket will cover removal (after characterization tests verify no production use).

---

*No further contradictions identified between teams.*
