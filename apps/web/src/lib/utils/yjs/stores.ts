import { devLog } from '../debug';
import { PartyDataManager, type PartyState, type SceneData, type SceneMetadata } from './PartyDataManager';

let partyDataManager: PartyDataManager | null = null;

/**
 * Initialize the party data manager (call once per game session)
 */
export function initializePartyDataManager(partyId: string, userId: string, gameSessionId?: string): PartyDataManager {
  devLog('yjs', 'Initializing PartyDataManager for party:', partyId, 'gameSession:', gameSessionId);
  if (partyDataManager) {
    partyDataManager.destroy();
  }
  partyDataManager = new PartyDataManager(partyId, userId, gameSessionId);
  devLog('yjs', 'PartyDataManager initialized successfully');
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
    updateSceneStageProps: (sceneId: string, stageProps: any) =>
      partyDataManager!.updateSceneStageProps(sceneId, stageProps),

    // Initialization helpers
    initializeSceneData: (sceneId: string, stageProps: any, markers: any[]) =>
      partyDataManager!.initializeSceneData(sceneId, stageProps, markers),
    initializeScenesList: (scenes: SceneMetadata[]) => partyDataManager!.initializeScenesList(scenes),
    initializePartyState: (state: Partial<PartyState>) => partyDataManager!.initializePartyState(state),

    // Scene list management
    addScene: (scene: SceneMetadata) => partyDataManager!.addScene(scene),
    updateScene: (sceneId: string, updates: Partial<SceneMetadata>) => partyDataManager!.updateScene(sceneId, updates),
    removeScene: (sceneId: string) => partyDataManager!.removeScene(sceneId),
    reorderScenes: (newScenesOrder: SceneMetadata[]) => partyDataManager!.reorderScenes(newScenesOrder),

    // Save coordination
    becomeActiveSaver: (sceneId: string) => partyDataManager!.becomeActiveSaver(sceneId),
    releaseActiveSaver: (sceneId: string, success?: boolean) => partyDataManager!.releaseActiveSaver(sceneId, success),
    isSaveInProgress: (sceneId: string) => partyDataManager!.isSaveInProgress(sceneId),
    getActiveSaver: (sceneId: string) => partyDataManager!.getActiveSaver(sceneId),

    // Debug utilities
    clearAllData: () => partyDataManager!.clearAllData(),
    forceSyncCheck: () => partyDataManager!.forceSyncCheck(),

    // Drift detection
    getSceneLastUpdated: (sceneId: string) => partyDataManager!.getSceneLastUpdated(sceneId),
    checkSceneDrift: (sceneId: string, dbTimestamp: number) => partyDataManager!.checkSceneDrift(sceneId, dbTimestamp),
    detectDrift: (fetchSceneTimestamps: () => Promise<Record<string, number>>) =>
      partyDataManager!.detectDrift(fetchSceneTimestamps),

    // Scene last updated
    updateSceneLastUpdated: (sceneId: string, timestamp: number) =>
      partyDataManager!.updateSceneLastUpdated(sceneId, timestamp)
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
