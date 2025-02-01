import { mutationFactory } from '$lib/factories';

export const useDeletePartyMemberMutation = () => {
  return mutationFactory<{ userId: string; partyId: string }>({
    mutationKey: ['deletePartyInvite'],
    endpoint: '/api/partyMember/deletePartyMember',
    method: 'POST'
  });
};
