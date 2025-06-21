import { db } from '$lib/db/app';
import { partyTable, sceneTable, type InsertScene, type SelectScene } from '$lib/db/app/schema';
import { and, asc, eq, gt, gte, lt, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getFile, transformImage, uploadFileFromInput, type Thumb } from '../file';
import { getPartyFromGameSessionId } from '../party';

export const reorderScenes = async (gameSessionId: string, sceneId: string, newPosition: number): Promise<void> => {
  // Step 1: First move all scenes to high numbers to avoid conflicts (add 10000)
  await db
    .update(sceneTable)
    .set({ order: sql`${sceneTable.order} + 10000` })
    .where(eq(sceneTable.gameSessionId, gameSessionId));

  // Step 2: Get all scenes for this session (now with high order numbers)
  const scenes = await db
    .select({ id: sceneTable.id, order: sceneTable.order })
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order));

  // Find the original position (1-based index) of the scene being moved
  const movedSceneIndex = scenes.findIndex((scene) => scene.id === sceneId);
  if (movedSceneIndex === -1) return; // Scene not found

  const originalPosition = movedSceneIndex + 1; // Convert to 1-based

  // No change in position
  if (originalPosition === newPosition) return;

  // Step 3: Create a new ordering by removing the scene and then inserting it at the new position

  // First, create a new array without the moved scene
  const newOrdering = scenes.filter((scene) => scene.id !== sceneId);

  // Then, insert the moved scene at the correct target index (using 0-based index for array insertion)
  const targetIndex = Math.min(Math.max(newPosition - 1, 0), newOrdering.length);
  newOrdering.splice(targetIndex, 0, scenes[movedSceneIndex]);

  // Step 4: Update all scenes with their new consecutive order numbers
  for (let i = 0; i < newOrdering.length; i++) {
    const scene = newOrdering[i];
    const newOrder = i + 1; // 1-based ordering

    await db.update(sceneTable).set({ order: newOrder }).where(eq(sceneTable.id, scene.id));
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
  // Removed cache busting timestamps to prevent flashing
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
    // Use mapThumbLocation if available, otherwise fall back to mapLocation
    const imageLocation = scene.mapThumbLocation || scene.mapLocation;

    if (!imageLocation) {
      scenesWithThumbs.push(scene);
      continue;
    }
    const thumb = await transformImage(imageLocation, 'w=400,h=225,fit=cover,gravity=center');
    // Removed cache busting timestamps to prevent flashing
    const sceneWithThumb = { ...scene, thumb };
    scenesWithThumbs.push(sceneWithThumb);
  }

  return scenesWithThumbs;
};

export const createScene = async (
  data: Omit<InsertScene, 'order'> & { order?: number }
): Promise<SelectScene | (SelectScene & Thumb)> => {
  const gameSessiondId = data.gameSessionId;
  let order = data.order;
  const name = data.name;

  // Default to a placeholder map
  let fileLocation = 'map/example1080.png';
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

  const sceneId = data.id ?? uuidv4();

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

  // If this is the first scene in the game session and the party doesn't have an active scene yet,
  // set this scene as the party's active scene
  if (scenes.length === 1 && !party.activeSceneId) {
    await setActiveSceneForParty(party.id, sceneId);
  }

  // Return the created scene with thumbnails
  return await getScene(sceneId);
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

  let thumb = null;
  if (scene.mapLocation) {
    thumb = await transformImage(scene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center');
  }
  const sceneWithThumb = { ...scene, thumb };

  return sceneWithThumb;
};

export const deleteScene = async (gameSessionId: string, sceneId: string): Promise<void> => {
  const sceneToDelete = await db
    .select({ order: sceneTable.order })
    .from(sceneTable)
    .where(and(eq(sceneTable.id, sceneId), eq(sceneTable.gameSessionId, gameSessionId)))
    .get();

  if (!sceneToDelete) {
    throw new Error('Scene not found');
  }

  // Get the party for this game session to check if this scene is active
  const party = await getPartyFromGameSessionId(gameSessionId);
  const isActiveScene = party.activeSceneId === sceneId;

  // Delete the scene
  await db.delete(sceneTable).where(and(eq(sceneTable.id, sceneId), eq(sceneTable.gameSessionId, gameSessionId)));

  // If this was the active scene, clear the party's activeSceneId
  if (isActiveScene) {
    await db.update(partyTable).set({ activeSceneId: null }).where(eq(partyTable.id, party.id));
  }

  const scenes = await db
    .select()
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order))
    .all();

  // Update all scene orders to ensure they are sequential without gaps
  for (let i = 0; i < scenes.length; i++) {
    const newOrder = i + 1; // Orders start at 1
    await db.update(sceneTable).set({ order: newOrder }).where(eq(sceneTable.id, scenes[i].id)).execute();
  }
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
      // Prevent overwriting existing mapLocation with the default example map
      if (
        key === 'mapLocation' &&
        value === 'map/example1080.png' &&
        scene.mapLocation &&
        scene.mapLocation !== 'map/example1080.png'
      ) {
        console.warn('Preventing overwrite of existing mapLocation with default example map');
        continue;
      }
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length > 0) {
    // Always update the lastUpdated timestamp when modifying scene data
    updateData.lastUpdated = new Date();
    await db.update(sceneTable).set(updateData).where(eq(sceneTable.id, sceneId)).execute();
  }
};

export const updateSceneMap = async (sceneId: string, userId: string, file: File) => {
  const fileRow = await uploadFileFromInput(file, userId, 'map');
  const fileContent = await getFile(fileRow.fileId);
  const fileLocation = fileContent.location;

  await db
    .update(sceneTable)
    .set({ mapLocation: fileLocation, lastUpdated: new Date() })
    .where(eq(sceneTable.id, sceneId))
    .execute();
};

// New party-level active scene function
export const getActiveSceneForParty = async (
  partyId: string
): Promise<SelectScene | ((SelectScene & Thumb) | null)> => {
  const party = await db.select().from(partyTable).where(eq(partyTable.id, partyId)).get();

  if (!party || !party.activeSceneId) {
    return null;
  }

  const activeScene = await getScene(party.activeSceneId);

  if (!activeScene) {
    return null;
  }

  return activeScene;
};

export const setActiveSceneForParty = async (partyId: string, sceneId: string): Promise<void> => {
  await db.update(partyTable).set({ activeSceneId: sceneId }).where(eq(partyTable.id, partyId));
};

export const duplicateScene = async (sceneId: string): Promise<SelectScene | ((SelectScene & Thumb) | null)> => {
  const originalScene = await db.select().from(sceneTable).where(eq(sceneTable.id, sceneId)).get();

  if (!originalScene) {
    throw new Error('Scene not found');
  }

  const { id: _, name, order, ...otherProps } = originalScene;
  const newSceneName = `${name} (Copy)`;
  const newSceneId = uuidv4();

  // createScene now returns the scene with thumbnails
  const newScene = await createScene({
    ...otherProps,
    id: newSceneId,
    name: newSceneName,
    order: order + 1 // Place it right after the original scene
  });

  return newScene;
};

/**
 * Update a scene's lastUpdated timestamp when markers are modified
 * This should be called whenever markers are added, updated, or deleted
 */
export const updateSceneTimestampForMarkerChange = async (sceneId: string): Promise<void> => {
  await db.update(sceneTable).set({ lastUpdated: new Date() }).where(eq(sceneTable.id, sceneId)).execute();
};
