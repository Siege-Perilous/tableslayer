import { createMutation } from '@tanstack/svelte-query';

import type { SelectScene } from '$lib/db/gs/schema';
import { mutationFactory } from '$lib/factories';

export const createUpdateSceneMutation = () => {
  return mutationFactory<{ dbName: string; partyId: string; sceneId: string; sceneData: Partial<SelectScene> }>({
    mutationKey: ['updateScene'],
    endpoint: '/api/scenes/updateScene',
    method: 'POST',
    onSuccess: async () => {
      return;
    }
  });
};

type UpdateSceneMapImageVariables = {
  sceneId: string;
  dbName: string;
  file: File;
};

export const createUpdateSceneMapImageMutation = () => {
  return createMutation<void, Error, UpdateSceneMapImageVariables>({
    mutationKey: ['updateSceneMapImage'],
    mutationFn: async ({ sceneId, dbName, file }) => {
      const formData = new FormData();
      formData.append('sceneId', sceneId);
      formData.append('dbName', dbName);
      formData.append('file', file, file.name);

      const response = await fetch('/api/scenes/updateSceneMapImage', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Failed to update scene map image: ${response.statusText}`);
      }
    }
  });
};
