import { apiFactory } from '$lib/factories';
import { getCustomer, lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';
import { z } from 'zod';

lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError(error) {
    console.log(error);
  }
});

const validationSchema = z.object({
  customerId: z.number()
});

export const POST = apiFactory(
  async (event) => {
    try {
      const { customerId } = event.body;
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      const { data } = await getCustomer(customerId);
      if (!data) {
        throw new Error('Customer not found');
      }

      const portalUrl = data?.data.attributes.urls.customer_portal;

      if (!portalUrl) {
        throw new Error('Customer portal URL not found');
      }

      return { url: portalUrl };
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
