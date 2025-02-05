import { PARTY_PLAN_PRICE_IDS, VALID_PARTY_PLANS } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { getParty, getUser } from '$lib/server';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1
          }
        ],
        mode: 'subscription',
        success_url: `${process.env.PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.PUBLIC_BASE_URL}/cancel`,
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
