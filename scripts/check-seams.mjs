#!/usr/bin/env node
/**
 * check-seams.mjs
 *
 * Validates seam cards under docs/ai_generated/seams/*.seam.md:
 *   1. For each seam card, parse the "File: src/..." line and verify the
 *      referenced file exists on disk.
 *   2. If SEAM-INDEX.md exists, verify every registered module has a
 *      corresponding seam card — exits non-zero (not warn) on missing cards.
 *   3. Warns (does not error) if SEAM-INDEX.md is absent.
 *
 * Exit 0  — all checks pass (warnings may be printed)
 * Exit 1  — broken file references or missing seam cards
 *
 * Usage: node scripts/check-seams.mjs
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find all *.seam.md files in a directory.
 * Returns an array of absolute file paths.
 */
export function findSeamCards(seamsDir) {
  if (!existsSync(seamsDir)) {return [];}
  let entries;
  try {
    entries = readdirSync(seamsDir);
  } catch {
    return [];
  }
  return entries
    .filter(f => f.endsWith('.seam.md'))
    .map(f => join(seamsDir, f));
}

/**
 * Parse the "File:" reference(s) from a seam card's content.
 * Looks for lines matching:  File: src/...
 * Returns an array of path strings (relative to repo root).
 */
export function parseSeamCardFilePaths(cardSrc) {
  const paths = [];
  // Match lines like: File: src/core/gif-controller.js
  // or: **File:** `src/core/gif-controller.js`
  const lineRe = /^\s*(?:\*{0,2}File\*{0,2}:)\s*[`]?([^\s`]+)[`]?\s*$/gim;
  let m;
  while ((m = lineRe.exec(cardSrc)) !== null) {
    const p = m[1].trim();
    if (p.startsWith('src/') || p.startsWith('./src/')) {
      paths.push(p.replace(/^\.\//, ''));
    }
  }
  // Also match inline: | File | `src/...` |  (table format)
  const tableRe = /\|\s*File\s*\|\s*[`]?([^`|\s]+)[`]?\s*\|/gi;
  while ((m = tableRe.exec(cardSrc)) !== null) {
    const p = m[1].trim();
    if (p.startsWith('src/') || p.startsWith('./src/')) {
      paths.push(p.replace(/^\.\//, ''));
    }
  }
  return [...new Set(paths)];
}

/**
 * Parse the list of registered modules from SEAM-INDEX.md.
 * Looks for lines matching: - module-name  or  | module-name |
 * in the modules section of the YAML front matter or body.
 *
 * Returns an array of module names (stem names, e.g. "gif-controller").
 */
export function parseSeamIndexModules(seamIndexSrc) {
  const modules = [];

  // Try YAML front matter: modules: block
  // e.g.:
  //   modules:
  //     - gif-controller
  //     - injector
  const fmMatch = seamIndexSrc.match(/^---\n([\s\S]*?)\n---/m);
  if (fmMatch) {
    const fm = fmMatch[1];
    const modulesBlock = fm.match(/(?:modules|seam-cards):\s*\n((?:\s+-\s+\S+\n?)+)/);
    if (modulesBlock) {
      const itemRe = /^\s+-\s+(\S+)/gm;
      let m;
      while ((m = itemRe.exec(modulesBlock[1])) !== null) {
        modules.push(m[1]);
      }
    }
  }

  // Also scan body for markdown list items under a "## Modules" heading
  const bodyModulesSection = seamIndexSrc.match(/##\s+Modules[\s\S]*?(?=\n##|\n$|$)/i);
  if (bodyModulesSection) {
    const itemRe = /^\s*[-*]\s+\*{0,2}([a-z0-9-]+)\*{0,2}/gim;
    let m;
    while ((m = itemRe.exec(bodyModulesSection[0])) !== null) {
      modules.push(m[1]);
    }
  }

  return [...new Set(modules)];
}

/**
 * Run all seam checks.
 * @param {object} opts - Override sources (for testing)
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkSeams(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const seamsDir = opts.seamsDir || join(repoRoot, 'docs/ai_generated/seams');
  const seamIndexPath = join(repoRoot, 'docs/ai_generated/SEAM-INDEX.md');

  const errors = [];
  const warnings = [];

  // --- 1. Find seam cards ---
  const cardPaths = opts.cardPaths !== undefined
    ? opts.cardPaths
    : findSeamCards(seamsDir);

  if (cardPaths.length === 0) {
    warnings.push(
      'WARN: No *.seam.md files found in docs/ai_generated/seams/. ' +
      'Seam cards are created by Team L3. This is expected before L3 runs.'
    );
  }

  // --- 2. For each seam card, verify cited file paths exist on disk ---
  for (const cardPath of cardPaths) {
    const cardSrc = opts.cardSources && opts.cardSources[cardPath] !== undefined
      ? opts.cardSources[cardPath]
      : (existsSync(cardPath) ? readFileSync(cardPath, 'utf8') : null);

    if (cardSrc === null) {
      errors.push(`MISSING SEAM CARD FILE: ${cardPath} listed but does not exist on disk`);
      continue;
    }

    const filePaths = parseSeamCardFilePaths(cardSrc);
    const cardName = basename(cardPath);

    if (filePaths.length === 0) {
      warnings.push(
        `WARN: ${cardName} has no "File: src/..." line. ` +
        'Add a File: field citing the module path.'
      );
      continue;
    }

    for (const fp of filePaths) {
      const abs = join(repoRoot, fp);
      const exists = opts.fileExistsOverride
        ? opts.fileExistsOverride(fp)
        : existsSync(abs);
      if (!exists) {
        errors.push(
          `BROKEN CITATION in ${cardName}: File: ${fp} does not exist on disk. ` +
          'Update the seam card to point to the correct path.'
        );
      }
    }
  }

  // --- 3. Check SEAM-INDEX module coverage ---
  const seamIndexExists = opts.seamIndexSrc !== undefined
    ? true
    : existsSync(seamIndexPath);

  if (!seamIndexExists) {
    warnings.push(
      'WARN: docs/ai_generated/SEAM-INDEX.md not found. ' +
      'SEAM-INDEX is the canonical module registry. ' +
      'Cannot verify seam card coverage without it.'
    );
    return { errors, warnings };
  }

  const seamIndexSrc = opts.seamIndexSrc !== undefined
    ? opts.seamIndexSrc
    : readFileSync(seamIndexPath, 'utf8');

  const registeredModules = parseSeamIndexModules(seamIndexSrc);

  if (registeredModules.length === 0) {
    warnings.push(
      'WARN: SEAM-INDEX.md was found but no module names could be parsed from it. ' +
      'Check that modules are listed in YAML front matter or under a ## Modules heading.'
    );
    return { errors, warnings };
  }

  // Build set of module stems from card filenames (e.g. "gif-controller" from "gif-controller.seam.md")
  const cardStems = new Set(
    cardPaths.map(p => basename(p).replace(/\.seam\.md$/, ''))
  );

  for (const mod of registeredModules) {
    if (!cardStems.has(mod)) {
      // Non-zero exit: missing seam card for a registered module
      errors.push(
        `MISSING SEAM CARD: Module "${mod}" is registered in SEAM-INDEX.md ` +
        `but docs/ai_generated/seams/${mod}.seam.md does not exist. ` +
        'Author the seam card before merging.'
      );
    }
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

{
  const scriptPath = fileURLToPath(import.meta.url);
  const entryPath = resolve(process.argv[1] || '');
  if (scriptPath === entryPath) {
    const { errors, warnings } = checkSeams();

    for (const w of warnings) {
      console.warn(w);
    }

    if (errors.length > 0) {
      console.error('\ncheck-seams FAILED:\n');
      for (const e of errors) {
        console.error(`  ${  e}`);
      }
      process.exit(1);
    }

    console.log('check-seams: OK');
    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s) — see above.`);
    }
    process.exit(0);
  }
}
