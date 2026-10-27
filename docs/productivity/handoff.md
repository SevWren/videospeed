## What it does

`handoff` compacts the current conversation into a document a fresh agent can pick up and continue from. It saves the output to a temporary directory (not the workspace), so it never clutters the repo.

## When to reach for it

Use `/handoff` at the end of a session when:

- You're handing work to another agent or a future session.
- The conversation has accumulated context that isn't captured in commits, specs, or issues.
- You want to describe what the next session should focus on.

Pass an argument to shape the document toward that goal:

```
/handoff fix the remaining frontier tickets on the GIF playback map
```

## What the document contains

- A brief summary of what was accomplished this session.
- Open threads and decisions still pending.
- References (by path or URL) to artifacts already written — commits, specs, ADRs, issues — rather than duplicating their content.
- A **suggested skills** section naming which skills the next agent should invoke at the start of the new session.

Sensitive information (API keys, passwords, PII) is redacted automatically.

## What it does not do

- It does not write to the repo. Output goes to `$TMPDIR` (or `/tmp`; `%TEMP%` on Windows).
- It does not replace commits, ADRs, or issues. Those are the authoritative record; the handoff document points at them.

## Where it fits

`handoff` is a session-close primitive. Pair it with `/wayfinder` for multi-session efforts: wayfinder holds the map and tickets; handoff bridges the gap between sessions for anything not yet captured in a ticket.
