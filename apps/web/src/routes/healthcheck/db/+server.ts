import { db } from '$lib/db/app';
import { healthTable } from '$lib/db/app/schema';
import * as Sentry from '@sentry/sveltekit';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

const HEALTH_ROW_ID = 1;

// This endpoint is public and side-effecting (each real probe writes to the DB), so cap write
// volume: cache the last result and only re-probe once per window. The window is shorter than the
// Fly check interval (30s), so legitimate checks always run fresh while an anonymous flood just
// gets cached responses and cannot amplify into unbounded writes.
const THROTTLE_MS = 15_000;

let lastProbe: { at: number; ok: boolean } | null = null;

// Write-aware DB probe: exercises the write path (which the plain /healthcheck never does) so a
// broken embedded-replica write is observable to Fly health checks and Sentry. Going through `db`
// also runs the resilient-client recovery path (see spec/embedded-replica-stream-recovery.md), so a
// transient stream loss self-heals and stays green; only an unrecoverable outage returns 503.
const runProbe = async (): Promise<void> => {
  const checkedAt = new Date();

  await db
    .insert(healthTable)
    .values({ id: HEALTH_ROW_ID, checkedAt })
    .onConflictDoUpdate({ target: healthTable.id, set: { checkedAt } });

  const [row] = await db.select().from(healthTable).where(eq(healthTable.id, HEALTH_ROW_ID));

  if (!row) {
    throw new Error('Health row missing after upsert');
  }
};

export const GET: RequestHandler = async () => {
  const now = Date.now();

  if (lastProbe && now - lastProbe.at < THROTTLE_MS) {
    return json({ status: lastProbe.ok ? 'ok' : 'error', cached: true }, { status: lastProbe.ok ? 200 : 503 });
  }

  try {
    await runProbe();
    lastProbe = { at: now, ok: true };
    return json({ status: 'ok' });
  } catch (error) {
    lastProbe = { at: now, ok: false };
    // Keep the detail in logs/Sentry only — this endpoint is public, so don't leak it in the body.
    console.error('❌ DB write health probe failed:', error);
    Sentry.captureException(error);
    return json({ status: 'error' }, { status: 503 });
  }
};
