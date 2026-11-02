/**
 * Dead-code guard: module-loader.js under Path B
 *
 * T3-A4 — confirms that src/module-loader.js is unreachable dead code under
 * the Path B (world:MAIN content_scripts) architecture and should not appear
 * in web_accessible_resources.
 *
 * RED before Path B cleanup:
 *   - src/module-loader.js was listed explicitly in web_accessible_resources,
 *     making it fetchable from the page via chrome.runtime.getURL() despite
 *     nothing calling loadModule() or defineModule() under Path B.
 *   - src/module-loader.js may also have appeared in a content_scripts js
 *     array as a legacy entry from the old module-loading architecture.
 *
 * GREEN after Path B cleanup:
 *   - module-loader.js is absent from all content_scripts js arrays.
 *   - module-loader.js is absent from web_accessible_resources as an explicit
 *     entry, AND no glob pattern in web_accessible_resources covers
 *     src/module-loader.js (e.g., a hypothetical src/*.js glob would expose
 *     it even without an explicit listing).
 *
 * Test 1 (regression guard):
 *   module-loader.js is absent from every content_scripts js array (both
 *   ISOLATED and MAIN world blocks). It was never injected by the browser, so
 *   its window.loadModule / window.defineModule globals are never created.
 *
 * Test 2 (regression guard):
 *   module-loader.js is not reachable via web_accessible_resources — neither
 *   as an explicit path nor as a file matched by any declared glob pattern.
 *   Listing it (directly or via glob) would make it fetchable from the page
 *   via chrome.runtime.getURL(), which is unnecessary attack surface.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

const runner = new SimpleTestRunner();

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../');
const manifest = JSON.parse(readFileSync(join(repoRoot, 'manifest.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Test 1 — module-loader.js is not in any content_scripts js array
// ---------------------------------------------------------------------------
runner.test(
  'module-loader.js is absent from all content_scripts js arrays (ISOLATED and MAIN worlds)',
  () => {
    const contentScripts = manifest.content_scripts ?? [];
    const allInjectedFiles = contentScripts.flatMap((cs) => cs.js ?? []);

    const found = allInjectedFiles.some((f) => f.includes('module-loader'));

    assert.false(
      found,
      `module-loader.js must not appear in any content_scripts js array — ` +
        `found it listed: ${allInjectedFiles.filter((f) => f.includes('module-loader')).join(', ')}`
    );
  }
);

// ---------------------------------------------------------------------------
// Test 2 — module-loader.js is unreachable via web_accessible_resources:
//           neither as an explicit path nor via any declared glob pattern
// ---------------------------------------------------------------------------
runner.test(
  'module-loader.js is not reachable via web_accessible_resources (explicit or glob)',
  () => {
    const war = manifest.web_accessible_resources ?? [];
    const allResources = war.flatMap((entry) => entry.resources ?? []);

    // Check 2a: no explicit listing
    const explicitMatch = allResources.find((r) => r === 'src/module-loader.js');
    assert.equal(
      explicitMatch,
      undefined,
      `src/module-loader.js must not be listed explicitly in web_accessible_resources — ` +
        `it is dead code under Path B and its presence widens the extension attack surface unnecessarily`
    );

    // Check 2b: no glob pattern covers src/module-loader.js.
    // The only glob patterns that could match it would be rooted at src/ with
    // a wildcard that reaches the top-level src/ directory (e.g., "src/*.js").
    // Patterns rooted in subdirectories (src/core/*.js, src/content/*.js, etc.)
    // cannot match a file directly under src/.
    const globsThatCoverSrcRoot = allResources.filter((r) => {
      // Match patterns of the form src/*.js or src/* (not src/subdir/...)
      return /^src\/\*/.test(r);
    });
    assert.equal(
      globsThatCoverSrcRoot.length,
      0,
      `web_accessible_resources must not contain a glob pattern rooted at src/ ` +
        `(e.g., "src/*.js") — such a pattern would expose src/module-loader.js ` +
        `to page scripts even without an explicit listing. Found: ${JSON.stringify(globsThatCoverSrcRoot)}`
    );
  }
);

export default runner;
