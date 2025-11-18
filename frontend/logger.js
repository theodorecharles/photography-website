/**
 * Simple logger for server.js (plain JavaScript, not TypeScript)
 * Mirrors the functionality of src/utils/logger.ts
 */

const LogLevel = {
  SILENT: -1,
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4,
};

let currentLogLevel = LogLevel.INFO;

function initLogger(level) {
  const levelStr = String(level || '').toLowerCase().trim();
  
  switch (levelStr) {
    case 'silent':
    case 'none':
    case 'off':
      currentLogLevel = LogLevel.SILENT;
      break;
    case 'error':
      currentLogLevel = LogLevel.ERROR;
      break;
    case 'warn':
      currentLogLevel = LogLevel.WARN;
      break;
    case 'info':
      currentLogLevel = LogLevel.INFO;
      break;
    case 'debug':
      currentLogLevel = LogLevel.DEBUG;
      break;
    case 'verbose':
      currentLogLevel = LogLevel.VERBOSE;
      break;
    default:
      currentLogLevel = LogLevel.INFO;
  }
}

// Initialize from environment variable
const logLevel = process.env.LOG_LEVEL || 'info';
initLogger(logLevel);

function formatMessage(level, ...args) {
  return `[${level}] ${args.join(' ')}`;
}

function error(...args) {
  if (currentLogLevel >= LogLevel.ERROR && currentLogLevel !== LogLevel.SILENT) {
    console.error(formatMessage('ERROR', ...args));
  }
}

function warn(...args) {
  if (currentLogLevel >= LogLevel.WARN && currentLogLevel !== LogLevel.SILENT) {
    console.warn(formatMessage('WARN', ...args));
  }
}

function info(...args) {
  if (currentLogLevel >= LogLevel.INFO && currentLogLevel !== LogLevel.SILENT) {
    console.log(formatMessage('INFO', ...args));
  }
}

function debug(...args) {
  if (currentLogLevel >= LogLevel.DEBUG && currentLogLevel !== LogLevel.SILENT) {
    console.log(formatMessage('DEBUG', ...args));
  }
}

function verbose(...args) {
  if (currentLogLevel >= LogLevel.VERBOSE && currentLogLevel !== LogLevel.SILENT) {
    console.log(formatMessage('VERBOSE', ...args));
  }
}

export { error, warn, info, debug, verbose, initLogger };
