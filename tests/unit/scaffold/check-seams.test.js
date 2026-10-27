/**
 * Unit tests for scripts/check-seams.mjs
 *
 * Tests pure functions and checkSeams() logic without filesystem I/O —
 * all disk access is overridden via opts parameters.
 *
 * Format matches tests/unit/core/settings.test.js:
 *   SimpleTestRunner + assert from tests/helpers/test-utils.js
 *   export { runner } so the custom test runner can call runner.run()
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import {
  parseSeamCardFilePaths,
  parseSeamIndexModules,
  checkSeams,
} from '../../../scripts/check-seams.mjs';

const runner = new SimpleTestRunner();

// ---------------------------------------------------------------------------
// parseSeamCardFilePaths
// ---------------------------------------------------------------------------

runner.test('parseSeamCardFilePaths: parses File: line in plain text format', () => {
  const src = '# gif-controller seam\n\nFile: src/core/gif-controller.js\n\nSome description.\n';
  const paths = parseSeamCardFilePaths(src);
  assert.equal(paths.length, 1);
  assert.equal(paths[0], 'src/core/gif-controller.js');
});

runner.test('parseSeamCardFilePaths: parses File: line in backtick format', () => {
  const src = '# injector seam\n\n**File:** `src/content/injector.js`\n';
  const paths = parseSeamCardFilePaths(src);
  assert.equal(paths.length, 1);
  assert.equal(paths[0], 'src/content/injector.js');
});

runner.test('parseSeamCardFilePaths: parses File in markdown table format', () => {
  const src = '| Field | Value |\n|---|---|\n| File | `src/observers/gif-observer.js` |\n';
  const paths = parseSeamCardFilePaths(src);
  assert.equal(paths.length, 1);
  assert.equal(paths[0], 'src/observers/gif-observer.js');
});

runner.test('parseSeamCardFilePaths: returns empty array when no File: line', () => {
  const src = '# orphan seam\n\nNo file reference here.\n';
  const paths = parseSeamCardFilePaths(src);
  assert.equal(paths.length, 0);
});

runner.test('parseSeamCardFilePaths: deduplicates repeated references', () => {
  const src = 'File: src/core/settings.js\nFile: src/core/settings.js\n';
  const paths = parseSeamCardFilePaths(src);
  assert.equal(paths.length, 1);
});

// ---------------------------------------------------------------------------
// parseSeamIndexModules
// ---------------------------------------------------------------------------

runner.test('parseSeamIndexModules: parses modules from YAML front matter', () => {
  const src = '---\nteam: L3\nmodule-count: 3\nmodules:\n  - gif-controller\n  - injector\n  - settings\n---\n';
  const mods = parseSeamIndexModules(src);
  assert.equal(mods.length, 3);
  assert.true(mods.includes('gif-controller'));
  assert.true(mods.includes('injector'));
  assert.true(mods.includes('settings'));
});

runner.test('parseSeamIndexModules: parses modules from ## Modules body section', () => {
  const src = '# SEAM-INDEX\n\n## Modules\n\n- gif-controller\n- gif-observer\n- video-controller\n';
  const mods = parseSeamIndexModules(src);
  assert.true(mods.includes('gif-controller'));
  assert.true(mods.includes('gif-observer'));
  assert.true(mods.includes('video-controller'));
});

runner.test('parseSeamIndexModules: returns empty array when no modules found', () => {
  const src = '---\nteam: L3\n---\n\n# SEAM-INDEX\n\nNo module list here.\n';
  const mods = parseSeamIndexModules(src);
  assert.equal(mods.length, 0);
});

// ---------------------------------------------------------------------------
// checkSeams — integration tests with I/O overrides
// ---------------------------------------------------------------------------

runner.test('checkSeams: passes when seam card cites a valid file path', () => {
  const cardPath = '/fake/seams/gif-controller.seam.md';
  const cardSrc = '# gif-controller seam\n\nFile: src/core/gif-controller.js\n';

  const { errors } = checkSeams({
    repoRoot: '/fake',
    cardPaths: [cardPath],
    cardSources: { [cardPath]: cardSrc },
    // File exists
    fileExistsOverride: (p) => p === 'src/core/gif-controller.js',
    // No SEAM-INDEX
    seamIndexSrc: undefined,
  });

  assert.equal(errors.length, 0, 'No errors when seam card cites valid path');
});

runner.test('checkSeams: errors when seam card cites a broken file path', () => {
  const cardPath = '/fake/seams/gif-controller.seam.md';
  const cardSrc = '# gif-controller seam\n\nFile: src/core/gif-controller-old.js\n';

  const { errors } = checkSeams({
    repoRoot: '/fake',
    cardPaths: [cardPath],
    cardSources: { [cardPath]: cardSrc },
    // File does NOT exist
    fileExistsOverride: () => false,
    seamIndexSrc: undefined,
  });

  const brokenError = errors.find(e => e.includes('BROKEN CITATION'));
  assert.exists(brokenError, 'Should report BROKEN CITATION for non-existent file path');
  assert.true(
    brokenError.includes('gif-controller.seam.md'),
    'Error should name the seam card file'
  );
});

runner.test('checkSeams: warns when no seam cards found and no SEAM-INDEX', () => {
  const { warnings } = checkSeams({
    repoRoot: '/fake',
    cardPaths: [],
    seamIndexSrc: undefined,
  });
  const noCardsWarn = warnings.find(w => w.includes('No *.seam.md files'));
  assert.exists(noCardsWarn, 'Should warn when no seam cards exist');
});

runner.test('checkSeams: errors when SEAM-INDEX lists module with no seam card', () => {
  const seamIndex = '---\nmodules:\n  - gif-controller\n  - injector\n---\n';
  // Only gif-controller.seam.md exists; injector card is missing

  const cardPath = '/fake/seams/gif-controller.seam.md';
  const cardSrc = 'File: src/core/gif-controller.js\n';

  const { errors } = checkSeams({
    repoRoot: '/fake',
    cardPaths: [cardPath],
    cardSources: { [cardPath]: cardSrc },
    fileExistsOverride: () => true,
    seamIndexSrc: seamIndex,
  });

  const missingCard = errors.find(e =>
    e.includes('MISSING SEAM CARD') && e.includes('injector')
  );
  assert.exists(missingCard, 'Should error when SEAM-INDEX module has no seam card');
});

runner.test('checkSeams: no error when all SEAM-INDEX modules have seam cards', () => {
  const seamIndex = '---\nmodules:\n  - gif-controller\n  - injector\n---\n';

  const gcPath = '/fake/seams/gif-controller.seam.md';
  const injPath = '/fake/seams/injector.seam.md';

  const { errors } = checkSeams({
    repoRoot: '/fake',
    cardPaths: [gcPath, injPath],
    cardSources: {
      [gcPath]: 'File: src/core/gif-controller.js\n',
      [injPath]: 'File: src/content/injector.js\n',
    },
    fileExistsOverride: () => true,
    seamIndexSrc: seamIndex,
  });

  assert.equal(errors.length, 0, 'No errors when all registered modules have seam cards');
});

runner.test('checkSeams: warns when seam card has no File: line', () => {
  const cardPath = '/fake/seams/mystery.seam.md';
  const cardSrc = '# mystery module\n\nThis card has no File: reference.\n';

  const { warnings } = checkSeams({
    repoRoot: '/fake',
    cardPaths: [cardPath],
    cardSources: { [cardPath]: cardSrc },
    fileExistsOverride: () => true,
    seamIndexSrc: undefined,
  });

  const noFileWarn = warnings.find(w => w.includes('mystery.seam.md'));
  assert.exists(noFileWarn, 'Should warn when seam card has no File: line');
});

export { runner };
