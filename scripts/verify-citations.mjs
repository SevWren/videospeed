#!/usr/bin/env node
/**
 * verify-citations.mjs
 *
 * Verifies path:function citations in the protected-behavior (PB) registry.
 *
 * For each row in docs/ai_generated/protected-behaviors/registry.md:
 *   1. Extracts "path::function" or "path:line" citations
 *   2. Verifies the file path exists on disk
 *   3. For function-name citations (path::functionName), greps the file to
 *      confirm the function/symbol name exists in the file content
 *
 * Line-number citations are validated as path-only (line numbers may drift;
 * function names are the preferred locator per J9 hybrid design).
 *
 * Exit 0  — all citations valid
 * Exit 1  — one or more broken citations
 *
 * Usage: node scripts/verify-citations.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract all citations from registry.md content.
 *
 * Recognises these formats:
 *   src/core/gif-controller.js::_drawFrame
 *   src/core/gif-controller.js:184
 *   `src/core/gif-controller.js::_drawFrame`
 *   | src/core/gif-controller.js::_drawFrame |
 *
 * Returns array of { path, symbol, line, raw } objects where:
 *   path   — repo-relative file path
 *   symbol — function/symbol name (or null)
 *   line   — line number hint (or null)
 *   raw    — original citation string
 */
export function extractCitations(registrySrc) {
  const citations = [];
  const seen = new Set();

  // Match path::symbol   e.g.  src/core/gif-controller.js::_drawFrame
  const symbolRe = /`?((?:src|tests|scripts)\/[\w.\-/]+\.(?:js|mjs))::(\w+)`?/g;
  let m;
  while ((m = symbolRe.exec(registrySrc)) !== null) {
    const raw = m[0].replace(/`/g, '').trim();
    if (!seen.has(raw)) {
      seen.add(raw);
      citations.push({ path: m[1], symbol: m[2], line: null, raw });
    }
  }

  // Match path:line   e.g.  src/core/gif-controller.js:184
  // (but not path::symbol which was already consumed above)
  const lineRe = /`?((?:src|tests|scripts)\/[\w.\-/]+\.(?:js|mjs)):(\d+)`?/g;
  while ((m = lineRe.exec(registrySrc)) !== null) {
    const raw = m[0].replace(/`/g, '').trim();
    if (!seen.has(raw)) {
      seen.add(raw);
      citations.push({ path: m[1], symbol: null, line: parseInt(m[2], 10), raw });
    }
  }

  return citations;
}

/**
 * Verify that a symbol (function/const name) exists in a file's source.
 * Uses simple string search — does not require a full AST parse.
 *
 * Returns true if the symbol is found as a word boundary match.
 */
export function symbolExistsInFile(fileSrc, symbol) {
  if (!symbol) {return true;}
  // Look for: function symbol, const symbol, let symbol, var symbol,
  //           symbol(, symbol =, _symbol (private convention)
  const re = new RegExp(
    `(?:function\\s+${  escapeRegex(symbol)  }\\b` +
    `|(?:const|let|var)\\s+${  escapeRegex(symbol)  }\\b` +
    `|${  escapeRegex(symbol)  }\\s*[=(]` +
    `|${  escapeRegex(symbol)  }\\s*:\\s*function` +
    ')'
  );
  return re.test(fileSrc);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Run all citation verification.
 * @param {object} opts - Override sources (for testing)
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function verifyCitations(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const registryPath = join(repoRoot, 'docs/ai_generated/protected-behaviors/registry.md');

  const errors = [];
  const warnings = [];

  // --- Read registry ---
  const registryExists = opts.registrySrc !== undefined
    ? true
    : existsSync(registryPath);

  if (!registryExists) {
    warnings.push(
      'WARN: docs/ai_generated/protected-behaviors/registry.md not found. ' +
      'Nothing to verify. Create the registry per R-01.'
    );
    return { errors, warnings };
  }

  const registrySrc = opts.registrySrc !== undefined
    ? opts.registrySrc
    : readFileSync(registryPath, 'utf8');

  const citations = extractCitations(registrySrc);

  if (citations.length === 0) {
    warnings.push(
      'WARN: No path citations found in registry.md. ' +
      'Expected citations in format: src/path/file.js::functionName'
    );
    return { errors, warnings };
  }

  // --- Verify each citation ---
  for (const citation of citations) {
    const abs = join(repoRoot, citation.path);
    const fileExists = opts.fileExistsOverride
      ? opts.fileExistsOverride(citation.path)
      : existsSync(abs);

    if (!fileExists) {
      errors.push(
        `BROKEN PATH in registry.md: ${citation.raw} — ` +
        `${citation.path} does not exist on disk. ` +
        'Update the registry to use the correct file path.'
      );
      continue; // cannot check symbol if file missing
    }

    // Verify symbol exists in file
    if (citation.symbol) {
      const fileSrc = opts.fileSources && opts.fileSources[citation.path] !== undefined
        ? opts.fileSources[citation.path]
        : readFileSync(abs, 'utf8');

      const found = opts.symbolExistsOverride
        ? opts.symbolExistsOverride(citation.path, citation.symbol)
        : symbolExistsInFile(fileSrc, citation.symbol);

      if (!found) {
        errors.push(
          `BROKEN SYMBOL in registry.md: ${citation.raw} — ` +
          `function/symbol "${citation.symbol}" not found in ${citation.path}. ` +
          'The function may have been renamed or removed. Update the registry citation.'
        );
      }
    }

    // For line-number-only citations: path was verified above; line may drift
    if (citation.line !== null && citation.symbol === null) {
      warnings.push(
        `WARN: ${citation.raw} uses a line-number citation. ` +
        'Line numbers drift during refactors. ' +
        `Prefer ${citation.path}::functionName format for stable citations.`
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
    const { errors, warnings } = verifyCitations();

    for (const w of warnings) {
      console.warn(w);
    }

    if (errors.length > 0) {
      console.error('\nverify-citations FAILED:\n');
      for (const e of errors) {
        console.error(`  ${  e}`);
      }
      process.exit(1);
    }

    console.log('verify-citations: OK');
    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s) — see above.`);
    }
    process.exit(0);
  }
}
