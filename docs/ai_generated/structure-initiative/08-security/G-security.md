---
team: G
title: Security, Privacy & Store-Compliance Guard Report
base_sha: e904370863d69a2b5d853af62745141953c4860d
date: 2026-10-27
status: FINAL
---

# G-Security Report: Constraints for Structure-Initiative Candidates

## G1 — Permissions & Exposure Audit

### Declared Permissions

| Permission | Type | Justification (OBSERVED) | Attack-Surface Notes |
|---|---|---|---|
| `storage` | API | Read/write `chrome.storage.sync` | Settings only; no remote transmission |
| `activeTab` | API | Used by popup to query/set speed | Narrow, tab-scoped |
| `tabs` | API | Background tracks tab IDs for icon state | Requires tab metadata; no URL scraping observed |
| `file://*` | host_permission | GIF fetching from local files; content-script injection on file pages | VERIFIED in manifest.json:20 |

**Note (OBSERVED):** `host_permissions` contains only `file://*`. All HTTP/HTTPS sites are covered implicitly via the `content_scripts.matches` patterns. There is no broad host permission for remote sites, which limits the extension's ability to issue credentialed requests.

### Content-Script Matches

| Match Pattern | Scope | Risk |
|---|---|---|
| `http://*/*` | All HTTP sites | Content script injected on every page |
| `https://*/*` | All HTTPS sites | Content script injected on every page |
| `file:///*` | All local files | Content script injected on local HTML/files |
| `match_about_blank: true` | blank iframes | Extends injection into blank frames |
| Excluded: `https://hangouts.google.com/*`, `https://meet.google.com/*` | Two Google Meet endpoints | Deliberate exclusion |

**Finding (VERIFIED):** `file:///*` (triple slash) is the content-script pattern; `file://*` (double slash) is the host permission. Both are present. The extension injects into local files, which is intentional for local GIF support but expands the attack surface on machines with sensitive local HTML files.

### Web-Accessible Resources (WAR) Exposure

| Resource Glob | What Is Exposed | Accessible By |
|---|---|---|
| `src/styles/inject.css`, `src/styles/shadow.css` | CSS only | Any matching origin |
| `src/module-loader.js` | Module loader entry point | Any matching origin |
| `src/core/*.js` | All core JS, including `gif-controller.js`, `storage-manager.js` | Any matching origin |
| `src/utils/*.js` | All utility JS | Any matching origin |
| `src/ui/*.js` | All UI JS | Any matching origin |
| `src/observers/*.js` | All observer JS | Any matching origin |
| `src/site-handlers/*.js` | All site-handler JS | Any matching origin |
| `src/site-handlers/scripts/*.js` | Site-specific scripts (e.g., `netflix.js`) | Any matching origin |
| `src/content/*.js` | Both `injector.js` and `inject.js` | Any matching origin |
| `src/lib/*.js` | Vendored `gifuct-js.min.js` | Any matching origin |
| `src/gif-file-fetcher.html` | Hidden iframe page used for file:// XHR | Any matching origin |
| `src/gif-file-fetcher.js` | File-fetcher script | Any matching origin |

**WAR matches:** `http://*/*`, `https://*/*`, `file:///*` — effectively every origin.

**Structural Risk (INFERRED):** The WAR glob patterns (`src/core/*.js`, `src/content/*.js`, etc.) are directory-level wildcards. Any new `.js` file added under these directories is automatically made web-accessible **without any manifest change**. This is a latent expansion risk for any restructuring that adds new files to existing directories.

**What adding a new script to WAR does to attack surface (OBSERVED/INFERRED):**
- A page script can load any WAR resource via `<script src="chrome-extension://ID/path">`.
- If that resource calls sensitive extension APIs it should be isolated.
- The current architecture already exposes essentially all extension JS to page scripts; adding more files widens the surface proportionally.
- If a build step (J4) renames or moves outputs to a `dist/` path that is NOT in the WAR list, those files become inaccessible to `injector.js` at runtime — a functional breakage with no security benefit unless the WAR list is updated deliberately.

---

## G2 — Message-Channel Trust Audit

### CustomEvent Channel (page world ↔ content script world)

| Event | Direction | Origin Validated? | Payload Validated? | Risk Level |
|---|---|---|---|---|
| `VSC_SAVE_SETTINGS` | page → content script (injector.js:144) | NO — any page script can dispatch | NONE — `event.detail` passed verbatim to `chrome.storage.sync.set()` | HIGH |
| `VSC_USER_SETTINGS` | content script → page | N/A (sent by extension) | N/A | LOW |
| `VSC_FETCH_GIF_BYTES` | page → content script (injector.js:222) | Partial — `url.startsWith('file://')` checked | url and requestId checked for existence; no sanitization of requestId | MEDIUM |
| `VSC_MESSAGE` | content script → page (forwarded from popup) | N/A (originates in `chrome.runtime.onMessage`) | type prefix `VSC_` checked | LOW |
| `VSC_CONTROLLER_CREATED` | page → content script (injector.js:235) | NO — any page script can dispatch | controllerId read but only forwarded to background as a string | MEDIUM |
| `VSC_CONTROLLER_REMOVED` | page → content script (injector.js:253) | NO | controllerId read but only forwarded | MEDIUM |

**Key Finding — VSC_SAVE_SETTINGS (VERIFIED):**
`injector.js:148` does `chrome.storage.sync.set(event.detail, ...)` with **no schema validation, no type checking, and no allowlist of keys**. Any page script on any injected page can dispatch a `VSC_SAVE_SETTINGS` CustomEvent with arbitrary content and pollute `chrome.storage.sync`. Chrome Storage Sync has per-key size limits (8 KB) and a quota (100 KB total), so a malicious page could attempt to exhaust sync quota, corrupt settings keys, or inject unexpected keys that are later read by extension logic.

**Key Finding — VSC_FETCH_GIF_BYTES (OBSERVED):**
`injector.js:224` checks `url.startsWith('file://')` before dispatching to the iframe. However, `requestId` is accepted without sanitization and forwarded to the iframe. The iframe does its own `url.startsWith('file://')` check. The requestId is used only as a correlation token, so XSS via requestId is not a current risk, but the lack of a requestId format constraint means any string is accepted.

### postMessage Channel (page/iframe ↔ content script world)

| Message | Direction | Origin Validated? | Payload Validated? | Risk Level |
|---|---|---|---|---|
| `VSC_GIF_FETCH_REQUEST` | injector → iframe (injector.js:203) | Sent to `'*'` target — any origin could receive | type, url, requestId checked inside iframe | LOW (iframe is extension-controlled) |
| `VSC_GIF_BYTES_RESPONSE` | iframe → parent page window | NO origin check in gif-controller.js:364 — any window can forge | type and requestId matched | MEDIUM |
| `VSC_GIF_FETCHER_READY` | iframe → parent page window | NO origin check in injector.js:215 | type checked only | LOW |

**Key Finding — VSC_GIF_BYTES_RESPONSE without origin check (OBSERVED):**
`gif-controller.js:364–372` listens for `window.addEventListener('message', messageHandler)` and resolves with `event.data.bytes` if `event.data.type === 'VSC_GIF_BYTES_RESPONSE'` and `event.data.requestId` matches. There is **no `event.origin` check**. A page script or a third-party iframe could forge a `VSC_GIF_BYTES_RESPONSE` message with a matching requestId and cause `gif-controller.js` to attempt to parse arbitrary bytes as a GIF via `gifuct-js`. This is currently a low-severity issue because the worst outcome is a failed GIF decode, but it is a trust-model violation.

**Key Finding — Dispatchment to iframe uses `'*'` target (VERIFIED, injector.js:205):**
The code comment notes "iframe at chrome-extension:// validates type internally," but using `'*'` as the postMessage target means the message is delivered to any window loaded in `fetcherIframe.contentWindow` — if the iframe were ever hijacked or navigated, the message would reach the wrong recipient.

**Key Finding — netflix.js origin validation (VERIFIED):**
`src/site-handlers/scripts/netflix.js:2` correctly validates `event.origin != 'https://www.netflix.com'`. This is the **only location** in the codebase where `event.origin` is checked. All other `window.addEventListener('message', ...)` handlers lack origin validation.

### Trust Model Summary (INFERRED)

The extension operates on an **implicit same-window trust model**: it assumes that CustomEvents dispatched on `window` and postMessages received on `window` are from the extension's own injected code. Page scripts can break this assumption on any page. The effective trust boundary is the chrome.runtime message channel (popup → content script via `chrome.runtime.onMessage`) which is validated by Chrome itself. Everything below that boundary (CustomEvents, postMessage) is unauthenticated.

---

## G3 — Privacy-Claim Verification

| # | Claim (from PRIVACY.md) | Code Evidence | Verdict |
|---|---|---|---|
| 1 | "No data is collected or transmitted" | No outbound HTTP calls other than GIF fetches observed. Background script only manages tab-local icon state. No analytics, no beacon calls, no external API calls. | TRUE |
| 2 | GIF fetches use `cache: force-cache` | `gif-controller.js:405`: `fetch(src, { mode: 'cors', cache: 'default' })` — **not** `force-cache` | STALE / FALSE |
| 3 | GIF fetch requests go "never to extension-controlled servers" | All `fetch()` calls target the `src` of the `<img>` element on the page — the origin server hosting the GIF | TRUE |
| 4 | "No third-party services" | No telemetry, analytics, or remote config calls observed in any source file | TRUE |
| 5 | Settings stored only in `chrome.storage.sync` | `storage-manager.js` uses only `chrome.storage.sync`; `event-manager.js:229` and `injector.js:148` also use only `.sync`. No `localStorage`, `IndexedDB`, or cookie usage found | TRUE |
| 6 | GIF control can be disabled via `controlGifs` setting | `gif-controller.js:53` and `inject.js:176` both gate on `config.settings.controlGifs` | TRUE |

**Privacy Discrepancy — cache option (VERIFIED):**
PRIVACY.md line 17 states fetches use `"cache: force-cache"`. The actual code at `gif-controller.js:405` uses `cache: 'default'`. `force-cache` would serve cached copies without revalidation even after expiry; `default` follows normal HTTP cache semantics. This is a factual misstatement in the privacy policy. It is a documentation defect, not a data-exfiltration risk, but it creates a Store Compliance exposure if Google reviews it.

---

## G4 — Restructure Risk Review

| Design Candidate | Security / Compliance Impact | Required Constraint |
|---|---|---|
| J1 — Additive guardrails (no structural change) | Minimal. No new files, no WAR changes. | None beyond existing C-list. |
| J2 — Runtime-world layering (change which code runs in which world) | HIGH. Moving code from page world to isolated world changes what page scripts can reach. Moving code the other way increases page-accessible attack surface. Any module moved into the isolated world loses access to page `window.VSC` globals and must use a different communication seam. | C-3, C-4: Any module moved to the isolated world must not expose sensitive APIs back to the page world. Content-script/page-world boundary must remain at the existing seam (CustomEvent channel). |
| J3 — Feature-sliced layout (additive directory reorganization) | MEDIUM. If new feature slice directories are added (e.g., `src/features/gif/`), the existing WAR globs (`src/core/*.js`, etc.) will NOT cover them. WAR must be updated or new glob added. Risk: forgetting to add WAR entry = runtime breakage. | C-1: Any new directory must be explicitly added to WAR or placed under an existing WAR glob. |
| J4 — Build-step (src/ → dist/) | HIGH. Current WAR entries point to `src/` paths. If build outputs go to `dist/`, every WAR entry must be updated to `dist/` paths. Failing to do so breaks all module loading. Additionally, source maps in `dist/` should not be WAR-listed (they expose implementation). | C-1, C-2: WAR paths must exactly match deployed artifact paths. Source maps must not be in WAR. Build output must not change extension ID or CSP. |
| J5 — Packages (isolate GIF engine as separate module) | MEDIUM. If the GIF engine becomes a new file outside current WAR globs (e.g., `src/packages/gif-engine/index.js`), it is not web-accessible and `injector.js` cannot load it. If it is added under an existing glob or a new WAR entry, it is web-accessible to all page origins. The `gif-file-fetcher.html` and `.js` are already individually named in WAR — any renamed or relocated fetcher requires explicit WAR update. | C-1: New module paths must be explicitly WAR-listed. Fetcher iframe page must remain at a chrome-extension:// URL. |
| J6 — Wildcard / unknown | HIGH uncertainty. Any structural change not covered above. | C-5: Any J6 proposal must undergo a dedicated G review before implementation. |

---

## C-List: Binding Constraints for Teams J and L

The following constraints are **required**. Any design candidate or implementation that violates them must be revised before acceptance.

**C-1 — WAR coverage must be explicit and complete.**
Every JavaScript or HTML file that `injector.js` loads via `injectScript()` or that is referenced by `chrome.runtime.getURL()` must appear in the `web_accessible_resources` list in `manifest.json`. Directory-glob wildcards in WAR automatically include any new file added to that directory; teams must audit this when adding files. If a file moves to a directory not covered by an existing glob, a new WAR entry must be added.

**C-2 — WAR paths must match deployed artifact paths exactly.**
If a build step (J4) changes output paths from `src/` to `dist/` or any other location, the WAR list and all `chrome.runtime.getURL()` call sites must be updated atomically. Source maps and build artifacts not needed at runtime must not be WAR-listed.

**C-3 — The CustomEvent seam boundary must not be widened.**
The trust boundary between the page world and the extension's isolated world is the CustomEvent channel (`VSC_SAVE_SETTINGS`, `VSC_FETCH_GIF_BYTES`, etc.). No new CustomEvent listener that triggers a write to `chrome.storage`, a network request, or a privileged API call may be added without payload schema validation (allowlist of permitted keys and value types for `VSC_SAVE_SETTINGS`; format constraint on requestId for `VSC_FETCH_GIF_BYTES`).

**C-4 — Storage writes from the page world must be validated.**
The `VSC_SAVE_SETTINGS` handler in `injector.js` must validate `event.detail` against an allowlist of known settings keys before calling `chrome.storage.sync.set()`. This is a pre-existing defect that any restructure must not replicate or worsen.

**C-5 — postMessage handlers must validate event.origin where the sender is known.**
The `VSC_GIF_BYTES_RESPONSE` listener in `gif-controller.js` and the `VSC_GIF_FETCHER_READY` listener in `injector.js` receive messages from a known chrome-extension:// iframe. Any restructure that touches these listeners must add `event.origin` validation against the expected `chrome.runtime.getURL('')`-derived origin, or must replace the `window.addEventListener('message')` pattern with a channel that inherently authenticates the sender.

**C-6 — No new outbound network requests to extension-developer-controlled or third-party servers.**
The privacy policy states no data is transmitted to extension developers or third parties. Any structural change that introduces telemetry, analytics, remote config, or CDN asset loading violates the store-compliance claim and is not permitted.

**C-7 — The `gif-file-fetcher.html` iframe must remain at a chrome-extension:// origin.**
Its file:// access capability depends on running at the extension's own origin. It must not be moved to a data: URI, a blob: URL, or any non-chrome-extension:// origin. Any J4/J5 restructure that moves this file must preserve its WAR listing and its chrome-extension:// load path.

**C-8 — PRIVACY.md claim about `cache: force-cache` must be corrected before store submission.**
The current code uses `cache: 'default'`, not `cache: 'force-cache'`. The privacy policy is factually incorrect. This is not a structural constraint on J/L candidates, but it is a compliance prerequisite: whoever ships the next release must update PRIVACY.md line 17 to match the code, or update the code to match the policy.

**C-9 — No new `eval`, `document.write`, or unsanitized `innerHTML` with external data.**
ESLint already enforces `no-eval`. Existing `innerHTML` usage in `options.js` is with extension-owned static strings, which is currently acceptable. Any restructure must not introduce `innerHTML` assignments of user-supplied or remotely-fetched data.

**C-10 — Source files added to directories covered by WAR directory globs are automatically web-accessible.**
Teams J and L must treat the following directories as "WAR-exposed by default" and must not place security-sensitive isolated-world logic in them without explicit justification: `src/core/`, `src/utils/`, `src/ui/`, `src/observers/`, `src/site-handlers/`, `src/site-handlers/scripts/`, `src/content/`, `src/lib/`.
