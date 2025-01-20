import { gsChildDb } from '$lib/db/gs';
import { sceneTable, settingsTable, type SelectGameSettings, type SelectScene } from '$lib/db/gs/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
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

  // Default to a placeholder map
  let fileLocation = 'maps/01.jpeg';
  // Handle file upload
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

  const sceneId = uuidv4();

  await gsDb
    .insert(sceneTable)
    .values({
      id: sceneId,
      name,
      order,
      mapLocation: fileLocation
    })
    .execute();

  const scenes = await gsDb.select().from(sceneTable).all();

  if (scenes.length === 1) {
    await setActiveScene(dbName, sceneId);
  }
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
    ? await transformImage(scene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center')
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

  const currentScene = await gsDb
    .select({ currentOrder: sceneTable.order })
    .from(sceneTable)
    .where(eq(sceneTable.id, sceneId))
    .get();

  if (!currentScene) {
    throw new Error('Scene not found');
  }

  const { currentOrder } = currentScene;

  if (currentOrder === newOrder) {
    return;
  }

  if (newOrder > currentOrder) {
    // If moving down, decrement `order` for rows between `currentOrder + 1` and `newOrder`
    await gsDb
      .update(sceneTable)
      .set({ order: sql`${sceneTable.order} - 1` })
      .where(sql`${sceneTable.order} > ${currentOrder} AND ${sceneTable.order} <= ${newOrder}`)
      .execute();
  } else {
    // If moving up, increment `order` for rows between `newOrder` and `currentOrder - 1`
    await gsDb
      .update(sceneTable)
      .set({ order: sql`${sceneTable.order} + 1` })
      .where(sql`${sceneTable.order} >= ${newOrder} AND ${sceneTable.order} < ${currentOrder}`)
      .execute();
  }

  // Update the target scene's order to the new order
  await gsDb.update(sceneTable).set({ order: newOrder }).where(eq(sceneTable.id, sceneId)).execute();
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

export const updateSceneMap = async (dbName: string, sceneId: string, userId: string, file: File) => {
  const gsDb = gsChildDb(dbName);
  const fileRow = await uploadFileFromInput(file, userId, 'map');
  const fileContent = await getFile(fileRow.fileId);
  const fileLocation = fileContent.location;

  await gsDb.update(sceneTable).set({ mapLocation: fileLocation }).where(eq(sceneTable.id, sceneId)).execute();
};

export const setActiveScene = async (dbName: string, sceneId: string) => {
  const gsDb = gsChildDb(dbName);
  // check to see if a settings row exists, create or update it
  const settings = await gsDb.select().from(settingsTable).get();
  if (settings) {
    console.log('updating settings');
    await gsDb.update(settingsTable).set({ activeSceneId: sceneId }).execute();
  } else {
    console.log('inserting settings');
    await gsDb.insert(settingsTable).values({ activeSceneId: sceneId }).execute();
  }
};

export const getActiveScene = async (dbName: string): Promise<SelectScene | ((SelectScene & Thumb) | null)> => {
  const gsDb = gsChildDb(dbName);
  const settings = await gsDb.select().from(settingsTable).get();

  if (!settings || !settings.activeSceneId) {
    return null;
  }

  const activeScene = await gsDb.select().from(sceneTable).where(eq(sceneTable.id, settings.activeSceneId)).get();

  if (!activeScene) {
    return null;
  }

  const thumb = activeScene.mapLocation
    ? await transformImage(activeScene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center')
    : null;
  const activeSceneWithThumb = { ...activeScene, thumb };

  return activeSceneWithThumb;
};

export const getGameSettings = async (dbName: string): Promise<SelectGameSettings> => {
  const gsDb = gsChildDb(dbName);
  const settings = await gsDb.select().from(settingsTable).get();
  if (!settings) {
    throw new Error(`Settings not found for ${dbName}`);
  }
  return settings;
};

export const toggleGamePause = async (dbName: string) => {
  const gsDb = gsChildDb(dbName);
  const settings = await gsDb.select().from(settingsTable).get();
  if (settings) {
    await gsDb.update(settingsTable).set({ isPaused: !settings.isPaused }).execute();
  }
};
