# Video Speed Controller — Multi-Agent Investigation & Remediation Prompt

Project: `SevWren/videospeed`  
Reported branch: `master`  
Reported prompt HEAD: `144746a` — **HEARSAY until pinned in G0**  
Status: **SPECIFICATION ONLY. No command in this document has been executed by the author of this correction.**  
Supersedes: `VSC_MultiAgent_Investigation_Prompt_2026-10-26.md`

---

# PART I — INVESTIGATION PROTOCOL

## 0. Precedence, scope and reading rules

### 0.1 Single operative instruction set
This document is the single operative instruction set for the investigation.

1. Part I overrides Part II wherever they conflict.
2. Part II retains the original mission, environment, constraints and message protocol, amended only where Part I requires it.
3. All “MUST NOT do” constraints in §19 remain in force without exception.
4. Human decisions recorded in §13 override the corresponding default.
5. All numeric parameters are OPERATIONAL defaults (§13.2), not facts about the repository.

### 0.2 Provenance classes
Agents MUST keep these classes separate.

| Label | Meaning | May it support KK? |
|---|---|---|
| SOURCED | Taken from an external source listed in §22, at the stated confidence | Only after in-repo replay where the claim concerns this repo |
| DIGEST | Read statically from the supplied `digest.txt` / `HANDOFF.md`; nothing executed | No — sub-class of HEARSAY until replayed |
| HEARSAY | Any assertion from the prompt, HANDOFF, CONTEXT, commit messages, issue text, screenshots not supplied, or an agent summary | No |
| OPERATIONAL | A definition, rule, snippet or default invented for this protocol | No — it is instructions, not evidence |

### 0.3 Status of this document
This document corrects structure and protocol only. It does **not** verify any claim about the repository, the commits, the tests, GitHub state, or runtime behavior.

---

## 1. Mission and reported symptoms

You are the **Orchestrator Agent** for a forensic investigation and, only after verification, remediation of a Manifest V3 Chrome WebExtension.

Two symptoms are **reported**, not confirmed:

| ID | Reported symptom | Reported evidence | Status |
|---|---|---|---|
| A | Keybinding changes in Options → Shortcuts neither apply at runtime nor persist after Save | `keybind_bugs.png` (not supplied) | HEARSAY |
| B | GIF speed overlay attaches to non-GIF elements on third-party pages, reportedly Gmail inbox list items | `gif_bugs.png` (not supplied); GitHub issue #9 | HEARSAY |

Severity `P0 (A)` / `P1 (B)` is **provisional triage**, to be re-justified from ledger entries at Gate 2.

Mandate, in order:

1. Pin the environment and seed the ledger.
2. Investigate both symptoms to D3 or explicitly escalate.
3. Publish only ledger-supported issue text.
4. Write red-at-production-path tests, then minimal fixes.
5. Verify in clean worktrees; only then commit, push, confirm remote SHA, and close issues.

---

## 2. The Rumsfeld Matrix

### 2.1 Sourced background
| # | Fact | Label |
|---|---|---|
| 1 | On 12 Feb 2002, at a DoD briefing with Gen. Myers, Rumsfeld named three categories: known knowns, known unknowns, unknown unknowns (“the ones we don’t know we don’t know”), and said the last tend to be the hard ones. | SOURCED (SRC-1, SRC-2, SRC-3) |
| 2 | The wording was not read from the Defense.gov transcript page by the addendum author (the page blocks automated fetching); it was corroborated by a search snippet, Wikipedia’s quotation and agreeing reprints. | SOURCED, **snippet-level confidence** |
| 3 | Rumsfeld did not originate the concept: his memoir’s author’s note credits William R. Graham on the Ballistic Missile Threat Commission in the late 1990s; Wikipedia reports procurement usage by the late 1960s. | SOURCED (SRC-3, SRC-4) |
| 4 | The Johari window (Luft & Ingham, UCLA, 1955) is an earlier 2×2 of known/not-known to self × known/not-known to others. | SOURCED (SRC-6) |
| 5 | The fourth cell, “unknown knowns”, was added by Žižek (2004) for disavowed beliefs; Rumsfeld did not name it. | SOURCED (SRC-5) |
| 6 | The awareness × understanding 2×2 is a later organizing device; Wikipedia reports Krogerus calling it the “Rumsfeld matrix”. | SOURCED (SRC-4) |

### 2.2 Cells and their operational meaning
| Cell | Operational meaning here |
|---|---|
| **KK** Known Known | A claim backed by evidence an independent agent replayed: a command plus captured output at a pinned SHA, or `path::symbol` plus exact observed text at that SHA. |
| **KU** Known Unknown | A registered question with an owner, an answering method and a due gate. **Not an answer.** |
| **UK** Unknown Known | **UK-T** (tacit/unread): the answer already exists in repo, docs, tests, git history or issues and has not been read. **UK-D** (disavowed): evidence contradicting the leading hypothesis is being ignored or explained away. |
| **UU** Unknown Unknown | Cannot be listed directly. Never “filled”. Hunted via `FW-1…FW-8` (§7), which convert UU into KU/KK/UK. |

### 2.3 Hard rules
- **R1.** A UU cell MUST NEVER be declared empty. The only permitted statement is: *“N sweep rounds ran; the last M consecutive rounds surfaced zero new entries.”*
- **R2.** Every assertion in the original prompt, HANDOFF, CONTEXT, commit messages, issue text and prior agent summaries is HEARSAY. It enters the ledger as `UK-T` and becomes KK only through replayed evidence at the pinned SHA.
- **R3.** A producer MUST NOT upgrade its own entry to VERIFIED/KK. Only a Verification Agent that did not produce it may do so.
- **R4.** Sweep identifiers (`FW-n`), source identifiers (`SRC-n`) and seed identifiers (`SD-n`) are disjoint namespaces. Never shorten them to a bare `S`.

---

## 3. The Matrix Ledger

**File:** `MATRIX_LEDGER.md` in the working directory, created at G0.  
Append-only: status changes add a history line; nothing is deleted or rewritten.

### 3.1 Schema — one row per entry
| Field | Rule |
|---|---|
| `entry_id` | Immutable. Assigned at creation as `SD-n`, `H-*`, `KU-n`, `UK-n`, or `E-n`. It does **not** encode the current cell. |
| `cell` | Mutable: KK / KU / UK-T / UK-D. Every change adds a history line. |
| `bug` | `A` (keybinding), `B` (GIF), `X` (cross-cutting/tooling) |
| `statement` | One falsifiable sentence |
| `provenance` | SOURCED / DIGEST / HEARSAY / OPERATIONAL |
| `sha` | Output of `git rev-parse HEAD` when evidence was gathered. Never assumed. |
| `evidence` | An executed command + captured stdout/stderr/exit code, or `path::symbol` + exact observed text. Line numbers required once a pinned SHA exists. |
| `prediction` | What would be observed if the statement were false |
| `depth` | D0–D3 (§3.3) |
| `owner` | Producing agent |
| `verifier` | A different agent; empty until verified |
| `status` | State machine below |
| `out_of_scope_reason` | Required for OUT_OF_SCOPE; Orchestrator proposes, **human confirms** |
| `history` | Append-only lines: timestamp, agent, old → new, evidence pointer |

### 3.2 State machine
```text
OPEN ──evidence attached──> EVIDENCED ──independent ACCEPT──> VERIFIED
  │                            │
  └──────────> REFUTED <───────┘

any non-terminal state ──> ESCALATED        (human decision required)
any non-terminal state ──> OUT_OF_SCOPE     (human confirmation required)
```

- Seeds enter as `OPEN`, `depth D0`, `provenance HEARSAY`, with a digest pointer in `evidence` clearly marked **not executed**.
- `VERIFIED` is terminal. New contradicting evidence opens a **new** entry linked to the old one.
- `UNVERIFIED` is not a status. It is a provenance note on an OPEN seed.

### 3.3 Depth levels
| Level | Name | Requirement |
|---|---|---|
| D0 | Symptom | Observed behaviour or reported text; no code location |
| D1 | Location | File + symbol where the behaviour arises, found by tracing, not by guessing from names |
| D2 | Mechanism | A reproduction: a failing test or script at the pinned SHA, failing **for the stated reason** |
| D3 | Root cause | D2 **plus all four**: (a) **counterfactual** — revert → red, apply → green; (b) **origin** — `git log -S` / `git blame` identifies introduction, and that commit’s message and tests were read; (c) **blast radius** — every caller, writer, reader and duplicate of the changed symbol listed with a disposition; (d) **miss analysis** — why the measured baseline suite did not catch it |

Any statement presented as a **root cause** — in an issue, commit message or final report — MUST be D3.

### 3.4 Certified words
| Word | Definition |
|---|---|
| **Valid** | Reproducible by a non-producer, from the stated command, at the stated SHA, with identical result; and falsifiable (a prediction exists). |
| **Complete** | Every in-scope symptom has a D3 chain; every KU answered, refuted or escalated; every §6 source read and recorded; FW-1…FW-8 run under the §7 stop rule; ledger arithmetic closes (B1); **zero ESCALATED items**. |
| **Deeply rooted** | Every root-cause claim is D3; no entry rests solely on HEARSAY; blast radius and prior-fix regression checks recorded. |

If any item is ESCALATED, the outcome is **ESCALATED–INCOMPLETE**, never “Complete”.

### 3.5 Sweep log
Sweeps are recorded in a separate **sweep log** section inside `MATRIX_LEDGER.md`.

- There are **no UU ledger rows**.
- A sweep either:
  - creates new `KU` / `UK` / `E` entries, or
  - records `zero new`.
- UU is a target, not a recordable answer.

---

## 4. Loop model

### 4.1 Producer loop
Applies to every Alpha, Beta, Gamma, Delta agent and sub-agent.

```text
P1 DECLARE     Register entries BEFORE probing: claim, question, unread source, applicable sweeps.
P2 PROBE       Run commands / read code. Write RAW output into the evidence field.
P3 RECLASSIFY  Move cell/status as facts change; append a history line.
P4 DISCONFIRM  For each leading hypothesis, name the strongest alternative and try to refute it.
P5 SELF-GATE   Test every item of your exit standard (§5). Any failure ⇒ return to P2.
P6 SUBMIT      Hand ledger entries (not narrative) to Verification. Wait for a verdict.
```

A producer exits only on **ACCEPT** for its entries. Self-assessment never ends a loop.

**Producer iteration cap:** default 5 per phase, then ESCALATE with the residual KU/UU statement.

### 4.2 Verification loop
Applies to every Verification Agent.

```text
V1 INTAKE     Receive entries + commands ONLY. No producer reasoning or summary.
V2 REPLAY     Re-run each command in a clean worktree at the entry's SHA (§9).
V3 ATTACK     Falsify using the entry's own prediction plus at least one alternative.
V4 SWEEP      Run assigned FW sweeps (§7) against the claims.
V5 VERDICT    ACCEPT / REJECT(defect list) / ESCALATE per entry. Defects become new entries.
V6 BREAK-OUT  Test B1–B13 (§8.2) for your scope. Any failure ⇒ next round.
```

A Verification Agent exits only when **all B1–B13 hold for its scope**.

**Verification round cap:** default 5 per gate, then ESCALATE.

### 4.3 Terminology
- **Iteration** = one P1–P6 pass by one producer.
- **Round** = one full execution of FW-1…FW-8 across the current scope (§7.2).
- **Gate** = a phase boundary requiring audited ACCEPT verdicts (§11).

---

## 5. Producer teams: objectives and exit standards

No agent may submit at P6 until **every** item in its row is true.

| Agent | Objective | Exit standard |
|---|---|---|
| **α1 Git Diff Analyst** | Classify every hunk of the reported suspect commit; trace full history of suspect symbols | (1) Range pinned with `git rev-list`, not “48 hours” or `HEAD~8` (SD-15). (2) Every hunk of the reported suspect commit classified functional vs diagnostic; classified count == total hunk count. (3) Every removed identifier checked with `git grep <id> <sha> -- src tests` at `suspect~1` and HEAD. (4) `git log -S` run for `keyBindings`, `VSC_SAVE_SETTINGS`, `onChanged`, `isGifSrc`, `frames.length`. (5) Each finding names a regression-test candidate. |
| **α2 Static Code Archaeologist** | Complete, edge-verified call graphs for save, apply and GIF-detect paths | (1) Every graph edge confirmed by `git grep`; no inferred edges. (2) Every writer/reader of `keyBindings` and every call site of `chrome.storage.sync.set`, `StorageManager.set`, `config.save` listed (FW-1). (3) Every parallel GIF-predicate implementation listed with disposition (FW-4). (4) Every in-scope hypothesis at D2 or REFUTED; out-of-scope items routed to human confirmation. |
| **α3 Test Coverage Auditor** | Prove what the suite does and does not exercise | (1) Every “covered” claim backed by a mutation in a scratch worktree: break the path, run `npm test`, record failing tests. No failure ⇒ uncovered. (2) Runner registration checked — `tests/run-tests.js` lists files explicitly (SD-12). (3) Baseline pass count **replayed**, never quoted. |
| **β1 Issue Author** | Publish only ledger-supported claims | (1) Every sentence carries a ledger ID. (2) Sentences below D2 are explicitly phrased as hypotheses. (3) Open **and closed** issues searched for duplicates. (4) **No POST before Gate 2 ACCEPT.** Pre-written claims such as “introduced between 914b85c and 144746a” and “affects 100% of users” MUST be deleted or reworded. |
| **β2 Triage Classifier** | Evidence-based priority | Every triage criterion maps to a ledger entry or is deleted. |
| **γ3 Test Author** | Red-for-the-right-reason tests at the production path | (1) Fails pre-fix with an assertion naming the symptom. (2) Expected values are literals from an independent source, never recomputed from the code. (3) Exercises the **production** path, not a helper with no production caller (SD-08). (4) Registered and executed; pass-count delta observed (SD-12). (5) Mutation check: a subtly wrong fix still fails it. |
| **γ1 / γ2 Fix Engineers** | Minimal change at the D3 root | (1) Plan cites D3 entries only. (2) Blast-radius list: files to change **and files that must not change**. (3) FW-6 prior-fix check per hunk — do not undo `414c6a2` (SD-11). (4) FW-3 counterfactual recorded. (5) `git diff --stat` equals the planned file list. |
| **δ1 Regression Runner** | Clean-room results | (1) Fresh worktree at candidate SHA (§9). (2) Output saved verbatim. (3) Per-file results reconcile with the total: a file that fails to import counts as **one** failure, not N. |
| **δ2 Integration Verifier** | Contract checks by execution | (1) Each check is a command, not a read. (2) Anything JSDOM/mocks cannot establish (real `chrome.storage` limits, page-world isolation, real Gmail DOM) is a **residual KU**, never “verified” (SD-13). (3) Any auxiliary script (`test:unit`, `test:integration`, `lint`) is used only after confirming it does not introduce Jest or another forbidden runner. |
| **δ3 Gatekeeper** | Push only verified work | (1) Gate 4 ACCEPT from all four VAs. (2) `git diff --stat` matches plan. (3) Commit messages cite ledger IDs. (4) After push, `git ls-remote origin master` equals local HEAD. |

---

## 6. Mandatory UK sources-read register

Alpha and VA-4 MUST read each source below and record **per source** what was extracted, or the exact command showing a null result. This register lives inside `MATRIX_LEDGER.md`. No conclusion precedes it.

1. `README.md` (FAQ; refresh-after-saving line), `CONTEXT.md` (Key Binding: `key` is an integer keyCode), `CLAUDE.md`, `HANDOFF.md`, `CONTRIBUTING.md`, both ADRs.
2. Entire history of every touched file: `git log --follow -p -- <file>`. Not only the last 48 hours.
3. `git blame` on every line to be changed.
4. All GitHub issues, open and closed, including **#8 and #9**.
5. Every test file touching changed symbols, plus `tests/run-tests.js`.
6. `manifest.json` (content-script scope, `web_accessible_resources`) — **read-only**.
7. `src/lib/gifuct-js.min.js` — **read-only**, for single-frame frame-count behaviour. Zero writes; the vendored-file prohibition is unchanged.

A source that cannot be accessed is a **KU with an owner**, not a silent omission.

---

## 7. UU forcing sweeps `FW-1 … FW-8`

A sweep is a procedure whose result the producer cannot predict. Each sweep appends new `KU/UK/E` entries **or** a `zero new` line to the **sweep log**.

> **There are no UU ledger rows.** UU is a target, not a recordable answer (R1).

| ID | Sweep | Procedure |
|---|---|---|
| **FW-1** | Writers / readers | For every storage key, DOM event, global and message touched: `git grep` all writers and all readers across `src/` and `tests/`; list each with file + symbol. |
| **FW-2** | Bisect | Write one deterministic red script returning exit 0/1. Prove a known-good SHA passes it. Then `git bisect run` between that SHA and HEAD in a **dedicated bisect worktree**. Also run at `suspect~1` and `suspect`. Confirm or refute the introducing commit. |
| **FW-3** | Counterfactual + mutation | Revert fix → red; apply → green; apply a subtly wrong variant → still red. |
| **FW-4** | Duplicate logic | Enumerate every implementation of the same predicate — at minimum `detectGifsInDOM`, `MediaElementObserver.scanForGifs`, and inline checks in `mutation-observer.js` (SD-08). Each needs a disposition. |
| **FW-5** | Environment variation | Stale second instance (tab loaded before Save); page-world vs content-script vs options-page context; `file://` vs `https://`; iframe vs top frame; Gmail-like DOM (many small images, lazy loading, `naturalWidth == 0`, 1×1 images, **single-frame GIF**). |
| **FW-6** | Prior-fix regression | Per changed hunk: `git log -S'<snippet>'`; read the introducing commit’s message and tests; confirm the change does not undo it. |
| **FW-7** | Test reality | New tests execute (count delta), fail for the right reason, are not tautological, and are mutation-sensitive. |
| **FW-8** | Adversary | A fresh agent is told *“the leading hypothesis is wrong”*. It MUST produce ≥3 alternatives (default). Each is refuted with evidence or becomes a KU. Hunt UK-D explicitly. |

### 7.2 Stop rule
Run rounds of FW-1…FW-8. A round is **clean** iff it produces:

- zero new ledger entries, **and**
- zero status / cell / depth changes, **and**
- zero new residual KUs.

Stop after **2 consecutive clean rounds**. Cap at **5 rounds**; at the cap, ESCALATE with the residual statement and the outcome `ESCALATED–INCOMPLETE`.

A clean-round stop means *the sweeps stopped finding things*. It never means *there are no unknown unknowns*.

---

## 8. Verification team and break-out conditions

### 8.1 Team — independent of all producers
| Agent | Certifies | Core duty |
|---|---|---|
| **VA-1 Evidence Replayer** | Valid | Blind replay of 100% of in-scope entries in clean worktrees |
| **VA-2 Completeness Auditor** | Complete | Ledger arithmetic, sources-read register, sweep log, residual KUs |
| **VA-3 Depth Auditor** | Deeply rooted | D3 elements (a)–(d) for every root-cause claim |
| **VA-4 Adversary** | UU / disconfirmation | FW-8 and FW-1; hunts UK-D |

**Independence rules**

- **I1.** A VA MUST NOT have produced any entry it verifies. Orchestrator-created seed rows are protocol inputs, not producer findings, and must still be replayed.
- **I2.** V1 intake excludes producer reasoning: claims + commands only.
- **I3.** Verdicts are cross-audited: **VA-1 ↔ VA-3**, **VA-2 ↔ VA-4**. An unaudited verdict does not count.
- **I4.** The Orchestrator MUST NOT override a REJECT. Only the human can, and any human override MUST be recorded as a ledger entry.
- **I5.** Silence, timeouts, and “no defects found” without replay output are not ACCEPT.

### 8.2 Break-out conditions — ALL must hold for the VA’s scope
| ID | Condition |
|---|---|
| **B1** | **Arithmetic closes:** total entries = VERIFIED + REFUTED + OUT_OF_SCOPE(human-confirmed) + ESCALATED. Zero OPEN, zero EVIDENCED left dangling, zero entries lacking an evidence field. Any ESCALATED forces outcome `ESCALATED–INCOMPLETE`. |
| **B2** | 100% of in-scope KK replayed by a non-producer; identical results. |
| **B3** | Every root-cause claim is D3 with (a)–(d) present. |
| **B4** | Each leading hypothesis has ≥1 alternative refuted by evidence, not assertion. |
| **B5** | §6 sources-read register complete; each source has an extraction or a null-result command. |
| **B6** | FW-1…FW-8 executed; §7.2 stop rule satisfied **or ESCALATED**. |
| **B7** | Every symbol the fix touches has all callers/duplicates listed with a disposition. |
| **B8** | FW-6 recorded per hunk. |
| **B9** | New tests executed (count delta), red pre-fix for the stated reason, green post-fix, mutation-sensitive. |
| **B10** | Zero entries whose only evidence is the prompt, HANDOFF, a commit message, issue text or an agent summary. |
| **B11** | Anything not provable in JSDOM is backed by pasted human-run output (§10) or listed as a residual KU. Never labelled “verified”. |
| **B12** | VA-1…VA-4 all ACCEPT, every verdict cross-audited under I3. |
| **B13** | Residual-risk statement present: rounds run, sweeps run, residual KUs, every ESCALATED item. |

### 8.3 Verdict format
```text
VERDICT:   ACCEPT | REJECT | ESCALATE
SCOPE:     <entry_ids>
SHA:       <pinned>
REPLAYED:  <commands + exit codes>
DEFECTS:   <entry_id → defect → evidence required to cure>
BREAK-OUT: B1 ✔/✘ … B13 ✔/✘
OUTCOME:   COMPLETE | ESCALATED-INCOMPLETE
```

---

## 9. Clean-room replay procedure

1. `git rev-parse HEAD` → record the **actual** pinned SHA. Do not assume `144746a`.
2. Record Node version and whether `node_modules` exists. If absent, register a KU before proceeding.
3. `git worktree add /tmp/vsc-verify-<sha> <sha>`
4. `ln -s <repo>/node_modules /tmp/vsc-verify-<sha>/node_modules`  
   **Do not use `npm ci`**: the supplied tree shows no `package-lock.json` (SD-16).
5. Run the entry’s command inside the worktree. Save stdout, stderr and exit code verbatim.
6. For FW-2, use a **separate** bisect worktree; never bisect the replay worktree or the working branch.
7. Remove afterwards: `git worktree remove /tmp/vsc-verify-<sha>`.
8. Test execution is **`npm test` only**. Never `npx jest`; never add `jest.config.js`.

---

## 10. Human-run evidence

### 10.1 Preconditions — OPERATIONAL, unverified
The snippets below assume symbols (`videoSpeedConfig`, `getGifElements`, `_frames`, `_gifWidth`, `_gifHeight`) that have **not** been verified to exist. Before asking the human to run them, α2 MUST confirm each symbol with `git grep` at the pinned SHA and record the result. If a symbol is absent, replace the snippet with a read-only inspection of the actual controller registry, or escalate. **Never add a getter, hook or log to production code to make a snippet work.**

Console `console.log` usage here is human-side evidence collection. It is **not** committed diagnostic code and does not relax §19.

### 10.2 Snippet A — Bug B (resolves KU-6)
Run in DevTools on the affected page, with the console context set to the frame that holds the image:

```js
(window.VSC?.videoSpeedConfig?.getGifElements?.() ?? []).map((img) => ({
  src: img.src,
  currentSrc: img.currentSrc,
  complete: img.complete,
  naturalWidth: img.naturalWidth,
  naturalHeight: img.naturalHeight,
  attrWidth: img.getAttribute('width'),
  attrHeight: img.getAttribute('height'),
  frames: img.gifController?._frames?.length ?? null,
  gifW: img.gifController?._gifWidth ?? null,
  gifH: img.gifController?._gifHeight ?? null,
  html: img.outerHTML.slice(0, 300),
}));
```

### 10.3 Snippet B — Bug A (discriminates H-A3)
Run in **Options page** DevTools before changing anything:

```js
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  const kb = changes.keyBindings;
  console.log(
    new Date().toISOString(),
    Object.keys(changes),
    kb ? kb.newValue.map((b) => `${b.action}:${b.key}`).join(' ') : '(keyBindings unchanged)'
  );
});
```

Procedure:

1. Open a second tab on a page with a video **before** pressing Save.
2. In Options, change one binding to a key **not already bound** — derive this from `DEFAULT_SETTINGS` at the pinned SHA; `E`/69 is already Rewind (SD-05). Press Save; record the log line.
3. In the second tab press a key bound to a speed action; record every new log line.
4. Reload Options; record the displayed binding.
5. Repeat 1–4 with the second tab reloaded **after** Save.
6. Paste all output verbatim into the ledger.

Use action names `faster` / `slower` and **integer keyCodes**, not `increaseSpeed` / `'e'` (SD-06).

---

## 11. Orchestration and gates

| Gate | After | Requirement to pass |
|---|---|---|
| **G0 Pin & Seed** | Phase 0 | Actual SHA, branch, Node version, `node_modules` presence, verbatim baseline `npm test`, ledger created, all HEARSAY entered, §12 seeds entered, blocking §13 human answers collected. Not a VA gate. |
| **V-Gate 1** | Phase 1 (α1 ∥ α2 ∥ α3) | Four audited ACCEPTs for Alpha scope; B1–B13 for that scope. |
| **V-Gate 2** | Phase 2 (β1 → β2) | Issue text verified **before any POST**; no sentence above its ledger depth. |
| **V-Gate 3a** | γ3 red tests | Red at the **production path**, for the stated reason; registered; mutation-sensitive. |
| **V-Gate 3b** | γ1 ∥ γ2 fixes | Counterfactual, blast radius, FW-6 per hunk, D3 citations. |
| **V-Gate 4** | Phase 4 (δ1 ∥ δ2 → δ3) | Full ledger, all B1–B13. Only then commit, push, confirm remote, close issues. |

Phase order:

```text
PHASE 0  Pin & seed                         → G0
PHASE 1  Alpha producer loops P1–P6         → V-Gate 1
PHASE 2  β1 then β2                         → V-Gate 2 (before POST)
PHASE 3  γ3 red tests → 3a; γ1 ∥ γ2 → 3b
PHASE 4  δ1 ∥ δ2, then δ3                   → V-Gate 4
```

A producer receiving REJECT returns to P2 with the defect list. Any gate hitting its cap ESCALATEs. **The Orchestrator never pushes past an escalation.**

---

## 12. Seed ledger

**Every row below is HEARSAY (read statically from the supplied digest; nothing executed).**  
Status on entry: `OPEN`, depth `D0`. VAs MUST replay or re-read each at the pinned SHA and add line numbers. Several rows show the original prompt disagreeing with the digest; these are the first things the matrix must catch.

### 12.1 Statements (`SD-*`)
| ID | Statement | Digest location | Why it matters |
|---|---|---|---|
| SD-01 | Options saves via `save_options()` → `window.VSC.videoSpeedConfig.save()` → `StorageManager.set()`, which calls `chrome.storage.sync.set` directly when `chrome.storage` exists; `VSC_SAVE_SETTINGS` is dispatched only in the no-`chrome.storage` (page-world) branch. | options.js, settings.js, storage-manager.js | The original α2 claim “options.js dispatches VSC_SAVE_SETTINGS” may not match the code |
| SD-02 | The `sync.set` callback never reads `chrome.runtime.lastError`; `save` then logs success. Chromium limits: 8192 B/item, 102400 B total, 512 items, 120 writes/min, 1800 writes/hour; over-limit writes fail and set `lastError`. | storage-manager.js, settings.js; SOURCED SRC-7 | A rejected write is silent |
| SD-03 | After saving, `save_options` checks only that `keyBindings.length` is unchanged. | options.js | A changed key keeps length equal, so a non-persisted change passes |
| SD-04 | No `src/` code registers `chrome.storage.onChanged`; `StorageManager.onChanged` has no caller in the digest. README says to refresh the viewing page. | storage-manager.js, README.md | “Not applied at runtime” may be existing behaviour, not a regression (KU-2) |
| SD-05 | `handleKeydown` uses `keyBindings.find(item => item.key === keyCode)` — first match by integer keyCode. Default `E` (69) is Rewind. The original repro changes Increase speed from `C` to `E`. | event-manager.js, constants.js | The repro key collides; the later binding is unreachable |
| SD-06 | Action names are `faster` / `slower`; `key` is an integer keyCode. The original test spec uses `increaseSpeed` and `'e'`/`'c'`. | constants.js, CONTEXT.md | Prompt-as-written tests would not match the real data shape |
| SD-07 | `EventManager.setupKeyboardShortcuts` calls `window.VSC.inIframe()`; `dom-utils` defines `window.VSC.DomUtils.inIframe`; no assignment to the former appears. The call is inside try/catch. | event-manager.js, dom-utils.js | Possible latent defect; confirm with `git grep`; scope must be ruled on, not skipped |
| SD-08 | Production GIF scan is `MediaElementObserver.scanForGifs` plus inline checks in `mutation-observer.js`; `detectGifsInDOM` has no production caller in the digest. The original plan stages only `gif-observer.js` + test. | inject.js, media-observer.js, mutation-observer.js, gif-observer.js | A fix limited to gif-observer.js may leave production untouched |
| SD-09 | The 20 px filter applies only when `naturalWidth > 0 && naturalHeight > 0`; unloaded images pass unfiltered. | gif-observer.js, media-observer.js | Raising the threshold would not affect unloaded images |
| SD-10 | `GifController.create` returns without replacing only when `!frames || frames.length === 0`; a single-frame GIF has length 1. | gif-controller.js | Static GIFs may receive a controller |
| SD-11 | `create()` deliberately prefers a `.gif` URL over `currentSrc`, because `currentSrc` may be a WebP from `<picture>` (commit `414c6a2`). | gif-controller.js, HANDOFF.md §5 | Original Option C would reverse a prior fix |
| SD-12 | `tests/run-tests.js` lists files explicitly; `npm run test:gif` passes `gif`, matching no branch, so all tests run. New files are not executed unless listed. | run-tests.js, package.json | The “133 + new” gate can silently ignore new tests |
| SD-13 | `tests/e2e/e2e-utils.js` hard-codes a macOS Chrome path; the environment is Linux. | e2e-utils.js | Real-browser verification unavailable by default; residual KU |
| SD-14 | Both bug screenshots are referenced but not supplied. | original prompt | §10 |
| SD-15 | “48 hours” and `git diff HEAD~8 HEAD` are not the same set; the table lists six commits; the window start `914b85c` is asserted without bisect evidence. | original prompt | Pin with `git rev-list`; confirm with FW-2 |
| SD-16 | The tree lists `package.json` but no `package-lock.json`. | digest.txt | `npm ci` is not assumable; §9 |

### 12.2 Candidate mechanisms — hypotheses, never conclusions
| ID | Hypothesis | Falsifying test |
|---|---|---|
| H-A1 | The suspect commit removed functional code alongside diagnostics | Deterministic red script at `suspect~1` vs `suspect` (FW-2) |
| H-A2 | Not applying until reload is by design | Reproduce at `suspect~1`; read README/ADR history |
| H-A3 | Lost update: a tab loaded before Save holds stale `keyBindings`; a later `config.save({...})` writes the whole settings object and overwrites fresh bindings | Two-instance FW-5 test + Snippet B |
| H-A4 | A write fails silently (quota/rate limit) | Mock a failing `set` that sets `lastError`; observe the success message |
| H-B1 | Single-frame GIFs receive controllers | Feed a 1-frame GIF through `create()` at the production path |
| H-B2 | Unloaded images bypass the size filter | `naturalWidth == 0` `.gif` image through `scanForGifs` |
| H-B3 | `src` / `currentSrc` mismatch causes the false positive | Must be reconciled with SD-11 before any fix |

### 12.3 Registered KUs
| ID | Question | Method | Due |
|---|---|---|---|
| KU-1 | Does `npm test` really report 133/133 at the pinned SHA? | δ1 replay + per-file reconciliation | G0 / Gate 1 |
| KU-2 | Does “apply at runtime” mean without reload in open tabs, or after reload? | Human decision, §13.3 | G0 |
| KU-3 | Can real Chrome be driven in this sandbox? | Attempt and record | Gate 1 |
| KU-4 | Is Bug A reproducible at `suspect~1`? | FW-2 | Gate 1 |
| KU-5 | Which of H-A1…H-A4 explains the observation? | Snippet B + FW-2 + FW-5 | Gate 1 |
| KU-6 | What are the offending element’s actual `src`, `currentSrc`, `complete`, natural dimensions and frame count? | Snippet A | Gate 1 |

---

## 13. Human decisions and parameters

### 13.1 Interpretation
Producers loop until Verification ACCEPTs. Verification Agents loop until B1–B13 hold **for their scope**. To claim overall COMPLETE, zero items may remain ESCALATED.

### 13.2 Defaults (OPERATIONAL)
| Parameter | Default |
|---|---|
| Producer iterations per phase | 5 |
| Verification rounds per gate | 5 |
| Consecutive clean UU rounds to stop | 2 |
| UU round cap | 5 |
| Adversary alternatives per leading hypothesis | ≥3 |

### 13.3 Blocking decisions
1. **KU-2:** Should a changed key apply in already-open tabs **without reload**? If yes, this is a **new capability** requiring a content-script `chrome.storage.onChanged` relay plus a page-world update path — not a restoration. The original “restore only removed code” and “add the missing onChanged handler” rules cannot both stand.
2. **SD-14:** Supply the screenshots, or run §10 Snippets A and B.
3. **SD-13 / KU-3:** Decide who runs real-browser verification if the sandbox cannot.
4. Any `OUT_OF_SCOPE` proposal (including SD-07’s latent `inIframe` defect) requires explicit human confirmation.

---

## 14. Definition of Done

**COMPLETE** only when all hold:

- [ ] `MATRIX_LEDGER.md` complete; B1 holds; zero ESCALATED.
- [ ] `FORENSIC_REPORT.md` cites ledger IDs only; every root-cause statement is D3.
- [ ] V-Gates 1, 2, 3a, 3b, 4 each closed with four **audited** ACCEPT verdicts (B12).
- [ ] No issue/comment sentence above its ledger depth was published (B10).
- [ ] New tests executed; count delta shown; red pre-fix for the stated reason; mutation-sensitive (B9).
- [ ] FW-1…FW-8 sweep log present; §7.2 stop rule satisfied.
- [ ] Residual-risk statement present (B13), including zero escalations.
- [ ] Only then: atomic commits citing ledger IDs → push → `git ls-remote origin master` == local HEAD → close issues.

Otherwise report **ESCALATED–INCOMPLETE** with the residual list. Never report success from a cap exit.

---

# PART II — AMENDED BASELINE MISSION APPENDIX

## 15. Environment and baseline

```bash
cd /home/vercel-sandbox/videospeed

# Git identity (GitHub App bot)
python3 /home/vercel-sandbox/gh_app_token.py --configure

# Pin actual state; do not assume reported values
git branch --show-current
git rev-parse HEAD
node --version
test -d node_modules && echo present || echo absent

# Baseline replay
npm test 2>&1 | tee /tmp/vsc-baseline.txt

# Optional auxiliary scripts only if present and safe
npm run | grep -E '(lint|test:unit|test:integration)' || true
```

The original prompt expected `133 / 133 passing`. That expectation is **HEARSAY** until replayed.

GitHub API access uses `/home/vercel-sandbox/gh_app_token.py`. The reported values below are operational configuration, not verified facts:

- KEY_PATH: `/home/vercel-sandbox/sevwrenai.private-key.pem`
- APP_ID: `4685524`
- INSTALL_ID: `155785043`
- Repo: `SevWren/videospeed`

If authentication fails, ESCALATE; do not hardcode tokens or guess identities.

---

## 16. Reported commit window — HEARSAY, not a pinned range

| Hash | Reported UTC | Reported message |
|---|---|---|
| `144746a` | 2026-10-26 05:20 | chore: remove keybinding diagnostic system (dead debug code) |
| `7e967f7` | 2026-10-26 04:38 | fix: correct GIF visual rendering |
| `4bac82d` | 2026-10-26 03:56 | fix: default loopCount to 0 (infinite) |
| `794a3e7` | 2026-10-26 03:05 | fix: don’t tear down gif controller after canvas-replacement |
| `9a5de5e` | 2026-10-26 02:53 | fix: stop mutation-observer from destroying gif controller |
| `9fe70db` | 2026-10-26 02:29 | fix: proxy file:// GIF fetches through chrome-extension:// iframe |

α1 MUST replace this table with a `git rev-list` range. “48 hours ago”, `HEAD~8` and this six-row table are **three different sets**. No commit is a suspect until FW-2 supports it.

---

## 17. Architecture pointers — HEARSAY

Reported structure:

```text
src/
├── content/
│   ├── inject.js
│   └── injector.js
├── core/
│   ├── action-handler.js
│   ├── settings.js
│   └── video-controller.js
├── utils/
│   ├── event-manager.js
│   └── constants.js
├── ui/
│   └── options/
│       ├── options.html
│       └── options.js
└── observers/
    ├── gif-observer.js
    ├── media-observer.js
    └── mutation-observer.js
```

Paths, line counts and module responsibilities are **not** confirmed. α2 MUST verify each with `git grep` / file reads at the pinned SHA before citing it. Resolve the `src/observers/` vs digest path discrepancy explicitly.

---

## 18. Issue publication templates

### 18.1 Bug A — create only if no duplicate exists

```markdown
Title: Keybinding changes reported not to persist / apply after Save

## Reported symptom
[HEARSAY: <entry_id>]

## Confirmed mechanism
[D2/D3: <entry_id> + SHA + reproduction]

## Reproduction
[commands / human output: <entry_id>]

## Regression status
[FW-2 result: <entry_id>, or “not yet bisected”]

## Blast radius
[<entry_id>]

## Unknowns
[<KU ids>]
```

### 18.2 Bug B — update existing issue #9; do not create a duplicate

Use the same structure as above. Do not assert Gmail specifics unless supported by ledger evidence.

### 18.3 Forbidden until supported
- “Introduced between `914b85c` and `144746a`”
- “Affects 100% of users who customized keybindings”
- “Gmail avatars confirmed”
- “Content-Type check required”
- Any named root cause below D3

### 18.4 Triage
P0/P1 assignments and `sevwrenai[bot]` assignment require a ledger-backed impact statement (β2). Labels are provisional until Gate 2.

---

## 19. Fix constraints and candidate options

### 19.1 MUST NOT
- Revert the whole reported suspect commit; the diagnostic removal may well have been correct.
- Add **any** new diagnostic or logging code to the repository.
- Modify `src/lib/gifuct-js.min.js` (read-only inspection is permitted).
- Modify `manifest.json` unless a D3 finding explicitly requires it **and** the human confirms.
- Change `GIF_MIN_SIZE_PX`, `GIF_GLOBAL_MEMORY_BUDGET_BYTES` or other GIF constants without a D3 justification.
- Run `npx jest`. Use `npm test` exclusively.
- Add `jest.config.js`.
- Push before all gates pass and the remote SHA is confirmed.
- Stage files not in the D3 blast-radius plan.

### 19.2 MUST
- Read every file before editing it.
- Write `FORENSIC_REPORT.md` before fixing anything.
- Keep commits atomic: one commit per bug fix, citing ledger IDs and the issue number.
- Register new test files in `tests/run-tests.js` and observe the pass-count delta.
- Verify Option C / any `currentSrc` precedence change against `414c6a2` under FW-6 **before** implementing it. No fix option is pre-selected.
- Confirm `src/gif-file-fetcher.html`, `src/gif-file-fetcher.js` and `manifest.json` are untouched unless a verified D3 entry says otherwise.

### 19.3 Bug A fix rules
- Restore only verified functional code, not diagnostic code.
- Do not restore `VSC_KEYBINDING_DIAGNOSTIC`.
- If “apply in already-open tabs without reload” is required, that is a new capability and requires the human decision in §13.3.

### 19.4 Bug B candidate options — not pre-approved
Options A–E below are **candidates only**. Each must be validated against D3 evidence, FW-4 duplicate-logic disposition, and FW-6 prior-fix regression checks.

- **Option A:** Tighten source matching and/or require stronger evidence of GIF content.
- **Option B:** Exclude fully loaded non-GIF elements.
- **Option C:** Prefer `currentSrc` over `src`. **Blocked pending FW-6 because of SD-11.**
- **Option D:** Raise size threshold. Must be reconciled with SD-09.
- **Option E:** Add explicit complete/frame-count/data-URI guards.

No candidate may be implemented unless it is the minimal fix supported by D3.

---

## 20. Commit and push protocol

1. Derive the exact file list from the D3 blast radius; assert `git diff --stat` equals it.
2. `python3 /home/vercel-sandbox/gh_app_token.py --configure`
3. Two atomic commits, each citing ledger IDs and its issue:

   - Bug A: only the files the verified mechanism requires — **do not assume** the original three-file staging list is sufficient or correct.
   - Bug B: only the verified production detection path plus its registered test.

Commit message template:

```text
fix: <minimal summary>

Root cause: <D3 entry_id>
Evidence: <entry_ids>
Fix: <minimal change>
Fixes #<issue>
```

4. `git push origin master`
5. `git ls-remote origin master` **must equal local HEAD**. `git log --oneline -5` is supplementary, not proof.
6. Only then close issues via the API and record the response in the ledger.

---

## 21. Message protocol — HEARSAY until traced

| Event | Reported direction | Purpose |
|---|---|---|
| `VSC_SAVE_SETTINGS` | page → content | Persist settings |
| `VSC_USER_SETTINGS` | content → page | Initial settings injection |
| `VSC_FETCH_GIF_BYTES` | page → content | Request `file://` GIF bytes |
| `VSC_GIF_BYTES_RESPONSE` | iframe → parent | Fetch result |
| `VSC_CONTROLLER_CREATED` / `_REMOVED` | page → content | Badge update |

`VSC_KEYBINDING_DIAGNOSTIC` was reported diagnostic-only and correctly removed. **Do not restore it.** Whether it was in fact diagnostic-only is an α1 question, not an assumption.

---

## 22. Sources

| ID | Source | URL | Confidence |
|---|---|---|---|
| SRC-1 | Defense.gov transcript index, Rumsfeld & Myers briefing, 12 Feb 2002 | https://archive.defense.gov/Transcripts/Transcript.aspx?TranscriptID=2636 | snippet only |
| SRC-2 | Wikipedia, “There are unknown unknowns” | https://en.wikipedia.org/wiki/There_are_unknown_unknowns | secondary |
| SRC-3 | Rumsfeld, *Known and Unknown*, Author’s Note | https://www.rumsfeld.com/about/page/authors-note | primary memoir note |
| SRC-4 | Wikipedia, “There are unknown unknowns” — procurement usage / matrix attribution | https://en.wikipedia.org/wiki/There_are_unknown_unknowns | secondary |
| SRC-5 | Žižek, “What Rumsfeld Doesn’t Know That He Knows About Abu Ghraib”, In These Times, 21 May 2004 | https://inthesetimes.com/article/what-rumsfeld-doesn-know-that-he-knows-about-abu-ghraib | secondary/essay |
| SRC-6 | Johari window (Luft & Ingham, 1955) | https://thedecisionlab.com/reference-guide/psychology/johari-window | secondary |
| SRC-7 | Chromium `extensions/common/api/storage.json` | https://chromium.googlesource.com/chromium/src/+/main/extensions/common/api/storage.json | primary API definition |

External sources establish context and API limits. **None of them establishes a fact about this repository.**
