import { SlugConflictError } from '$lib/server/errors';
import * as Sentry from '@sentry/sveltekit';
import type { RequestEvent } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiFactory } from './apiFactory';

vi.mock('@sentry/sveltekit', () => ({ captureException: vi.fn() }));

const captureException = vi.mocked(Sentry.captureException);

// Build a handler whose validated-body handler throws (or returns) the given value, then invoke it.
const invoke = async (thrownOrResult: unknown, { throws = true, body = {} } = {}) => {
  const handler = apiFactory(
    async () => {
      if (throws) throw thrownOrResult;
      return thrownOrResult;
    },
    { validationSchema: z.object({ name: z.string() }).partial() }
  );
  const event = { request: { json: async () => body } } as unknown as RequestEvent;
  const response = await handler(event);
  return { status: response.status, json: await response.json() };
};

describe('apiFactory error classification', () => {
  beforeEach(() => captureException.mockClear());

  it('returns the message as a 400 for the plain Error idiom, without reporting to Sentry', async () => {
    const { status, json } = await invoke(new Error('Scene not found'));
    expect(status).toBe(400);
    expect(json.message).toBe('Scene not found');
    expect(captureException).not.toHaveBeenCalled();
  });

  it('treats AppError subclasses as expected 400s, without Sentry', async () => {
    const { status } = await invoke(new SlugConflictError('slug taken'));
    expect(status).toBe(400);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('reports typed Error subclasses (e.g. DB driver errors) as 500 + Sentry', async () => {
    class DrizzleQueryError extends Error {}
    const { status, json } = await invoke(new DrizzleQueryError('stream not found: abc'));
    expect(status).toBe(500);
    expect(json.message).not.toContain('stream not found'); // generic message, detail only in Sentry
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('reports non-Error throws as 500 + Sentry', async () => {
    const { status } = await invoke('some string blew up');
    expect(status).toBe(500);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('handles validation errors as 400 without Sentry', async () => {
    const { status } = await invoke(null, { throws: false, body: { name: 123 } });
    expect(status).toBe(400);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('maps the Unauthorized idiom to 401 without Sentry', async () => {
    const { status } = await invoke(new Error('Unauthorized'));
    expect(status).toBe(401);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('returns handler results as 200 json', async () => {
    const { status, json } = await invoke({ ok: true }, { throws: false });
    expect(status).toBe(200);
    expect(json).toEqual({ ok: true });
  });
});
