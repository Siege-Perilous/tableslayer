import { type PartyPlan } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useStripeCheckout = () => {
  return mutationFactory<{ plan: PartyPlan; partyId: string }, { url: string }>({
    mutationKey: ['stripe'],
    endpoint: '/api/stripe/checkout',
    method: 'POST'
  });
};

export const useStripeCustomerPortal = () => {
  return mutationFactory<{ partyId: string }, { url: string }>({
    mutationKey: ['stripe'],
    endpoint: '/api/stripe/customerPortal',
    method: 'POST'
  });
};
