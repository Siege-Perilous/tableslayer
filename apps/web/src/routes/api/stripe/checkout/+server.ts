import { VALID_PARTY_PLANS } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { getParty, getUser, updateParty } from '$lib/server';
import Stripe from 'stripe';
import { z } from 'zod/v4';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const STRIPE_PRICE_YEARLY_ID = process.env.STRIPE_PRICE_ID_YEARLY!;
const STRIPE_PRICE_LIFETIME_ID = process.env.STRIPE_PRICE_ID_LIFETIME!;
const STRIPE_PRICE_MONTHLY_ID = process.env.STRIPE_PRICE_ID_MONTHLY!;

const PARTY_PLAN_PRICE_IDS: Record<string, string | null> = {
  yearly: STRIPE_PRICE_YEARLY_ID,
  lifetime: STRIPE_PRICE_LIFETIME_ID,
  monthly: STRIPE_PRICE_MONTHLY_ID,
  free: null
};

const validationSchema = z.object({
  plan: z.enum(VALID_PARTY_PLANS),
  partyId: z.string()
});

export const POST = apiFactory(
  async (event) => {
    try {
      const { plan, partyId } = event.body;

      if (!plan || !partyId) {
        throw new Error('Missing required fields');
      }

      if (!event.locals.user) {
        throw new Error('Unauthorized');
      }

      const user = await getUser(event.locals.user.id);

      if (!user) {
        throw new Error('User not found');
      }

      const party = await getParty(partyId);
      if (!party) {
        throw new Error('Party not found');
      }

      const priceId = PARTY_PLAN_PRICE_IDS[plan];
      if (!priceId) {
        throw new Error('Invalid party plan');
      }

      // Ensure the party has a Stripe customer ID
      let stripeCustomerId = party.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
            partyId
          }
        });

        stripeCustomerId = customer.id;

        // Store on the party
        await updateParty(partyId, { stripeCustomerId });
      }

      const mode: Stripe.Checkout.SessionCreateParams.Mode = plan === 'lifetime' ? 'payment' : 'subscription';

      // Create the session config with proper typing
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        allow_promotion_codes: true,
        mode,
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        metadata: {
          userEmail: user.email,
          userId: user.id,
          partyName: party.name,
          partyId
        },
        success_url: `${process.env.BASE_URL}/${party.slug}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/${party.slug}`
      };

      // Only add subscription_data for subscription mode
      if (mode === 'subscription') {
        sessionConfig.subscription_data = {
          metadata: {
            userEmail: user.email,
            userId: user.id,
            partyName: party.name,
            partyId
          }
        };
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      if (!session.url) {
        throw new Error('Failed to create Stripe Checkout session');
      }

      return { url: session.url };
    } catch (error) {
      console.error('Error creating Stripe Checkout session:', error);
      throw error;
    }
  },
  {
    validationSchema,
    validationErrorMessage: 'Check your form for errors',
    unauthorizedMessage: 'You are not authorized',
    unexpectedErrorMessage: 'An unexpected error occurred'
  }
);
