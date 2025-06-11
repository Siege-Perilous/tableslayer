import { apiFactory } from '$lib/factories';
import { getParty } from '$lib/server';
import Stripe from 'stripe';
import { z } from 'zod/v4';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const validationSchema = z.object({
  partyId: z.string()
});

export const POST = apiFactory(
  async (event) => {
    try {
      const { partyId } = event.body;

      if (!partyId) {
        throw new Error('Missing required fields');
      }

      if (!event.locals.user) {
        throw new Error('Unauthorized');
      }

      const party = await getParty(partyId);
      if (!party || !party.stripeCustomerId) {
        throw new Error('Party not found or missing Stripe customer ID');
      }

      // Create a customer portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: party.stripeCustomerId,
        return_url: `${process.env.BASE_URL}/${party.slug}`
      });

      if (!session.url) {
        throw new Error('Failed to create Stripe Customer Portal session');
      }

      return { url: session.url };
    } catch (error) {
      console.error('Error creating Stripe Customer Portal session:', error);
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
