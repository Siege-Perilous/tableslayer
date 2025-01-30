import type { SelectGameSettings } from '$lib/db/gs/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdateGameSessionSettingsMutation = () => {
  return mutationFactory<{ dbName: string; partyId: string; settings: Partial<SelectGameSettings> }>({
    mutationKey: ['updateScene'],
    endpoint: '/api/gameSessions/updateSettings',
    method: 'POST'
  });
};
