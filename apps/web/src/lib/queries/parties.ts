import type { InsertParty } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const createUpdatePartyMutation = () => {
  return mutationFactory<{ partyId: string; partyData: Partial<InsertParty> }>({
    mutationKey: ['updateParty'],
    endpoint: '/api/party/updateParty',
    method: 'POST'
  });
};
