#!/usr/bin/env node

/**
 * Source invariant validator — structural contracts not enforced by ESLint.
 *
 * Asserts:
 *  1. injector.js::setupMessageBridge() registers exactly ONE chrome.storage.onChanged
 *     listener. A duplicate causes VSC_USER_SETTINGS to fire twice per tab on every
 *     options-page save, silently applying settings double.
 *
 * Exits 0 on success, exits 1 with an error message on failure.
 * Uses only Node.js built-ins (no npm imports).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const errors = [];

// ── Invariant 1: exactly one chrome.storage.onChanged.addListener in injector.js ──
const injectorSrc = readFileSync(join(__dirname, '../src/content/injector.js'), 'utf8');
const listenerMatches = (injectorSrc.match(/chrome\.storage\.onChanged\.addListener/g) || []);

if (listenerMatches.length !== 1) {
  errors.push(
    `injector.js must have exactly 1 chrome.storage.onChanged.addListener call ` +
    `(found ${listenerMatches.length}). ` +
    `A duplicate causes double VSC_USER_SETTINGS dispatch on every options-page save.`
  );
}

if (errors.length > 0) {
  console.error('check-invariants: source invariant violations found:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('check-invariants: all source invariants passed.');
process.exit(0);
