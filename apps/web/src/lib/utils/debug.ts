import { dev } from '$app/environment';

/**
 * Logs to console only in development mode
 * @param prefix - Optional system prefix like 'yjs', 'save', 'markers'
 * @param args - Arguments to log
 */
export function devLog(prefix?: string, ...args: any[]): void;
export function devLog(...args: any[]): void;
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
export function devWarn(prefix?: string, ...args: any[]): void;
export function devWarn(...args: any[]): void;
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
export function devError(prefix?: string, ...args: any[]): void;
export function devError(...args: any[]): void;
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
