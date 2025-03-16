import type { SelectMarker } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdateMarkerMutation = () => {
  return mutationFactory<
    { partyId: string; markerId: string; markerData: Partial<SelectMarker> },
    { success: boolean; marker: SelectMarker }
  >({
    mutationKey: ['updateMarker'],
    endpoint: '/api/marker/updateMarker',
    method: 'POST',
    onSuccess: async () => {
      // Prevent invalidation by providing a custom onSuccess handler
      return;
    }
  });
};

export const useCreateMarkerMutation = () => {
  return mutationFactory<
    { partyId: string; sceneId: string; markerData: Partial<SelectMarker> },
    { success: boolean; marker: SelectMarker }
  >({
    mutationKey: ['insertMarker'],
    endpoint: '/api/marker/createMarker',
    method: 'POST',
    onSuccess: async () => {
      // Prevent invalidation by providing a custom onSuccess handler
      return;
    }
  });
};

export const useDeleteMarkerMutation = () => {
  return mutationFactory<{ partyId: string; markerId: string }>({
    mutationKey: ['deleteMarker'],
    endpoint: '/api/marker/deleteMarker',
    method: 'POST'
  });
};
