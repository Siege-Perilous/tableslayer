import type { StageProps } from '@tableslayer/ui';
import type { Socket } from 'socket.io-client';

// Track pending updates for different property paths
const pendingUpdates: Record<string, any> = {};
let updateScheduled = false;

// Different throttle times for different property types
const MARKER_UPDATE_DELAY = 150;
const UI_CONTROL_DELAY = 250;
const SCENE_UPDATE_DELAY = 500;

export type PropertyPath = string[];

// Store collaborative provider reference
let collaborativeProvider: any = null;
let isUpdatingFromCollabGetter: (() => boolean) | null = null;
let isWindowFocusedGetter: (() => boolean) | null = null;

export function setCollaborativeProvider(
  provider: any,
  isUpdatingFromCollabGetterFn: () => boolean,
  isWindowFocusedGetterFn: () => boolean
) {
  collaborativeProvider = provider;
  isUpdatingFromCollabGetter = isUpdatingFromCollabGetterFn;
  isWindowFocusedGetter = isWindowFocusedGetterFn;
}

export function getCollaborativeUpdateState(): boolean {
  return isUpdatingFromCollabGetter?.() ?? false;
}

// Update specific property and schedule broadcast
export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: any,
  updateType: 'marker' | 'control' | 'scene' = 'control'
) {
  // If we have a collaborative provider, window is focused, and we're not updating from collaborative state, use Y.js
  if (
    collaborativeProvider &&
    isUpdatingFromCollabGetter &&
    isWindowFocusedGetter &&
    !isUpdatingFromCollabGetter() &&
    isWindowFocusedGetter()
  ) {
    // console.log('queuePropertyUpdate: Using collaborative provider for', propertyPath, value);

    // Check if this is a marker property update (path like ['marker', 'markers', index, property])
    if (propertyPath.length === 4 && propertyPath[0] === 'marker' && propertyPath[1] === 'markers') {
      // Find the marker ID from the current state and use the specific marker update method
      const markerIndex = parseInt(propertyPath[2]);
      const property = propertyPath[3];
      const marker = stageProps.marker.markers[markerIndex];
      if (marker && marker.id) {
        collaborativeProvider.updateMarkerProperty(marker.id, property, value);
        return;
      }
    }

    collaborativeProvider.updateStageProperty(propertyPath, value);
    return;
  }

  // Fallback to original behavior
  // console.log('queuePropertyUpdate: Using fallback update for', propertyPath, value);
  // Update the property immediately in the local state
  applyUpdate(stageProps, propertyPath, value);

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

      // Now broadcast the updates
      if (pendingSocketUpdate && socket && sceneId) {
        broadcastPropertyUpdates(socket, updates, sceneId);
        pendingSocketUpdate();
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

// Store socket update function and socket when available
let pendingSocketUpdate: (() => void) | null = null;
let socket: Socket | null = null;
let sceneId: string | null = null;

export function registerSocketUpdate(
  socketUpdateFn: () => void,
  socketInstance: Socket | null,
  currentSceneId: string
) {
  pendingSocketUpdate = socketUpdateFn;
  socket = socketInstance;
  sceneId = currentSceneId;
}

// Broadcast multiple property updates at once
function broadcastPropertyUpdates(socket: Socket, updates: Record<string, any>, sceneId: string) {
  if (!socket || !sceneId) return;

  const updateData = {
    properties: Object.values(updates),
    sceneId
  };

  socket.emit('propertyUpdates', updateData);
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

// Update property locally without any collaborative broadcasting
export function updateLocalProperty(stageProps: StageProps, propertyPath: PropertyPath, value: any) {
  applyUpdate(stageProps, propertyPath, value);
}
