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

let lastProbe: { at: number; status: number; body: Record<string, unknown> } | null = null;

// Write-aware DB probe: exercises the write path (which the plain /healthcheck never does) so a
// broken embedded-replica write is observable to Fly health checks and Sentry. Going through `db`
// also runs the resilient-client recovery path (see spec/embedded-replica-stream-recovery.md), so a
// transient stream loss self-heals and stays green; only an unrecoverable outage returns 503.
const runProbe = async (): Promise<string> => {
  const checkedAt = new Date();

  await db
    .insert(healthTable)
    .values({ id: HEALTH_ROW_ID, checkedAt })
    .onConflictDoUpdate({ target: healthTable.id, set: { checkedAt } });

  const [row] = await db.select().from(healthTable).where(eq(healthTable.id, HEALTH_ROW_ID));

  if (!row) {
    throw new Error('Health row missing after upsert');
  }

  return row.checkedAt.toISOString();
};

export const GET: RequestHandler = async () => {
  const now = Date.now();

  if (lastProbe && now - lastProbe.at < THROTTLE_MS) {
    return json({ ...lastProbe.body, cached: true }, { status: lastProbe.status });
  }

  try {
    const checkedAt = await runProbe();
    lastProbe = { at: now, status: 200, body: { status: 'ok', checkedAt } };
    return json(lastProbe.body, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ DB write health probe failed:', error);
    Sentry.captureException(error);
    lastProbe = { at: now, status: 503, body: { status: 'error', message } };
    return json(lastProbe.body, { status: 503 });
  }
};
