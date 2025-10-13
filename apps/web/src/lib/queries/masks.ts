import { mutationFactory } from '$lib/factories';
import { createQuery } from '@tanstack/svelte-query';

/**
 * Updates the fog of war mask for a scene with RLE data
 */
export const useUpdateFogMaskMutation = () => {
  return mutationFactory<{ sceneId: string; partyId: string; maskData: Uint8Array }, { success: boolean }, Error>({
    mutationKey: ['updateFogMask'],
    mutationFn: async ({ sceneId, partyId, maskData }) => {
      // Convert Uint8Array to regular array for JSON serialization
      const response = await fetch('/api/scenes/updateFogMask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          partyId,
          maskData: Array.from(maskData)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fog mask update failed:', errorText);
        throw new Error(`Failed to update fog mask: ${errorText}`);
      }

      return response.json();
    }
  });
};

/**
 * Updates the annotation mask with RLE data
 */
export const useUpdateAnnotationMaskMutation = () => {
  return mutationFactory<{ annotationId: string; partyId: string; maskData: Uint8Array }, { success: boolean }, Error>({
    mutationKey: ['updateAnnotationMask'],
    mutationFn: async ({ annotationId, partyId, maskData }) => {
      // Convert Uint8Array to regular array for JSON serialization
      const response = await fetch('/api/annotations/updateMask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotationId,
          partyId,
          maskData: Array.from(maskData)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update annotation mask');
      }

      return response.json();
    }
  });
};

/**
 * Fetches the fog mask data for a scene
 */
export const useFogMaskQuery = (sceneId: string | undefined) => {
  return createQuery(() => ({
    queryKey: ['fogMask', sceneId],
    queryFn: async () => {
      if (!sceneId) return null;

      const response = await fetch(`/api/scenes/getFogMask?sceneId=${sceneId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch fog mask');
      }

      const data = (await response.json()) as { maskData?: string };

      // Convert base64 back to Uint8Array if mask data exists
      if (data.maskData) {
        const binaryString = atob(data.maskData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }

      return null;
    },
    enabled: !!sceneId
  }));
};

/**
 * Fetches the annotation mask data for an annotation
 */
export const useAnnotationMaskQuery = (annotationId: string | undefined) => {
  return createQuery(() => ({
    queryKey: ['annotationMask', annotationId],
    queryFn: async () => {
      if (!annotationId) return null;

      const response = await fetch(`/api/annotations/getMask?annotationId=${annotationId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch annotation mask');
      }

      const data = (await response.json()) as { maskData?: string };

      // Convert base64 back to Uint8Array if mask data exists
      if (data.maskData) {
        const binaryString = atob(data.maskData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }

      return null;
    },
    enabled: !!annotationId
  }));
};
