# T07: Split HANDOFF.md into durable ADR/context and ephemeral session notes

**Finding**: F-D-001 (HANDOFF.md ~8,800 tokens never auto-loaded, no entry pointer); F-C-003 (5 candidate ADRs undocumented)
**Type**: doc
**Prerequisite tickets**: none (can proceed independently, but benefits from T06 being landed first so the doc can reference the new check scripts accurately)
**Human approval required**: YES — this is significant doc restructuring that affects how every future agent navigates the codebase. The split point between "durable architectural knowledge" and "ephemeral session notes" is a judgment call that requires the human owner's approval. Incorrect categorization could cause agents to ignore durable invariants or retain stale session context.

## Problem

`HANDOFF.md` is approximately 8,800 tokens (~35 KB) and contains two conceptually distinct kinds of content mixed together:

1. **Durable content** (§12–16 per the mission brief): architectural invariants, protected behaviors P1–P14, gotchas for the next LLM, module load-order contracts, and security constraints. This content is permanent and should survive across sessions indefinitely.

2. **Ephemeral content**: session-specific state, in-progress task context, open questions from the last session, and notes about what was tried. This content is only relevant for a short period and should be labeled with an expiry or "valid until" marker.

Currently, a cold-start agent has no way to distinguish which parts of `HANDOFF.md` are architectural ground truth vs. stale session notes. The file is also never auto-loaded (F-D-001, VERIFIED) and has no pointer from `CLAUDE.md`, so most cold-start agents miss it entirely (OBS-02).

## Proposed change

**File 1: Create `docs/ai_generated/architecture-invariants.md`**

Extract the durable content from `HANDOFF.md` (§12–16 and any other sections that describe permanent architectural decisions, protected behaviors, or constraints). Structure it as:
- A brief orientation paragraph
- A cross-reference to `docs/ai_generated/protected-behaviors/registry.md`
- A cross-reference to `docs/ai_generated/adr/`
- The 5 candidate ADRs in stub form (iframe proxy, patch-canvas compositing, sentinel pattern, load-order contract, skills location) — or cross-links to full ADR files if Team L3 has created them
- The "gotchas for the next LLM" list (currently buried in HANDOFF.md §16) reformatted as a numbered checklist

This file should be stable across sessions and updated only when architecture changes.

**File 2: Update `HANDOFF.md`**

After extracting durable content:
- Add a header block:
  ```
  EPHEMERAL — valid for session starting [DATE]. Review before trusting.
  Durable architectural context: see docs/ai_generated/architecture-invariants.md
  ```
- Retain only session-specific state, open questions, and in-progress context.
- Add a `## Expiry` section that states when this content should be considered stale (e.g., after the next session completes).

**File 3: Update `CLAUDE.md`**

Add a pointer line (one line) to both `HANDOFF.md` and `docs/ai_generated/architecture-invariants.md` so cold-start agents discover them. This addresses OBS-02 (HANDOFF.md never auto-loaded, no entry-point pointer).

## Verification command

```bash
# Confirm architecture-invariants.md was created
ls docs/ai_generated/architecture-invariants.md

# Confirm HANDOFF.md now has the EPHEMERAL header
head -5 HANDOFF.md | grep -i "EPHEMERAL"

# Confirm CLAUDE.md has a pointer to architecture-invariants.md
grep "architecture-invariants" CLAUDE.md

# Zero-diff guard (src/ and manifest.json must be untouched)
git diff --name-status master...HEAD -- src manifest.json LICENSE PRIVACY.md
# Must print nothing
```

## Expected diff

```
CLAUDE.md                                       |   3 +++
HANDOFF.md                                      |  ~N -(extracted durable sections) + ~5 +(expiry header)
docs/ai_generated/architecture-invariants.md    | ~150 + (new file)
3 files changed, ~158 insertions(+), ~N deletions(-)
```

## Rollback

```bash
git revert HEAD
```

This restores `HANDOFF.md` to its original content, removes `architecture-invariants.md`, and removes the pointer from `CLAUDE.md`.

## Constraints

- Do not delete any content; only move it. Every paragraph currently in `HANDOFF.md` must appear in exactly one of the two post-split documents.
- `CLAUDE.md` is in the allowed-writes list (Charter §5). The pointer addition is a minimal one-line change.
- The new `docs/ai_generated/architecture-invariants.md` lives under `OUTPUT_ROOT` and is an allowed write (Charter §5).
- OBS-02 and OBS-10 are both partially addressed by this ticket. Note that OBS-10 (5 candidate ADRs undocumented) is only fully addressed if full ADR documents are created by L3 and cross-referenced here.
- After this ticket, `docs/ai_generated/architecture-invariants.md` should be treated as a living document — updated when `src/` changes land that modify invariants. Add a note to that effect in the file header.
