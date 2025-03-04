import { getDatabaseMode } from '$lib/db/app/index';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  return json({
    status: 'ok',
    databaseMode: getDatabaseMode(),
    region: process.env.FLY_REGION || 'unknown',
    alloc: process.env.FLY_ALLOC_ID || 'unknown',
    app: process.env.FLY_APP_NAME || 'unknown',
    timestamp: new Date().toISOString()
  });
};
