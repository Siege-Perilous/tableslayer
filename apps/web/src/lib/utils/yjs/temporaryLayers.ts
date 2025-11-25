import { devLog } from '../debug';
import type { PartyDataManager } from './PartyDataManager';

/**
 * Temporary annotation layer that syncs via Y.js awareness
 * but doesn't persist to database. Used for player drawings
 * that can be made permanent or expire after a timeout.
 */
export interface TemporaryLayer {
  id: string;
  isTemporary: boolean;
  createdAt: number;
  expiresAt: number;
  color: string;
  maskData: string; // Base64 RLE data
  creatorId: string;
  opacity: number;
  name: string;
}

/**
 * Broadcasts a temporary layer via Y.js awareness protocol
 */
export function broadcastTemporaryLayer(partyData: PartyDataManager, layer: TemporaryLayer): void {
  if (!partyData) {
    return;
  }

  const awareness = (partyData as any).gameSessionProvider?.awareness;
  if (!awareness) {
    return;
  }

  // Get only the local client's temporary layers (not all clients)
  const localState = awareness.getLocalState();
  const currentLayers: TemporaryLayer[] = localState?.temporaryLayers || [];

  // Add or update the layer
  const layerIndex = currentLayers.findIndex((l) => l.id === layer.id);
  if (layerIndex >= 0) {
    currentLayers[layerIndex] = layer;
  } else {
    currentLayers.push(layer);
  }

  // Broadcast via awareness
  awareness.setLocalStateField('temporaryLayers', currentLayers);
  devLog(
    'yjs',
    `Broadcast temporary layer: ${layer.id}, expires at ${new Date(layer.expiresAt).toISOString()}, total local layers: ${currentLayers.length}`
  );
}

/**
 * Removes a temporary layer from awareness
 */
export function removeTemporaryLayer(partyData: PartyDataManager, layerId: string): void {
  if (!partyData) {
    return;
  }

  const currentLayers = getTemporaryLayers(partyData);
  const filteredLayers = currentLayers.filter((l) => l.id !== layerId);

  const awareness = (partyData as any).gameSessionProvider?.awareness;
  if (awareness) {
    awareness.setLocalStateField('temporaryLayers', filteredLayers);
    devLog('yjs', `Removed temporary layer: ${layerId}`);
  }
}

/**
 * Gets all temporary layers from all connected clients
 */
export function getTemporaryLayers(partyData: PartyDataManager): TemporaryLayer[] {
  if (!partyData) {
    return [];
  }

  const awareness = (partyData as any).gameSessionProvider?.awareness;
  if (!awareness) {
    return [];
  }

  const allLayers: TemporaryLayer[] = [];
  const states = awareness.getStates();

  states.forEach((state: any) => {
    if (state.temporaryLayers && Array.isArray(state.temporaryLayers)) {
      allLayers.push(...state.temporaryLayers);
    }
  });

  return allLayers;
}

/**
 * Cleans up expired temporary layers.
 * Should be called periodically (e.g., every 1000ms) by all clients.
 */
export function cleanupExpiredLayers(partyData: PartyDataManager): void {
  if (!partyData) {
    return;
  }

  const awareness = (partyData as any).gameSessionProvider?.awareness;
  if (!awareness) {
    return;
  }

  const now = Date.now();
  const currentLayers = getTemporaryLayers(partyData);
  const expiredCount = currentLayers.filter((l) => l.expiresAt <= now).length;

  if (expiredCount > 0) {
    // Only clean up our own layers from awareness
    const localState = awareness.getLocalState();
    if (localState?.temporaryLayers && Array.isArray(localState.temporaryLayers)) {
      const validLayers = localState.temporaryLayers.filter((l: TemporaryLayer) => l.expiresAt > now);
      awareness.setLocalStateField('temporaryLayers', validLayers);

      devLog('yjs', `Cleaned up ${localState.temporaryLayers.length - validLayers.length} expired temporary layers`);
    }
  }
}

/**
 * Gets only temporary layers created by the current user
 */
export function getOwnTemporaryLayers(partyData: PartyDataManager, userId: string): TemporaryLayer[] {
  return getTemporaryLayers(partyData).filter((layer) => layer.creatorId === userId);
}

/**
 * Checks if a specific temporary layer still exists and hasn't expired
 */
export function isTemporaryLayerActive(partyData: PartyDataManager, layerId: string): boolean {
  const layer = getTemporaryLayers(partyData).find((l) => l.id === layerId);
  return layer !== undefined && layer.expiresAt > Date.now();
}

/**
 * Creates a temporary layer object with default expiration
 * Default: 10 seconds from creation
 */
export function createTemporaryLayer(
  layerId: string,
  creatorId: string,
  color: string,
  maskData: string,
  expirationMs: number = 10000
): TemporaryLayer {
  const now = Date.now();
  return {
    id: layerId,
    isTemporary: true,
    createdAt: now,
    expiresAt: now + expirationMs,
    color,
    maskData,
    creatorId,
    opacity: 1.0,
    name: 'Temporary drawing'
  };
}
