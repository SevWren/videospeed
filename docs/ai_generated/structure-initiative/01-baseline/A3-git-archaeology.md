# A3 Git Archaeology — Baseline Report

**Agent:** A3 Git Archaeologist
**Date:** 2026-10-27
**Base SHA:** e904370863d69a2b5d853af62745141953c4860d
**Repo:** videospeed

---

## 1. Commit Count and Date Range

| Metric | Value |
|---|---|
| Total commits | **460** |
| Oldest commit date | 2014-03-02 |
| Newest commit date | 2026-10-27 |
| Span | ~12.5 years |

**Command:** `git log --oneline | wc -l` → `460`
**Command:** `git log --oneline | tail -5` → oldest: `2965ec3 initial import` (2014-03-02)
**Command:** `git log --oneline | head -10` → newest: `323c95f docs(structure): G0 bootstrap…` (2026-10-27)

---

## 2. Top 15 Churn Hot-Spots (by commit frequency)

**Command:** `git log --name-only --pretty=format: | sort | uniq -c | sort -rn | head -30`

| Rank | File | Commit appearances |
|---|---|---|
| 1 | `inject.js` (legacy monolith) | 195 |
| 2 | `manifest.json` | 84 |
| 3 | `inject.css` (legacy) | 40 |
| 4 | `options.js` (legacy) | 37 |
| 5 | `README.md` | 34 |
| 6 | `options.html` (legacy) | 31 |
| 7 | `src/core/gif-controller.js` | 15 |
| 8 | `src/core/action-handler.js` | 15 |
| 9 | `src/content/injector.js` | 15 |
| 10 | `src/content/inject.js` | 15 |
| 11 | `src/utils/constants.js` | 14 |
| 12 | `src/observers/media-observer.js` | 14 |
| 13 | `src/observers/mutation-observer.js` | 13 |
| 14 | `tests/run-tests.js` | 11 |
| 15 | `src/utils/event-manager.js` | 11 |

**Note:** The top 4 files (`inject.js`, `inject.css`, `options.js`, `options.html`) are the **legacy pre-refactor monolith** paths. These no longer exist at those paths in the current tree — they were renamed/moved when the `src/` structure was introduced. The actual current hot-spots start at rank 7.

---

## 3. Top 10 Files in Bug-Fix Commits

**Command:** `git log --oneline --grep="^fix:" | wc -l` → **23 fix: commits**
**Command:** `git log --name-only --pretty=format: --grep="^fix:" | sort | uniq -c | sort -rn | head -20`

| Rank | File | Bug-fix commit appearances |
|---|---|---|
| 1 | `src/core/gif-controller.js` | 14 |
| 2 | `src/observers/mutation-observer.js` | 5 |
| 3 | `src/content/inject.js` | 5 |
| 4 | `src/content/injector.js` | 4 |
| 5 | `tests/run-tests.js` | 3 |
| 6 | `src/utils/dom-utils.js` | 3 |
| 7 | `src/ui/options/options.js` | 3 |
| 8 | `src/observers/media-observer.js` | 2 |
| 9 | `src/observers/gif-observer.js` | 2 |
| 10 | `src/core/storage-manager.js` | 2 |

**Observation:** `src/core/gif-controller.js` appears in **14 of 23** `fix:` commits (61%). This file is the dominant bug-fix locality and a primary risk surface.

---

## 4. Co-Change Coupling — Top 10 File Pairs

**Command:** `git log --name-only --pretty=format:"COMMIT" | head -1000` piped through Python co-occurrence counter.

| Rank | File A | File B | Co-change count |
|---|---|---|---|
| 1 | `src/core/action-handler.js` | `src/utils/event-manager.js` | 10 |
| 2 | `src/content/inject.js` | `src/observers/mutation-observer.js` | 10 |
| 3 | `inject.js` (legacy) | `options.js` (legacy) | 10 |
| 4 | `src/content/injector.js` | `src/core/action-handler.js` | 9 |
| 5 | `src/content/injector.js` | `src/utils/event-manager.js` | 8 |
| 6 | `src/content/inject.js` | `src/content/injector.js` | 8 |
| 7 | `src/content/inject.js` | `src/core/action-handler.js` | 8 |
| 8 | `src/content/inject.js` | `src/observers/media-observer.js` | 8 |
| 9 | `src/content/injector.js` | `src/observers/media-observer.js` | 8 |
| 10 | `src/core/action-handler.js` | `src/observers/media-observer.js` | 8 |

**Structural implication:** `src/content/injector.js`, `src/core/action-handler.js`, and `src/utils/event-manager.js` form a **tightly coupled triad** — changes to any one almost always pull the others along. `src/observers/media-observer.js` and `src/observers/mutation-observer.js` are similarly coupled to the content layer.

---

## 5. Stable Files (Never Appear in Git Log)

**Method:** `find src -type f | sort` vs `git log --name-only --pretty=format: | grep "^src/" | sort -u` → `comm -23`

Result: **No current `src/` files are absent from git history.** Every file tracked under `src/` has appeared in at least one commit. The icon assets (`src/assets/icons/*.png`) were added in a single commit via a large batch import and never modified, making them effectively stable in practice.

**Stable-in-practice files** (added once, zero subsequent changes):
- All PNG icon assets in `src/assets/icons/`
- `src/lib/gifuct-js.min.js` (vendored library, added once)
- `src/site-handlers/scripts/netflix.js`

---

## 6. Commit Cadence

**Command:** `git log --format="%ad" --date=format:"%Y-%m" | sort | uniq -c`

### Activity by era

| Era | Period | Monthly avg | Notes |
|---|---|---|---|
| Origin | 2014-03 – 2014-03 | 12/month | Initial burst (12 commits in March 2014) |
| Early growth | 2014-05 – 2017-12 | ~5–8/month | Steady OSS maintenance, peaks at 12–14 |
| Decline | 2018-01 – 2024-06 | 1–3/month | Slow maintenance mode; sparse months |
| AI-assisted revival | 2025-06 – 2025-07 | 25–28/month | Sudden burst: 23 in Jun 2025, 28 in Jul 2025 |
| Current AI sprint | 2026-07 – 2026-10 | 8–29/month | 8 in Jul 2026, **29 in Oct 2026** |

**Pattern:** Classic OSS parabola — early burst → long plateau/decline → AI-assisted acceleration. The October 2026 cluster (29 commits) is the largest single-month spike in the repository's history.

Selected monthly data:
```
2019-11:  25   2020-03: 19   2025-06: 23   2025-07: 28   2026-07: 8   2026-10: 29
```

---

## 7. Commit Type Breakdown

**Command:** `git log --format="%s"` analyzed with awk type classification.

| Type | Count | Notes |
|---|---|---|
| `other` (freeform / pre-conventional) | 387 | Majority; older commits use no prefix |
| `bump` | 34 | Version bumps (npm/semver pattern) |
| `fix:` | 23 | Conventional commit bug fixes |
| `docs:` / `docs(...)` | 5 | Documentation-only |
| `chore:` | 5 | Housekeeping |
| `refactor:` | 4 | Explicit refactors |
| `feat:` / `feature:` | 2 | Explicit feature additions |

**Observation:** Only ~74 commits (16%) use conventional commit prefixes. The remaining 84% are freeform messages from the pre-conventional era or casual commits. The `fix:` prefix appears only in recent AI-assisted commits, meaning the bug-fix locality analysis in §3 captures only the modern, disciplined fix history.

---

## Summary of Key Findings

1. **Dominant churn file is a legacy artifact.** `inject.js` with 195 appearances is the pre-refactor monolith — it no longer exists at that path. The active hot-spot in the current codebase is `src/core/gif-controller.js` (15 churn appearances + 14 bug-fix appearances).

2. **GIF controller is the #1 risk surface.** It appears in 61% of all `fix:` commits and 15 churn commits. Any structural work must treat this file with caution.

3. **Content/action/event triad is tightly coupled.** The pairs `action-handler ↔ event-manager` and `injector ↔ action-handler` each co-change 8–10 times. These three files behave as a single logical unit despite being separate files.

4. **Cadence shows AI-driven acceleration.** Oct 2026 (29 commits) is the all-time monthly peak. The repo has shifted from organic OSS maintenance to AI-agent-assisted development.

5. **No truly stable code.** Every `src/` file appears in git history. However, vendored/binary assets (`gifuct-js.min.js`, PNGs) are effectively frozen after initial addition.
