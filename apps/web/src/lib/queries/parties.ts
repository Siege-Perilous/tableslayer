import { invalidateAll } from '$app/navigation';
import type { InsertParty } from '$lib/db/app/schema';
import { createMutation } from '@tanstack/svelte-query';

export const createUpdatePartyMutation = () => {
  return createMutation<void, Error, { partyId: string; partyData: Partial<InsertParty> }>({
    mutationKey: ['updateParty'],
    mutationFn: async ({ partyId, partyData }) => {
      console.log('mutating partyData', partyData);
      const response = await fetch('/api/party/updateParty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, partyData })
      });

      if (!response.ok) {
        throw new Error(`Failed to update party: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('mutated partyData', data);
      return data;
    },
    onSuccess: async () => {
      await invalidateAll();
    }
  });
};
