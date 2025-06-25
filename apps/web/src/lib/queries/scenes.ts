import type { SelectScene } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';
import { createQuery } from '@tanstack/svelte-query';

export const useUpdateSceneMutation = () => {
  return mutationFactory<
    { partyId: string; sceneId: string; sceneData: Partial<SelectScene> },
    { success: boolean; scene: SelectScene }
  >({
    mutationKey: ['updateScene'],
    endpoint: '/api/scenes/updateScene',
    method: 'POST',
    onSuccess: async () => {
      // Prevent invalidation by providing a custom onSuccess handler
      // Scene data is managed by Y.js, no need to refetch from server
      return;
    }
  });
};

export const useCreateSceneMutation = () => {
  return mutationFactory<
    { partyId: string; sceneData: Partial<SelectScene> },
    { success: boolean; scene: SelectScene }
  >({
    mutationKey: ['insertScene'],
    endpoint: '/api/scenes/createScene',
    method: 'POST'
  });
};

export const useDeleteSceneMutation = () => {
  return mutationFactory<
    { gameSessionId: string; partyId: string; sceneId: string },
    { success: boolean; scenes: SelectScene[] }
  >({
    mutationKey: ['deleteScene'],
    endpoint: '/api/scenes/deleteScene',
    method: 'POST'
  });
};

export const useReorderScenesMutation = () => {
  return mutationFactory<{
    partyId: string;
    gameSessionId: string;
    sceneId: string;
    newOrder: number;
    oldOrder: number;
  }>({
    mutationKey: ['reorderScenes'],
    endpoint: '/api/scenes/reorderScenes',
    method: 'POST'
  });
};

export const useDuplicateSceneMutation = () => {
  return mutationFactory<
    { partyId: string; sceneId: string },
    { success: boolean; scene: SelectScene; scenes: SelectScene[] }
  >({
    mutationKey: ['duplicateScene'],
    endpoint: '/api/scenes/duplicateScene',
    method: 'POST'
  });
};

// Unified save mutation for scene + markers + party state
export const useSavePartyStateMutation = () => {
  return mutationFactory<
    {
      partyId: string;
      gameSessionId: string;
      sceneId: string;
      sceneData: Partial<SelectScene>;
      gameSessionData?: { lastUpdated?: Date };
      markerOperations?: Array<{
        operation: 'create' | 'update' | 'delete';
        id: string;
        data?: any;
      }>;
      thumbnailLocation?: string;
    },
    {
      success: boolean;
      results: {
        scene: SelectScene;
        markers: {
          created: any[];
          updated: any[];
          deleted: string[];
        };
        gameSession: any;
      };
    }
  >({
    mutationKey: ['savePartyState'],
    endpoint: '/api/party/savePartyState',
    method: 'POST'
  });
};

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
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to fetch scene timestamps');
      }

      return response.json();
    },
    enabled: !!gameSessionId && !!partyId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true
  });
};
