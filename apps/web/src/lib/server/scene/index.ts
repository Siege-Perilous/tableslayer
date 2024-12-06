import { gsChildDb } from '$lib/db/gs';
import { sceneTable, type SelectScene } from '$lib/db/gs/schema';
import { eq } from 'drizzle-orm';
import { getFile, transformImage, uploadFileFromInput, type Thumb } from '../file';

const reorderScenes = async (dbName: string) => {
  const gsDb = gsChildDb(dbName);
  const scenes = await gsDb.select().from(sceneTable).orderBy(sceneTable.order).all();

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const desiredOrder = i + 1;
    if (scene.order !== desiredOrder) {
      await gsDb.update(sceneTable).set({ order: desiredOrder }).where(eq(sceneTable.id, scene.id)).execute();
    }
  }
};

export const getScenes = async (dbName: string): Promise<(SelectScene | (SelectScene & Thumb))[]> => {
  const gsDb = gsChildDb(dbName);
  const scenes = await gsDb.select().from(sceneTable).orderBy(sceneTable.order).all();

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

  // Insert with the given order, or default to a large number to append at the end
  const initialOrder = order !== undefined ? order : 999999;

  await gsdb
    .insert(sceneTable)
    .values({
      name,
      order: initialOrder,
      mapLocation: fileLocation
    })
    .execute();

  // After insertion, reorder all scenes
  await reorderScenes(dbName);
};

export const getSceneFromOrder = async (
  dbName: string,
  order: number
): Promise<SelectScene | (SelectScene & Thumb)> => {
  const db = gsChildDb(dbName);
  const scene = await db.select().from(sceneTable).where(eq(sceneTable.order, order)).get();
  if (!scene) {
    throw new Error('Scene not found');
  }

  const thumb = scene.mapLocation
    ? await transformImage(scene.mapLocation, 'w=2000,h=2000,fit=scale-down,gravity=center')
    : null;
  const sceneWithThumb = { ...scene, thumb };

  if (!scene) {
    throw new Error('Scene not found');
  }

  return sceneWithThumb;
};

export const deleteScene = async (dbName: string, sceneId: string) => {
  const gsdb = gsChildDb(dbName);

  await gsdb.delete(sceneTable).where(eq(sceneTable.id, sceneId)).execute();

  // After deletion, reorder all scenes
  await reorderScenes(dbName);
};

export const adjustSceneOrder = async (dbName: string, sceneId: string, newOrder: number) => {
  const gsDb = gsChildDb(dbName);

  // First, update the target scene to the new order
  const updated = await gsDb.update(sceneTable).set({ order: newOrder }).where(eq(sceneTable.id, sceneId)).execute();

  if (updated.rowsAffected === 0) {
    throw new Error('Scene not found');
  }

  // Then reorder all scenes so that no two scenes share the same order
  // and their ordering is consecutive
  await reorderScenes(dbName);
};
