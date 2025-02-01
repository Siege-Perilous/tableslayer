import type { InsertPartyMember, SelectPartyMember } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useDeletePartyMemberMutation = () => {
  return mutationFactory<{ userId: string; partyId: string }>({
    mutationKey: ['deletePartyInvite'],
    endpoint: '/api/partyMember/deletePartyMember',
    method: 'POST'
  });
};

export const useUpdatePartyMemberMutation = () => {
  return mutationFactory<InsertPartyMember, SelectPartyMember>({
    mutationKey: ['updatePartyMember'],
    endpoint: '/api/partyMember/updatePartyMember',
    method: 'POST'
  });
};
