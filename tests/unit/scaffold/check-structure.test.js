/**
 * Unit tests for scripts/check-structure.mjs
 *
 * Tests the pure helper functions and checkStructure() logic
 * without touching the filesystem — all I/O is overridden via opts.
 *
 * Format matches tests/unit/core/settings.test.js:
 *   SimpleTestRunner + assert from tests/helpers/test-utils.js
 *   export { runner } so the custom test runner can call runner.run()
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import {
  parseInjectorModules,
  parseWARPatterns,
  expandGlob,
  parseSeamIndexModuleCount,
  checkStructure,
} from '../../../scripts/check-structure.mjs';

const runner = new SimpleTestRunner();

// ---------------------------------------------------------------------------
// parseInjectorModules
// ---------------------------------------------------------------------------

runner.test('parseInjectorModules: extracts paths from a standard modules array', () => {
  const src = `
    const modules = [
      'src/utils/constants.js',
      'src/core/settings.js',
      'src/ui/controls.js',
    ];
  `;
  const result = parseInjectorModules(src);
  assert.equal(result.length, 3, 'Should extract 3 modules');
  assert.equal(result[0], 'src/utils/constants.js');
  assert.equal(result[2], 'src/ui/controls.js');
});

runner.test('parseInjectorModules: returns empty array when no modules block found', () => {
  const src = `function injectScript(src) { return src; }`;
  const result = parseInjectorModules(src);
  assert.equal(result.length, 0);
});

runner.test('parseInjectorModules: handles double-quoted paths', () => {
  const src = `const modules = ["src/utils/logger.js", "src/core/action-handler.js"];`;
  const result = parseInjectorModules(src);
  assert.equal(result.length, 2);
  assert.equal(result[0], 'src/utils/logger.js');
});

// ---------------------------------------------------------------------------
// parseWARPatterns
// ---------------------------------------------------------------------------

runner.test('parseWARPatterns: extracts glob patterns from manifest', () => {
  const manifest = JSON.stringify({
    web_accessible_resources: [
      {
        resources: ['src/core/*.js', 'src/utils/*.js', 'src/lib/*.js'],
        matches: ['http://*/*'],
      },
    ],
  });
  const patterns = parseWARPatterns(manifest);
  assert.equal(patterns.length, 3);
  assert.equal(patterns[0], 'src/core/*.js');
});

runner.test('parseWARPatterns: returns empty array when no WAR present', () => {
  const manifest = JSON.stringify({ name: 'test', manifest_version: 3 });
  const patterns = parseWARPatterns(manifest);
  assert.equal(patterns.length, 0);
});

runner.test('parseWARPatterns: throws on invalid JSON', () => {
  assert.throws(() => parseWARPatterns('NOT JSON'), 'Should throw on invalid JSON');
});

// ---------------------------------------------------------------------------
// parseSeamIndexModuleCount
// ---------------------------------------------------------------------------

runner.test('parseSeamIndexModuleCount: parses module-count from YAML front matter', () => {
  const src = `---\nteam: L3\nmodule-count: 25\n---\n\n# SEAM-INDEX\n`;
  const count = parseSeamIndexModuleCount(src);
  assert.equal(count, 25);
});

runner.test('parseSeamIndexModuleCount: returns null when no module-count field', () => {
  const src = `---\nteam: L3\n---\n\n# SEAM-INDEX\n`;
  const count = parseSeamIndexModuleCount(src);
  assert.equal(count, null);
});

// ---------------------------------------------------------------------------
// checkStructure — integration of pure logic with overridden I/O
// ---------------------------------------------------------------------------

// Build a minimal injector src with known modules
const INJECTOR_SRC_OK = `
const modules = [
  'src/utils/constants.js',
  'src/core/settings.js',
];
`;

// Manifest that covers both modules via globs
const MANIFEST_SRC_OK = JSON.stringify({
  web_accessible_resources: [
    {
      resources: ['src/utils/*.js', 'src/core/*.js'],
      matches: ['http://*/*'],
    },
  ],
});

runner.test('checkStructure: returns no errors when all modules are consistent', () => {
  const { errors, warnings } = checkStructure({
    injectorSrc: INJECTOR_SRC_OK,
    manifestSrc: MANIFEST_SRC_OK,
    // Override filesystem checks: all files "exist"
    fileExistsOverride: () => true,
    // No SEAM-INDEX
    seamIndexSrc: undefined,
    repoRoot: '/fake',
    _skipFsRead: true,
  });
  // No file-existence errors (we overrode existsSync via fileExistsOverride — but
  // checkStructure uses existsSync directly; we test via the fs-override pattern)
  // The real test: with valid inputs and all files existing, errors should be empty
  // (warnings may exist for missing SEAM-INDEX)
  assert.equal(errors.length, 0, 'No errors expected when structure is consistent');
});

runner.test('checkStructure: errors when injected module not covered by WAR', () => {
  const injectorWithExtra = `
    const modules = [
      'src/utils/constants.js',
      'src/special/not-in-war.js',
    ];
  `;
  // WAR only covers src/utils/*.js
  const manifestNarrow = JSON.stringify({
    web_accessible_resources: [
      { resources: ['src/utils/*.js'], matches: ['http://*/*'] },
    ],
  });

  const { errors } = checkStructure({
    injectorSrc: injectorWithExtra,
    manifestSrc: manifestNarrow,
    repoRoot: '/fake',
    _skipFsRead: true,
  });

  // Should flag src/special/not-in-war.js as not in WAR
  const warError = errors.find(e => e.includes('NOT IN WAR') && e.includes('not-in-war.js'));
  assert.exists(warError, 'Should report NOT IN WAR error for module missing from WAR patterns');
});

runner.test('checkStructure: warns when SEAM-INDEX is absent', () => {
  const { warnings } = checkStructure({
    injectorSrc: INJECTOR_SRC_OK,
    manifestSrc: MANIFEST_SRC_OK,
    repoRoot: '/fake',
    _skipFsRead: true,
    // seamIndexSrc not provided and no real fs
  });
  // Should warn about missing SEAM-INDEX
  const seamWarn = warnings.find(w => w.includes('SEAM-INDEX'));
  assert.exists(seamWarn, 'Should warn about missing SEAM-INDEX.md');
});

runner.test('checkStructure: errors when SEAM-INDEX module-count mismatches injector', () => {
  const seamIndexWithWrongCount = `---\nmodule-count: 99\n---\n`;
  const { errors } = checkStructure({
    injectorSrc: INJECTOR_SRC_OK, // 2 modules
    manifestSrc: MANIFEST_SRC_OK,
    seamIndexSrc: seamIndexWithWrongCount,
    repoRoot: '/fake',
    _skipFsRead: true,
  });
  const mismatchError = errors.find(e => e.includes('SEAM-INDEX MISMATCH'));
  assert.exists(mismatchError, 'Should report SEAM-INDEX MISMATCH when count differs');
});

runner.test('checkStructure: errors when parse finds no modules in injector', () => {
  const emptyInjector = `function injectScript(src) {}`;
  const { errors } = checkStructure({
    injectorSrc: emptyInjector,
    manifestSrc: MANIFEST_SRC_OK,
    repoRoot: '/fake',
    _skipFsRead: true,
  });
  const parseError = errors.find(e => e.includes('PARSE ERROR'));
  assert.exists(parseError, 'Should report PARSE ERROR when no modules array found');
});

export { runner };
