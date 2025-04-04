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

// Update specific property and schedule broadcast
export function queuePropertyUpdate(
  stageProps: StageProps,
  propertyPath: PropertyPath,
  value: any,
  updateType: 'marker' | 'control' | 'scene' = 'control'
) {
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
