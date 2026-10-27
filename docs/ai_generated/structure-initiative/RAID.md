# RAID Log

**Program**: AI-Driven Development Scaffold
**Base SHA**: `e904370863d69a2b5d853af62745141953c4860d`

Format: `[type] [date] [status] description`
Types: R=Risk, A=Assumption, I=Issue, D=Dependency
Status: OPEN, MITIGATED, CLOSED

---

## Risks

| ID | Type | Date | Status | Description | Mitigation |
|---|---|---|---|---|---|
| R-001 | R | 2026-10-27 | OPEN | Sandbox is ephemeral; OUTPUT_ROOT data may be lost if session ends before push | Commit after every gate. Push at each gate if remote is configured |
| R-002 | R | 2026-10-27 | OPEN | npm test may become flaky across parallel agent worktrees | Each agent gets its own clean worktree or runs sequentially |
| R-003 | R | 2026-10-27 | OPEN | ADR-0001's load-bearing premise (MV3 prohibits ES-module scope sharing) may be incorrect per Team I research; if false, J4 Build-step option becomes valid | Team I must verify against Chrome docs before P5 Design Lab begins |
| R-004 | R | 2026-10-27 | OPEN | `package-lock.json` was modified in working tree (from `npm install`); must not be committed to WORK_BRANCH if it changes protected surface | Check: `git diff --name-status master...HEAD -- package-lock.json` is allowed (not in ZERO-DIFF list) |
| R-005 | R | 2026-10-27 | OPEN | Cold-start trial threshold (≥30% localization improvement) may not be met by additive-only scaffold | Pre-mortem in Team J must address this; shortfall reported honestly |

---

## Assumptions

| ID | Type | Date | Status | Description |
|---|---|---|---|---|
| A-001 | A | 2026-10-27 | OPEN | npm test 133/133 result at base SHA is stable (not flaky) — to be verified by A2 with 3× runs |
| A-002 | A | 2026-10-27 | OPEN | CONTEXT.md domain vocabulary is authoritative for all agent reports |
| A-003 | A | 2026-10-27 | OPEN | `ai-driven-scaffolding` branch (previous session) is separate from this program; do not merge |

---

## Issues

| ID | Type | Date | Status | Description |
|---|---|---|---|---|
| I-001 | I | 2026-10-27 | OPEN | `docs/ai_generated/adr/` has only ADR-0001 and ADR-0002 but the prompt references them needing format audit (Team C) — to be addressed in P2 |
| I-002 | I | 2026-10-27 | OPEN | CONTEXT.md has blank value for `GIF_SPEED_SAVE_DEBOUNCE_MS` (Appendix B seed #3) — Team C to verify |
| I-003 | I | 2026-10-27 | OPEN | Version discrepancy: `0.9.1` (manifest) vs `0.8.0` (package.json) — do not change; record only |

---

## Dependencies

| ID | Type | Date | Status | Description |
|---|---|---|---|---|
| D-001 | D | 2026-10-27 | OPEN | P5 Design Lab depends on P4 Synthesis R-list; cannot start until G3 |
| D-002 | D | 2026-10-27 | OPEN | P6 Scaffold depends on P5 proposed ADR; cannot start until G4 |
| D-003 | D | 2026-10-27 | OPEN | P7 Verification depends on P6 scaffold; cannot start until G5 |
| D-004 | D | 2026-10-27 | OPEN | Team J needs Team G C-list and Team I research before scoring |
