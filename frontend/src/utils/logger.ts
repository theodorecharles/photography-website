/**
 * Frontend logging utility with configurable log levels
 * Supports: error, warn, info, debug, verbose
 * 
 * Log levels:
 * - error: Always shown (critical errors)
 * - warn: Always shown (warnings)
 * - info: Default level and above (important information)
 * - debug: Debug level and above (detailed debugging)
 * - verbose: Verbose level only (very detailed, noisy)
 */

export enum LogLevel {
  SILENT = -1,
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

let currentLogLevel: LogLevel = LogLevel.INFO; // Default to INFO

/**
 * Initialize logger with log level from environment or API
 */
export function initLogger(logLevel?: string | LogLevel): void {
  if (logLevel !== undefined) {
    if (typeof logLevel === 'string') {
      const level = logLevel.toLowerCase().trim();
      switch (level) {
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
          console.warn(`[Logger] Unknown log level "${logLevel}", defaulting to INFO`);
      }
    } else {
      currentLogLevel = logLevel;
    }
  } else {
    // Check environment variable (from Vite)
    const envLevel = import.meta.env.VITE_LOG_LEVEL?.toLowerCase().trim();
    if (envLevel) {
      switch (envLevel) {
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
  }
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Set log level programmatically
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Format log message with level (no timestamp)
 */
function formatMessage(level: string, ...args: any[]): string {
  return `[${level}] ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ')}`;
}

/**
 * Log error (always shown)
 */
export function error(...args: any[]): void {
  if (currentLogLevel >= LogLevel.ERROR && currentLogLevel !== LogLevel.SILENT) {
    console.error(formatMessage('ERROR', ...args));
  }
}

/**
 * Log warning (always shown)
 */
export function warn(...args: any[]): void {
  if (currentLogLevel >= LogLevel.WARN && currentLogLevel !== LogLevel.SILENT) {
    console.warn(formatMessage('WARN', ...args));
  }
}

/**
 * Log info (default level and above)
 */
export function info(...args: any[]): void {
  if (currentLogLevel >= LogLevel.INFO && currentLogLevel !== LogLevel.SILENT) {
    console.log(formatMessage('INFO', ...args));
  }
}

/**
 * Log debug (debug level and above)
 */
export function debug(...args: any[]): void {
  if (currentLogLevel >= LogLevel.DEBUG && currentLogLevel !== LogLevel.SILENT) {
    console.log(formatMessage('DEBUG', ...args));
  }
}

/**
 * Log verbose (verbose level only)
 */
export function verbose(...args: any[]): void {
  if (currentLogLevel >= LogLevel.VERBOSE && currentLogLevel !== LogLevel.SILENT) {
    console.log(formatMessage('VERBOSE', ...args));
  }
}

/**
 * Legacy console.log replacement - maps to info
 */
export function log(...args: any[]): void {
  info(...args);
}

// Initialize logger on module load
initLogger();
