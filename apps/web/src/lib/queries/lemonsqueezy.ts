import { type PartyPlan } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useLemonSqueezyCheckout = () => {
  return mutationFactory<{ plan: PartyPlan; partyId: string }, { url: string }>({
    mutationKey: ['lemonsqueezyCheckout'],
    endpoint: '/api/lemonsqueezy/checkout',
    method: 'POST'
  });
};
