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
  return createMutation<
    { userId: string; fileId: string; location: string }, // Success Type
    Error, // Error Type
    { file: File; folder: string } // Variables Type
  >({
    mutationKey: ['uploadFile'],
    mutationFn: async ({ file, folder }) => {
      try {
        // Step 1: Generate a unique file name with the correct extension
        const fileId = uuidv4();
        const fileExtension = mime.getExtension(file.type);
        const fileName = `${folder}/${fileId}.${fileExtension}`;
        const contentType = file.type;

        // Step 2: Fetch Presigned URL

        const presignedUrlResponse = await fetch('/api/file/generatePresignedWriteUrl', {
          method: 'POST',
          body: JSON.stringify({ fileName, contentType }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!presignedUrlResponse.ok) {
          throw new Error('Failed to generate presigned URL');
        }

        const presignedData = await presignedUrlResponse.json();

        if (!presignedData.signedUrl) {
          throw new Error('Signed URL is missing from the response');
        }

        const signedUrl = presignedData.signedUrl;

        // Step 3: Upload the file to Cloudflare R2
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('File upload to Cloudflare R2 failed');
        }

        // Step 4: Save file location in the database
        const createFileResponse = await fetch('/api/file/createFile', {
          method: 'POST',
          body: JSON.stringify({ location: fileName }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!createFileResponse.ok) {
          throw new Error('Failed to create user file entry');
        }

        const fileDetails = await createFileResponse.json();

        return fileDetails;
      } catch (error) {
        console.error('Error in file upload mutation:', error);
        throw error;
      }
    },
    onError: (error) => {
      console.error('Upload failed:', error);
    },
    onSuccess: () => {
      console.log('File uploaded successfully:');
    }
  });
};
