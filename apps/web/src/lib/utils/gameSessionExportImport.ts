/**
 * Utility functions for exporting and importing game sessions
 */

import { devError, devLog } from './debug';

/**
 * Exports a game session as a downloadable JSON file
 * @param gameSessionId - The ID of the game session to export
 * @returns Promise that resolves when the download starts
 */
export const exportGameSession = async (gameSessionId: string): Promise<void> => {
  try {
    const response = await fetch('/api/gameSessions/exportGameSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ gameSessionId })
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      throw new Error(errorData.message || 'Failed to export game session');
    }

    // Get the blob from the response
    const blob = await response.blob();

    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = url;

    // Get the filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'tableslayer-game-session.json';

    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute('download', filename);

    // Append to the body and trigger the download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    devError('export', 'Error exporting game session:', error);
    throw error;
  }
};

/**
 * Imports a game session from a JSON file
 * @param partyId - The ID of the party to import the game session into
 * @param file - The JSON file containing the game session data
 * @returns Promise that resolves with the imported game session ID
 */
export const importGameSession = async (partyId: string, file: File): Promise<string> => {
  try {
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    formData.append('partyId', partyId);

    // Send the request
    const response = await fetch('/api/gameSessions/importGameSession', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      devLog('import', 'Error response from importGameSession:', errorData);

      // Create a specific error with the error message from the API
      const errorMessage = errorData.message || 'Failed to import game session';
      throw new Error(errorMessage);
    }

    const data = (await response.json()) as { gameSessionId: string };
    return data.gameSessionId;
  } catch (error) {
    devError('import', 'Error importing game session:', error);
    throw error;
  }
};
