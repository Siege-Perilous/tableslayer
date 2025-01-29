import { mutationFactory } from '$lib/factories';
import { createMutation } from '@tanstack/svelte-query';
import mime from 'mime';
import { v4 as uuidv4 } from 'uuid';

export const createUploadFogFromBlobMutation = () => {
  return createMutation<{ location: string }, Error, { sceneId: string; blob: Blob }>({
    mutationKey: ['uploadFog'],
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

export const createUploadFileMutation = () => {
  return mutationFactory<{ file: File; folder: string }, { userId: string; fileId: string; location: string }, Error>({
    mutationKey: ['uploadFile'],
    mutationFn: async ({ file, folder }) => {
      const fileId = uuidv4();
      const fileExtension = mime.getExtension(file.type);
      const fileName = `${folder}/${fileId}.${fileExtension}`;
      const contentType = file.type;

      // Step 1: Fetch Presigned URL
      const presignedUrlResponse = await fetch('/api/file/generatePresignedWriteUrl', {
        method: 'POST',
        body: JSON.stringify({ fileName, contentType }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!presignedUrlResponse.ok) {
        throw new Error('Failed to generate presigned URL');
      }

      const { signedUrl } = await presignedUrlResponse.json();

      // Step 2: Upload to Cloudflare R2
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload to Cloudflare R2 failed');
      }

      // Step 3: Save file location in DB
      const createFileResponse = await fetch('/api/file/createFile', {
        method: 'POST',
        body: JSON.stringify({ location: fileName }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!createFileResponse.ok) {
        throw new Error('Failed to create user file entry');
      }

      return createFileResponse.json();
    },
    // Don't invalidate, since typically we pace the file to the correct location in the UI
    onSuccess: () => {
      return;
    }
  });
};
