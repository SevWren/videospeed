#!/usr/bin/env node

/**
 * Manifest contract validator — Path B architecture invariants.
 *
 * Asserts:
 *  1. content_scripts has an entry with world:"MAIN"
 *  2. minimum_chrome_version >= 111
 *  3. "scripting" is NOT in permissions
 *
 * Exits 0 on success, exits 1 with an error message on failure.
 * Uses only Node.js built-ins (no npm imports).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const manifestPath = join(__dirname, '../manifest.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error(`check-manifest: failed to read manifest.json — ${err.message}`);
  process.exit(1);
}

const errors = [];

// 1. content_scripts must include at least one entry with world:"MAIN"
const hasWorldMain =
  Array.isArray(manifest.content_scripts) &&
  manifest.content_scripts.some((cs) => cs.world === 'MAIN');
if (!hasWorldMain) {
  errors.push(
    'content_scripts must have at least one entry with world:"MAIN" (Path B architecture)'
  );
}

// 2. minimum_chrome_version must be >= 111
const minChromeRaw = manifest.minimum_chrome_version;
const minChromeNum = parseInt(minChromeRaw, 10);
if (!minChromeRaw || isNaN(minChromeNum) || minChromeNum < 111) {
  errors.push(
    `minimum_chrome_version must be 111 or higher (found: ${JSON.stringify(minChromeRaw)})`
  );
}

// 3. "scripting" must NOT be in permissions
const permissions = manifest.permissions || [];
if (permissions.includes('scripting')) {
  errors.push(
    '"scripting" must not be listed in permissions — Path B uses world:"MAIN" instead'
  );
}

if (errors.length > 0) {
  console.error('check-manifest: manifest contract violations found:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('check-manifest: all Path B manifest invariants passed.');
process.exit(0);
