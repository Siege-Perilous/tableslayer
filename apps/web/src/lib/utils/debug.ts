import { browser, dev } from '$app/environment';

/**
 * Logs to console only in development mode
 * @param prefix - Optional system prefix like 'yjs', 'save', 'markers'
 * @param args - Arguments to log
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devLog(prefix?: string, ...args: any[]): void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devLog(...args: any[]): void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devLog(...args: any[]) {
  if (dev) {
    if (typeof args[0] === 'string' && args.length > 1) {
      // Check if first arg looks like a system prefix (lowercase, no spaces)
      const possiblePrefix = args[0];
      if (/^[a-z]+$/.test(possiblePrefix)) {
        console.log(`[${possiblePrefix}]`, ...args.slice(1));
        return;
      }
    }
    console.log(...args);
  }
}

/**
 * Warns to console only in development mode
 * @param prefix - Optional system prefix like 'yjs', 'save', 'markers'
 * @param args - Arguments to warn
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devWarn(prefix?: string, ...args: any[]): void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devWarn(...args: any[]): void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devWarn(...args: any[]) {
  if (dev) {
    if (typeof args[0] === 'string' && args.length > 1) {
      // Check if first arg looks like a system prefix (lowercase, no spaces)
      const possiblePrefix = args[0];
      if (/^[a-z]+$/.test(possiblePrefix)) {
        console.warn(`[${possiblePrefix}]`, ...args.slice(1));
        return;
      }
    }
    console.warn(...args);
  }
}

/**
 * Errors to console only in development mode
 * @param prefix - Optional system prefix like 'yjs', 'save', 'markers'
 * @param args - Arguments to error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devError(prefix?: string, ...args: any[]): void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devError(...args: any[]): void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function devError(...args: any[]) {
  if (dev) {
    if (typeof args[0] === 'string' && args.length > 1) {
      // Check if first arg looks like a system prefix (lowercase, no spaces)
      const possiblePrefix = args[0];
      if (/^[a-z]+$/.test(possiblePrefix)) {
        console.error(`[${possiblePrefix}]`, ...args.slice(1));
        return;
      }
    }
    console.error(...args);
  }
}

/**
 * Special timing log that can be enabled in production via query parameter or sessionStorage
 * Add ?debug=fogtiming to the URL to enable fog round-trip timing logs
 * The debug mode persists across navigation within the same browser tab
 * This has zero performance impact when not enabled
 */
export function timingLog(category: string, message: string): void {
  if (!browser) return;

  const debugMode = getDebugMode();

  // Only log if in dev mode OR if the specific debug flag is enabled
  if (dev || debugMode === 'fogtiming') {
    console.log(`[${category}] ${message}`);
  }
}

/**
 * Get the debug mode from URL parameter or sessionStorage
 * If URL has ?debug=X, save it to sessionStorage so it persists across navigation
 */
function getDebugMode(): string | null {
  if (!browser) return null;

  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');

  // If URL has debug param, save to sessionStorage for persistence
  if (debugParam) {
    sessionStorage.setItem('debug', debugParam);
    return debugParam;
  }

  // Otherwise check sessionStorage
  return sessionStorage.getItem('debug');
}

/**
 * Clear the debug mode from sessionStorage
 * Call this from browser console to disable debug logs: clearDebugMode()
 */
export function clearDebugMode(): void {
  if (browser) {
    sessionStorage.removeItem('debug');
    console.log('[debug] Debug mode cleared. Refresh the page to apply.');
  }
}

/**
 * Production-safe debug log that can be enabled via query parameter or sessionStorage
 * Add ?debug=all or ?debug=scene to the URL to enable specific debug logs in production
 * The debug mode persists across navigation within the same browser tab
 *
 * Examples:
 *   ?debug=all - Enable all production debug logs
 *   ?debug=scene - Enable only scene-related logs
 *   ?debug=query - Enable only query-related logs
 *
 * To disable, run in browser console: clearDebugMode()
 *
 * This has zero performance impact when not enabled
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function prodLog(category: string, message: string, data?: any): void {
  if (!browser) return;

  const debugMode = getDebugMode();

  // Log if in dev mode OR if debug=all OR if debug matches the category
  if (dev || debugMode === 'all' || debugMode === category) {
    if (data !== undefined) {
      console.log(`[${category}] ${message}`, data);
    } else {
      console.log(`[${category}] ${message}`);
    }
  }
}
