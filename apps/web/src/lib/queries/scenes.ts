import type { SelectScene } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

// Scene creation still goes through the API: the server computes map/grid
// alignment from the uploaded image, and the response row is then added to the
// session doc. Everything else about scenes is doc-authoritative — the PartyKit
// room persists changes through /api/internal/persistSession, so there are no
// client-side update/delete/reorder mutations.
export const useCreateSceneMutation = () => {
  return mutationFactory<
    { partyId: string; sceneData: Partial<SelectScene> },
    { success: boolean; scene: SelectScene }
  >({
    mutationKey: ['insertScene'],
    endpoint: '/api/scenes/createScene',
    method: 'POST',
    onSuccess: async () => {
      // No invalidation: the caller adds the new scene to the session doc
      return;
    }
  });
};
