import type { InsertGameSession, SelectGameSession } from '$lib/db/app/schema';
import type { SelectGameSettings } from '$lib/db/gs/schema';
import { mutationFactory } from '$lib/factories';

export const useUpdateGameSessionSettingsMutation = () => {
  return mutationFactory<{ dbName: string; partyId: string; settings: Partial<SelectGameSettings> }>({
    mutationKey: ['updateGameSession'],
    endpoint: '/api/gameSessions/updateSettings',
    method: 'POST'
  });
};

export const useCreateGameSessionMutation = () => {
  return mutationFactory<
    { partyId: string; gameSessionData: Partial<InsertGameSession> },
    { success: boolean; gameSession: SelectGameSession }
  >({
    mutationKey: ['createGameSession'],
    endpoint: '/api/gameSessions/createGameSession',
    method: 'POST'
  });
};
