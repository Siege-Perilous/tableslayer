import { db } from '$lib/db/app';
import { gameSessionTable, partyTable, sceneTable, type InsertScene, type SelectScene } from '$lib/db/app/schema';
import { getAlignedMapTransform } from '@tableslayer/stage';
import { asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getFile, getVideoUrl, transformImage, uploadFileFromInput, type Thumb } from '../file';
import { getPartyFromGameSessionId } from '../party';

// Get all scene columns except fogOfWarMask for list queries (avoids transferring large blob data)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { fogOfWarMask: _fogOfWarMask, ...sceneColumnsWithoutMask } = getTableColumns(sceneTable);

// Lightweight scene list for menus (only id and name, no thumbnails or full data)
export type SceneListItem = { id: string; name: string };
export const getSceneList = async (gameSessionId: string): Promise<SceneListItem[]> => {
  const scenes = await db
    .select({ id: sceneTable.id, name: sceneTable.name })
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order), asc(sceneTable.id))
    .all();
  return scenes;
};

// Validates that a scene belongs to a specific party (scene -> gameSession -> party)
export const isSceneInParty = async (sceneId: string, partyId: string): Promise<boolean> => {
  const result = await db
    .select({ partyId: gameSessionTable.partyId })
    .from(sceneTable)
    .innerJoin(gameSessionTable, eq(sceneTable.gameSessionId, gameSessionTable.id))
    .where(eq(sceneTable.id, sceneId))
    .get();

  return result?.partyId === partyId;
};

const isVideoFile = (location: string): boolean => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.gif'];
  const lowerLocation = location.toLowerCase();
  return videoExtensions.some((ext) => lowerLocation.includes(ext));
};

export const getScene = async (sceneId: string): Promise<SelectScene | (SelectScene & Thumb)> => {
  const scene = await db.select().from(sceneTable).where(eq(sceneTable.id, sceneId)).get();

  if (!scene) {
    throw new Error('Scene not found');
  }

  // Remove fogOfWarMask if present to avoid serialization issues
  if ('fogOfWarMask' in scene) {
    delete (scene as Record<string, unknown>).fogOfWarMask;
  }

  if (!scene?.mapLocation) {
    return scene;
  }

  // For video files, return direct URL without transformation
  if (isVideoFile(scene.mapLocation)) {
    const thumb = getVideoUrl(scene.mapLocation);
    const sceneWithThumb = { ...scene, thumb };
    return sceneWithThumb;
  }

  const thumb = await transformImage(scene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center');
  const sceneWithThumb = { ...scene, thumb };
  return sceneWithThumb;
};

// New function to get only mask data for a scene
export const getSceneMaskData = async (sceneId: string): Promise<{ fogOfWarMask: string | null }> => {
  const result = await db
    .select({ fogOfWarMask: sceneTable.fogOfWarMask })
    .from(sceneTable)
    .where(eq(sceneTable.id, sceneId))
    .get();

  if (!result) {
    throw new Error('Scene not found');
  }

  return result;
};

export const getScenes = async (gameSessionId: string): Promise<(SelectScene | (SelectScene & Thumb))[]> => {
  // Select all columns except fogOfWarMask to avoid transferring large blob data
  const scenes = await db
    .select(sceneColumnsWithoutMask)
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order), asc(sceneTable.id))
    .all();

  if (!scenes || scenes.length === 0) {
    return [];
  }

  // Process thumbnails in parallel for better performance
  const scenesWithThumbs = await Promise.all(
    scenes.map(async (scene) => {
      // Use mapThumbLocation if available, otherwise fall back to mapLocation
      const imageLocation = scene.mapThumbLocation || scene.mapLocation;

      if (!imageLocation) {
        return scene as SelectScene | (SelectScene & Thumb);
      }

      // For video files, return direct URL without transformation
      if (isVideoFile(imageLocation)) {
        const thumb = getVideoUrl(imageLocation);
        return { ...scene, thumb } as SelectScene & Thumb;
      }

      const thumb = await transformImage(imageLocation, 'w=400,h=225,fit=cover,gravity=center');
      return { ...scene, thumb } as SelectScene & Thumb;
    })
  );

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

  // Order is a fractional sort key owned by the realtime session doc — callers
  // inserting between scenes compute it with orderBetween. Never shift existing
  // rows here: the doc would not see the change and the two would diverge.
  if (order === undefined) {
    const maxOrderScene = await db
      .select({ maxOrder: sql<number>`MAX(${sceneTable.order})` })
      .from(sceneTable)
      .where(eq(sceneTable.gameSessionId, gameSessiondId))
      .get();

    order = (maxOrderScene?.maxOrder ?? 0) + 1; // Default to the next available order
  }

  // Get the party's default settings
  const party = await getPartyFromGameSessionId(gameSessiondId);

  const sceneId = data.id ?? uuidv4();

  // Calculate map alignment if Fixed Count mode with dimensions
  let mapRotation = data.mapRotation ?? 0;
  let mapZoom = data.mapZoom ?? 1.0;
  let mapOffsetX = data.mapOffsetX ?? 0;
  let mapOffsetY = data.mapOffsetY ?? 0;

  // If grid dimensions are provided and we're in MapDefined mode, calculate alignment
  if (data.gridMode === 1 && data.gridMapDefinedX && data.gridMapDefinedY && fileLocation) {
    console.log('[createScene] Calculating map alignment for Fixed Count mode:', {
      gridMapDefinedX: data.gridMapDefinedX,
      gridMapDefinedY: data.gridMapDefinedY,
      mapLocation: fileLocation
    });

    // Get map dimensions using the existing transformImage function
    try {
      const imageResult = await transformImage(fileLocation, 'format=json');
      const originalWidth = imageResult.details.original.width || imageResult.details.width;
      const originalHeight = imageResult.details.original.height || imageResult.details.height;

      // The client will receive a scaled-down version (max 3000x3000)
      // Calculate the actual dimensions the client will see
      const maxDimension = 3000;
      let mapWidth = originalWidth;
      let mapHeight = originalHeight;

      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
        mapWidth = Math.round(originalWidth * scale);
        mapHeight = Math.round(originalHeight * scale);
        console.log(
          '[createScene] Image will be scaled from',
          originalWidth + 'x' + originalHeight,
          'to',
          mapWidth + 'x' + mapHeight
        );
      }

      if (mapWidth && mapHeight) {
        // Same aligned transform the client computes ("Reset map position"):
        // cardinal rotation matching the display orientation, locked zoom so
        // one grid cell spans gridSpacing inches on the TV, and an offset
        // that centers the map or top-left aligns it when it overflows
        const aligned = getAlignedMapTransform(
          {
            fixedGridCount: { x: data.gridMapDefinedX, y: data.gridMapDefinedY },
            spacing: data.gridSpacing ?? party.defaultGridSpacing
          },
          {
            resolution: { x: party.defaultDisplayResolutionX, y: party.defaultDisplayResolutionY },
            size: { x: party.defaultDisplaySizeX, y: party.defaultDisplaySizeY }
          },
          { width: mapWidth, height: mapHeight }
        );

        mapRotation = aligned.rotation;
        mapZoom = aligned.zoom;
        mapOffsetX = aligned.offset.x;
        mapOffsetY = aligned.offset.y;

        console.log('[createScene] Calculated alignment:', { mapRotation, mapZoom, mapOffsetX, mapOffsetY });
      }
    } catch (error) {
      console.error('[createScene] Error getting image dimensions:', error);
      // Continue without auto-alignment if we can't get dimensions
    }
  } else if (fileLocation && fileLocation !== 'map/example1080.png' && data.gridMode !== 1) {
    // For maps without grid dimensions (FillSpace mode), autofit the map to the scene
    // This matches the old client-side fit() behavior and only runs at scene creation
    console.log('[createScene] Autofitting map without grid dimensions:', {
      mapLocation: fileLocation
    });

    try {
      const imageResult = await transformImage(fileLocation, 'format=json');
      const originalWidth = imageResult.details.original.width || imageResult.details.width;
      const originalHeight = imageResult.details.original.height || imageResult.details.height;

      // The client will receive a scaled-down version (max 3000x3000)
      const maxDimension = 3000;
      let mapWidth = originalWidth;
      let mapHeight = originalHeight;

      if (originalWidth > maxDimension || originalHeight > maxDimension) {
        const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
        mapWidth = Math.round(originalWidth * scale);
        mapHeight = Math.round(originalHeight * scale);
        console.log(
          '[createScene] Image will be scaled from',
          originalWidth + 'x' + originalHeight,
          'to',
          mapWidth + 'x' + mapHeight
        );
      }

      if (mapWidth && mapHeight) {
        const displayResolutionX = party.defaultDisplayResolutionX;
        const displayResolutionY = party.defaultDisplayResolutionY;

        // Check if we should rotate the map to better fit the scene
        // Calculate the zoom we'd get in both orientations and choose the larger one
        let effectiveMapWidth = mapWidth;
        let effectiveMapHeight = mapHeight;

        // Calculate zoom for straight orientation
        const straightImageAspectRatio = mapWidth / mapHeight;
        const sceneAspectRatio = displayResolutionX / displayResolutionY;

        let straightZoom: number;
        if (straightImageAspectRatio > sceneAspectRatio) {
          // Image is wider relative to scene, so width constrains us
          straightZoom = displayResolutionX / mapWidth;
        } else {
          // Image is taller relative to scene, so height constrains us
          straightZoom = displayResolutionY / mapHeight;
        }

        // Calculate zoom for rotated orientation (swap width and height)
        const rotatedImageAspectRatio = mapHeight / mapWidth;
        let rotatedZoom: number;
        if (rotatedImageAspectRatio > sceneAspectRatio) {
          // Rotated image is wider relative to scene, so width constrains us
          rotatedZoom = displayResolutionX / mapHeight;
        } else {
          // Rotated image is taller relative to scene, so height constrains us
          rotatedZoom = displayResolutionY / mapWidth;
        }

        console.log('[createScene] Rotation check:', {
          map: { width: mapWidth, height: mapHeight },
          display: { width: displayResolutionX, height: displayResolutionY },
          straightImageAspectRatio,
          rotatedImageAspectRatio,
          sceneAspectRatio,
          zoom: {
            straight: straightZoom,
            rotated: rotatedZoom
          }
        });

        // Choose orientation that gives larger zoom (better fit / larger image)
        if (rotatedZoom > straightZoom) {
          mapRotation = 90;
          effectiveMapWidth = mapHeight;
          effectiveMapHeight = mapWidth;
          mapZoom = rotatedZoom;
          console.log('[createScene] Rotating map 90 degrees for better fit');
        } else {
          mapZoom = straightZoom;
        }

        // Keep map centered
        mapOffsetX = 0;
        mapOffsetY = 0;

        console.log('[createScene] Autofit calculation:', {
          mapDimensions: { width: effectiveMapWidth, height: effectiveMapHeight },
          displayResolution: { x: displayResolutionX, y: displayResolutionY },
          finalValues: {
            mapRotation,
            mapZoom,
            mapOffsetX,
            mapOffsetY
          }
        });
      }
    } catch (error) {
      console.error('[createScene] Error autofitting map:', error);
      // Continue with default values if we can't get dimensions
    }
  }

  await db
    .insert(sceneTable)
    .values({
      id: sceneId,
      gameSessionId: gameSessiondId,
      name,
      order,
      mapLocation: fileLocation,
      mapRotation,
      mapZoom,
      mapOffsetX,
      mapOffsetY,
      gridType: data.gridType ?? party.defaultGridType,
      gridMode: data.gridMode ?? 0,
      gridMapDefinedX: data.gridMapDefinedX ?? null,
      gridMapDefinedY: data.gridMapDefinedY ?? null,
      // New scenes are born with map-local coordinate semantics
      mapCoordVersion: 1,
      displaySizeX: party.defaultDisplaySizeX,
      displaySizeY: party.defaultDisplaySizeY,
      displayResolutionX: party.defaultDisplayResolutionX,
      displayResolutionY: party.defaultDisplayResolutionY,
      displayPaddingX: data.displayPaddingX ?? party.defaultDisplayPaddingX,
      displayPaddingY: data.displayPaddingY ?? party.defaultDisplayPaddingY,
      gridSpacing: data.gridSpacing ?? party.defaultGridSpacing,
      gridLineThickness: data.gridLineThickness ?? party.defaultLineThickness
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

// Helper to get the first available scene for a party (from most recently updated game session)
export const getFirstAvailableSceneForParty = async (partyId: string): Promise<SelectScene | null> => {
  // Get game sessions ordered by lastUpdated (most recent first)
  const gameSessions = await db
    .select()
    .from(gameSessionTable)
    .where(eq(gameSessionTable.partyId, partyId))
    .orderBy(desc(gameSessionTable.lastUpdated))
    .all();

  // Find the first game session that has scenes
  for (const gameSession of gameSessions) {
    const firstScene = await db
      .select()
      .from(sceneTable)
      .where(eq(sceneTable.gameSessionId, gameSession.id))
      .orderBy(asc(sceneTable.order), asc(sceneTable.id))
      .limit(1)
      .get();

    if (firstScene) {
      return firstScene;
    }
  }

  return null;
};

// New party-level active scene function with fallback for orphaned activeSceneId
export const getActiveSceneForParty = async (
  partyId: string
): Promise<SelectScene | ((SelectScene & Thumb) | null)> => {
  const party = await db.select().from(partyTable).where(eq(partyTable.id, partyId)).get();

  if (!party) {
    return null;
  }

  // If party has an activeSceneId, try to fetch it
  if (party.activeSceneId) {
    const sceneExists = await db
      .select({ id: sceneTable.id })
      .from(sceneTable)
      .where(eq(sceneTable.id, party.activeSceneId))
      .get();

    if (sceneExists) {
      const activeScene = await getScene(party.activeSceneId);
      return activeScene;
    }

    // Active scene no longer exists - find a fallback
    const fallbackScene = await getFirstAvailableSceneForParty(partyId);
    if (fallbackScene) {
      // Self-heal: update the party's activeSceneId
      await db.update(partyTable).set({ activeSceneId: fallbackScene.id }).where(eq(partyTable.id, partyId));
      return await getScene(fallbackScene.id);
    }

    // No scenes exist at all - clear the activeSceneId
    await db.update(partyTable).set({ activeSceneId: null }).where(eq(partyTable.id, partyId));
    return null;
  }

  return null;
};

export const setActiveSceneForParty = async (partyId: string, sceneId: string): Promise<void> => {
  await db.update(partyTable).set({ activeSceneId: sceneId }).where(eq(partyTable.id, partyId));
};

/**
 * Update a scene's lastUpdated timestamp when markers are modified
 * This should be called whenever markers are added, updated, or deleted
 */
export const updateSceneTimestampForMarkerChange = async (sceneId: string): Promise<void> => {
  await db.update(sceneTable).set({ lastUpdated: new Date() }).where(eq(sceneTable.id, sceneId)).execute();
};

/**
 * Update a scene's lastUpdated timestamp when lights are modified
 * This should be called whenever lights are added, updated, or deleted
 */
export const updateSceneTimestampForLightChange = async (sceneId: string): Promise<void> => {
  await db.update(sceneTable).set({ lastUpdated: new Date() }).where(eq(sceneTable.id, sceneId)).execute();
};
