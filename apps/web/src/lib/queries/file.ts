import { createMutation } from '@tanstack/svelte-query';

export const createUploadFogFromBlobMutation = () => {
  return createMutation<{ location: string }, Error, { sceneId: string; blob: Blob }>({
    mutationKey: ['uploadFile'],
    mutationFn: async ({ sceneId, blob }) => {
      const response = await fetch(`/api/file/uploadFogFromBlob/${sceneId}`, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type
        },
        body: blob
      });

      if (!response.ok) {
        throw new Error(`Failed to upload fog of war: ${response.statusText}`);
      }

      const file = await response.json();
      return file;
    }
  });
};
