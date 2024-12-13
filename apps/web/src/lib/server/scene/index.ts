import { gsChildDb } from '$lib/db/gs';
import { sceneTable, type SelectScene } from '$lib/db/gs/schema';
import { eq, sql } from 'drizzle-orm';
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
  const gsDb = gsChildDb(dbName);

  // Handle file upload
  let fileLocation = null;
  if (file) {
    const fileRow = await uploadFileFromInput(file, userId, 'map');
    const fileContent = await getFile(fileRow.fileId);
    fileLocation = fileContent.location;
  }

  if (order === undefined) {
    const maxOrderScene = await gsDb
      .select({ maxOrder: sql<number>`MAX(${sceneTable.order})` })
      .from(sceneTable)
      .get();

    order = (maxOrderScene?.maxOrder ?? 0) + 1; // Default to the next available order
  }

  const scenesToShift = await gsDb
    .select({ id: sceneTable.id, currentOrder: sceneTable.order })
    .from(sceneTable)
    .where(sql`${sceneTable.order} >= ${order}`)
    .orderBy(sql`${sceneTable.order} DESC`) // Process from highest order to lowest
    .all();

  for (const { id, currentOrder } of scenesToShift) {
    await gsDb
      .update(sceneTable)
      .set({ order: currentOrder + 1 }) // Increment order
      .where(eq(sceneTable.id, id))
      .execute();
  }

  await gsDb
    .insert(sceneTable)
    .values({
      name,
      order,
      mapLocation: fileLocation
    })
    .execute();
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

export const updateScene = async (
  dbName: string,
  userId: string,
  sceneId: string,
  details: Partial<Record<keyof (typeof sceneTable)['_']['columns'], unknown>> & { file?: File }
) => {
  const gsDb = gsChildDb(dbName);
  const scene = await gsDb.select().from(sceneTable).where(eq(sceneTable.id, sceneId)).get();

  if (!scene) {
    throw new Error('Scene not found');
  }

  let fileLocation = scene.mapLocation;
  if (details.file) {
    const fileRow = await uploadFileFromInput(details.file, userId, 'map');
    const fileContent = await getFile(fileRow.fileId);
    fileLocation = fileContent.location;

    // Include the map location in details
    details.mapLocation = fileLocation;
  }

  // Construct update object dynamically
  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(details)) {
    if (value !== undefined) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length > 0) {
    await gsDb.update(sceneTable).set(updateData).where(eq(sceneTable.id, sceneId)).execute();
  }
};
