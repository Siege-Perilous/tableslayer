import { invalidateAll } from '$app/navigation';
import type { InsertParty } from '$lib/db/app/schema';
import { createMutation } from '@tanstack/svelte-query';

export const createUpdatePartyMutation = () => {
  return createMutation<
    { success: boolean; errors?: { message: string; path: string[] }[] },
    Error,
    { partyId: string; partyData: Partial<InsertParty> }
  >({
    mutationKey: ['updateParty'],
    mutationFn: async ({ partyId, partyData }) => {
      const response = await fetch('/api/party/updateParty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, partyData })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(JSON.stringify({ message: `Failed to update party: ${response.statusText}`, ...data }));
      }

      return data;
    },
    onSuccess: async () => {
      await invalidateAll();
    }
  });
};
