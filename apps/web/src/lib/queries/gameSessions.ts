import type { InsertGameSession, SelectGameSession } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

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

export const useDeleteGameSessionMutation = () => {
  return mutationFactory<{ partyId: string; gameSessionId: string }>({
    mutationKey: ['deleteGameSession'],
    endpoint: '/api/gameSessions/deleteGameSession',
    method: 'POST'
  });
};

export const useUpdateGameSessionMutation = () => {
  return mutationFactory<
    { partyId: string; gameSessionId: string; gameSessionData: Partial<InsertGameSession> },
    { success: boolean; gameSession: SelectGameSession }
  >({
    mutationKey: ['createGameSession'],
    endpoint: '/api/gameSessions/updateGameSession',
    onSuccess: async () => {
      return;
    },
    method: 'POST'
  });
};

export const useExportGameSessionMutation = () => {
  return mutationFactory<{ gameSessionId: string }, Blob>({
    mutationKey: ['exportGameSession'],
    endpoint: '/api/gameSessions/exportGameSession',
    method: 'POST'
  });
};

export const useImportGameSessionMutation = () => {
  return mutationFactory<{ partyId: string; file: File }, { success: boolean; gameSessionId: string; message: string }>(
    {
      mutationKey: ['importGameSession'],
      endpoint: '/api/gameSessions/importGameSession',
      method: 'POST'
    }
  );
};
