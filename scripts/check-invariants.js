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

// ── Invariant 2: every key in DEFAULT_SETTINGS (constants.js) that is not internal-only
//    must appear in _VSC_USER_CONTROLLED_KEYS (injector.js).
//    Internal-only keys: lastSpeed, lastGifSpeed, speeds (not user-settable from the Options
//    page and not relayed as live patches — they are bulk-written by save()).
//    Adding a new user-settable setting without adding it here produces a silent bug where
//    Options-page saves are not relayed to open tabs until a page reload.
const constantsSrc = readFileSync(join(__dirname, '../src/utils/constants.js'), 'utf8');

// Extract keys from DEFAULT_SETTINGS block
const defaultSettingsMatch = constantsSrc.match(/const DEFAULT_SETTINGS\s*=\s*\{([\s\S]*?)\};/);
const defaultSettingsKeys = [];
if (defaultSettingsMatch) {
  const body = defaultSettingsMatch[1];
  // Match lines like: `  keyName: value,` or `  keyName: value`
  const keyRegex = /^\s{2,4}(\w+)\s*:/gm;
  let m;
  while ((m = keyRegex.exec(body)) !== null) {
    defaultSettingsKeys.push(m[1]);
  }
}

// Keys that are intentionally excluded from the relay Set.
// Each exclusion reason is documented in injector.js adjacent to _VSC_USER_CONTROLLED_KEYS.
//   lastSpeed, lastGifSpeed, speeds — runtime/bulk-write state; not relayed individually
//   keyBindings — bulk relay (the entire array), not a simple patch key
//   controlGifs — handled via dedicated VSC_ENABLE/DISABLE_GIF_CONTROL message channel
//   displayKeyCode — legacy; display key lives inside keyBindings already
//   defaultLogLevel — internal fallback log level; not a user option page setting
const RELAY_EXCLUDED = new Set([
  'lastSpeed',
  'lastGifSpeed',
  'speeds',
  'keyBindings',
  'controlGifs',
  'displayKeyCode',
  'defaultLogLevel',
]);

// Extract _VSC_USER_CONTROLLED_KEYS set literal from injector.js
const relayMatch = injectorSrc.match(/_VSC_USER_CONTROLLED_KEYS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
const relayKeys = new Set();
if (relayMatch) {
  const setBody = relayMatch[1];
  const quoteRegex = /['"](\w+)['"]/g;
  let qm;
  while ((qm = quoteRegex.exec(setBody)) !== null) {
    relayKeys.add(qm[1]);
  }
}

for (const key of defaultSettingsKeys) {
  if (RELAY_EXCLUDED.has(key)) {
    continue;
  }
  if (!relayKeys.has(key)) {
    errors.push(
      `DEFAULT_SETTINGS key '${key}' is missing from _VSC_USER_CONTROLLED_KEYS in injector.js. ` +
      `Live Options-page saves for this key will not be relayed to open tabs. ` +
      `Add '${key}' to the _VSC_USER_CONTROLLED_KEYS Set.`
    );
  }
}

if (errors.length > 0) {
  console.error('check-invariants: source invariant violations found:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log('check-invariants: all source invariants passed.');
process.exit(0);
