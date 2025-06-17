import type { Marker, StageProps } from '@tableslayer/ui';
import { SocketIOProvider } from 'y-socket.io';
import * as Y from 'yjs';

export interface SceneMetadata {
  id: string;
  name: string;
  order: number;
  mapLocation?: string;
  mapThumbLocation?: string;
  gameSessionId: string;
  thumb?: {
    resizedUrl: string;
    originalUrl: string;
  };
}

export interface CursorData {
  userId: string;
  position: { x: number; y: number };
  normalizedPosition: { x: number; y: number };
  lastMoveTime: number;
}

export interface LocalViewportState {
  sceneOffset: { x: number; y: number };
  sceneZoom: number;
}

export interface SceneData {
  stageProps: StageProps;
  markers: Marker[];
  localStates: Record<string, LocalViewportState>;
  lastSavedAt: number;
  saveInProgress: boolean;
  activeSaver?: string;
}

export interface PartyState {
  isPaused: boolean;
  activeGameSessionId: string;
  activeSceneId?: string;
  cursors: Record<string, CursorData>;
}

/**
 * Y.js-powered Party Data Manager using Socket.IO provider
 */
export class PartyDataManager {
  private doc: Y.Doc;
  private provider: SocketIOProvider;
  private userId: string;
  private partyId: string;

  // Y.js shared data structures
  private yScenes: Y.Map<any>;
  private yScenesList: Y.Array<SceneMetadata>;
  private yParty: Y.Map<any>;
  private yCursors: Y.Map<CursorData>;

  // Reactive state
  private subscribers = new Set<() => void>();
  private isConnected = false;

  constructor(partyId: string, userId: string, gameSessionId?: string) {
    this.userId = userId;
    this.partyId = partyId;

    // Initialize Y.js document and provider
    this.doc = new Y.Doc();

    // Connect to Y.js through Socket.IO
    const socketUrl = window.location.origin;
    // Use game session for room isolation, fallback to party for compatibility
    const roomName = gameSessionId ? `gameSession-${gameSessionId}` : `party-${partyId}`;

    console.log(`PartyDataManager connecting to Y.js via Socket.IO: ${socketUrl}, room: ${roomName}`);

    this.provider = new SocketIOProvider(socketUrl, roomName, this.doc, {
      autoConnect: true,
      resyncInterval: -1, // Disable resync interval
      disableBc: false // Keep broadcast channel for cross-tab communication
    });

    // Initialize shared data structures
    this.yScenes = this.doc.getMap('scenes');
    this.yScenesList = this.doc.getArray('scenesList');
    this.yParty = this.doc.getMap('party');
    this.yCursors = this.doc.getMap('cursors');

    // Set up connection status listeners
    this.provider.on('status', (event: { status: string }) => {
      this.isConnected = event.status === 'connected';
      console.log(`Y.js connection status: ${event.status}`);
      this.notifySubscribers();
    });

    // Listen for data changes
    this.yScenes.observe(() => this.notifySubscribers());
    this.yScenesList.observe(() => this.notifySubscribers());
    this.yParty.observe(() => this.notifySubscribers());
    this.yCursors.observe(() => this.notifySubscribers());

    console.log(`PartyDataManager initialized for party: ${partyId}`);
  }

  /**
   * Subscribe to data changes
   */
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach((callback) => callback());
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Initialize scene data from SSR
   */
  initializeSceneData(sceneId: string, stageProps: StageProps, markers: Marker[]) {
    if (!this.yScenes.has(sceneId)) {
      const sceneData: SceneData = {
        stageProps,
        markers,
        localStates: {},
        lastSavedAt: Date.now(),
        saveInProgress: false
      };
      this.yScenes.set(sceneId, sceneData);
    }
  }

  /**
   * Initialize scenes list from SSR with proper sync coordination
   */
  initializeScenesList(scenes: SceneMetadata[]) {
    if (scenes.length === 0) return;

    // Wait for Y.js to fully sync before making initialization decisions
    const initializeAfterSync = () => {
      const initFlag = this.yParty.get('scenesInitialized');
      const currentScenes = this.yScenesList.toArray();

      console.log(`Y.js sync complete. Flag: ${initFlag}, Current: ${currentScenes.length}, SSR: ${scenes.length}`);

      // If data is massively accumulated (more than 2x expected), force clear everything
      if (currentScenes.length > scenes.length * 2) {
        console.log(
          `Force clearing accumulated Y.js data. Current: ${currentScenes.length}, Expected: ${scenes.length}`
        );
        this.doc.transact(() => {
          this.yScenesList.delete(0, this.yScenesList.length);
          this.yParty.clear();
        });

        // Reinitialize after clearing
        setTimeout(() => {
          this.doc.transact(() => {
            scenes.forEach((scene) => this.yScenesList.push([scene]));
            this.yParty.set('scenesInitialized', true);
            this.yParty.set('lastInitTimestamp', Date.now());
          });
          console.log('Y.js reinitialized with clean data');
        }, 100);
        return;
      }

      // If already initialized recently (within 5 seconds), skip
      const lastInit = this.yParty.get('lastInitTimestamp');
      if (initFlag && lastInit && Date.now() - lastInit < 5000) {
        console.log('Y.js recently initialized, skipping');
        return;
      }

      // Initialize if not done or data doesn't match
      const hasValidData =
        currentScenes.length === scenes.length && currentScenes.every((scene) => scenes.some((s) => s.id === scene.id));

      if (!initFlag || !hasValidData) {
        console.log(`Initializing Y.js scenes. Current: ${currentScenes.length}, SSR: ${scenes.length}`);
        this.doc.transact(() => {
          this.yScenesList.delete(0, this.yScenesList.length);
          scenes.forEach((scene) => this.yScenesList.push([scene]));
          this.yParty.set('scenesInitialized', true);
          this.yParty.set('lastInitTimestamp', Date.now());
        });
      } else {
        console.log('Y.js scenes already properly initialized');
      }
    };

    // Wait for provider to connect and sync
    if (this.isConnected) {
      // Already connected, wait a moment for any pending sync
      setTimeout(initializeAfterSync, 1000);
    } else {
      // Wait for connection, then sync
      const unsubscribe = this.subscribe(() => {
        if (this.isConnected) {
          unsubscribe();
          setTimeout(initializeAfterSync, 1000);
        }
      });
    }
  }

  /**
   * Initialize party state from SSR
   */
  initializePartyState(state: Partial<PartyState>) {
    this.doc.transact(() => {
      Object.entries(state).forEach(([key, value]) => {
        this.yParty.set(key, value);
      });
    });
  }

  /**
   * Update cursor position
   */
  updateCursor(position: { x: number; y: number }, normalizedPosition: { x: number; y: number }) {
    if (this.isConnected) {
      const cursorData: CursorData = {
        userId: this.userId,
        position,
        normalizedPosition,
        lastMoveTime: Date.now()
      };

      // Update Y.js shared cursor state
      this.yCursors.set(this.userId, cursorData);
    }
  }

  /**
   * Get current cursors (excluding self)
   */
  getCursors(): Record<string, CursorData> {
    const cursors: Record<string, CursorData> = {};
    this.yCursors.forEach((cursor, userId) => {
      if (userId !== this.userId) {
        cursors[userId] = cursor;
      }
    });
    return cursors;
  }

  /**
   * Get scenes list
   */
  getScenesList(): SceneMetadata[] {
    return this.yScenesList.toArray();
  }

  /**
   * Get party state
   */
  getPartyState(): PartyState {
    const cursors: Record<string, CursorData> = {};
    this.yCursors.forEach((cursor, userId) => {
      cursors[userId] = cursor;
    });

    return {
      isPaused: this.yParty.get('isPaused') || false,
      activeGameSessionId: this.yParty.get('activeGameSessionId') || '',
      activeSceneId: this.yParty.get('activeSceneId'),
      cursors
    };
  }

  /**
   * Update party state
   */
  updatePartyState(key: keyof PartyState, value: any) {
    this.yParty.set(key, value);
    // No need to manually notify - Y.js observers handle this
  }

  /**
   * Get scene data
   */
  getSceneData(sceneId: string): SceneData | null {
    return this.yScenes.get(sceneId) || null;
  }

  /**
   * Add scene to the list
   */
  addScene(scene: SceneMetadata) {
    console.log('Adding scene to Y.js:', scene.name);
    this.doc.transact(() => {
      this.yScenesList.push([scene]);
      // Update timestamp to prevent initialization conflicts
      this.yParty.set('lastInitTimestamp', Date.now());
    });
  }

  /**
   * Update scene metadata
   */
  updateScene(sceneId: string, updates: Partial<SceneMetadata>) {
    const scenes = this.yScenesList.toArray();
    const sceneIndex = scenes.findIndex((scene) => scene.id === sceneId);

    if (sceneIndex !== -1) {
      console.log('Updating scene in Y.js:', sceneId, updates);
      this.doc.transact(() => {
        const updatedScene = { ...scenes[sceneIndex], ...updates };
        this.yScenesList.delete(sceneIndex, 1);
        this.yScenesList.insert(sceneIndex, [updatedScene]);
        this.yParty.set('lastInitTimestamp', Date.now());
      });
    }
  }

  /**
   * Remove scene from the list
   */
  removeScene(sceneId: string) {
    const scenes = this.yScenesList.toArray();
    const sceneIndex = scenes.findIndex((scene) => scene.id === sceneId);

    if (sceneIndex !== -1) {
      console.log('Removing scene from Y.js:', sceneId);
      this.doc.transact(() => {
        this.yScenesList.delete(sceneIndex, 1);
        this.yParty.set('lastInitTimestamp', Date.now());
      });
    }
  }

  /**
   * Reorder scenes
   */
  reorderScenes(newScenesOrder: SceneMetadata[]) {
    console.log('Reordering scenes in Y.js:', newScenesOrder.length);
    this.doc.transact(() => {
      // Clear current list and replace with new order
      this.yScenesList.delete(0, this.yScenesList.length);
      newScenesOrder.forEach((scene) => this.yScenesList.push([scene]));
      this.yParty.set('lastInitTimestamp', Date.now());
    });
  }

  /**
   * Force clear all Y.js data (for development/debugging)
   */
  clearAllData() {
    this.doc.transact(() => {
      this.yScenesList.delete(0, this.yScenesList.length);
      this.yScenes.clear();
      this.yParty.clear();
      this.yCursors.clear();
    });
    console.log('Y.js data cleared');
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.provider) {
      this.provider.destroy();
    }
    if (this.doc) {
      this.doc.destroy();
    }
    this.subscribers.clear();
  }
}
