/**
 * Unit tests for blacklist regex parsing
 * Tests regex patterns with and without flags
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

// Load all required modules
await loadMinimalModules();

const runner = new SimpleTestRunner();

runner.beforeEach(() => {
  // Store original location
  runner.originalHref = global.location.href;
});

runner.afterEach(() => {
  // Restore original location
  Object.defineProperty(global.location, 'href', {
    value: runner.originalHref,
    writable: true,
    configurable: true,
  });
});

function setTestURL(url) {
  Object.defineProperty(global.location, 'href', {
    value: url,
    writable: true,
    configurable: true,
  });
}

runner.test('should blacklist www.youtube.com with regex pattern without flags', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/';
  setTestURL('https://www.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist music.youtube.com with regex pattern without flags', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/';
  setTestURL('https://music.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist m.youtube.com with regex pattern without flags', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/';
  setTestURL('https://m.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should not blacklist example.com with youtube regex pattern', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/';
  setTestURL('https://example.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), false);
});

runner.test('should blacklist www.youtube.com with case-insensitive regex pattern', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/gi';
  setTestURL('https://www.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist uppercase YOUTUBE.COM using i flag in regex pattern', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/gi';
  setTestURL('https://YOUTUBE.COM/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist music.youtube.com with case-insensitive regex pattern', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/gi';
  setTestURL('https://music.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should not blacklist example.com with case-insensitive youtube regex pattern', () => {
  const blacklist = '/(.+)youtube\\.com(\\/*)$/gi';
  setTestURL('https://example.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), false);
});

runner.test('should blacklist a URL that contains a plain string blacklist entry', () => {
  const blacklist = 'youtube.com';
  setTestURL('https://www.youtube.com/watch?v=123');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist youtube.com matched by plain string entry in multi-entry blacklist', () => {
  const blacklist = `youtube.com
/(.+)instagram\\.com/
/twitter\\.com/gi`;
  setTestURL('https://www.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist instagram.com matched by regex entry in multi-entry blacklist', () => {
  const blacklist = `youtube.com
/(.+)instagram\\.com/
/twitter\\.com/gi`;
  setTestURL('https://www.instagram.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist twitter.com matched by case-insensitive regex in multi-entry blacklist', () => {
  const blacklist = `youtube.com
/(.+)instagram\\.com/
/twitter\\.com/gi`;
  setTestURL('https://twitter.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist uppercase TWITTER.COM using i flag in multi-entry blacklist', () => {
  const blacklist = `youtube.com
/(.+)instagram\\.com/
/twitter\\.com/gi`;
  setTestURL('https://TWITTER.COM/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should not blacklist example.com when it appears in no multi-entry blacklist entry', () => {
  const blacklist = `youtube.com
/(.+)instagram\\.com/
/twitter\\.com/gi`;
  setTestURL('https://example.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), false);
});

runner.test('should not throw when blacklist contains malformed regex entries', () => {
  const blacklist = `//
/[unclosed
/valid\\.com/`;
  setTestURL('https://valid.com/');
  let threwError = false;
  try {
    window.VSC.DomUtils.isBlacklisted(blacklist);
  } catch (e) {
    threwError = true;
  }
  assert.equal(threwError, false, 'Should not throw on malformed regex');
});

runner.test('should blacklist a valid entry even when blacklist also contains malformed regex entries', () => {
  const blacklist = `//
/[unclosed
/valid\\.com/`;
  setTestURL('https://valid.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

runner.test('should blacklist a URL when blacklist has blank lines around entries', () => {
  const blacklist = `

youtube.com

`;
  setTestURL('https://www.youtube.com/');
  assert.equal(window.VSC.DomUtils.isBlacklisted(blacklist), true);
});

// Export for test runner
export { runner };
