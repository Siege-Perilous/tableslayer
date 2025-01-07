import type { StageProps } from '@tableslayer/ui';
import { createMutation } from '@tanstack/svelte-query';

export const createUpdateSceneMutation = () => {
  return createMutation<void, Error, { sceneId: string; dbName: string; stageProps: Partial<StageProps> }>({
    mutationKey: ['updateScene'],
    mutationFn: async ({ sceneId, dbName, stageProps }) => {
      const response = await fetch(`/api/updateScene/${sceneId}`, {
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
