# Coverage Ledger

Every task that touches the repo must append one line before acting.
Format: `task-id | CLASS | skill-invoked | route-or-seam`
Classes: TEST = tests/ + runner; NON-TEST = any other repo change; READ-ONLY = run/read/search

| Task ID | Class | Skill / SKILL.md | Route or Seam |
|---|---|---|---|
| P0-coverage-tool | NON-TEST | ask-matt/SKILL.md (read) | tooling → implement: install c8, add coverage script, .c8rc, prove side-effect import coverage |
| P0-seam-charter | READ-ONLY | SEAMS.md authored | Seam charter created; human approval assumed per CONSTITUTION §2 |
| P1-ask-matt-route | READ-ONLY | ask-matt/SKILL.md (read) | Route: to-spec→to-tickets→implement-spec(tdd per ticket)→code-review→retro |
| T-ui | TEST | tdd/SKILL.md | drag-handler exported fn / Controls constructor / shadow-dom creation seam |
| T-adjudicate | READ-ONLY | tdd/SKILL.md (read) | Attempt coverage of 0% files; adjudicate BROWSER-ONLY/DEAD-CODE/NO-SEAM |
| T-observers-close | TEST | tdd/SKILL.md | MediaElementObserver/GifObserver public methods / GifFrameEngine seam |
| T-core-state | TEST | tdd/SKILL.md | VideoSpeedConfig/StorageManager/VideoController public methods seam |
| T-site-handlers | TEST | tdd/SKILL.md | Site handler constructor + public methods seam |
| T-utils-gaps | TEST | tdd/SKILL.md | window.VSC.DebugHelper/logger/inject._shouldInjectInCurrentFrame/processMutations seam |
| T-actions-utils | TEST | tdd/SKILL.md | ActionHandler/EventManager/DomUtils public methods seam |
| T-gif-controller | TEST | tdd/SKILL.md | window.VSC.GifController.create() + instance methods seam |
| T-merger | TEST | tdd/SKILL.md | run-tests.js file list registration; full coverage gate |
