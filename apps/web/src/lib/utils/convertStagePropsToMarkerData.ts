import type { InsertMarker } from '$lib/db/app/schema';
import type { Marker } from '@tableslayer/ui';
import { devError } from './debug';
import { extractLocationFromUrl } from './extractLocationFromUrl';

/**
 * Converts a UI marker to a database marker format
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const convertMarkerToDbFormat = (marker: Marker, sceneId: string): Partial<InsertMarker> => {
  if (!marker) {
    devError('converter', 'Attempted to convert undefined marker to DB format');
    return {};
  }

  // Extract the image location from the URL if it exists
  let imageLocation = null;
  if (marker.imageUrl) {
    imageLocation = extractLocationFromUrl(marker.imageUrl) || `marker/${marker.id}`;
  }

  return {
    id: marker.id,
    // Don't include sceneId in the returned object as it's passed separately
    title: marker.title || 'Unnamed Marker',
    label: marker.label,
    visibility: typeof marker.visibility === 'number' ? marker.visibility : 0,
    positionX: marker.position?.x || 0,
    positionY: marker.position?.y || 0,
    shape: marker.shape,
    size: typeof marker.size === 'number' ? marker.size : 0,
    imageLocation: imageLocation,
    imageScale: marker.size || 1.0,
    shapeColor: marker.shapeColor || '#FFFFFF',
    note: marker.note,
    pinnedTooltip: marker.pinnedTooltip ?? false
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
