import { mutationFactory } from '$lib/factories';
import { createQuery } from '@tanstack/svelte-query';

export const LIVE_STATE_POLL_MS = 20_000;

export interface PartyLiveStateResponse {
  success: boolean;
  activeSceneId: string | null;
  isPaused: boolean;
  /** Epoch ms of the latest wake-kind activity, or null. */
  lastActivityAt: number | null;
}

/** Editor "I'm here" ping; silent on failure and never reloads page data. */
export const useEditorActivityMutation = () => {
  return mutationFactory<{ partyId: string; gameSessionId: string }, { success: boolean }>({
    mutationKey: ['editorActivity'],
    endpoint: '/api/party/editorActivity',
    method: 'POST',
    onSuccess: async () => {
      return;
    },
    onError: () => {}
  });
};

/** Polls party live state while `enabled()` (the playfield only polls asleep). */
export const createPartyLiveStateQuery = (partyId: string, enabled: () => boolean) => {
  return createQuery<PartyLiveStateResponse, Error>(() => ({
    queryKey: ['partyLiveState', partyId],
    enabled: enabled(),
    refetchInterval: LIVE_STATE_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const response = await fetch('/api/party/liveState', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId })
      });
      if (!response.ok) {
        throw new Error('Failed to load party live state');
      }
      return response.json();
    }
  }));
};
