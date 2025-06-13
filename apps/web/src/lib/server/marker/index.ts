import { db } from '$lib/db/app';
import { markerTable, type SelectMarker } from '$lib/db/app/schema';
import { asc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { transformImage, type Thumb } from '../file';

export const getMarkersForScene = async (sceneId: string) => {
  const markers = await db
    .select()
    .from(markerTable)
    .where(eq(markerTable.sceneId, sceneId))
    .orderBy(asc(markerTable.title));

  const markersWithThumb: (SelectMarker & Partial<Thumb>)[] = [];
  for (const marker of markers) {
    if (marker.imageLocation) {
      const thumb = await transformImage(marker.imageLocation, 'w=512,h=512,fit=cover,gravity=auto');
      markersWithThumb.push({ ...marker, thumb });
    } else {
      // For markers without images, still include them in the result
      markersWithThumb.push({ ...marker });
    }
  }
  return markersWithThumb;
};

export const createMarker = async (markerData: Partial<SelectMarker>, sceneId: string): Promise<SelectMarker> => {
  const id = markerData.id || uuidv4();

  // Ensure note field is properly handled for JSON column
  const values = {
    ...markerData,
    sceneId,
    id,
    note: markerData.note === null ? null : markerData.note
  };

  console.log('Database insert values:', values);

  const marker = await db.insert(markerTable).values(values).returning().get();

  return marker;
};

export const updateMarker = async (markerId: string, markerData: Partial<SelectMarker>): Promise<SelectMarker> => {
  const marker = await db.update(markerTable).set(markerData).where(eq(markerTable.id, markerId)).returning().get();

  return marker;
};

export const deleteMarker = async (markerId: string): Promise<void> => {
  await db.delete(markerTable).where(eq(markerTable.id, markerId));
};
