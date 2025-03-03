// apps/web/src/routes/admin/database-status/+server.ts
import { getDatabaseMode } from '$lib/db/app/index';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  return json({
    databaseMode: getDatabaseMode(),
    timestamp: new Date().toISOString()
  });
};
