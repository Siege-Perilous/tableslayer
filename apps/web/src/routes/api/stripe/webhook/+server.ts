import type { PartyPlan } from '$lib/db/app/schema';
import { updateParty } from '$lib/server';
import { json, type RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const endpointSecret = process.env.STRIPE_WEBHOOK_KEY!;

const PRICE_PLAN_MAP: Record<string, PartyPlan> = {
  [process.env.STRIPE_PRICE_ID_MONTHLY!]: 'monthly',
  [process.env.STRIPE_PRICE_ID_YEARLY!]: 'yearly',
  [process.env.STRIPE_PRICE_ID_LIFETIME!]: 'lifetime'
};

export const POST: RequestHandler = async (event) => {
  try {
    const rawBody = await event.request.text();
    const signature = event.request.headers.get('stripe-signature');

    if (!signature) {
      throw new Error('Missing Stripe signature.');
    }

    let stripeEvent: Stripe.Event;

    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
    } catch (err) {
      console.error('⚠️  Webhook signature verification failed.', err);
      return json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const dataObject = stripeEvent.data.object as Stripe.Subscription | Stripe.Checkout.Session;
    const eventType = stripeEvent.type;
    const partyId = dataObject.metadata?.partyId;
    const stripeCustomerId = dataObject.customer as string;

    console.log(`Received Stripe webhook: ${eventType}`);

    if (!partyId) {
      console.error('Webhook received without a partyId');
      return json({ error: 'Missing partyId' }, { status: 400 });
    }

    switch (eventType) {
      case 'checkout.session.completed': {
        const session = dataObject as Stripe.Checkout.Session;

        const isLifetimePlan = session.mode === 'payment';

        if (isLifetimePlan) {
          // For lifetime plans, we need to update the plan specifically
          // Get the price ID from the session
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const priceId = lineItems.data[0]?.price?.id;
          const plan = priceId ? PRICE_PLAN_MAP[priceId] : 'free';

          await updateParty(partyId, {
            stripeCustomerId,
            plan,
            planStatus: 'active',
            planNextBillingDate: null,
            planExpirationDate: null
          });
        } else {
          // For regular subscriptions, we'll just update the customer ID
          // The subscription.created event will handle the rest
          await updateParty(partyId, {
            stripeCustomerId,
            planStatus: 'active',
            planNextBillingDate: null,
            planExpirationDate: null
          });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = dataObject as Stripe.Subscription;
        const priceId = subscription.items?.data[0]?.price.id;
        const plan = PRICE_PLAN_MAP[priceId] || 'free';

        await updateParty(partyId, {
          plan,
          stripeCustomerId,
          planStatus: subscription.status,
          planNextBillingDate: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          planExpirationDate: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null
        });
        break;
      }
      case 'customer.subscription.deleted': {
        await updateParty(partyId, {
          plan: 'free',
          stripeCustomerId,
          planStatus: 'expired',
          planNextBillingDate: null,
          planExpirationDate: new Date()
        });
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return json({ error: 'Webhook processing error' }, { status: 400 });
  }
};
