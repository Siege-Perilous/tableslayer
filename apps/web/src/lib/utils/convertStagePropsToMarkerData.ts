import type { InsertMarker } from '$lib/db/app/schema';
import type { Marker } from '@tableslayer/ui';

/**
 * Converts a UI marker to a database marker format
 */
export const convertMarkerToDbFormat = (marker: Marker, sceneId: string): Partial<InsertMarker> => {
  if (!marker) {
    console.error('Attempted to convert undefined marker to DB format');
    return {};
  }

  return {
    id: marker.id,
    // Don't include sceneId in the returned object as it's passed separately
    name: marker.name || 'Unnamed Marker',
    text: marker.text,
    visibility: typeof marker.visibility === 'number' ? marker.visibility : 0,
    positionX: marker.position?.x || 0,
    positionY: marker.position?.y || 0,
    shape: marker.shape,
    size: typeof marker.size === 'number' ? marker.size : 0,
    imageLocation: marker.imageUrl || null,
    imageScale: marker.size || 1.0
  };
};

/**
 * Converts an array of UI markers to database format
 */
export const convertStageMarkersToDbFormat = (
  markers: Marker[] | undefined | null,
  sceneId: string
): Partial<InsertMarker>[] => {
  if (!markers || !Array.isArray(markers)) {
    return [];
  }

  return markers.map((marker) => convertMarkerToDbFormat(marker, sceneId));
};
