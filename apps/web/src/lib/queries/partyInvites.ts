import type { InsertPartyInvite, SelectPartyInvite } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useCreatePartyInviteMutation = () => {
  return mutationFactory<Partial<InsertPartyInvite>, { success: boolean; partyInvite: SelectPartyInvite }>({
    mutationKey: ['createPartyInvite'],
    endpoint: '/api/partyInvite/createPartyInvite',
    method: 'POST'
  });
};

export const useUpdatePartyInviteMutation = () => {
  return mutationFactory<Partial<InsertPartyInvite>, { success: boolean; partyInvite: SelectPartyInvite }>({
    mutationKey: ['updatePartyInvite'],
    endpoint: '/api/partyInvite/updatePartyInvite',
    method: 'POST'
  });
};

export const useDeletePartyInviteMutation = () => {
  return mutationFactory<{ partyInviteId: string }>({
    mutationKey: ['deletePartyInvite'],
    endpoint: '/api/partyInvite/deletePartyInvite',
    method: 'POST'
  });
};
