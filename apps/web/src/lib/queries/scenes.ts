import type { SelectScene } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdateSceneMutation = () => {
  return mutationFactory<{ partyId: string; sceneId: string; sceneData: Partial<SelectScene> }>({
    mutationKey: ['updateScene'],
    endpoint: '/api/scenes/updateScene',
    method: 'POST',
    onSuccess: async () => {
      return;
    }
  });
};

export const useCreateSceneMutation = () => {
  return mutationFactory<{ partyId: string; sceneData: Partial<SelectScene> }>({
    mutationKey: ['insertScene'],
    endpoint: '/api/scenes/createScene',
    method: 'POST'
  });
};

export const useDeleteSceneMutation = () => {
  return mutationFactory<{ gameSessionId: string; partyId: string; sceneId: string }>({
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
