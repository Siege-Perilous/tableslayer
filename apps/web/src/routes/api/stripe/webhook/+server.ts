import { getParty, getPartyByStripeSubscriptionId, updateParty } from '$lib/server';
import { json, type RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PARTY_PLAN_PRICE_IDS = {
  free: null,
  annual: 'price_1QpI0ZBBgc5xdbaet9uqA0Iy',
  lifetime: 'price_1QpHyyBBgc5xdbaetvqgzQL9'
} as const;

export const POST: RequestHandler = async (event) => {
  try {
    const sig = event.request.headers.get('stripe-signature');
    if (!sig) {
      console.error('Missing Stripe signature');
      throw new Error('Missing Stripe signature');
    }

    // Get the raw body to verify the signature
    const rawBody = await event.request.text();

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_KEY!);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // Handle Stripe events
    switch (stripeEvent.type) {
      /**
       * 1. Checkout session completed
       */
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;

        // Retrieve the full session with expanded line_items
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items.data.price.product']
        });

        const partyId = fullSession.client_reference_id;
        const subscriptionId = fullSession.subscription as string | null;

        if (!partyId) {
          console.error('Missing partyId in session metadata');
          throw new Error('Missing partyId');
        }

        const party = await getParty(partyId);
        if (!party) {
          throw new Error(`Party ${partyId} not found`);
        }

        const lineItemPriceId = fullSession.line_items?.data?.[0]?.price?.id;

        const plan = Object.keys(PARTY_PLAN_PRICE_IDS).find((key) => {
          return PARTY_PLAN_PRICE_IDS[key as keyof typeof PARTY_PLAN_PRICE_IDS] === lineItemPriceId;
        }) as keyof typeof PARTY_PLAN_PRICE_IDS;

        if (!plan) {
          console.error('Invalid plan in session line items');
          throw new Error('Invalid plan mapping');
        }

        if (plan === 'lifetime') {
          await updateParty(partyId, {
            plan,
            stripeSubscriptionId: null,
            planNextBillingDate: null,
            planExpirationDate: null
          });
          console.log(`✅ Lifetime plan purchased: Party ${partyId} upgraded to ${plan}`);
        } else {
          if (!subscriptionId) {
            throw new Error('Subscription ID is required for non-lifetime plans');
          }
          await updateParty(partyId, {
            plan,
            stripeSubscriptionId: subscriptionId,
            planNextBillingDate: null,
            planExpirationDate: null
          });
          console.log(`✅ Subscription plan purchased: Party ${partyId} upgraded to ${plan}`);
        }
        break;
      }

      /**
       * 2. Invoice payment succeeded
       */
      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        const planNextBillingDate = invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null;

        const party = await getPartyByStripeSubscriptionId(subscriptionId);
        if (!party) {
          console.error(`No party found for subscription ${subscriptionId}`);
          throw new Error('Party not found');
        }

        if (party.plan === 'lifetime') {
          console.log(`ℹ️ Skipping billing update for lifetime plan: Party ${party.id}`);
          break;
        }

        await updateParty(party.id, {
          planNextBillingDate,
          planExpirationDate: null
        });
        console.log(`✅ Payment received: Party ${party.name} next bill is on ${planNextBillingDate}`);
        break;
      }

      /**
       * 3. Subscription deleted
       */
      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const party = await getPartyByStripeSubscriptionId(subscriptionId);
        if (party) {
          if (party.plan === 'lifetime') {
            console.log(`ℹ️ Skipping downgrade for lifetime plan: Party ${party.id}`);
            break;
          }

          await updateParty(party.id, {
            plan: 'free',
            planNextBillingDate: null,
            planExpirationDate: null
          });
          console.log(`🚨 Subscription ${subscriptionId} canceled. Party ${party.id} downgraded to free.`);
        }
        break;
      }

      /**
       * 4. Subscription updated
       */
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;
        const status = subscription.status;

        const nextBillTimestamp = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
          : null;
        const wasCanceled = subscription.cancel_at_period_end || status === 'canceled';

        const party = await getPartyByStripeSubscriptionId(subscriptionId);
        if (!party) break;

        if (party.plan === 'lifetime') {
          console.log(`ℹ️ Skipping updates for lifetime plan: Party ${party.id}`);
          break;
        }

        if (wasCanceled) {
          if (status === 'canceled') {
            await updateParty(party.id, {
              plan: 'free',
              planNextBillingDate: null
            });
            console.log(`🚨 Subscription ${subscriptionId} expired. Party ${party.id} downgraded to free.`);
          } else {
            await updateParty(party.id, {
              planNextBillingDate: null,
              planExpirationDate: nextBillTimestamp
            });
            console.log(
              `🚨 Subscription ${subscriptionId} canceled. Party ${party.id} will expire on ${nextBillTimestamp}`
            );
          }
        } else {
          await updateParty(party.id, {
            planNextBillingDate: nextBillTimestamp
          });
          console.log(`🔄 Subscription updated: Party ${party.id} next bill is ${nextBillTimestamp}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return json({ error: 'Webhook processing error' }, { status: 400 });
  }
};
