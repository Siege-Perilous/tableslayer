import { PartyDataManager, type PartyState, type SceneData, type SceneMetadata } from './PartyDataManager';

let partyDataManager: PartyDataManager | null = null;

/**
 * Initialize the party data manager (call once per party)
 */
export function initializePartyDataManager(partyId: string, userId: string): PartyDataManager {
  if (partyDataManager) {
    partyDataManager.destroy();
  }
  partyDataManager = new PartyDataManager(partyId, userId);
  return partyDataManager;
}

/**
 * Get the current party data manager
 */
export function getPartyDataManager(): PartyDataManager | null {
  return partyDataManager;
}

/**
 * Svelte store-like hook for party data
 */
export function usePartyData() {
  if (!partyDataManager) {
    throw new Error('PartyDataManager not initialized. Call initializePartyDataManager first.');
  }

  return {
    // Connection status
    getConnectionStatus: () => partyDataManager!.getConnectionStatus(),

    // Subscribe to changes
    subscribe: (callback: () => void) => partyDataManager!.subscribe(callback),

    // Cursor management
    updateCursor: (position: { x: number; y: number }, normalizedPosition: { x: number; y: number }) =>
      partyDataManager!.updateCursor(position, normalizedPosition),
    getCursors: () => partyDataManager!.getCursors(),

    // Scenes list
    getScenesList: (): SceneMetadata[] => partyDataManager!.getScenesList(),

    // Party state
    getPartyState: (): PartyState => partyDataManager!.getPartyState(),
    updatePartyState: (key: keyof PartyState, value: any) => partyDataManager!.updatePartyState(key, value),

    // Scene data
    getSceneData: (sceneId: string): SceneData | null => partyDataManager!.getSceneData(sceneId),

    // Initialization helpers
    initializeSceneData: (sceneId: string, stageProps: any, markers: any[]) =>
      partyDataManager!.initializeSceneData(sceneId, stageProps, markers),
    initializeScenesList: (scenes: SceneMetadata[]) => partyDataManager!.initializeScenesList(scenes),
    initializePartyState: (state: Partial<PartyState>) => partyDataManager!.initializePartyState(state)
  };
}

/**
 * Clean up the party data manager
 */
export function destroyPartyDataManager() {
  if (partyDataManager) {
    partyDataManager.destroy();
    partyDataManager = null;
  }
}
