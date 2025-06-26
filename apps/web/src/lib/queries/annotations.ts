import type { InsertAnnotation, SelectAnnotation } from '$lib/db/app/schema';
import { mutationFactory } from '$lib/factories';

// Client-side mutations
export const useUpsertAnnotationMutation = () => {
  return mutationFactory<InsertAnnotation, SelectAnnotation | null, Error>({
    mutationKey: ['upsertAnnotation'],
    mutationFn: async (annotation) => {
      const response = await fetch('/api/annotations/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation)
      });

      if (!response.ok) {
        throw new Error('Failed to upsert annotation');
      }

      return response.json();
    }
  });
};

export const useDeleteAnnotationMutation = () => {
  return mutationFactory<{ annotationId: string }, boolean, Error>({
    mutationKey: ['deleteAnnotation'],
    mutationFn: async ({ annotationId }) => {
      const response = await fetch(`/api/annotations/${annotationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete annotation');
      }

      return response.json();
    }
  });
};
