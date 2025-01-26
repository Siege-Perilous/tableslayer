import type { InsertParty } from '$lib/db/app/schema';
import { createBaseMutation } from './baseMutation';

export const createUpdatePartyMutation = () => {
  return createBaseMutation<{ partyId: string; partyData: Partial<InsertParty> }>({
    mutationKey: ['updateParty'],
    endpoint: '/api/party/updateParty',
    method: 'POST'
  });
};
