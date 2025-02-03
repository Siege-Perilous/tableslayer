import type { SelectScene } from '$lib/db/gs/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdateSceneMutation = () => {
  return mutationFactory<{ dbName: string; partyId: string; sceneId: string; sceneData: Partial<SelectScene> }>({
    mutationKey: ['updateScene'],
    endpoint: '/api/scenes/updateScene',
    method: 'POST',
    onSuccess: async () => {
      return;
    }
  });
};

export const useCreateSceneMutation = () => {
  return mutationFactory<{ dbName: string; partyId: string; sceneData: Partial<SelectScene> }>({
    mutationKey: ['insertScene'],
    endpoint: '/api/scenes/createScene',
    method: 'POST'
  });
};

export const useDeleteSceneMutation = () => {
  return mutationFactory<{ dbName: string; partyId: string; sceneId: string }>({
    mutationKey: ['deleteScene'],
    endpoint: '/api/scenes/deleteScene',
    method: 'POST'
  });
};
