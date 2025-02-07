import { VALID_PARTY_PLANS } from '$lib/db/app/schema';
import { apiFactory } from '$lib/factories';
import { getParty, getUser } from '$lib/server';
import { createCheckout, lemonSqueezySetup, type NewCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import { z } from 'zod';

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError(error) {
    console.log(error);
  }
});

const LEMON_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID!;

const yearlyId = Number(process.env.LEMONSQUEEZY_VARIANT_YEARLY_ID!);
const lifetimeId = Number(process.env.LEMONSQUEEZY_VARIANT_LIFETIME_ID!);
const monthlyId = Number(process.env.LEMONSQUEEZY_VARIANT_MONTHLY_ID!);

const PARTY_PLAN_VARIANT_IDS = {
  yearly: yearlyId,
  lifetime: lifetimeId,
  monthly: monthlyId,
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
      const userId = event.locals.user.id;

      const user = await getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const party = await getParty(partyId);
      if (!party) {
        throw new Error('Party not found');
      }

      const variantId = PARTY_PLAN_VARIANT_IDS[plan];
      if (!variantId) {
        throw new Error('Invalid party plan');
      }

      // Create a checkout session with LemonSqueezy SDK
      const newCheckout: NewCheckout = {
        checkoutOptions: {
          embed: false,
          media: false,
          logo: true
        },
        checkoutData: {
          email: user.email,
          name: 'Lemon Squeezy Test',
          custom: {
            paryName: party.name,
            partyId,
            userId,
            userEmail: user.email
          }
        },
        preview: true,
        testMode: true
      };

      console.log('Creating checkout session with LemonSqueezy...');
      console.log('storeId', LEMON_STORE_ID);
      console.log('variantId', variantId);

      const { error, data } = await createCheckout(LEMON_STORE_ID, variantId, newCheckout);
      if (error) {
        console.log(error);
        throw new Error(`Failed to create LemonSqueezy checkout session: ${error.message}`);
      }
      if (!data) {
        throw new Error('Failed to create LemonSqueezy checkout session');
      }

      const checkoutUrl = data.data.attributes.url;

      return { url: checkoutUrl };
    } catch (error) {
      console.error('Error creating LemonSqueezy Checkout session:', error);
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
