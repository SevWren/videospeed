/**
 * Dead-code guard: module-loader.js under Path B
 *
 * T3-A4 — confirms that src/module-loader.js is unreachable dead code under
 * the Path B (world:MAIN content_scripts) architecture and should not appear
 * in web_accessible_resources.
 *
 * Test 1 (GREEN — regression guard):
 *   module-loader.js is absent from every content_scripts js array (both
 *   ISOLATED and MAIN world blocks). It was never injected by the browser, so
 *   its window.loadModule / window.defineModule globals are never created.
 *
 * Test 2 (GREEN — regression guard):
 *   module-loader.js is absent from web_accessible_resources. Listing it there
 *   would make it fetchable from the page via chrome.runtime.getURL(), which is
 *   unnecessary attack surface for a file that nothing calls. This test guards
 *   against the entry being re-introduced.
 *
 * Test 3 (GREEN — regression guard):
 *   None of the files actually injected by content_scripts call loadModule()
 *   or defineModule(). This proves the file is unreachable: even if it were
 *   somehow loaded, nothing in the injected surface invokes it.
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
// Test 2 — module-loader.js must NOT be in web_accessible_resources (RED now)
// ---------------------------------------------------------------------------
runner.test(
  'module-loader.js is absent from web_accessible_resources (regression guard)',
  () => {
    const war = manifest.web_accessible_resources ?? [];
    const allResources = war.flatMap((entry) => entry.resources ?? []);

    const found = allResources.some((r) => r === 'src/module-loader.js');

    assert.false(
      found,
      `src/module-loader.js must not be listed in web_accessible_resources — ` +
        `it is dead code under Path B and its presence widens the extension attack surface unnecessarily`
    );
  }
);

// ---------------------------------------------------------------------------
// Test 3 — no injected file calls loadModule() or defineModule()
// ---------------------------------------------------------------------------
runner.test(
  'no content_scripts file calls loadModule() or defineModule() — module-loader.js is unreachable',
  () => {
    const contentScripts = manifest.content_scripts ?? [];
    const allInjectedFiles = contentScripts.flatMap((cs) => cs.js ?? []);

    const callers = [];

    for (const relPath of allInjectedFiles) {
      const absPath = join(repoRoot, relPath);
      let source;
      try {
        source = readFileSync(absPath, 'utf8');
      } catch {
        // File missing — not a call-site concern; other tests cover missing files
        continue;
      }

      if (/loadModule\s*\(|defineModule\s*\(/.test(source)) {
        callers.push(relPath);
      }
    }

    assert.true(
      callers.length === 0,
      `loadModule() or defineModule() was found in injected file(s): ${callers.join(', ')} — ` +
        `these functions are only defined in module-loader.js, which is not injected under Path B`
    );
  }
);

export default runner;
