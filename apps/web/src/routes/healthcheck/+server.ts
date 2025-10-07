import { getDatabaseMode } from '$lib/db/app/index';
import { isGoogleOAuthEnabled, isStripeEnabled } from '$lib/server';
import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async () => {
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';

  return json({
    status: 'ok',
    databaseMode: getDatabaseMode(),
    region: process.env.FLY_REGION || 'unknown',
    alloc: process.env.FLY_ALLOC_ID || 'unknown',
    app: process.env.FLY_APP_NAME || 'unknown',
    timestamp: new Date().toISOString(),
    stripeEnabled: isStripeEnabled(),
    googleOAuthEnabled: isGoogleOAuthEnabled(),
    r2BucketUrl: process.env.CLOUDFLARE_R2_BUCKET_URL || 'Not configured',
    partykit: {
      host: partykitHost,
      url: partykitHost.includes('localhost') ? `ws://${partykitHost}` : `wss://${partykitHost}`
    }
  });
};
