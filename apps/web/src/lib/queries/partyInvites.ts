import type { InsertPartyInvite, SelectPartyInvite } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useCreatePartyInviteMutation = () => {
  return mutationFactory<Partial<InsertPartyInvite>, { success: boolean; partyInvite: SelectPartyInvite }>({
    mutationKey: ['createPartyInvite'],
    endpoint: '/api/partyInvite/createPartyInvite',
    method: 'POST'
  });
};

export const useResendPartyInviteMutation = () => {
  return mutationFactory<{ partyId: string; email: string }, { success: boolean; partyInvite: SelectPartyInvite }>({
    mutationKey: ['resendPartyInvite'],
    endpoint: '/api/partyInvite/resendPartyInvite',
    method: 'POST'
  });
};

export const useDeletePartyInviteMutation = () => {
  return mutationFactory<{ partyId: string; email: string }>({
    mutationKey: ['deletePartyInvite'],
    endpoint: '/api/partyInvite/deletePartyInvite',
    method: 'POST'
  });
};
