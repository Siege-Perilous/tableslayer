import type { AnnotationLayerData, StageProps } from '@tableslayer/ui';
import { devError, devLog, devWarn } from './debug';
import { getPartyDataManager } from './yjs/stores';

// Track pending updates for different property paths
const pendingUpdates: Record<string, any> = {};
let updateScheduled = false;
let currentSceneId: string | null = null;

// Queue for updates that happen before Y.js is ready
const preYjsUpdatesQueue: Array<{ sceneId: string; updates: Record<string, any> }> = [];
let yjsReadyCheckTimer: ReturnType<typeof setTimeout> | null = null;

// Different throttle times for different property types
const MARKER_UPDATE_DELAY = 50; // Reduced from 150ms for faster marker sync
const UI_CONTROL_DELAY = 100; // Reduced from 250ms
const SCENE_UPDATE_DELAY = 200; // Reduced from 500ms

// Flag to enable immediate Y.js sync mode
let immediateYjsSyncEnabled = false;

export function enableImmediateYjsSync() {
  immediateYjsSyncEnabled = true;
}

export function disableImmediateYjsSync() {
  immediateYjsSyncEnabled = false;
}

export type PropertyPath = string[];

// Define which properties should be shared vs local per user
const LOCAL_ONLY_PROPERTIES = new Set([
  'scene.offset.x',
  'scene.offset.y',
  'scene.rotation', // Scene rotation and offset should be local only, but zoom should sync
  'activeLayer', // Active layer should be local per editor (fog tools, etc.)
  'annotations.activeLayer', // Active annotation layer should be local per editor
  'fogOfWar.tool.size' // Fog of war brush size should be local per editor
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
    // devLog('broadcaster', `Local-only property update: ${propertyPath.join('.')} = ${JSON.stringify(value)}`);
    applyUpdate(stageProps, propertyPath, value);
    // Don't trigger auto-save for local-only properties
    return;
  }

  // For shared properties, apply locally for immediate UI feedback
  // But Y.js will be the source of truth for other editors
  devLog('broadcaster', `Queueing shared property update: ${propertyPath.join('.')} = ${JSON.stringify(value)}`);

  // Special logging for map properties
  if (propertyPath[0] === 'map') {
    devLog('broadcaster', `🗺️ Map property update:`, {
      path: propertyPath.join('.'),
      value,
      type: typeof value
    });
  }

  applyUpdate(stageProps, propertyPath, value);

  // Check if PartyDataManager is available early
  const partyDataManager = getPartyDataManager();
  if (!partyDataManager) {
    devWarn('broadcaster', `PartyDataManager not available when queueing property update: ${propertyPath.join('.')}`);
    devWarn('broadcaster', 'This update will be applied locally but not synced to other editors!');
  }

  // If immediate sync is enabled and we have Y.js, sync immediately
  if (immediateYjsSyncEnabled && partyDataManager && currentSceneId) {
    devLog('broadcaster', '🚀 Immediate Y.js sync for:', propertyPath.join('.'), '=', value);

    // Get current scene data from Y.js
    const currentSceneData = partyDataManager.getSceneData(currentSceneId);
    if (currentSceneData) {
      // Update Y.js immediately with current stageProps
      devLog('broadcaster', '🚀 Calling updateSceneStageProps with immediate sync');
      // Clean local-only properties before sending to Y.js
      const cleanedStageProps = {
        ...stageProps,
        annotations: {
          ...stageProps.annotations,
          activeLayer: null, // activeLayer is local-only, not synchronized
          // Remove lineWidth from all layers to prevent rubber banding
          layers: stageProps.annotations.layers.map((layer) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { lineWidth, ...layerWithoutLineWidth } = layer;
            return layerWithoutLineWidth;
          })
        },
        fogOfWar: {
          ...stageProps.fogOfWar,
          tool: {
            ...stageProps.fogOfWar.tool
            // size is omitted to prevent syncing
          }
        }
      };
      partyDataManager.updateSceneStageProps(currentSceneId, cleanedStageProps as StageProps);
    } else {
      devWarn('broadcaster', '⚠️ No Y.js scene data found for immediate sync - scene may not be initialized');
    }
  } else {
    devLog('broadcaster', '⏭️ Immediate sync skipped:', {
      enabled: immediateYjsSyncEnabled,
      hasManager: !!partyDataManager,
      hasSceneId: !!currentSceneId
    });
  }

  // Store path and value for later batch update (for database save)
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

      // Now broadcast the batched updates via Y.js (only needed when immediate sync is disabled)
      if (!immediateYjsSyncEnabled && currentSceneId && Object.keys(updates).length > 0) {
        const partyDataManager = getPartyDataManager();
        if (!partyDataManager) {
          // Queue updates for when Y.js becomes ready
          devLog('broadcaster', 'Y.js not ready, queueing updates for later processing');
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
  devLog('broadcaster', `Property updates registered for scene: ${sceneId}`);
}

// Schedule periodic checks for Y.js readiness to process queued updates
function scheduleYjsReadyCheck() {
  if (yjsReadyCheckTimer) return; // Already scheduled

  yjsReadyCheckTimer = setTimeout(() => {
    const partyDataManager = getPartyDataManager();
    if (partyDataManager && preYjsUpdatesQueue.length > 0) {
      devLog('broadcaster', `Y.js now ready, processing ${preYjsUpdatesQueue.length} queued update batches`);

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
    devWarn('broadcaster', 'PartyDataManager not available for property updates - Y.js sync will not work!');
    devWarn('broadcaster', 'Updates that will be lost:', updates);
    return;
  }

  try {
    devLog(
      'broadcaster',
      `Broadcasting ${Object.keys(updates).length} property updates via Y.js for scene: ${sceneId}`
    );
    devLog('broadcaster', 'Property paths being updated:', Object.keys(updates));

    // Get current scene data from Y.js - this is the source of truth
    const currentSceneData = partyDataManager.getSceneData(sceneId);
    if (!currentSceneData) {
      devWarn('broadcaster', `No scene data found for scene: ${sceneId} - scene may not be initialized in Y.js yet`);
      devWarn('broadcaster', 'Updates that will be lost:', updates);
      return;
    }

    // IMPORTANT: Always use Y.js state as the base, not local stageProps
    // This prevents desync issues when multiple editors are making changes
    const updatedStageProps = JSON.parse(JSON.stringify(currentSceneData.stageProps));
    devLog('broadcaster', 'Using Y.js stageProps as base for updates:', updatedStageProps);

    // Apply all pending updates to the copy
    Object.values(updates).forEach(({ path, value }) => {
      devLog('broadcaster', `Applying update: ${path.join('.')} = ${JSON.stringify(value)}`);
      applyUpdate(updatedStageProps, path, value);
    });

    // Clean local-only properties before sending to Y.js
    const cleanedStageProps = {
      ...updatedStageProps,
      annotations: {
        ...updatedStageProps.annotations,
        activeLayer: null, // activeLayer is local-only, not synchronized
        // Remove lineWidth from all layers to prevent rubber banding
        layers: updatedStageProps.annotations.layers.map((layer: AnnotationLayerData) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { lineWidth, ...layerWithoutLineWidth } = layer;
          return layerWithoutLineWidth;
        })
      },
      fogOfWar: {
        ...updatedStageProps.fogOfWar,
        tool: {
          ...updatedStageProps.fogOfWar.tool
          // size is omitted to prevent syncing
        }
      }
    };

    // Update scene data via the PartyDataManager method
    partyDataManager.updateSceneStageProps(sceneId, cleanedStageProps as StageProps);

    devLog('broadcaster', `Y.js property updates applied for scene: ${sceneId}`);
  } catch (error) {
    devError('broadcaster', 'Error broadcasting property updates via Y.js:', error);
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
