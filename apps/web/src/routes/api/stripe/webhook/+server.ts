import { PARTY_PLAN_PRICE_IDS, type PartyPlan } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { getParty, getPartyByStripeSubscriptionId, updateParty } from '$lib/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = apiFactory(
  async (event) => {
    try {
      const sig = event.request.headers.get('stripe-signature');
      if (!sig) {
        throw new Error('Missing Stripe signature');
      }

      const rawBody = await event.request.text();

      let stripeEvent: Stripe.Event;
      try {
        stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_KEY!);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        throw new Error('Webhook signature verification failed');
      }

      /**
       * 1. PAYMENT SUCCESSFUL: Update their plan and planNextBillingDate.
       */
      switch (stripeEvent.type) {
        case 'checkout.session.completed': {
          const session = stripeEvent.data.object as Stripe.Checkout.Session;
          const partyId = session.client_reference_id; // ✅ Retrieve partyId
          const subscriptionId = session.subscription as string;

          if (!partyId || !subscriptionId) {
            console.error('Missing partyId or subscriptionId in session metadata');
            throw new Error('Missing required data');
          }

          const party = await getParty(partyId);
          if (!party) {
            throw new Error(`Party ${partyId} not found`);
          }

          // Update the party with the Stripe subscription ID
          await updateParty(partyId, { stripeSubscriptionId: subscriptionId });
          console.log(`✅ Party ${partyId} linked to subscription ${subscriptionId}`);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = stripeEvent.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;
          const planNextBillingDate = invoice.next_payment_attempt
            ? new Date(invoice.next_payment_attempt * 1000)
            : null;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0]?.price.id;

          const getPlanFromPriceId = (priceId: string): string | null => {
            return (
              Object.keys(PARTY_PLAN_PRICE_IDS).find(
                (plan: string) => PARTY_PLAN_PRICE_IDS[plan as keyof typeof PARTY_PLAN_PRICE_IDS] === priceId
              ) || null
            );
          };

          const plan = getPlanFromPriceId(priceId) as PartyPlan;

          if (!plan) {
            console.error(`No matching plan for priceId: ${priceId}`);
            throw new Error('Invalid plan mapping');
          }

          const party = await getPartyByStripeSubscriptionId(subscriptionId);

          if (!party) {
            console.error(`No party found for subscription ${subscriptionId}`);
            throw new Error('Party not found');
          }

          await updateParty(party.id, { plan, planNextBillingDate, planExpirationDate: null });
          console.log(`✅ Payment received: Party ${party.name} upgraded.`);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = stripeEvent.data.object as Stripe.Subscription;
          const subscriptionId = subscription.id;

          const party = await getPartyByStripeSubscriptionId(subscriptionId);

          if (party) {
            await updateParty(party.id, { plan: 'free', planExpirationDate: null, planNextBillingDate: null });
            console.log(`Subscription ${subscriptionId} canceled. Party ${party.id} downgraded.`);
          }
          break;
        }
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

          if (wasCanceled) {
            if (status === 'canceled') {
              // This is the *final expiration* event
              await updateParty(party.id, {
                plan: 'free',
                planNextBillingDate: null
              });
              console.log(`Subscription ${subscriptionId} fully expired. Party ${party.id} downgraded to free.`);
            } else {
              // This is the *initial cancellation* (still active until period ends)
              await updateParty(party.id, {
                planNextBillingDate: null,
                planExpirationDate: nextBillTimestamp
              });
              console.log(
                `🚨 Subscription ${subscriptionId} canceled. Party ${party.id} will expire on ${nextBillTimestamp}`
              );
            }
          } else {
            // Subscription still active, just update next bill date
            await updateParty(party.id, {
              planNextBillingDate: nextBillTimestamp
            });
            console.log(`Subscription updated: Party ${party.id} next bill is ${nextBillTimestamp}`);
          }

          break;
        }
        default:
          console.log(`Unhandled event type: ${stripeEvent.type}`);
      }

      return { received: true };
    } catch (err) {
      console.error('Webhook processing error:', err);
      throw err;
    }
  },
  {
    unauthorizedMessage: 'Unauthorized access to webhook',
    unexpectedErrorMessage: 'An error occurred processing the webhook'
  }
);
