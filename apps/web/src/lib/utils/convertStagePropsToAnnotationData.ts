import type { InsertAnnotation } from '$lib/db/app/schema';
import type { AnnotationLayerData } from '@tableslayer/ui';
import { devError } from './debug';
import { extractLocationFromUrl } from './extractLocationFromUrl';

/**
 * Converts a UI annotation layer to a database annotation format
 */
export const convertAnnotationToDbFormat = (
  annotation: AnnotationLayerData,
  sceneId: string,
  order: number
): InsertAnnotation => {
  if (!annotation) {
    devError('converter', 'Attempted to convert undefined annotation to DB format');
    throw new Error('Cannot convert undefined annotation');
  }

  // Extract the URL location if it exists
  let url = annotation.url || null;
  if (url && url.startsWith('https://')) {
    // If it's a full URL, extract just the location part
    const location = extractLocationFromUrl(url);
    if (location) {
      url = location;
    }
  }

  return {
    id: annotation.id,
    sceneId: sceneId,
    name: annotation.name || 'New Annotation',
    opacity: typeof annotation.opacity === 'number' ? annotation.opacity : 1.0,
    color: annotation.color || '#FF0000',
    url: url,
    visibility: typeof annotation.visibility === 'number' ? annotation.visibility : 1,
    order: order,
    effectType: annotation.effect?.type ?? null
  };
};

/**
 * Converts an array of UI annotation layers to database format
 */
export const convertStageAnnotationsToDbFormat = (
  annotations: AnnotationLayerData[] | undefined | null,
  sceneId: string
): InsertAnnotation[] => {
  if (!annotations || !Array.isArray(annotations)) {
    return [];
  }

  return annotations.map((annotation, index) => convertAnnotationToDbFormat(annotation, sceneId, index));
};
