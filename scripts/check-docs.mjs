#!/usr/bin/env node
/**
 * check-docs.mjs
 *
 * Verifies that every file path cited in agent-facing docs exists on disk.
 *
 * Scans:
 *   - docs/ai_generated/protected-behaviors/registry.md  (if present)
 *   - AGENTS.md  (if present at repo root)
 *   - CLAUDE.md  (if present at repo root)
 *
 * Extracts path references matching patterns:
 *   - Markdown links:  [text](path)  where path starts with src/ or docs/
 *   - Backtick paths:  `src/...` or `docs/...`
 *   - Bare paths on their own: src/foo/bar.js
 *
 * Exit 0  — all cited paths exist (or no docs found)
 * Exit 1  — one or more cited paths do not exist on disk
 *
 * Usage: node scripts/check-docs.mjs
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
 * Extract file path references from markdown content.
 * Only extracts paths that look like concrete repo-relative source paths:
 *   src/...  docs/...  tests/...  scripts/...
 *
 * Excludes:
 *   - http(s):// URLs and anchors
 *   - Glob patterns containing * or **
 *   - SHA-suffixed references like src/foo.js:func@abc1234
 *
 * @param {string} src - markdown source
 * @returns {Array<{path: string, context: string}>}
 */
export function extractPathReferences(src) {
  const refs = [];

  // Pattern: markdown link [text](path) — local relative paths only
  const mdLinkRe = /\[([^\]]*)\]\(([^)#\s]+)\)/g;
  let m;
  while ((m = mdLinkRe.exec(src)) !== null) {
    const href = m[2];
    if (isLocalRepoPath(href) && isConcreteFilePath(href)) {
      refs.push({ path: href, context: `markdown link [${m[1]}](${href})` });
    }
  }

  // Pattern: backtick-quoted concrete file path `src/dir/file.ext`
  // Must end with a known extension; must not contain * or @ (glob/SHA markers)
  const backtickRe = /`((?:src|docs|tests|scripts|\.claude)\/[^`\s*@]+\.(?:js|mjs|md|json|css|html|yml|yaml))`/g;
  while ((m = backtickRe.exec(src)) !== null) {
    const p = m[1];
    if (isConcreteFilePath(p)) {
      refs.push({ path: p, context: `backtick reference \`${p}\`` });
    }
  }

  // Pattern: bare path on its own (e.g. in "path: src/core/foo.js" lines)
  // Must be surrounded by whitespace/start-of-line and end with known extension.
  // Must not contain glob chars or SHA suffixes.
  const barePathRe = /(?:^|[\s:])((src|docs|tests|scripts)\/[\w\-/]+\.(?:js|mjs|md|json|css|html))(?=\s|$|[,;)])/gm;
  while ((m = barePathRe.exec(src)) !== null) {
    const p = m[1].trim();
    if (isLocalRepoPath(p) && isConcreteFilePath(p)) {
      refs.push({ path: p, context: `bare path reference ${p}` });
    }
  }

  // Deduplicate by path
  const seen = new Set();
  return refs.filter(r => {
    if (seen.has(r.path)) {return false;}
    seen.add(r.path);
    return true;
  });
}

/**
 * Returns true if a path is a concrete file path (not a glob, not SHA-suffixed).
 */
function isConcreteFilePath(p) {
  if (!p) {return false;}
  if (p.includes('*')) {return false;}   // glob pattern
  if (p.includes('@')) {return false;}   // SHA suffix e.g. file.js:func@abc123
  if (p.endsWith('/')) {return false;}   // directory reference
  return true;
}

/**
 * Returns true if a path looks like a local repo path (not a URL).
 */
function isLocalRepoPath(p) {
  if (!p) {return false;}
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) {return false;}
  if (p.startsWith('#')) {return false;}
  return (
    p.startsWith('src/') ||
    p.startsWith('docs/') ||
    p.startsWith('tests/') ||
    p.startsWith('scripts/')
  );
}

/**
 * Files to scan for path references.
 * Returns an array of { label, src } objects.
 */
export function collectDocSources(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const sources = [];

  const candidates = [
    { label: 'AGENTS.md', path: join(repoRoot, 'AGENTS.md') },
    { label: 'CLAUDE.md', path: join(repoRoot, 'CLAUDE.md') },
    {
      label: 'docs/ai_generated/protected-behaviors/registry.md',
      path: join(repoRoot, 'docs/ai_generated/protected-behaviors/registry.md'),
    },
  ];

  for (const c of candidates) {
    if (opts.fileSources && c.label in opts.fileSources) {
      sources.push({ label: c.label, src: opts.fileSources[c.label] });
    } else if (existsSync(c.path)) {
      sources.push({ label: c.label, src: readFileSync(c.path, 'utf8') });
    }
  }

  return sources;
}

/**
 * Run all doc-citation checks.
 * @param {object} opts - Override sources (for testing)
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function checkDocs(opts = {}) {
  const repoRoot = opts.repoRoot || REPO_ROOT;
  const errors = [];
  const warnings = [];

  const sources = opts.docSources !== undefined
    ? opts.docSources
    : collectDocSources(opts);

  if (sources.length === 0) {
    warnings.push(
      'WARN: No agent-facing docs found to scan ' +
      '(AGENTS.md, CLAUDE.md, protected-behaviors/registry.md). ' +
      'Nothing to check.'
    );
    return { errors, warnings };
  }

  for (const { label, src } of sources) {
    const refs = extractPathReferences(src);
    for (const ref of refs) {
      const abs = join(repoRoot, ref.path);
      const exists = opts.fileExistsOverride
        ? opts.fileExistsOverride(ref.path)
        : existsSync(abs);
      if (!exists) {
        errors.push(
          `BROKEN REFERENCE in ${label}: ${ref.context} — ` +
          `${ref.path} does not exist on disk.`
        );
      }
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
    const { errors, warnings } = checkDocs();

    for (const w of warnings) {
      console.warn(w);
    }

    if (errors.length > 0) {
      console.error('\ncheck-docs FAILED:\n');
      for (const e of errors) {
        console.error(`  ${  e}`);
      }
      process.exit(1);
    }

    console.log('check-docs: OK');
    if (warnings.length > 0) {
      console.log(`  ${warnings.length} warning(s) — see above.`);
    }
    process.exit(0);
  }
}
