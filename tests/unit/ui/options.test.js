/**
 * Structural tests for the Options page — T5 (Keyboard targeting section).
 *
 * options.js is a BROWSER-ONLY module (see docs/coverage/untestable.md:73-103).
 * It is loaded via a <script> tag inside options.html and cannot be imported as
 * an ES module in JSDOM. Per CODING_STANDARDS.md CS-3 exception, this file
 * uses readFileSync + content assertions (structural source tests) instead of
 * importing the production module.
 *
 * Production files mirrored: src/ui/options/options.html, src/ui/options/options.js
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';

const runner = new SimpleTestRunner();

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../');
const optionsHtml = readFileSync(join(repoRoot, 'src/ui/options/options.html'), 'utf8');
const optionsJs = readFileSync(join(repoRoot, 'src/ui/options/options.js'), 'utf8');

// ── options.html structural assertions ────────────────────────────────────────

runner.test('options.html contains hoverActivatesVideoTarget checkbox id', () => {
  assert.true(
    optionsHtml.includes('id="hoverActivatesVideoTarget"'),
    'options.html must contain id="hoverActivatesVideoTarget" checkbox'
  );
});

runner.test('options.html contains hoverActivatesGifTarget checkbox id', () => {
  assert.true(
    optionsHtml.includes('id="hoverActivatesGifTarget"'),
    'options.html must contain id="hoverActivatesGifTarget" checkbox'
  );
});

runner.test('options.html contains a Keyboard targeting section heading', () => {
  assert.true(
    optionsHtml.includes('Keyboard targeting'),
    'options.html must contain a "Keyboard targeting" section heading'
  );
});

// ── options.js structural assertions — save_options ───────────────────────────

runner.test('options.js save_options references hoverActivatesVideoTarget', () => {
  assert.true(
    optionsJs.includes('hoverActivatesVideoTarget'),
    'options.js must reference hoverActivatesVideoTarget (used in save_options and restore_options)'
  );
});

runner.test('options.js save_options references hoverActivatesGifTarget', () => {
  assert.true(
    optionsJs.includes('hoverActivatesGifTarget'),
    'options.js must reference hoverActivatesGifTarget (used in save_options and restore_options)'
  );
});

runner.test('options.js settingsToSave includes hoverActivatesVideoTarget key', () => {
  // The settingsToSave object literal in save_options must contain the key.
  assert.true(
    optionsJs.includes('hoverActivatesVideoTarget:'),
    'options.js settingsToSave object must include hoverActivatesVideoTarget: as a key'
  );
});

runner.test('options.js settingsToSave includes hoverActivatesGifTarget key', () => {
  assert.true(
    optionsJs.includes('hoverActivatesGifTarget:'),
    'options.js settingsToSave object must include hoverActivatesGifTarget: as a key'
  );
});

export default runner;
