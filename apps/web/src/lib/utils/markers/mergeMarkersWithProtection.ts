import type { Marker } from '@tableslayer/ui';

/**
 * Merge markers while protecting ones being moved or edited
 * This prevents Y.js updates from overwriting local changes during drag operations
 *
 * @param localMarkers - Current local marker state
 * @param incomingMarkers - Markers from Y.js sync
 * @param beingMoved - Set of marker IDs currently being moved
 * @param beingEdited - Set of marker IDs currently being edited
 * @param recentlyDeleted - Set of marker IDs recently deleted locally
 * @returns Merged marker array with protections applied
 */
export function mergeMarkersWithProtection(
  localMarkers: Marker[],
  incomingMarkers: Marker[],
  beingMoved: Set<string>,
  beingEdited: Set<string>,
  recentlyDeleted: Set<string>
): Marker[] {
  const protectedMarkers = new Set([...beingMoved, ...beingEdited]);

  // Start with incoming markers as base, but exclude recently deleted ones
  const resultMap = new Map<string, Marker>();
  incomingMarkers.forEach((marker) => {
    // Skip markers that were recently deleted in this editor
    if (!recentlyDeleted.has(marker.id)) {
      resultMap.set(marker.id, marker);
    }
  });

  // Apply protections and add new markers
  for (const localMarker of localMarkers) {
    if (protectedMarkers.has(localMarker.id)) {
      if (resultMap.has(localMarker.id)) {
        // Marker exists in incoming - apply protection
        const incomingMarker = resultMap.get(localMarker.id)!;
        if (beingMoved.has(localMarker.id)) {
          // For moved markers, only preserve position from local state
          // This protects the marker being actively dragged in THIS editor
          resultMap.set(localMarker.id, {
            ...incomingMarker,
            position: localMarker.position
          });
        } else if (beingEdited.has(localMarker.id)) {
          // For edited markers, preserve entire local marker
          resultMap.set(localMarker.id, localMarker);
        }
      } else {
        // New marker not in incoming yet - add it
        resultMap.set(localMarker.id, localMarker);
      }
    }
  }

  return Array.from(resultMap.values());
}
