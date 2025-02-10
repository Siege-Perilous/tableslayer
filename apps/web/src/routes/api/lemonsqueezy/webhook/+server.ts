import { dev } from '$app/environment';
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

// LS stores ids as numbers. ENV vars are strings.
const yearlyId = Number(process.env.LEMONSQUEEZY_VARIANT_YEARLY_ID!);
const lifetimeId = Number(process.env.LEMONSQUEEZY_VARIANT_LIFETIME_ID!);
const monthlyId = Number(process.env.LEMONSQUEEZY_VARIANT_MONTHLY_ID!);

function planNameFromVariantId(variantId: number | null) {
  switch (variantId) {
    case lifetimeId:
      return 'lifetime';
    case yearlyId:
      return 'yearly';
    case monthlyId:
      return 'monthly';
    default:
      return 'free';
  }
}

// Verify the webhook comes from LemonSqueezy
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

    if (!dev) {
      verifyLemonSqueezySignature(event.request, rawBody);
    }

    const webhookEvent = JSON.parse(rawBody);
    const partyId = webhookEvent.meta.custom_data.party_id;
    const eventType = webhookEvent?.meta?.event_name;
    const lemonSqueezyCustomerId = webhookEvent.data.attributes.customer_id;

    // Payload is a json:api response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sync = async (payload: any) => {
      let variantId;
      if (payload.data.attributes.first_order_item) {
        variantId = Number(payload.data.attributes.first_order_item.variant_id);
        console.log('variantId from order', variantId);
      } else if (payload.data.attributes.variant_id) {
        variantId = Number(payload.data.attributes.variant_id);
        console.log('variantId from subscription', variantId);
      } else {
        variantId = null;
      }
      const planStatus = payload.data.attributes.status;
      let planNextBillingDate = null;
      if (payload.data.attributes.renews_at) {
        planNextBillingDate = new Date(payload.data.attributes.renews_at);
      }

      let planExpirationDate = null;
      if (payload.data.attributes.ends_at) {
        planExpirationDate = new Date(payload.data.attributes.ends_at);
      }

      const plan = planNameFromVariantId(variantId);
      const updates: Partial<SelectParty> = {
        lemonSqueezyCustomerId,
        plan,
        planStatus,
        planNextBillingDate,
        planExpirationDate
      };
      const party = await updateParty(partyId, updates);
      return party;
    };

    console.log(`Received LemonSqueezy webhook: ${eventType}`);

    switch (eventType) {
      case 'order_created': {
        const party = await sync(webhookEvent);
        console.log('Order created', party);
        break;
      }

      case 'subscription_created': {
        const party = await sync(webhookEvent);
        console.log('Subscription created', party);
        break;
      }

      case 'subscription_updated': {
        const party = await sync(webhookEvent);
        console.log('Subscription updated', party);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    console.log(`Processed LemonSqueezy webhook ${eventType}`);

    return json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return json({ error: 'Webhook processing error' }, { status: 400 });
  }
};
