import { type PartyPlan } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useStripeCheckout = () => {
  return mutationFactory<{ plan: PartyPlan; partyId: string }>({
    mutationKey: ['stripeCheckout'],
    endpoint: '/api/stripe/checkout',
    method: 'POST'
  });
};
