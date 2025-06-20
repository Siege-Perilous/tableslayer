import { createQuery } from '@tanstack/svelte-query';

type SceneTimestampsParams = {
  gameSessionId: string;
  partyId: string;
};

type SceneTimestampsResponse = {
  timestamps: Record<string, number>;
};

export const useGetSceneTimestampsQuery = ({ gameSessionId, partyId }: SceneTimestampsParams) => {
  return createQuery<SceneTimestampsResponse, Error>({
    queryKey: ['sceneTimestamps', gameSessionId],
    queryFn: async () => {
      const response = await fetch('/api/scenes/timestamps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ gameSessionId, partyId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch scene timestamps');
      }

      return response.json();
    },
    enabled: !!gameSessionId && !!partyId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true
  });
};
