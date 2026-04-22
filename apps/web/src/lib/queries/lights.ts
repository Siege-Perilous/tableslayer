import type { SelectLight } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useUpsertLightMutation = () => {
  return mutationFactory<
    { partyId: string; sceneId: string; lightData: Partial<SelectLight> },
    { success: boolean; light: SelectLight; operation: 'created' | 'updated' }
  >({
    mutationKey: ['upsertLight'],
    endpoint: '/api/light/upsertLight',
    method: 'POST',
    onSuccess: async () => {
      return;
    }
  });
};

export const useDeleteLightMutation = () => {
  return mutationFactory<{ partyId: string; lightId: string }>({
    mutationKey: ['deleteLight'],
    endpoint: '/api/light/deleteLight',
    method: 'POST'
  });
};
