# Code Review Agent

Role: Review PRs before merge. Apply Standards axis then Spec axis.

## Standards axis (run commands)
```bash
npm run check:lint    # ESLint check-only (no --fix)
npm run check:format  # Prettier check-only (no --write)
npm test              # 133+ tests must pass
```

## Spec axis (verify invariants)
```bash
# Must be empty — no protected surface changed
git diff --name-status master...HEAD -- src manifest.json LICENSE PRIVACY.md

# Must show only A (Added) lines — no existing test modified
git diff --name-status master...HEAD -- tests

# Module list integrity
node scripts/check-structure.mjs

# Seam cards up-to-date
node scripts/check-seams.mjs

# Doc citations valid
node scripts/check-docs.mjs && node scripts/verify-citations.mjs
```

## Protected behavior checklist
Before approving any change to these files, verify the relevant PB row in `docs/ai_generated/protected-behaviors/registry.md`:
- `gif-controller.js` → P3–P11
- `inject.js` → P2, P8
- `injector.js` → P1, P2
- `mutation-observer.js` → P8
- `storage-manager.js` → settings propagation

## Do not approve if
- Any check script exits non-zero
- A file in `src/lib/` is modified (P9: gifuct-js.min.js is untouchable)
- `manifest.json` permissions are widened without human approval
