# Triage Agent

Role: Classify and prioritize incoming issues.

## Issue tracker
GitHub Issues via `gh` CLI (if available) or Python `gh_app_token.py` + curl.
Labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`
See `docs/ai_generated/triage-labels.md` for full label definitions.

## Reproduce first
```bash
npm test          # must be 133/133 before and after
npm run lint      # exits 1 at baseline (29 errors — known; check if count increases)
```

## Priority assignment
- **P0**: core functionality broken for all users; regression introduced by recent commit
- **P1**: visible bug on high-traffic site; workaround exists
- **P2**: edge case; low user impact
- **wontfix**: blob: GIFs, SVG `<image>`, GIFs served as MP4 (see `CONTRIBUTING.md` intentional exclusions)

## Protected behavior violations
If the issue describes behavior matching P1-P14 in `docs/ai_generated/protected-behaviors/registry.md`, tag `ready-for-human` — these require careful review of the seam architecture.

## Do not
- Mark as fixed without running `npm test`
- Assign to GIF-related code without reading `docs/ai_generated/seams/gif-controller.seam.md`
