/**
 * Manifest contract validator — asserts Path B invariants.
 *
 * RED before Path B fix:
 *   - no content_scripts entry with world:"MAIN"
 *   - minimum_chrome_version is "89" (< 111)
 *
 * GREEN after Path B fix:
 *   - at least one content_scripts entry declares world:"MAIN"
 *   - minimum_chrome_version is "111" or higher
 *   - "scripting" is NOT in permissions (Path B does not need chrome.scripting)
 *   - manifest lists inject.js as the last file in the world:MAIN block
 *
 * Per diagnosing-bugs skill Phase 5: this is the regression test written
 * BEFORE the fix, at the manifest-structure seam (highest available seam
 * that covers the bug's root cause without a browser).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

const runner = new SimpleTestRunner();

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../');
const manifest = JSON.parse(readFileSync(join(repoRoot, 'manifest.json'), 'utf8'));

runner.test('minimum_chrome_version is at least 111 (world:MAIN requires Chrome 111+)', () => {
  const minChrome = parseInt(manifest.minimum_chrome_version ?? '0', 10);
  assert.true(
    minChrome >= 111,
    `expected minimum_chrome_version >= 111, got "${manifest.minimum_chrome_version}"`
  );
});

runner.test('content_scripts has at least one entry with world:"MAIN"', () => {
  const contentScripts = manifest.content_scripts ?? [];
  const mainWorldEntry = contentScripts.find((cs) => cs.world === 'MAIN');
  assert.true(
    mainWorldEntry !== undefined,
    'no content_scripts entry declares world:"MAIN" — Path B requires this for CSP bypass'
  );
});

runner.test('"scripting" is absent from permissions (Path B does not need chrome.scripting)', () => {
  const permissions = manifest.permissions ?? [];
  assert.equal(
    permissions.includes('scripting'),
    false,
    '"scripting" permission must not be present under Path B — world:MAIN bypasses both CSP and chrome.scripting entirely'
  );
});

runner.test('world:MAIN block includes src/content/inject.js as last entry', () => {
  const contentScripts = manifest.content_scripts ?? [];
  const mainWorldEntry = contentScripts.find((cs) => cs.world === 'MAIN');
  if (!mainWorldEntry) {
    assert.true(false, 'no world:MAIN entry found — cannot check inject.js order');
    return;
  }
  const files = mainWorldEntry.js ?? [];
  assert.true(files.length > 0, 'world:MAIN content_scripts entry must list at least one file');
  assert.equal(
    files[files.length - 1],
    'src/content/inject.js',
    'src/content/inject.js must be last in the world:MAIN js array (it bootstraps the page world)'
  );
});

runner.test('world:MAIN block includes src/utils/constants.js as first entry (P11 load order)', () => {
  const contentScripts = manifest.content_scripts ?? [];
  const mainWorldEntry = contentScripts.find((cs) => cs.world === 'MAIN');
  if (!mainWorldEntry) {
    assert.true(false, 'no world:MAIN entry found — cannot check P11 order');
    return;
  }
  const files = mainWorldEntry.js ?? [];
  assert.equal(
    files[0],
    'src/utils/constants.js',
    'src/utils/constants.js must be first in the world:MAIN js array (P11: sets VSC namespace globals before any consumer)'
  );
});

export default runner;
