import { db } from '$lib/db/app';
import { gameSessionTable, partyTable, sceneTable, type InsertScene, type SelectScene } from '$lib/db/app/schema';
import { and, asc, desc, eq, gt, gte, lt, lte, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { copySceneFile, getFile, getVideoUrl, transformImage, uploadFileFromInput, type Thumb } from '../file';
import { getPartyFromGameSessionId } from '../party';

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

export const reorderScenes = async (gameSessionId: string, sceneId: string, newPosition: number): Promise<void> => {
  try {
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
    if (movedSceneIndex === -1) {
      // If scene not found, restore original order numbers
      for (let i = 0; i < scenes.length; i++) {
        await db
          .update(sceneTable)
          .set({ order: i + 1 })
          .where(eq(sceneTable.id, scenes[i].id));
      }
      return;
    }

    const originalPosition = movedSceneIndex + 1; // Convert to 1-based

    // No change in position
    if (originalPosition === newPosition) {
      // Restore original order numbers
      for (let i = 0; i < scenes.length; i++) {
        await db
          .update(sceneTable)
          .set({ order: i + 1 })
          .where(eq(sceneTable.id, scenes[i].id));
      }
      return;
    }

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
  } catch (error) {
    // If any error occurs, try to restore original order
    const scenes = await db
      .select({ id: sceneTable.id })
      .from(sceneTable)
      .where(eq(sceneTable.gameSessionId, gameSessionId))
      .orderBy(asc(sceneTable.order));

    // Reset to simple consecutive ordering
    for (let i = 0; i < scenes.length; i++) {
      await db
        .update(sceneTable)
        .set({ order: i + 1 })
        .where(eq(sceneTable.id, scenes[i].id));
    }

    throw error;
  }
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
  const scenes = await db
    .select()
    .from(sceneTable)
    .where(eq(sceneTable.gameSessionId, gameSessionId))
    .orderBy(asc(sceneTable.order))
    .all();

  if (!scenes || scenes.length === 0) {
    return [];
  }

  // Check if any scene has an order > 1000 (indicating they got stuck with high numbers)
  const needsReordering = scenes.some((scene) => scene.order > 1000);

  if (needsReordering) {
    // Fix the ordering by resetting to consecutive numbers
    for (let i = 0; i < scenes.length; i++) {
      await db
        .update(sceneTable)
        .set({ order: i + 1 })
        .where(eq(sceneTable.id, scenes[i].id));
      scenes[i].order = i + 1; // Update local copy too
    }
  }

  const scenesWithThumbs: (SelectScene | (SelectScene & Thumb))[] = [];

  for (const scene of scenes) {
    // Remove fogOfWarMask if present to avoid serialization issues
    if ('fogOfWarMask' in scene) {
      delete (scene as Record<string, unknown>).fogOfWarMask;
    }

    // Use mapThumbLocation if available, otherwise fall back to mapLocation
    const imageLocation = scene.mapThumbLocation || scene.mapLocation;

    if (!imageLocation) {
      scenesWithThumbs.push(scene);
      continue;
    }

    // For video files, return direct URL without transformation
    if (isVideoFile(imageLocation)) {
      const thumb = getVideoUrl(imageLocation);
      const sceneWithThumb = { ...scene, thumb };
      scenesWithThumbs.push(sceneWithThumb);
    } else {
      const thumb = await transformImage(imageLocation, 'w=400,h=225,fit=cover,gravity=center');
      // Removed cache busting timestamps to prevent flashing
      const sceneWithThumb = { ...scene, thumb };
      scenesWithThumbs.push(sceneWithThumb);
    }
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
        const gridCountX = data.gridMapDefinedX;
        const gridCountY = data.gridMapDefinedY;

        // Display settings - Always use party defaults for TV size
        const displayResolutionX = party.defaultDisplayResolutionX;
        const displayResolutionY = party.defaultDisplayResolutionY;
        const displaySizeX = party.defaultDisplaySizeX;
        const displaySizeY = party.defaultDisplaySizeY;
        const gridSpacing = data.gridSpacing ?? party.defaultGridSpacing;
        const gridLineThickness = data.gridLineThickness ?? party.defaultLineThickness;

        let effectiveMapWidth = mapWidth;
        let effectiveMapHeight = mapHeight;

        // Calculate grid square sizes for both orientations
        const straightSquareWidth = mapWidth / gridCountX;
        const straightSquareHeight = mapHeight / gridCountY;
        const straightSquareDiff = Math.abs(straightSquareWidth - straightSquareHeight);

        const rotatedSquareWidth = mapHeight / gridCountX;
        const rotatedSquareHeight = mapWidth / gridCountY;
        const rotatedSquareDiff = Math.abs(rotatedSquareWidth - rotatedSquareHeight);

        console.log('[createScene] Rotation check:', {
          map: { width: mapWidth, height: mapHeight },
          grid: { countX: gridCountX, countY: gridCountY },
          straight: {
            squareWidth: straightSquareWidth,
            squareHeight: straightSquareHeight,
            diff: straightSquareDiff
          },
          rotated: {
            squareWidth: rotatedSquareWidth,
            squareHeight: rotatedSquareHeight,
            diff: rotatedSquareDiff
          }
        });

        // Choose orientation that gives most square grid cells
        if (rotatedSquareDiff < straightSquareDiff) {
          mapRotation = 90;
          effectiveMapWidth = mapHeight;
          effectiveMapHeight = mapWidth;
          console.log('[createScene] Rotating map 90 degrees for better grid square match');
        }

        // Calculate pixel pitch (inches per pixel)
        const pixelPitchX = displaySizeX / displayResolutionX;
        const pixelPitchY = displaySizeY / displayResolutionY;

        // Calculate grid spacing in pixels
        const gridSpacingX = gridSpacing / pixelPitchX;
        const gridSpacingY = gridSpacing / pixelPitchY;

        // Calculate total grid size in pixels
        const gridWidthPx = gridSpacingX * gridCountX + gridLineThickness / 2.0;
        const gridHeightPx = gridSpacingY * gridCountY + gridLineThickness / 2.0;

        // Calculate grid origin (matching shader logic)
        let gridOriginX: number;
        let gridOriginY: number;

        // If grid fits horizontally, center it; otherwise align left
        if (gridWidthPx <= displayResolutionX) {
          gridOriginX = (displayResolutionX - gridWidthPx) / 2.0;
        } else {
          gridOriginX = 0;
        }

        // If grid fits vertically, center it; otherwise align top
        // In UV space: Y=0 is bottom, Y=resolution is top
        // To start at top when overflowing: originY = resolution - gridSize
        if (gridHeightPx <= displayResolutionY) {
          gridOriginY = (displayResolutionY - gridHeightPx) / 2.0;
        } else {
          gridOriginY = displayResolutionY - gridHeightPx;
        }

        // Calculate how many pixels per map grid square in the original image
        const mapGridSquareWidth = effectiveMapWidth / gridCountX;
        const mapGridSquareHeight = effectiveMapHeight / gridCountY;

        // Calculate zoom so map grid squares match display grid squares
        // We want: mapGridSquare * zoom = gridSpacing (in pixels)
        const zoomX = gridSpacingX / mapGridSquareWidth;
        const zoomY = gridSpacingY / mapGridSquareHeight;

        // Use average for uniform scaling
        mapZoom = (zoomX + zoomY) / 2;

        console.log('[createScene] Zoom calculation:', {
          mapDimensions: { width: effectiveMapWidth, height: effectiveMapHeight },
          gridCount: { x: gridCountX, y: gridCountY },
          mapGridSquare: { width: mapGridSquareWidth, height: mapGridSquareHeight },
          gridSpacingPx: { x: gridSpacingX, y: gridSpacingY },
          zoom: { x: zoomX, y: zoomY, final: mapZoom },
          pixelPitch: { x: pixelPitchX, y: pixelPitchY },
          display: {
            resolution: { x: displayResolutionX, y: displayResolutionY },
            size: { x: displaySizeX, y: displaySizeY }
          }
        });

        // Calculate the scaled map dimensions
        const scaledMapWidth = effectiveMapWidth * mapZoom;
        const scaledMapHeight = effectiveMapHeight * mapZoom;

        // Position map so its top-left aligns with grid's top-left
        // For X: align map's left edge with grid's left edge
        mapOffsetX = gridOriginX - displayResolutionX / 2 + scaledMapWidth / 2;

        // For Y: Align map's top edge with grid's top edge
        // In WebGL coordinate system: -Y is up (toward top of screen), +Y is down
        // Screen top = -(resolution.y / 2), Screen bottom = +(resolution.y / 2)
        // Grid top in screen coords: gridOriginY (0 when overflow, centered value when fits)
        // Grid top in WebGL: -(resolution.y / 2) + gridOriginY
        // Map center position for top alignment: gridTopWebGL + (scaledMapHeight / 2)

        const gridTopWebGL = -(displayResolutionY / 2) + gridOriginY;
        mapOffsetY = gridTopWebGL + scaledMapHeight / 2;

        console.log('[createScene] Calculated alignment:', {
          gridOrigin: { x: gridOriginX, y: gridOriginY },
          gridSize: { widthPx: gridWidthPx, heightPx: gridHeightPx },
          gridTopWebGL,
          scaledMap: { width: scaledMapWidth, height: scaledMapHeight },
          targetGridSquareSize: gridSpacing + ' inches = ' + gridSpacingX + ' pixels',
          actualMapGridSquareSize: scaledMapWidth / gridCountX + ' x ' + scaledMapHeight / gridCountY + ' pixels',
          finalValues: {
            mapRotation,
            mapZoom,
            mapOffsetX,
            mapOffsetY
          }
        });
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

  // Remove fogOfWarMask if present to avoid serialization issues
  if ('fogOfWarMask' in scene) {
    delete (scene as Record<string, unknown>).fogOfWarMask;
  }

  let thumb = null;
  if (scene.mapLocation) {
    // For video files, return direct URL without transformation
    if (isVideoFile(scene.mapLocation)) {
      thumb = getVideoUrl(scene.mapLocation);
    } else {
      thumb = await transformImage(scene.mapLocation, 'w=3000,h=3000,fit=scale-down,gravity=center');
    }
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
      .orderBy(asc(sceneTable.order))
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

export const duplicateScene = async (sceneId: string): Promise<SelectScene | ((SelectScene & Thumb) | null)> => {
  const originalScene = await db.select().from(sceneTable).where(eq(sceneTable.id, sceneId)).get();

  if (!originalScene) {
    throw new Error('Scene not found');
  }

  const newSceneId = uuidv4();
  const newSceneName = `${originalScene.name} (Copy)`;
  const gameSessionId = originalScene.gameSessionId;

  // Copy map and thumbnail files if they exist and aren't the default
  let newMapLocation = originalScene.mapLocation;
  let newMapThumbLocation = originalScene.mapThumbLocation;

  // Copy map file if it exists and isn't the default example map
  if (originalScene.mapLocation && originalScene.mapLocation !== 'map/example1080.png') {
    try {
      newMapLocation = await copySceneFile(originalScene.mapLocation, newSceneId, 'map');
    } catch (error) {
      console.error('Error copying map file during scene duplication:', error);
      // Continue with original location if copy fails
    }
  }

  // Copy thumbnail file if it exists
  if (originalScene.mapThumbLocation) {
    try {
      newMapThumbLocation = await copySceneFile(originalScene.mapThumbLocation, newSceneId, 'thumbnail');
    } catch (error) {
      console.error('Error copying thumbnail file during scene duplication:', error);
      // Continue with original location if copy fails
    }
  }

  // Place the new scene right after the original scene
  const targetOrder = originalScene.order + 1;

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
    .orderBy(asc(sceneTable.order))
    .all();

  // Step 3: Reassign orders, inserting the new scene at the target position
  let currentOrder = 1;
  for (const scene of scenes) {
    if (currentOrder === targetOrder) {
      currentOrder++; // Skip this order for the new scene
    }
    await db.update(sceneTable).set({ order: currentOrder }).where(eq(sceneTable.id, scene.id)).execute();
    currentOrder++;
  }

  // The new scene will get the targetOrder
  const newOrder = targetOrder;

  // Copy all scene data except the fields we need to change
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _, name: __, order: ___, fogOfWarUrl: ____, lastUpdated: _____, ...sceneDataToCopy } = originalScene;

  // Insert the duplicated scene with all settings preserved
  await db
    .insert(sceneTable)
    .values({
      ...sceneDataToCopy,
      id: newSceneId,
      name: newSceneName,
      order: newOrder,
      mapLocation: newMapLocation,
      mapThumbLocation: newMapThumbLocation,
      fogOfWarUrl: null, // Reset fog of war URL for duplicated scene
      lastUpdated: new Date()
    })
    .execute();

  // Return the created scene with thumbnails
  return await getScene(newSceneId);
};

/**
 * Update a scene's lastUpdated timestamp when markers are modified
 * This should be called whenever markers are added, updated, or deleted
 */
export const updateSceneTimestampForMarkerChange = async (sceneId: string): Promise<void> => {
  await db.update(sceneTable).set({ lastUpdated: new Date() }).where(eq(sceneTable.id, sceneId)).execute();
};
