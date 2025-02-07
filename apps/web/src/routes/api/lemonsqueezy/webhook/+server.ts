import { json, type RequestHandler } from '@sveltejs/kit';
import crypto from 'node:crypto';

import type { SelectParty } from '$lib/db/app/schema';
import { updateParty } from '$lib/server';
import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

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

    console.log(rawBody);

    const webhookEvent = JSON.parse(rawBody);
    const partyId = webhookEvent.meta.custom_data.party_id;
    const userId = webhookEvent.meta.custom_data.user_id;
    const eventType = webhookEvent?.meta?.event_name;
    const lemonSqueezyCustomerId = webhookEvent.data.attributes.customer_id;

    switch (eventType) {
      case 'order_created': {
        const isLifetime = (webhookEvent.data.attributes.first_order_item.product_id = 444662);
        const updates: Partial<SelectParty> = {
          lemonSqueezyCustomerId
        };
        if (isLifetime) {
          updates.plan = 'lifetime';
          updates.planNextBillingDate = null;
          updates.planExpirationDate = null;
        }
        await updateParty(partyId, updates);
        break;
      }

      case 'subscription_created': {
        const status = webhookEvent.data.attributes.status;
        if (status !== 'active') {
          break;
        }
        const updates: Partial<SelectParty> = {
          plan: 'annual',
          planNextBillingDate: new Date(webhookEvent.data.attributes.renews_at * 1000),
          planExpirationDate: new Date(webhookEvent.data.attributes.ends_at * 1000)
        };

        await updateParty(partyId, updates);
        break;
      }

      case 'subscription_updated': {
        const status = webhookEvent.data.attributes.status;
        let updates: Partial<SelectParty> = {};
        if (status === 'active') {
          updates = {
            plan: 'annual',
            planNextBillingDate: new Date(webhookEvent.data.attributes.renews_at * 1000),
            planExpirationDate: new Date(webhookEvent.data.attributes.ends_at * 1000)
          };
          break;
        }

        await updateParty(partyId, updates);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    console.log(`Received LemonSqueezy webhook: ${eventType}`);

    return json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return json({ error: 'Webhook processing error' }, { status: 400 });
  }
};
