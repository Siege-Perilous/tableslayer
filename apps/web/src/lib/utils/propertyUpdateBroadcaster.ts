import type { StageProps } from '@tableslayer/ui';
import { getPartyDataManager } from './yjs/stores';

// Track pending updates for different property paths
const pendingUpdates: Record<string, any> = {};
let updateScheduled = false;
let currentSceneId: string | null = null;

// Different throttle times for different property types
const MARKER_UPDATE_DELAY = 150;
const UI_CONTROL_DELAY = 250;
const SCENE_UPDATE_DELAY = 500;

export type PropertyPath = string[];

// Define which properties should be shared vs local per user
const LOCAL_ONLY_PROPERTIES = new Set([
  'scene.offset.x',
  'scene.offset.y',
  'scene.rotation', // Scene rotation and offset should be local only, but zoom should sync
  'activeLayer' // Active layer should be local per editor (fog tools, etc.)
]);

// Check if a property path should be local-only
function isLocalOnlyProperty(propertyPath: PropertyPath): boolean {
  const pathString = propertyPath.join('.');
  return LOCAL_ONLY_PROPERTIES.has(pathString);
}

// Update specific property and schedule broadcast
export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: any,
  updateType: 'marker' | 'control' | 'scene' = 'control'
) {
  // Update the property immediately in the local state
  applyUpdate(stageProps, propertyPath, value);

  // Skip Y.js sync for local-only properties
  if (isLocalOnlyProperty(propertyPath)) {
    console.log(`Skipping Y.js sync for local-only property: ${propertyPath.join('.')}`);
    return;
  }

  // Store path and value for later batch update
  const pathKey = propertyPath.join('.');
  pendingUpdates[pathKey] = { path: propertyPath, value };

  // Schedule batch update if not already scheduled
  if (!updateScheduled) {
    updateScheduled = true;

    // Select throttle delay based on update type
    const delay =
      updateType === 'marker' ? MARKER_UPDATE_DELAY : updateType === 'scene' ? SCENE_UPDATE_DELAY : UI_CONTROL_DELAY;

    setTimeout(() => {
      // Make a copy of pending updates before clearing
      const updates = { ...pendingUpdates };

      // Clear pending updates and reset flag
      Object.keys(pendingUpdates).forEach((key) => delete pendingUpdates[key]);
      updateScheduled = false;

      // Now broadcast the updates via Y.js
      if (currentSceneId && Object.keys(updates).length > 0) {
        broadcastPropertyUpdatesViaYjs(updates, currentSceneId);
      }
    }, delay);
  }
}

// Helper to apply update at specific path
function applyUpdate(obj: any, path: PropertyPath, value: any) {
  const lastKey = path[path.length - 1];
  let current = obj;

  // Navigate to the parent object
  for (let i = 0; i < path.length - 1; i++) {
    if (current[path[i]] === undefined) {
      current[path[i]] = {};
    }
    current = current[path[i]];
  }

  current[lastKey] = value;
}

// Register the current scene ID for property updates
export function registerSceneForPropertyUpdates(sceneId: string) {
  currentSceneId = sceneId;
  console.log(`Property updates registered for scene: ${sceneId}`);
}

// Broadcast multiple property updates via Y.js
function broadcastPropertyUpdatesViaYjs(updates: Record<string, any>, sceneId: string) {
  const partyDataManager = getPartyDataManager();
  if (!partyDataManager) {
    console.warn('PartyDataManager not available for property updates');
    return;
  }

  try {
    console.log(`Broadcasting ${Object.keys(updates).length} property updates via Y.js for scene: ${sceneId}`);

    // Get current scene data from Y.js
    const currentSceneData = partyDataManager.getSceneData(sceneId);
    if (!currentSceneData) {
      console.warn(`No scene data found for scene: ${sceneId}`);
      return;
    }

    // Create a copy of stageProps to modify
    const updatedStageProps = JSON.parse(JSON.stringify(currentSceneData.stageProps));

    // Apply all pending updates to the copy
    Object.values(updates).forEach(({ path, value }) => {
      applyUpdate(updatedStageProps, path, value);
    });

    // Update scene data via the PartyDataManager method
    partyDataManager.updateSceneStageProps(sceneId, updatedStageProps);

    console.log(`Y.js property updates applied for scene: ${sceneId}`);
  } catch (error) {
    console.error('Error broadcasting property updates via Y.js:', error);
  }
}

export type PropertyUpdate = {
  path: PropertyPath;
  value: any;
  sceneId: string;
};

export type PropertyUpdates = {
  properties: Array<{ path: PropertyPath; value: any }>;
  sceneId: string;
};
