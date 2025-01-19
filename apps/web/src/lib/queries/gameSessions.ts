import { invalidateAll } from '$app/navigation';
import { createMutation } from '@tanstack/svelte-query';

type ToggleGamePauseResponse = {
  success: boolean;
};
export const createToggleGamePauseMutation = () => {
  return createMutation<ToggleGamePauseResponse, Error, { dbName: string; partyId: string }>({
    mutationKey: ['toggleGamePause'],
    mutationFn: async ({ dbName, partyId }) => {
      const response = await fetch('/api/gameSessions/togglePause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, partyId })
      });

      if (!response.ok) {
        throw new Error(`Failed to toggle game pause: ${response.statusText}`);
      }
      const data = (await response.json()) as ToggleGamePauseResponse;
      return data;
    },
    onSuccess: async () => {
      await invalidateAll();
    }
  });
};
