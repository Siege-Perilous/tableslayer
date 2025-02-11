import { db } from '$lib/db/app';
import { gameSessionTable, sceneTable, type InsertScene, type SelectScene } from '$lib/db/app/schema';
import { and, asc, eq, gt, gte, lt, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getFile, transformImage, uploadFileFromInput, type Thumb } from '../file';
import { getGameSession, updateGameSession } from '../gameSession';
import { getPartyFromGameSessionId } from '../party';

const reorderScenes = async (gameSessionId: string) => {
  const scenes = await db
    .select()
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order))
    .all();

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const desiredOrder = i + 1;
    if (scene.order !== desiredOrder) {
      await db.update(sceneTable).set({ order: desiredOrder }).where(eq(sceneTable.id, scene.id)).execute();
    }
  }
};

export const getScene = async (sceneId: string): Promise<SelectScene | (SelectScene & Thumb)> => {
  const scene = await db.select().from(sceneTable).where(eq(sceneTable.id, sceneId)).get();

  if (!scene) {
    throw new Error('Scene not found');
  }

  if (!scene?.mapLocation) {
    return scene;
  }

  const thumb = await transformImage(scene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center');
  const sceneWithThumb = { ...scene, thumb };
  return sceneWithThumb;
};

export const getScenes = async (gameSessionId: string): Promise<(SelectScene | (SelectScene & Thumb))[]> => {
  const scenes = await db
    .select()
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order))
    .all();

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

export const createScene = async (data: Omit<InsertScene, 'order'> & { order?: number }) => {
  const gameSessiondId = data.gameSessionId;
  let order = data.order;
  const name = data.name;

  // Default to a placeholder map
  let fileLocation = 'maps/01.jpeg';
  // Handle file upload

  if (data.mapLocation) {
    fileLocation = data.mapLocation;
  }

  if (order === undefined) {
    const maxOrderScene = await db
      .select({ maxOrder: sql<number>`MAX(${sceneTable.order})` })
      .from(sceneTable)
      .where(eq(sceneTable.gameSessionId, gameSessiondId))
      .get();

    order = (maxOrderScene?.maxOrder ?? 0) + 1; // Default to the next available order
  }

  const scenesToShift = await db
    .select({ id: sceneTable.id, currentOrder: sceneTable.order })
    .from(sceneTable)
    .where(and(eq(sceneTable.gameSessionId, gameSessiondId), gte(sceneTable.order, order)))
    .orderBy(sql`${sceneTable.order} DESC`) // Process from highest order to lowest
    .all();

  for (const { id, currentOrder } of scenesToShift) {
    await db
      .update(sceneTable)
      .set({ order: currentOrder + 1 }) // Increment order
      .where(eq(sceneTable.id, id))
      .execute();
  }

  // Get the party's default settings
  const party = await getPartyFromGameSessionId(gameSessiondId);

  const sceneId = uuidv4();

  await db
    .insert(sceneTable)
    .values({
      id: sceneId,
      gameSessionId: gameSessiondId,
      name,
      order,
      mapLocation: fileLocation,
      gridType: party.defaultGridType,
      displaySizeX: party.defaultDisplaySizeX,
      displaySizeY: party.defaultDisplaySizeY,
      displayResolutionX: party.defaultDisplayResolutionX,
      displayResolutionY: party.defaultDisplayResolutionY,
      displayPaddingX: party.defaultDisplayPaddingX,
      displayPaddingY: party.defaultDisplayPaddingY,
      gridSpacing: party.defaultGridSpacing,
      gridLineThickness: party.defaultLineThickness
    })
    .execute();

  const scenes = await db.select().from(sceneTable).where(eq(sceneTable.gameSessionId, gameSessiondId)).all();

  if (scenes.length === 1) {
    await setActiveScene(gameSessiondId, sceneId);
  }
};

export const getSceneFromOrder = async (
  gameSessiondId: string,
  order: number
): Promise<SelectScene | (SelectScene & Thumb)> => {
  const scene = await db
    .select()
    .from(sceneTable)
    .where(and(eq(sceneTable.gameSessionId, gameSessiondId), eq(sceneTable.order, order)))
    .get();
  if (!scene) {
    throw new Error('Scene not found');
  }

  const thumb = scene.mapLocation
    ? await transformImage(scene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center')
    : null;
  const sceneWithThumb = { ...scene, thumb };

  return sceneWithThumb;
};

export const deleteScene = async (gameSessionId: string, sceneId: string) => {
  // Check if the scene being deleted is the active scene
  const gameSession = await db
    .select({ activeSceneId: gameSessionTable.activeSceneId })
    .from(gameSessionTable)
    .where(eq(gameSessionTable.id, gameSessionId))
    .get();

  // Delete the scene
  await db.delete(sceneTable).where(eq(sceneTable.id, sceneId)).execute();

  // If the deleted scene was the active scene, update activeSceneId to NULL or another scene
  if (gameSession?.activeSceneId === sceneId) {
    // Try to find another scene to set as active
    const nextScene = await db
      .select({ id: sceneTable.id })
      .from(sceneTable)
      .where(eq(sceneTable.gameSessionId, gameSessionId))
      .orderBy(asc(sceneTable.order)) // Pick the next lowest order scene
      .limit(1)
      .get();

    await db
      .update(gameSessionTable)
      .set({ activeSceneId: nextScene ? nextScene.id : null }) // Set to another scene if available, otherwise NULL
      .where(eq(gameSessionTable.id, gameSessionId))
      .execute();
  }

  // Reorder the remaining scenes
  await reorderScenes(gameSessionId);
};

export const adjustSceneOrder = async (gameSessionId: string, sceneId: string, newOrder: number) => {
  const currentScene = await db
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
    await db
      .update(sceneTable)
      .set({ order: sql`${sceneTable.order} - 1` })
      .where(
        and(
          eq(sceneTable.gameSessionId, gameSessionId),
          gt(sceneTable.order, currentOrder),
          lte(sceneTable.order, newOrder)
        )
      )
      .execute();
  } else {
    // If moving up, increment `order` for rows between `newOrder` and `currentOrder - 1`
    await db
      .update(sceneTable)
      .set({ order: sql`${sceneTable.order} + 1` })
      .where(
        and(
          eq(sceneTable.gameSessionId, gameSessionId),
          gte(sceneTable.order, newOrder),
          lt(sceneTable.order, currentOrder)
        )
      )
      .execute();
  }

  // Update the target scene's order to the new order
  await db.update(sceneTable).set({ order: newOrder }).where(eq(sceneTable.id, sceneId)).execute();
};

export const updateScene = async (
  userId: string,
  sceneId: string,
  details: Partial<Record<keyof (typeof sceneTable)['_']['columns'], unknown>> & { file?: File }
) => {
  const scene = await db.select().from(sceneTable).where(eq(sceneTable.id, sceneId)).get();

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
    await db.update(sceneTable).set(updateData).where(eq(sceneTable.id, sceneId)).execute();
  }
};

export const updateSceneMap = async (sceneId: string, userId: string, file: File) => {
  const fileRow = await uploadFileFromInput(file, userId, 'map');
  const fileContent = await getFile(fileRow.fileId);
  const fileLocation = fileContent.location;

  await db.update(sceneTable).set({ mapLocation: fileLocation }).where(eq(sceneTable.id, sceneId)).execute();
};

export const setActiveScene = async (gameSessionId: string, sceneId: string) => {
  await updateGameSession(gameSessionId, { activeSceneId: sceneId });
};

export const getActiveScene = async (gameSessiondId: string): Promise<SelectScene | ((SelectScene & Thumb) | null)> => {
  const gameSession = await getGameSession(gameSessiondId);
  const activeSceneId = gameSession.activeSceneId;
  if (!activeSceneId) {
    return null;
  }

  const activeScene = await getScene(activeSceneId);

  if (!activeScene) {
    return null;
  }

  return activeScene;
};

export const toggleGamePause = async (gameSessionId: string) => {
  const gameSession = await getGameSession(gameSessionId);
  const newPausedState = !gameSession.isPaused;
  await updateGameSession(gameSessionId, { isPaused: newPausedState });
};
