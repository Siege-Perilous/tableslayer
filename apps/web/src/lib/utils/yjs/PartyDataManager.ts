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

  constructor(partyId: string, userId: string) {
    this.userId = userId;
    this.partyId = partyId;

    // Initialize Y.js document and provider
    this.doc = new Y.Doc();

    // Connect to Y.js through Socket.IO
    const socketUrl = window.location.origin;
    const roomName = `party-${partyId}`;

    console.log(`PartyDataManager connecting to Y.js via Socket.IO: ${socketUrl}`);

    this.provider = new SocketIOProvider(socketUrl, roomName, this.doc, {
      autoConnect: true,
      resyncInterval: -1, // Disable resync interval
      disableBc: false // Enable broadcast channel for cross-tab communication
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
   * Initialize scenes list from SSR
   */
  initializeScenesList(scenes: SceneMetadata[]) {
    if (this.yScenesList.length === 0) {
      // Use Y.js transaction for atomic updates
      this.doc.transact(() => {
        scenes.forEach((scene) => this.yScenesList.push([scene]));
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
