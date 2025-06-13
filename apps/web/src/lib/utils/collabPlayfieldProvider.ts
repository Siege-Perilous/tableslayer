import type { SelectMarker, SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import type { Socket } from 'socket.io-client';
import { SocketIOProvider } from 'y-socket.io';
import { buildSceneProps } from './buildSceneProps';
import { CollabPlayfieldDoc, type CollaborativePlayfieldState } from './collabPlayfieldDoc';

/**
 * Provider that manages the collaborative playfield document and synchronization
 * This replaces the manual websocket broadcasts with Y.js CRDT synchronization
 */
export class CollabPlayfieldProvider {
  private doc: CollabPlayfieldDoc;
  private provider: SocketIOProvider;
  private unsubscribe?: () => void;
  private onStateChangeCallback?: (state: CollaborativePlayfieldState) => void;

  constructor(socket: Socket, partyId: string, gameSessionId: string, userId: string, userEmail: string) {
    // Create collaborative document
    const docKey = `${partyId}-${gameSessionId}`;
    this.doc = new CollabPlayfieldDoc(docKey);

    // Create SocketIO provider for Y.js synchronization
    // Use current window location for the URL
    const url = window.location.origin;
    const roomName = docKey;

    this.provider = new SocketIOProvider(url, roomName, this.doc.ydoc, {
      autoConnect: true
    });

    // Add connection logging
    this.provider.on('status', (event: any) => {
      // console.log('Y.js provider status:', event);
    });

    this.provider.on('connection-close', () => {
      // console.log('Y.js provider connection closed');
    });

    this.provider.on('connection-error', (error: any) => {
      console.error('Y.js provider connection error:', error);
    });

    // Register this editor
    this.doc.registerEditor(userId, userEmail);

    // Set up state change subscription
    this.setupStateSubscription();
  }

  /**
   * Initialize the collaborative document with current scene data
   */
  initializeWithScene(
    selectedScene: SelectScene | (SelectScene & Thumb),
    selectedSceneMarkers: (SelectMarker & Partial<Thumb>)[],
    activeScene: SelectScene | (SelectScene & Thumb) | null,
    activeSceneMarkers: (SelectMarker & Partial<Thumb>)[],
    gameIsPaused: boolean,
    activeGameSessionId?: string
  ) {
    const stageProps = buildSceneProps(selectedScene, selectedSceneMarkers, 'editor');
    // console.log('Initializing collaborative document with stageProps:', stageProps);

    this.doc.initializeState({
      stageProps,
      activeScene,
      selectedScene,
      gameIsPaused,
      activeGameSessionId
    });
  }

  /**
   * Update stage property (replaces direct socketUpdate calls)
   */
  updateStageProperty(path: string[], value: any) {
    // console.log('CollabProvider: Updating stage property', path, 'to', value);
    this.doc.updateStageProperty(path, value);
  }

  /**
   * Update marker property (replaces direct marker property updates)
   */
  updateMarkerProperty(markerId: string, property: string, value: any) {
    this.doc.updateMarkerProperty(markerId, property, value);
  }

  /**
   * Update marker position (replaces broadcastMarkerUpdate)
   */
  updateMarkerPosition(markerId: string, position: { x: number; y: number }) {
    this.doc.updateMarkerPosition(markerId, position);
  }

  /**
   * Update editor cursor position
   */
  updateCursor(userId: string, cursor: { x: number; y: number }) {
    this.doc.updateEditorCursor(userId, cursor);
  }

  /**
   * Update game state (pause, active session, etc.)
   */
  updateGameState(updates: {
    gameIsPaused?: boolean;
    activeGameSessionId?: string;
    activeScene?: SelectScene | (SelectScene & Thumb) | null;
    selectedScene?: SelectScene | (SelectScene & Thumb) | null;
  }) {
    this.doc.ydoc.transact(() => {
      if (updates.gameIsPaused !== undefined) {
        this.doc.state.set('gameIsPaused', updates.gameIsPaused);
      }
      if (updates.activeGameSessionId !== undefined) {
        this.doc.state.set('activeGameSessionId', updates.activeGameSessionId);
      }
      if (updates.activeScene !== undefined) {
        this.doc.state.set('activeScene', updates.activeScene);
      }
      if (updates.selectedScene !== undefined) {
        this.doc.state.set('selectedScene', updates.selectedScene);
      }
      this.doc.state.set('lastUpdated', Date.now());
    });
  }

  /**
   * Get current collaborative state
   */
  getState(): CollaborativePlayfieldState {
    return this.doc.getState();
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: CollaborativePlayfieldState) => void) {
    this.onStateChangeCallback = callback;
  }

  /**
   * Set up subscription to document changes
   */
  private setupStateSubscription() {
    this.unsubscribe = this.doc.onStateChange((state) => {
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(state);
      }
    });
  }

  /**
   * Check if this provider is connected to other editors
   */
  isConnected(): boolean {
    return this.provider.socket.connected;
  }

  /**
   * Get list of current editors
   */
  getEditors(): Record<
    string,
    { userId: string; userEmail: string; lastSeen: number; cursor?: { x: number; y: number } }
  > {
    return this.doc.getState().editors;
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.provider.destroy();
    this.doc.destroy();
  }
}
