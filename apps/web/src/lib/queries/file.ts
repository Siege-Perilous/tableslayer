import { mutationFactory } from '$lib/factories';
import mime from 'mime';
import { v4 as uuidv4 } from 'uuid';

// Uploads fog to R2, does not create a user file entry because they are throwaway
export const useUploadFogFromBlobMutation = () => {
  return mutationFactory<{ blob: Blob; sceneId: string }, { location: string }, Error>({
    mutationKey: ['uploadFog'],
    mutationFn: async ({ blob, sceneId }) => {
      const fileName = `fog/${sceneId}.png`;
      const contentType = 'image/png';
      const file = new File([blob], fileName, { type: contentType });
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

      return { location: fileName };
    },
    // Don't invalidate.
    onSuccess: () => {
      return;
    }
  });
};

// Uploads a file to R2 and creates a user file entry
export const useUploadFileMutation = () => {
  return mutationFactory<{ file: File; folder: string }, { userId: string; fileId: number; location: string }, Error>({
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
