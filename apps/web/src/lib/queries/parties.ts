import type { InsertParty, SelectParty } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdatePartyMutation = () => {
  return mutationFactory<
    { partyId: string; partyData: Partial<InsertParty> },
    { success: boolean; party: SelectParty }
  >({
    mutationKey: ['updateParty'],
    endpoint: '/api/party/updateParty',
    method: 'POST'
  });
};

export const useCreatePartyMutation = () => {
  return mutationFactory<{ partyData?: Partial<InsertParty> }, { success: boolean; party: SelectParty }>({
    mutationKey: ['updateParty'],
    endpoint: '/api/party/createParty',
    method: 'POST'
  });
};

export const useDeletePartyMutation = () => {
  return mutationFactory<{ partyId: string }>({
    mutationKey: ['deleteParty'],
    endpoint: '/api/party/deleteParty',
    method: 'POST'
  });
};
