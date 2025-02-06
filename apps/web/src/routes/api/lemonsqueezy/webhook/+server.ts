import { json, type RequestHandler } from '@sveltejs/kit';
import crypto from 'node:crypto';

import { lemonSqueezySetup, type Webhook } from '@lemonsqueezy/lemonsqueezy.js';

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError(error) {
    console.log(error);
  }
});

const PARTY_PLAN_PRODUCT_IDS = {
  free: null,
  annual: process.env.LEMONSQUEEZY_ANNUAL_ID!,
  lifetime: process.env.LEMONSQUEEZY_LIFETIME_ID!
} as const;

function verifyLemonSqueezySignature(request: Request, rawBody: string) {
  const signatureHeader = request.headers.get('X-Signature');
  if (!signatureHeader) {
    throw new Error('Missing LemonSqueezy webhook signature.');
  }

  const hmac = crypto.createHmac('sha256', process.env.LEMONSQUEEZY_WEBHOOK_KEY!);
  const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
  const signature = Buffer.from(signatureHeader, 'utf8');

  if (!crypto.timingSafeEqual(digest, signature)) {
    throw new Error('Invalid LemonSqueezy webhook signature.');
  }
}

export const POST: RequestHandler = async (event) => {
  try {
    const rawBody = await event.request.text();

    //  verifyLemonSqueezySignature(event.request, rawBody);

    const webhookEvent: Webhook = JSON.parse(rawBody);
    const eventType = webhookEvent?.meta?.event_name;

    console.log(`Received LemonSqueezy webhook: ${eventType}`);

    console.log(webhookEvent.meta);

    return json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return json({ error: 'Webhook processing error' }, { status: 400 });
  }
};
