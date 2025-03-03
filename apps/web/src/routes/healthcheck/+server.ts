// Modify your healthcheck endpoint
// apps/web/src/routes/healthcheck/+server.ts
import { getDatabaseMode } from '$lib/db/app/index';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  return json({
    status: 'ok',
    databaseMode: getDatabaseMode(),
    timestamp: new Date().toISOString()
  });
};
