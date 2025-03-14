import type { SelectMarker } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdateMarkerMutation = () => {
  return mutationFactory<{ partyId: string; markerId: string; markerData: Partial<SelectMarker> }>({
    mutationKey: ['updateMarker'],
    endpoint: '/api/marker/updateMarker',
    method: 'POST',
    onSuccess: async () => {
      return;
    }
  });
};

export const useCreateMarkerMutation = () => {
  return mutationFactory<{ partyId: string; sceneId: string; markerData: Partial<SelectMarker> }>({
    mutationKey: ['insertMarker'],
    endpoint: '/api/marker/createMarker',
    method: 'POST'
  });
};

export const useDeleteMarkerMutation = () => {
  return mutationFactory<{ partyId: string; markerId: string }>({
    mutationKey: ['deleteMarker'],
    endpoint: '/api/marker/deleteMarker',
    method: 'POST'
  });
};
