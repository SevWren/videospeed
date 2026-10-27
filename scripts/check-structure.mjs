#!/usr/bin/env node
/**
 * check-structure.mjs
 *
 * Verifies that the module list is consistent across:
 *   1. src/content/injector.js  (the modules[] array)
 *   2. manifest.json            (web_accessible_resources globs, expanded against disk)
 *   3. Disk                     (every injected path actually exists)
 *
 * Also reads docs/ai_generated/SEAM-INDEX.md (if present) as the canonical
 * module registry and cross-checks the module-count field in its YAML
 * front matter against the injector.js array length.
 *
 * Exit 0  — all checks pass
 * Exit 1  — one or more discrepancies found (actionable errors printed)
 *
 * Usage: node scripts/check-structure.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse the modules[] array from injector.js.
 * Returns an array of path strings relative to the repo root.
 */
export function parseInjectorModules(injectorSrc) {
  // Match the modules = [ ... ] block (multi-line)
  const blockMatch = injectorSrc.match(/const\s+modules\s*=\s*\[([\s\S]*?)\];/);
  if (!blockMatch) return [];

  const block = blockMatch[1];
  const paths = [];
  // Extract every single-quoted or double-quoted string inside the block
  const stringRe = /['"]([^'"]+)['"]/g;
  let m;
  while ((m = stringRe.exec(block)) !== null) {
    paths.push(m[1]);
  }
  return paths;
}

/**
 * Expand a single WAR glob pattern to matching file paths relative to repo root.
 * Supports patterns like "src/core/*.js", "src/lib/*.js", literal paths.
 * Uses only fs/path — no external glob library.
 */
export function expandGlob(pattern, repoRoot) {
  // If no wildcard, treat as literal path
  if (!pattern.includes('*')) {
    return [pattern];
  }

  // Split into directory prefix and file glob
  const lastSlash = pattern.lastIndexOf('/');
  const dirPart = pattern.slice(0, lastSlash);
  const filePart = pattern.slice(lastSlash + 1);

  const absDir = join(repoRoot, dirPart);
  if (!existsSync(absDir)) return [];

  // Build a simple regex from the file glob (only * wildcard supported)
  const fileRegex = new RegExp('^' + filePart.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');

  let entries;
  try {
    entries = readdirSync(absDir);
  } catch {
    return [];
  }

  const results = [];
  for (const entry of entries) {
    const absEntry = join(absDir, entry);
    let stat;
    try { stat = statSync(absEntry); } catch { continue; }
    if (stat.isFile() && fileRegex.test(entry)) {
      results.push(dirPart + '/' + entry);
    }
  }
  return results;
}

/**
 * Extract all web_accessible_resources file patterns from manifest.json.
 * Returns an array of pattern strings.
 */
export function parseWARPatterns(manifestSrc) {
  let manifest;
  try {
    manifest = JSON.parse(manifestSrc);
  } catch (e) {
    throw new Error('Failed to parse manifest.json: ' + e.message);
  }

  const patterns = [];
  const war = manifest.web_accessible_resources || [];
  for (const entry of war) {
    const resources = Array.isArray(entry.resources) ? entry.resources : [entry.resources];
    for (const r of resources) {
      if (typeof r === 'string') patterns.push(r);
    }
  }
  return patterns;
}

/**
 * Expand all WAR patterns to a Set of paths relative to repo root.
 */
export function expandWARPatterns(patterns, repoRoot) {
  const expanded = new Set();
  for (const pattern of patterns) {
    for (const p of expandGlob(pattern, repoRoot)) {
      expanded.add(p);
    }
  }
  return expanded;
}

/**
 * Parse the module-count field from SEAM-INDEX.md YAML front matter.
 * Returns the number if found, or null.
 */
export function parseSeamIndexModuleCount(seamIndexSrc) {
  const m = seamIndexSrc.match(/^module-count:\s*(\d+)/m);
  if (m) return parseInt(m[1], 10);
  return null;
}

/**
 * Run all structure checks.
 * @param {object} opts - Override sources (for testing)
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkStructure(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;

  // Read sources
  const injectorPath = join(repoRoot, 'src/content/injector.js');
  const manifestPath = join(repoRoot, 'manifest.json');
  const seamIndexPath = join(repoRoot, 'docs/ai_generated/SEAM-INDEX.md');

  const errors = [];
  const warnings = [];

  // When opts.injectorSrc / opts.manifestSrc are provided directly (testing),
  // skip filesystem existence checks for those files.
  const testMode = opts.injectorSrc !== undefined || opts._skipFsRead;

  // --- 1. Read injector.js ---
  if (!testMode && !existsSync(injectorPath)) {
    errors.push(`MISSING: src/content/injector.js not found at ${injectorPath}`);
    return { errors, warnings };
  }
  const injectorSrc = opts.injectorSrc !== undefined
    ? opts.injectorSrc
    : readFileSync(injectorPath, 'utf8');
  const injectedModules = parseInjectorModules(injectorSrc);

  if (injectedModules.length === 0) {
    errors.push('PARSE ERROR: No modules found in injector.js modules[] array');
    return { errors, warnings };
  }

  // --- 2. Read manifest.json ---
  if (!testMode && !existsSync(manifestPath)) {
    errors.push(`MISSING: manifest.json not found at ${manifestPath}`);
    return { errors, warnings };
  }
  const manifestSrc = opts.manifestSrc !== undefined
    ? opts.manifestSrc
    : readFileSync(manifestPath, 'utf8');

  let warPatterns;
  try {
    warPatterns = parseWARPatterns(manifestSrc);
  } catch (e) {
    errors.push(e.message);
    return { errors, warnings };
  }

  const warExpanded = expandWARPatterns(warPatterns, repoRoot);

  // --- 3. Check every injected module exists on disk ---
  for (const mod of injectedModules) {
    const absPath = join(repoRoot, mod);
    const exists = opts.fileExistsOverride
      ? opts.fileExistsOverride(mod)
      : (!testMode && existsSync(absPath));
    if (testMode && !opts.fileExistsOverride) {
      // In test mode without an explicit override, skip disk check
    } else if (!exists) {
      errors.push(`MISSING ON DISK: ${mod} (referenced in injector.js but file does not exist)`);
    }
  }

  // --- 4. Check every injected module is covered by WAR ---
  for (const mod of injectedModules) {
    // WAR glob expansion: check if any WAR pattern covers this path
    const coveredByPattern = warPatterns.some(pattern => {
      if (!pattern.includes('*')) return pattern === mod;
      const lastSlash = pattern.lastIndexOf('/');
      const patternDir = pattern.slice(0, lastSlash);
      const patternFile = pattern.slice(lastSlash + 1);
      // mod must be in the same directory
      const modLastSlash = mod.lastIndexOf('/');
      const modDir = mod.slice(0, modLastSlash);
      const modFile = mod.slice(modLastSlash + 1);
      if (patternDir !== modDir) return false;
      const fileRegex = new RegExp('^' + patternFile.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      return fileRegex.test(modFile);
    });

    if (!coveredByPattern) {
      errors.push(
        `NOT IN WAR: ${mod} is injected by injector.js but not covered by any web_accessible_resources pattern in manifest.json`
      );
    }
  }

  // --- 5. Check SEAM-INDEX module-count if present ---
  const seamIndexPresent = opts.seamIndexSrc !== undefined
    ? true
    : (!testMode && existsSync(seamIndexPath));
  if (seamIndexPresent) {
    const seamSrc = opts.seamIndexSrc !== undefined
      ? opts.seamIndexSrc
      : readFileSync(seamIndexPath, 'utf8');
    const moduleCount = parseSeamIndexModuleCount(seamSrc);
    if (moduleCount !== null && moduleCount !== injectedModules.length) {
      errors.push(
        `SEAM-INDEX MISMATCH: docs/ai_generated/SEAM-INDEX.md declares module-count: ${moduleCount} ` +
        `but injector.js modules[] has ${injectedModules.length} entries. ` +
        `Update the module-count field in SEAM-INDEX.md to match.`
      );
    }
  } else {
    warnings.push(
      'WARN: docs/ai_generated/SEAM-INDEX.md not found. ' +
      'SEAM-INDEX is the canonical module registry per R-04. ' +
      'Create it with a module-count YAML front-matter field.'
    );
  }

  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Main (run when executed directly, not when imported as a module)
// ---------------------------------------------------------------------------

// Standard ESM entry-point guard: compare the resolved script path to argv[1]
{
  const scriptPath = fileURLToPath(import.meta.url);
  const entryPath = resolve(process.argv[1] || '');
  if (scriptPath === entryPath) {
    const { errors, warnings } = checkStructure();

    for (const w of warnings) {
      console.warn(w);
    }

    if (errors.length > 0) {
      console.error('\ncheck-structure FAILED:\n');
      for (const e of errors) {
        console.error('  ' + e);
      }
      process.exit(1);
    }

    console.log('check-structure: OK');
    console.log(`  injector.js modules checked, all consistent with manifest.json WAR.`);
    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s) — see above.`);
    }
    process.exit(0);
  }
}
