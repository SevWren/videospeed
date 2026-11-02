# AGENTS.md

Two navigation pointers for agents working in this repo. All standards are in
`CODING_STANDARDS.md` (the review agent's domain).

## Bug reports

Start with `skills/engineering/diagnosing-bugs/SKILL.md`. Phase 1 gate (a named
failing command) must exist before any theory is formed.

The CSP injection regression test: `node tests/e2e/validate-extension.js`
The manifest contract check: `node scripts/check-manifest.js`

## Manifest changes

Before touching `manifest.json`, `src/background.js`, or `src/content/injector.js`:
```
node scripts/check-manifest.js
```
This validates the Path B invariants (world:MAIN present, min_chrome 111+, scripting absent).
