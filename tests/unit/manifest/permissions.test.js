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

runner.test('all world:MAIN content_scripts blocks declare run_at:"document_end"', () => {
  const contentScripts = manifest.content_scripts ?? [];
  const mainWorldBlocks = contentScripts.filter((cs) => cs.world === 'MAIN');
  assert.true(
    mainWorldBlocks.length > 0,
    'no world:MAIN blocks found — cannot verify run_at'
  );
  for (const block of mainWorldBlocks) {
    assert.equal(
      block.run_at,
      'document_end',
      `world:MAIN block (js: ${JSON.stringify(block.js?.[0])}) must declare run_at:"document_end" ` +
        `to ensure MAIN-world scripts run before document_idle (got: ${JSON.stringify(block.run_at)})`
    );
  }
});

runner.test('ISOLATED-world injector block (injector.js) has match_about_blank:false', () => {
  const contentScripts = manifest.content_scripts ?? [];
  // Identify the ISOLATED-world injector block by content, not position:
  // it is the block that injects injector.js and does NOT declare world:"MAIN".
  const injectorBlock = contentScripts.find(
    (cs) => cs.world !== 'MAIN' && (cs.js ?? []).includes('src/content/injector.js')
  );
  assert.true(
    injectorBlock !== undefined,
    'no ISOLATED-world content_scripts block containing src/content/injector.js found'
  );
  assert.equal(
    injectorBlock.match_about_blank,
    false,
    'ISOLATED-world injector block must set match_about_blank:false ' +
      'to prevent injection into YouTube sandboxed about:blank iframes (causes console errors)'
  );
});

runner.test('all content_scripts blocks explicitly set match_about_blank:false (no block may inject into about:blank)', () => {
  // Chrome MV3 default is false when the key is absent, but explicit false is
  // required so that adding a new block never silently enables about:blank
  // injection.  This test catches any block that omits the key entirely.
  const contentScripts = manifest.content_scripts ?? [];
  assert.true(contentScripts.length > 0, 'manifest must have at least one content_scripts block');
  for (const cs of contentScripts) {
    assert.equal(
      cs.match_about_blank,
      false,
      `content_scripts block (matches: ${JSON.stringify(cs.matches)}, world: ${JSON.stringify(cs.world)}) ` +
        `must explicitly declare match_about_blank:false — absent key defaults to false in Chrome MV3 ` +
        `but is invisible to reviewers and future agents`
    );
  }
});

runner.test('base-handler.js appears before all other site handler files in world:MAIN js array (regression guard)', () => {
  const contentScripts = manifest.content_scripts ?? [];
  const mainWorldEntry = contentScripts.find(
    (cs) => cs.world === 'MAIN' && (cs.js ?? []).includes('src/site-handlers/base-handler.js')
  );
  if (!mainWorldEntry) {
    assert.true(false, 'no world:MAIN block containing base-handler.js found');
    return;
  }
  const files = mainWorldEntry.js ?? [];
  const baseIndex = files.indexOf('src/site-handlers/base-handler.js');
  assert.true(baseIndex !== -1, 'src/site-handlers/base-handler.js not found in world:MAIN js array');
  const siteHandlerPattern = /^src\/site-handlers\/.+-handler\.js$/;
  const otherHandlersBefore = files
    .slice(0, baseIndex)
    .filter((f) => siteHandlerPattern.test(f) && f !== 'src/site-handlers/base-handler.js');
  assert.equal(
    otherHandlersBefore.length,
    0,
    `base-handler.js must appear before all other site handler files; ` +
      `found these site handlers before it: ${JSON.stringify(otherHandlersBefore)}`
  );
});

export default runner;
