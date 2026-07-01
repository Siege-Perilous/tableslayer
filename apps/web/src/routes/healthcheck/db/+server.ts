import { db } from '$lib/db/app';
import { healthTable } from '$lib/db/app/schema';
import * as Sentry from '@sentry/sveltekit';
import { json, type RequestHandler } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

const HEALTH_ROW_ID = 1;

// Write-aware DB probe: exercises the write path (which the plain /healthcheck never does) so a
// broken embedded-replica write is observable to Fly health checks and Sentry. Going through `db`
// also runs the resilient-client recovery path (see spec/embedded-replica-stream-recovery.md), so a
// transient stream loss self-heals and stays green; only an unrecoverable outage returns 503.
export const GET: RequestHandler = async () => {
  try {
    const checkedAt = new Date();

    await db
      .insert(healthTable)
      .values({ id: HEALTH_ROW_ID, checkedAt })
      .onConflictDoUpdate({ target: healthTable.id, set: { checkedAt } });

    const [row] = await db.select().from(healthTable).where(eq(healthTable.id, HEALTH_ROW_ID));

    if (!row) {
      throw new Error('Health row missing after upsert');
    }

    return json({ status: 'ok', checkedAt: row.checkedAt.toISOString() });
  } catch (error) {
    console.error('❌ DB write health probe failed:', error);
    Sentry.captureException(error);
    return json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 503 });
  }
};
