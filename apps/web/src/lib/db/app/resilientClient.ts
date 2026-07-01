import type { Client } from '@libsql/client';

// libsql/Turso embedded-replica stream errors that an in-place reconnect() can recover from.
// See spec/embedded-replica-stream-recovery.md for the full rationale (libsql#2083, #1856).
const STREAM_ERRORS = /stream not found|stream (has )?expired|STREAM_EXPIRED|HRANA_CLOSED|invalid baton/i;

// Drizzle wraps the libsql error in DrizzleQueryError, so walk the whole `cause` chain.
export const isStreamError = (error: unknown): boolean => {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current != null && !seen.has(current)) {
    seen.add(current);
    const message =
      typeof current === 'object' && 'message' in current
        ? String((current as { message: unknown }).message)
        : String(current);
    if (STREAM_ERRORS.test(message)) return true;
    current = typeof current === 'object' && 'cause' in current ? (current as { cause: unknown }).cause : undefined;
  }
  return false;
};

// `reconnect()` exists on the concrete client (sqlite3/http/ws) but is not on the exported Client type.
type Reconnectable = { reconnect: () => Promise<void> };

// Wraps a libsql client so that a dropped Hrana stream (e.g. after the primary restarts/upgrades)
// self-heals: on a stream error, reconnect() the client in place and retry the statement once.
// Only `execute`/`batch` are retried — transactions run through `tx.execute()` (drizzle) and are
// deliberately left to surface, since a mid-transaction statement cannot be safely replayed.
export const makeResilientClient = (client: Client): Client => {
  let reconnecting: Promise<void> | null = null;

  // Single-flight: concurrent failures share one reconnect rather than each recreating the handle.
  const recover = (): Promise<void> =>
    (reconnecting ??= (client as unknown as Reconnectable).reconnect().finally(() => {
      reconnecting = null;
    }));

  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;

      // Bind every method to the real client so private-field access works through the Proxy.
      const method = value as (...args: unknown[]) => unknown;
      if (prop !== 'execute' && prop !== 'batch') {
        return (...args: unknown[]) => method.apply(target, args);
      }

      const runnable = method as (...args: unknown[]) => Promise<unknown>;
      return async (...args: unknown[]): Promise<unknown> => {
        try {
          return await runnable.apply(target, args);
        } catch (error) {
          if (!isStreamError(error)) throw error;
          console.warn('⚠️ libsql stream error; reconnecting client and retrying once', error);
          await recover();
          return await runnable.apply(target, args); // retry once; if it fails again, surface it
        }
      };
    }
  });
};
