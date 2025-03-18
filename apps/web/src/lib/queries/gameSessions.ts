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
    method: 'POST',
    fetchOptions: {
      responseType: 'blob' // Important: ensure the response is handled as binary data
    },
    onSuccess: async (data, variables) => {
      // Create a URL to the blob
      const url = window.URL.createObjectURL(data);

      // Create a link element
      const link = document.createElement('a');
      link.href = url;

      // Set the download attribute with a filename
      link.setAttribute('download', `tableslayer-gamesession-export.json`);

      // Append the link to the body
      document.body.appendChild(link);

      // Trigger the download
      link.click();

      // Clean up by removing the link and revoking the URL
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      return data;
    }
  });
};

export const useImportGameSessionMutation = () => {
  return mutationFactory<{ partyId: string; file: File }, { success: boolean; gameSessionId: string; message: string }>(
    {
      mutationKey: ['importGameSession'],
      endpoint: '/api/gameSessions/importGameSession',
      method: 'POST',
      fetchOptions: {
        processData: async ({ partyId, file }) => {
          // Create FormData and append the file and partyId
          const formData = new FormData();
          formData.append('file', file);
          formData.append('partyId', partyId);
          return formData;
        }
      }
    }
  );
};
