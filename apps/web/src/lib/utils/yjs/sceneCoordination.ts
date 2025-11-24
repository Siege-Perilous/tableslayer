import { devLog } from '../debug';
import type { PartyDataManager } from './PartyDataManager';

/**
 * Switches the active scene for all connected clients (editor and playfield)
 * Uses the party-level Y.js document so it affects everyone viewing this party.
 */
export function switchActiveScene(partyData: PartyDataManager, sceneId: string): void {
  if (!partyData) {
    devLog('yjs', 'Cannot switch scene: partyData is undefined');
    return;
  }

  // Update party state with new active scene ID
  const partyState = (partyData as any).yPartyState;
  if (partyState) {
    partyState.set('activeSceneId', sceneId);
    devLog('yjs', `Switched active scene to: ${sceneId}`);
  }
}

/**
 * Gets the current active scene ID from party state
 */
export function getActiveSceneId(partyData: PartyDataManager): string | undefined {
  if (!partyData) {
    return undefined;
  }

  const partyState = (partyData as any).yPartyState;
  if (!partyState) {
    return undefined;
  }

  return partyState.get('activeSceneId') as string | undefined;
}

/**
 * Subscribes to scene changes and calls the callback when the active scene changes
 * Returns an unsubscribe function
 */
export function subscribeToSceneChanges(
  partyData: PartyDataManager,
  callback: (sceneId: string | undefined) => void
): () => void {
  if (!partyData) {
    return () => {}; // No-op unsubscribe
  }

  const partyState = (partyData as any).yPartyState;
  if (!partyState) {
    return () => {};
  }

  const observer = () => {
    const sceneId = partyState.get('activeSceneId') as string | undefined;
    devLog('yjs', `Active scene changed to: ${sceneId}`);
    callback(sceneId);
  };

  partyState.observe(observer);

  // Return unsubscribe function
  return () => {
    partyState.unobserve(observer);
  };
}

/**
 * Gets the pause state from party data
 */
export function getIsPaused(partyData: PartyDataManager): boolean {
  if (!partyData) {
    return false;
  }

  const partyState = (partyData as any).yPartyState;
  if (!partyState) {
    return false;
  }

  return (partyState.get('isPaused') as boolean) ?? false;
}

/**
 * Sets the pause state for all connected clients
 */
export function setIsPaused(partyData: PartyDataManager, isPaused: boolean): void {
  if (!partyData) {
    return;
  }

  const partyState = (partyData as any).yPartyState;
  if (partyState) {
    partyState.set('isPaused', isPaused);
    devLog('yjs', `Set isPaused to: ${isPaused}`);
  }
}

/**
 * Subscribes to pause state changes
 * Returns an unsubscribe function
 */
export function subscribeToPauseChanges(
  partyData: PartyDataManager,
  callback: (isPaused: boolean) => void
): () => void {
  if (!partyData) {
    return () => {};
  }

  const partyState = (partyData as any).yPartyState;
  if (!partyState) {
    return () => {};
  }

  const observer = () => {
    const isPaused = (partyState.get('isPaused') as boolean) ?? false;
    devLog('yjs', `Pause state changed to: ${isPaused}`);
    callback(isPaused);
  };

  partyState.observe(observer);

  return () => {
    partyState.unobserve(observer);
  };
}
