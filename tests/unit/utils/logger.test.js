/**
 * Unit tests for logger.js
 *
 * Seam: window.VSC.logger.* methods after side-effect import.
 *
 * Coverage targets (uncovered lines in baseline):
 *   Lines 29-30  — setDefaultLevel()
 *   Lines 44-45  — ERROR branch in log() (switch case LOG_LEVELS.ERROR)
 *   Lines 56-58  — VERBOSE branch in log() (console.trace path)
 *   Line  60     — default branch in log() switch
 *   Lines 70-71  — error() convenience method
 *
 * Strategy: set verbosity high enough that all levels pass the gate, then call
 * log() with each LOG_LEVEL value, capturing console.log output to verify the
 * format string emitted. Expected values are independent string literals.
 */

import { SimpleTestRunner, assert } from '../../helpers/test-utils.js';
import { loadMinimalModules } from '../../helpers/module-loader.js';

await loadMinimalModules();

const runner = new SimpleTestRunner();

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Temporarily replace console.log with a recording stub.
 * Returns { calls, restore }.
 */
function patchConsoleLog() {
  const calls = [];
  const orig = console.log;
  console.log = (...args) => calls.push(args);
  return {
    calls,
    restore: () => { console.log = orig; },
  };
}

/**
 * Temporarily replace console.trace with a no-op stub.
 */
function silenceConsoleTrace() {
  const orig = console.trace;
  console.trace = () => {};
  return () => { console.trace = orig; };
}

// ── setDefaultLevel() — lines 29-30 ─────────────────────────────────────────

runner.test('setDefaultLevel() updates defaultLevel on the logger instance', () => {
  const logger = window.VSC.logger;
  const origDefault = logger.defaultLevel;

  logger.setDefaultLevel(2);
  assert.equal(logger.defaultLevel, 2, 'defaultLevel must be 2 after setDefaultLevel(2)');

  // Restore
  logger.setDefaultLevel(origDefault);
});

runner.test('log() uses defaultLevel when no level argument is provided', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  const origDefault = logger.defaultLevel;

  // Set verbosity to DEBUG (high) so all messages pass the gate.
  logger.setVerbosity(LOG_LEVELS.DEBUG);
  // Set defaultLevel to WARNING so log('msg') uses WARNING format.
  logger.setDefaultLevel(LOG_LEVELS.WARNING);

  const patch = patchConsoleLog();
  logger.log('default-level-test');
  patch.restore();

  logger.setVerbosity(origVerbosity);
  logger.setDefaultLevel(origDefault);

  assert.equal(patch.calls.length, 1, 'log() with no level must emit exactly one console.log call');
  assert.equal(
    patch.calls[0][0],
    'WARNING:default-level-test',
    'log() with no level must use defaultLevel (WARNING) format'
  );
});

// ── ERROR branch — lines 44-45 ────────────────────────────────────────────────

runner.test('log() with ERROR level emits "ERROR:" prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  // Set verbosity to ERROR level so the gate passes
  logger.setVerbosity(LOG_LEVELS.ERROR);

  const patch = patchConsoleLog();
  logger.log('err-msg', LOG_LEVELS.ERROR);
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'ERROR log must produce exactly one console.log call');
  assert.equal(patch.calls[0][0], 'ERROR:err-msg', 'ERROR log must emit "ERROR:" prefix');
});

// ── error() convenience — lines 70-71 ────────────────────────────────────────

runner.test('error() delegates to log() with ERROR level', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.ERROR);

  const patch = patchConsoleLog();
  logger.error('something-broke');
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'error() must produce exactly one console.log call');
  assert.equal(
    patch.calls[0][0],
    'ERROR:something-broke',
    'error() must emit "ERROR:" prefix'
  );
});

// ── VERBOSE branch — lines 56-58 ──────────────────────────────────────────────

runner.test('log() with VERBOSE level emits "DEBUG (VERBOSE):" prefix and calls console.trace', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.VERBOSE);

  const traceCalls = [];
  const origTrace = console.trace;
  console.trace = () => traceCalls.push(true);

  const patch = patchConsoleLog();
  logger.log('verbose-msg', LOG_LEVELS.VERBOSE);
  patch.restore();

  console.trace = origTrace;
  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'VERBOSE log must produce exactly one console.log call');
  assert.equal(
    patch.calls[0][0],
    'DEBUG (VERBOSE):verbose-msg',
    'VERBOSE log must emit "DEBUG (VERBOSE):" prefix'
  );
  assert.equal(traceCalls.length, 1, 'VERBOSE log must call console.trace once');
});

runner.test('verbose() convenience method triggers VERBOSE branch', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.VERBOSE);

  const restoreTrace = silenceConsoleTrace();
  const patch = patchConsoleLog();
  logger.verbose('verbose-convenience');
  patch.restore();
  restoreTrace();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'verbose() must produce one console.log call');
  assert.equal(
    patch.calls[0][0],
    'DEBUG (VERBOSE):verbose-convenience',
    'verbose() must use VERBOSE format'
  );
});

// ── default branch — line 60 ─────────────────────────────────────────────────

runner.test('log() with unknown level emits the message without a prefix', () => {
  const logger = window.VSC.logger;

  const origVerbosity = logger.verbosity;
  // Use a verbosity of 99 and a level of 1 (NONE / below any valid level key)
  // so the gate passes but the switch default branch fires.
  // LOG_LEVELS has no entry for 1 (NONE is not in the switch), and the switch
  // only matches ERROR(2), WARNING(3), INFO(4), DEBUG(5), VERBOSE(6).
  // Actually NONE=1 is also not in the switch, so level=1 hits the default.
  logger.setVerbosity(99);

  // Level 1 (NONE) is not matched by any case in the switch → default branch
  const patch = patchConsoleLog();
  logger.log('no-prefix-msg', 1);
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'default branch must produce exactly one console.log call');
  assert.equal(
    patch.calls[0][0],
    'no-prefix-msg',
    'default branch must emit the message without a prefix'
  );
});

// ── Filtering: messages below verbosity threshold are suppressed ──────────────

runner.test('log() suppresses messages whose level is above verbosity threshold', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  // Set verbosity to WARNING (3) — DEBUG (4) should be suppressed
  logger.setVerbosity(LOG_LEVELS.WARNING);

  const patch = patchConsoleLog();
  logger.log('suppressed', LOG_LEVELS.DEBUG);
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 0, 'log() must suppress messages above verbosity threshold');
});

// ── WARNING and INFO and DEBUG branches (already partially covered — verify format) ──

runner.test('log() with WARNING level emits "WARNING:" prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.DEBUG);

  const patch = patchConsoleLog();
  logger.log('warn-msg', LOG_LEVELS.WARNING);
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls[0][0], 'WARNING:warn-msg', 'WARNING log must emit "WARNING:" prefix');
});

runner.test('log() with INFO level emits "INFO:" prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.DEBUG);

  const patch = patchConsoleLog();
  logger.log('info-msg', LOG_LEVELS.INFO);
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls[0][0], 'INFO:info-msg', 'INFO log must emit "INFO:" prefix');
});

runner.test('log() with DEBUG level emits "DEBUG:" prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.DEBUG);

  const patch = patchConsoleLog();
  logger.log('debug-msg', LOG_LEVELS.DEBUG);
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls[0][0], 'DEBUG:debug-msg', 'DEBUG log must emit "DEBUG:" prefix');
});

// ── warn(), info(), debug() convenience methods ───────────────────────────────
// Lines 78-79 (warn), 86-87 (info), 94-95 (debug) — direct convenience calls

runner.test('warn() emits WARNING prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.DEBUG);

  const patch = patchConsoleLog();
  logger.warn('warn-convenience');
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'warn() must produce one console.log call');
  assert.equal(patch.calls[0][0], 'WARNING:warn-convenience', 'warn() must use WARNING format');
});

runner.test('info() emits INFO prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.DEBUG);

  const patch = patchConsoleLog();
  logger.info('info-convenience');
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'info() must produce one console.log call');
  assert.equal(patch.calls[0][0], 'INFO:info-convenience', 'info() must use INFO format');
});

runner.test('debug() emits DEBUG prefix', () => {
  const logger = window.VSC.logger;
  const LOG_LEVELS = window.VSC.Constants.LOG_LEVELS;

  const origVerbosity = logger.verbosity;
  logger.setVerbosity(LOG_LEVELS.DEBUG);

  const patch = patchConsoleLog();
  logger.debug('debug-convenience');
  patch.restore();

  logger.setVerbosity(origVerbosity);

  assert.equal(patch.calls.length, 1, 'debug() must produce one console.log call');
  assert.equal(patch.calls[0][0], 'DEBUG:debug-convenience', 'debug() must use DEBUG format');
});

export { runner as loggerTestRunner };
