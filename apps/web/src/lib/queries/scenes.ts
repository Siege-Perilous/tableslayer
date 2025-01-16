import { invalidateAll } from '$app/navigation';
import { createMutation } from '@tanstack/svelte-query';

export const createUpdateSceneMutation = () => {
  return createMutation<void, Error, { sceneId: string; dbName: string; stageProps: Partial<StageProps> }>({
    mutationKey: ['updateScene'],
    mutationFn: async ({ sceneId, dbName, stageProps }) => {
      const response = await fetch(`/api/scenes/updateScene/${sceneId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, stageProps })
      });

      if (!response.ok) {
        throw new Error(`Failed to update scene: ${response.statusText}`);
      }
    }
  });
};

type SetActiveSceneResponse = {
  success: boolean;
};

type SetActiveSceneVariables = {
  sceneId: string;
  partyId: string;
  dbName: string;
};

export const createSetActiveSceneMutation = () => {
  return createMutation<SetActiveSceneResponse, Error, SetActiveSceneVariables>({
    mutationKey: ['setActiveScene'],
    mutationFn: async ({ sceneId, partyId, dbName }) => {
      const response = await fetch('/api/scenes/setActiveScene', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sceneId, partyId, dbName })
      });

      if (!response.ok) {
        throw new Error(`Failed to set active scene: ${response.statusText}`);
      }

      const data = (await response.json()) as SetActiveSceneResponse;
      return data;
    },
    onSuccess: async () => {
      await invalidateAll();
    }
  });
};
