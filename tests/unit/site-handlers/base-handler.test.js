/**
 * Unit tests for BaseSiteHandler
 * Seam: window.VSC.BaseSiteHandler constructor + public methods
 *
 * Change 1: BaseSiteHandler.getControllerPosition() absorbs the canonical
 *   gifMode/CANVAS guard so all subclasses inherit correct short-circuit logic.
 * Change 2 (structural): getVideoContainerSelectors IS a live interface
 *   (called from media-observer.js:115 via scanSiteSpecificContainers) —
 *   deletion was not performed. This test file records that finding.
 */

import { installChromeMock, cleanupChromeMock } from '../../helpers/chrome-mock.js';
import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadCoreModules } from '../../helpers/module-loader.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

await loadCoreModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  installChromeMock();
  location.hostname = 'localhost';
  location.href = 'http://localhost';
});

runner.afterEach(() => {
  cleanupChromeMock();
  location.hostname = 'localhost';
  location.href = 'http://localhost';
});

// ── Change 1: gifMode/CANVAS guard in BaseSiteHandler ─────────────────────────

runner.test('BaseSiteHandler.getControllerPosition with gifMode:true returns base firstChild positioning', () => {
  // RED evidence: before this change, BaseSiteHandler.getControllerPosition() ignored
  // options entirely and always returned firstChild — so there was no guard to call
  // super() from subclasses. After the change, the base absorbs the guard and returns
  // firstChild positioning when gifMode is true (same result, but now the canonical path).
  const parent = document.createElement('div');
  const video = document.createElement('video');

  const handler = new window.VSC.BaseSiteHandler();
  const result = handler.getControllerPosition(parent, video, { gifMode: true });

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.insertionMethod, 'firstChild');
  assert.equal(result.targetParent, parent);
});

runner.test('BaseSiteHandler.getControllerPosition with CANVAS tagName returns base firstChild positioning', () => {
  // RED evidence: before this change, BaseSiteHandler had no CANVAS guard at all.
  // YouTube and Apple handlers called super() only for gifMode, not CANVAS tagName —
  // this is the latent bug. After the change, the base handles CANVAS correctly.
  const parent = document.createElement('div');
  const canvas = document.createElement('canvas');

  const handler = new window.VSC.BaseSiteHandler();
  const result = handler.getControllerPosition(parent, canvas, {});

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.insertionMethod, 'firstChild');
  assert.equal(result.targetParent, parent);
});

runner.test('BaseSiteHandler.getControllerPosition with normal video returns firstChild positioning', () => {
  // The base still returns firstChild for normal video elements.
  const parent = document.createElement('div');
  const video = document.createElement('video');

  const handler = new window.VSC.BaseSiteHandler();
  const result = handler.getControllerPosition(parent, video, {});

  assert.equal(result.insertionPoint, parent);
  assert.equal(result.insertionMethod, 'firstChild');
  assert.equal(result.targetParent, parent);
});

runner.test('BaseSiteHandler.getControllerPosition with null video and no gifMode returns firstChild positioning', () => {
  // Guard must not throw when video is null (e.g., called without a video element).
  const parent = document.createElement('div');

  const handler = new window.VSC.BaseSiteHandler();
  let threw = false;
  let result;
  try {
    result = handler.getControllerPosition(parent, null, {});
  } catch (_e) {
    threw = true;
  }
  assert.equal(threw, false);
  assert.equal(result.insertionPoint, parent);
});

// ── YouTubeHandler: CANVAS guard now inherited from base ──────────────────────

runner.test('YouTubeHandler.getControllerPosition with CANVAS tagName delegates to base (latent bug fixed)', () => {
  // RED evidence: before Change 1, YouTube handler only checked gifMode, NOT canvas.tagName.
  // A CANVAS element on YouTube would fall through to the parent.parentElement path, which
  // would operate on a canvas and produce wrong positioning.
  // After Change 1, BaseSiteHandler.getControllerPosition() short-circuits on CANVAS before
  // delegating to the YouTube-specific logic, so this test passes.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const canvas = document.createElement('canvas');

  const handler = new window.VSC.YouTubeHandler();
  const result = handler.getControllerPosition(parent, canvas, {});

  // Base handler returns parent itself, not grandparent
  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
  assert.equal(result.insertionMethod, 'firstChild');
});

runner.test('AppleHandler.getControllerPosition with CANVAS tagName delegates to base (latent bug fixed)', () => {
  // RED evidence: AppleHandler also only checked gifMode, not CANVAS tagName.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const canvas = document.createElement('canvas');

  const handler = new window.VSC.AppleHandler();
  const result = handler.getControllerPosition(parent, canvas, {});

  // Base handler returns parent itself
  assert.equal(result.insertionPoint, parent);
  assert.equal(result.targetParent, parent);
});

runner.test('YouTubeHandler.getControllerPosition for normal video still uses YouTube-specific logic', () => {
  // The YouTube override for normal videos must still work after the base absorbs the guard.
  const grandparent = document.createElement('div');
  const parent = document.createElement('div');
  grandparent.appendChild(parent);
  const video = document.createElement('video');

  const handler = new window.VSC.YouTubeHandler();
  const result = handler.getControllerPosition(parent, video, {});

  // YouTube-specific: returns grandparent
  assert.equal(result.insertionPoint, grandparent);
  assert.equal(result.targetParent, grandparent);
});

// ── Change 2 (structural): getVideoContainerSelectors is a live interface ─────

runner.test('getVideoContainerSelectors is NOT absent from base-handler.js (live interface — not deleted)', () => {
  // The codebase-design analysis incorrectly labelled getVideoContainerSelectors() as dead.
  // A grep confirmed: media-observer.js:115 calls
  //   this.siteHandler.getVideoContainerSelectors()
  // inside scanSiteSpecificContainers(). It IS a live interface.
  // This structural source test asserts the method IS present, confirming the deletion
  // was correctly skipped.
  const baseHandlerSrc = readFileSync(
    join(__dirname, '../../../src/site-handlers/base-handler.js'),
    'utf-8'
  );
  assert.equal(
    baseHandlerSrc.includes('getVideoContainerSelectors'),
    true
  );
});

export { runner };
