import { VALID_PARTY_PLANS } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { getParty, getUser } from '$lib/server';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PARTY_PLAN_PRICE_IDS = {
  free: null,
  annual: 'price_1QpI0ZBBgc5xdbaet9uqA0Iy',
  lifetime: 'price_1QpHyyBBgc5xdbaetvqgzQL9'
} as const;

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
      const userId = event.locals.user.id;

      const user = await getUser(userId);
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

      // Determine mode dynamically
      const mode = plan === 'lifetime' ? 'payment' : 'subscription';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode,
        success_url: `${process.env.BASE_URL}/${party.slug}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/${party.slug}/cancel`,
        metadata: { partyId, userId, userEmail: user.email },
        client_reference_id: partyId
      });

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
