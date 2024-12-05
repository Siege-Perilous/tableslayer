import { gsChildDb } from '$lib/db/gs';
import { sceneTable, type SelectScene } from '$lib/db/gs/schema';
import { getFile, transformImage, uploadFileFromInput, type Thumb } from '../file';

export const getScenes = async (dbName: string): Promise<(SelectScene | (SelectScene & Thumb))[]> => {
  const db = gsChildDb(dbName);
  const scenes = await db.select().from(sceneTable).orderBy(sceneTable.order).all();

  if (!scenes || scenes.length === 0) {
    return [];
  }

  const scenesWithThumbs: (SelectScene | (SelectScene & Thumb))[] = [];

  for (const scene of scenes) {
    if (!scene.mapLocation) {
      scenesWithThumbs.push(scene);
      continue;
    }
    const thumb = await transformImage(scene.mapLocation, 'w=400,h=225,fit=cover,gravity=center');
    const sceneWithThumb = { ...scene, thumb };
    scenesWithThumbs.push(sceneWithThumb);
  }

  return scenesWithThumbs;
};

export const createScene = async (dbName: string, userId: string, name?: string, order?: number, file?: File) => {
  const gsdb = gsChildDb(dbName);
  let fileLocation = null;
  if (file) {
    const fileRow = await uploadFileFromInput(file, userId, 'map');
    const fileContent = await getFile(fileRow.fileId);
    fileLocation = fileContent.location;
  }
  try {
    await gsdb
      .insert(sceneTable)
      .values({
        name,
        order: order || 0,
        mapLocation: fileLocation
      })
      .execute();
  } catch (error) {
    console.error('Error creating scene', error);
    throw error;
  }
};
