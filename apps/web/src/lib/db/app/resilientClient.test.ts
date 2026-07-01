import type { Client } from '@libsql/client';
import { describe, expect, it, vi } from 'vitest';
import { isStreamError, makeResilientClient } from './resilientClient';

const streamError = () =>
  new Error('Hrana(Api("status=404 Not Found, body={\\"error\\":\\"stream not found: 2c4be4b6:a2a9\\"}"))');

describe('isStreamError', () => {
  it('matches each recoverable stream-error variant', () => {
    for (const message of [
      'stream not found: abc',
      'STREAM_EXPIRED',
      'stream has expired',
      'HRANA_CLOSED',
      'invalid baton'
    ]) {
      expect(isStreamError(new Error(message))).toBe(true);
    }
  });

  it('walks the cause chain (Drizzle wraps the libsql error)', () => {
    const wrapped = new Error('Failed query: delete from "session"', { cause: streamError() });
    expect(isStreamError(wrapped)).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isStreamError(new Error('SQLITE_BUSY: database is locked'))).toBe(false);
    expect(isStreamError(new Error('UNIQUE constraint failed'))).toBe(false);
    expect(isStreamError(undefined)).toBe(false);
  });

  it('does not loop on a circular cause chain', () => {
    const a = new Error('boom') as Error & { cause?: unknown };
    a.cause = a;
    expect(isStreamError(a)).toBe(false);
  });
});

// Minimal fake client exposing the surface the proxy touches.
const makeFakeClient = (execute: (...args: unknown[]) => Promise<unknown>) => {
  const reconnect = vi.fn(async () => {});
  return { execute: vi.fn(execute), batch: vi.fn(execute), reconnect } as unknown as Client & {
    execute: ReturnType<typeof vi.fn>;
    reconnect: ReturnType<typeof vi.fn>;
  };
};

describe('makeResilientClient', () => {
  it('reconnects once and retries when execute hits a stream error, then succeeds', async () => {
    let calls = 0;
    const fake = makeFakeClient(async () => {
      calls += 1;
      if (calls === 1) throw streamError();
      return { rows: ['ok'] };
    });

    const client = makeResilientClient(fake);
    const result = await client.execute('delete from "session" where id = ?');

    expect(result).toEqual({ rows: ['ok'] });
    expect(fake.execute).toHaveBeenCalledTimes(2);
    expect(fake.reconnect).toHaveBeenCalledTimes(1);
  });

  it('rethrows a non-stream error without reconnecting', async () => {
    const fake = makeFakeClient(async () => {
      throw new Error('UNIQUE constraint failed');
    });

    const client = makeResilientClient(fake);
    await expect(client.execute('insert ...')).rejects.toThrow('UNIQUE constraint failed');
    expect(fake.reconnect).not.toHaveBeenCalled();
  });

  it('surfaces the error after a single retry (no infinite loop)', async () => {
    const fake = makeFakeClient(async () => {
      throw streamError();
    });

    const client = makeResilientClient(fake);
    await expect(client.execute('delete ...')).rejects.toThrow(/stream not found/);
    expect(fake.execute).toHaveBeenCalledTimes(2);
    expect(fake.reconnect).toHaveBeenCalledTimes(1);
  });

  it('single-flights the reconnect across concurrent failures', async () => {
    let firstAttempts = 0;
    const fake = makeFakeClient(async () => {
      firstAttempts += 1;
      if (firstAttempts <= 5) throw streamError(); // all 5 concurrent first-attempts fail
      return { rows: [] };
    });

    const client = makeResilientClient(fake);
    await Promise.all(Array.from({ length: 5 }, () => client.execute('delete ...')));

    // 5 concurrent failing calls should trigger exactly one shared reconnect.
    expect(fake.reconnect).toHaveBeenCalledTimes(1);
  });
});
