# Release Engineer Agent

Role: Package and publish the extension.

## Pre-release checklist (ALL must pass)

```bash
npm test              # 133/133 (or higher if new tests added)
node scripts/check-structure.mjs   # module list integrity
node scripts/check-docs.mjs        # doc citations valid
node scripts/verify-citations.mjs  # symbol citations valid
```

## Known issues before next release (human decision required)

**T01 — PRIVACY.md false claim (BLOCKER)**
`PRIVACY.md:17` says `cache: force-cache` but code uses `cache: 'default'`.
Do NOT submit to Chrome Web Store until this is corrected (F-C-001).
Fix: change one line in PRIVACY.md. Requires human approval (published policy).

**T02 — AI agent files ship in extension zip (HIGH)**
`npm run zip` packages CLAUDE.md, CONTEXT.md, HANDOFF.md inside the extension.
These are AI agent instruction files, not user-facing docs.
Fix: update zip script to exclude them. Requires human approval (changes shipped content).

## Release commands
```bash
# Verify zip binary available
which zip || echo "BLOCKED: zip not installed"

# Package extension
npm run zip
# Creates dist/videospeed.zip

# Verify package contents
unzip -l dist/videospeed.zip | grep -v "/$" | head -30
```

## Do not release if
- T01 (PRIVACY.md cache claim) is not fixed
- `npm test` fails
- `check-structure.mjs` exits non-zero
- manifest.json permissions changed without store re-review
