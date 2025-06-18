import type { StageProps } from '@tableslayer/ui';
import { getPartyDataManager } from './yjs/stores';

// Track pending updates for different property paths
const pendingUpdates: Record<string, any> = {};
let updateScheduled = false;
let currentSceneId: string | null = null;

// Queue for updates that happen before Y.js is ready
const preYjsUpdatesQueue: Array<{ sceneId: string; updates: Record<string, any> }> = [];
let yjsReadyCheckTimer: ReturnType<typeof setTimeout> | null = null;

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

// Callback function for user changes (to trigger auto-save)
let onUserChangeCallback: (() => void) | null = null;

export function setUserChangeCallback(callback: () => void) {
  onUserChangeCallback = callback;
}

// Update specific property and schedule broadcast
export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: any,
  updateType: 'marker' | 'control' | 'scene' = 'control'
) {
  // Skip Y.js sync for local-only properties but still apply them locally
  if (isLocalOnlyProperty(propertyPath)) {
    console.log(`Local-only property update: ${propertyPath.join('.')} = ${JSON.stringify(value)}`);
    applyUpdate(stageProps, propertyPath, value);
    return;
  }

  // For shared properties, apply locally for immediate UI feedback
  // But Y.js will be the source of truth for other editors
  console.log(`Queueing shared property update: ${propertyPath.join('.')} = ${JSON.stringify(value)}`);
  applyUpdate(stageProps, propertyPath, value);

  // Check if PartyDataManager is available early
  const partyDataManager = getPartyDataManager();
  if (!partyDataManager) {
    console.warn(`PartyDataManager not available when queueing property update: ${propertyPath.join('.')}`);
    console.warn('This update will be applied locally but not synced to other editors!');
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
        const partyDataManager = getPartyDataManager();
        if (!partyDataManager) {
          // Queue updates for when Y.js becomes ready
          console.log('Y.js not ready, queueing updates for later processing');
          preYjsUpdatesQueue.push({ sceneId: currentSceneId, updates });
          scheduleYjsReadyCheck();
        } else {
          broadcastPropertyUpdatesViaYjs(updates, currentSceneId);
        }
      }
    }, delay);
  }

  // Trigger user change callback for auto-save (only for shared properties)
  if (onUserChangeCallback && !isLocalOnlyProperty(propertyPath)) {
    onUserChangeCallback();
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

// Schedule periodic checks for Y.js readiness to process queued updates
function scheduleYjsReadyCheck() {
  if (yjsReadyCheckTimer) return; // Already scheduled

  yjsReadyCheckTimer = setTimeout(() => {
    const partyDataManager = getPartyDataManager();
    if (partyDataManager && preYjsUpdatesQueue.length > 0) {
      console.log(`Y.js now ready, processing ${preYjsUpdatesQueue.length} queued update batches`);

      // Process all queued updates
      const queuedUpdates = [...preYjsUpdatesQueue];
      preYjsUpdatesQueue.length = 0; // Clear the queue

      queuedUpdates.forEach(({ sceneId, updates }) => {
        broadcastPropertyUpdatesViaYjs(updates, sceneId);
      });
    }

    // Continue checking if there are still queued updates
    yjsReadyCheckTimer = null;
    if (preYjsUpdatesQueue.length > 0) {
      scheduleYjsReadyCheck();
    }
  }, 500); // Check every 500ms
}

// Export function to manually trigger processing of queued updates (called when Y.js initializes)
export function flushQueuedPropertyUpdates() {
  if (yjsReadyCheckTimer) {
    clearTimeout(yjsReadyCheckTimer);
    yjsReadyCheckTimer = null;
  }
  scheduleYjsReadyCheck();
}

// Broadcast multiple property updates via Y.js
function broadcastPropertyUpdatesViaYjs(updates: Record<string, any>, sceneId: string) {
  const partyDataManager = getPartyDataManager();
  if (!partyDataManager) {
    console.warn('PartyDataManager not available for property updates - Y.js sync will not work!');
    console.warn('Updates that will be lost:', updates);
    return;
  }

  try {
    console.log(`Broadcasting ${Object.keys(updates).length} property updates via Y.js for scene: ${sceneId}`);
    console.log('Property paths being updated:', Object.keys(updates));

    // Get current scene data from Y.js - this is the source of truth
    const currentSceneData = partyDataManager.getSceneData(sceneId);
    if (!currentSceneData) {
      console.warn(`No scene data found for scene: ${sceneId} - scene may not be initialized in Y.js yet`);
      console.warn('Updates that will be lost:', updates);
      return;
    }

    // IMPORTANT: Always use Y.js state as the base, not local stageProps
    // This prevents desync issues when multiple editors are making changes
    const updatedStageProps = JSON.parse(JSON.stringify(currentSceneData.stageProps));
    console.log('Using Y.js stageProps as base for updates:', updatedStageProps);

    // Apply all pending updates to the copy
    Object.values(updates).forEach(({ path, value }) => {
      console.log(`Applying update: ${path.join('.')} = ${JSON.stringify(value)}`);
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
