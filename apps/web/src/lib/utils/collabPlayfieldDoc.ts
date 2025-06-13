import type { SelectScene } from '$lib/db/app/schema';
import type { Thumb } from '$lib/server';
import type { StageProps } from '@tableslayer/ui';
import * as Y from 'yjs';

/**
 * Y.js document structure for collaborative playfield editing
 *
 * This replaces the direct websocket broadcasting with CRDT-based synchronization
 * to prevent infinite loops and provide automatic conflict resolution between editors.
 */

export type CollaborativePlayfieldState = {
  // Stage properties that need collaborative editing
  stageProps: StageProps;

  // Scene and game session info that affects all editors
  activeScene: SelectScene | (SelectScene & Thumb) | null;
  selectedScene: SelectScene | (SelectScene & Thumb) | null;
  gameIsPaused: boolean;
  activeGameSessionId?: string;

  // Additional metadata
  lastUpdated: number;
  editors: Record<string, EditorInfo>;
};

export type EditorInfo = {
  userId: string;
  userEmail: string;
  lastSeen: number;
  cursor?: {
    x: number;
    y: number;
  };
};

export class CollabPlayfieldDoc {
  public ydoc: Y.Doc;
  public state: Y.Map<any>;
  public stageProps: Y.Map<any>;
  public editors: Y.Map<EditorInfo>;

  constructor(documentId: string) {
    this.ydoc = new Y.Doc();

    // Set unique document identifier
    this.ydoc.guid = documentId;

    // Create collaborative data structures
    this.state = this.ydoc.getMap('state');
    this.stageProps = this.ydoc.getMap('stageProps');
    this.editors = this.ydoc.getMap('editors');
  }

  /**
   * Initialize the document with current state
   */
  initializeState(initialState: Partial<CollaborativePlayfieldState>) {
    this.ydoc.transact(() => {
      if (initialState.stageProps) {
        this.setStageProps(initialState.stageProps);
      }

      if (initialState.activeScene) {
        this.state.set('activeScene', initialState.activeScene);
      }

      if (initialState.selectedScene) {
        this.state.set('selectedScene', initialState.selectedScene);
      }

      if (initialState.gameIsPaused !== undefined) {
        this.state.set('gameIsPaused', initialState.gameIsPaused);
      }

      if (initialState.activeGameSessionId) {
        this.state.set('activeGameSessionId', initialState.activeGameSessionId);
      }

      this.state.set('lastUpdated', Date.now());
    });
  }

  /**
   * Set stage properties with deep merge support
   */
  setStageProps(props: StageProps) {
    console.log('Setting stageProps in Y.js document:', props);
    this.ydoc.transact(() => {
      // Convert nested objects to Y.Map structures for proper CRDT behavior
      Object.entries(props).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          if (!this.stageProps.has(key)) {
            this.stageProps.set(key, new Y.Map());
          }
          const subMap = this.stageProps.get(key) as Y.Map<any>;
          this.setNestedObject(subMap, value);
        } else {
          this.stageProps.set(key, value);
        }
      });

      this.state.set('lastUpdated', Date.now());
    });
  }

  /**
   * Update a specific property path in stageProps
   */
  updateStageProperty(path: string[], value: any) {
    this.ydoc.transact(() => {
      let current = this.stageProps;

      // Navigate to the parent map
      for (let i = 0; i < path.length - 1; i++) {
        const key = path[i];
        if (!current.has(key)) {
          current.set(key, new Y.Map());
        }
        current = current.get(key) as Y.Map<any>;
      }

      // Set the final value
      const lastKey = path[path.length - 1];
      current.set(lastKey, value);

      this.state.set('lastUpdated', Date.now());
    });
  }

  /**
   * Update marker position optimized for frequent updates
   */
  updateMarkerPosition(markerId: string, position: { x: number; y: number }) {
    this.ydoc.transact(() => {
      // Navigate to markers array
      if (!this.stageProps.has('marker')) {
        this.stageProps.set('marker', new Y.Map());
      }

      const markerMap = this.stageProps.get('marker') as Y.Map<any>;
      if (!markerMap.has('markers')) {
        markerMap.set('markers', new Y.Array());
      }

      let markersArray = markerMap.get('markers');

      // If markers is not a Y.Array (might be a regular array), convert it
      if (!(markersArray instanceof Y.Array)) {
        console.log('Converting regular array to Y.Array');
        const regularArray = Array.isArray(markersArray) ? markersArray : [];
        markersArray = new Y.Array();
        markersArray.insert(0, regularArray);
        markerMap.set('markers', markersArray);
      }

      // Find and update the marker
      const markers = markersArray.toArray();
      for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        if (marker && marker.id === markerId) {
          // Update position without replacing the entire marker
          const updatedMarker = { ...marker, position };
          markersArray.delete(i, 1);
          markersArray.insert(i, [updatedMarker]);
          break;
        }
      }

      this.state.set('lastUpdated', Date.now());
    });
  }

  /**
   * Register an editor in the collaborative session
   */
  registerEditor(userId: string, userEmail: string) {
    this.editors.set(userId, {
      userId,
      userEmail,
      lastSeen: Date.now()
    });
  }

  /**
   * Update editor cursor position
   */
  updateEditorCursor(userId: string, cursor: { x: number; y: number }) {
    const editor = this.editors.get(userId);
    if (editor) {
      this.editors.set(userId, {
        ...editor,
        cursor,
        lastSeen: Date.now()
      });
    }
  }

  /**
   * Remove an editor from the session
   */
  removeEditor(userId: string) {
    this.editors.delete(userId);
  }

  /**
   * Get the current state as a plain object
   */
  getState(): CollaborativePlayfieldState {
    return {
      stageProps: this.stagePropsToObject(),
      activeScene: this.state.get('activeScene') || null,
      selectedScene: this.state.get('selectedScene') || null,
      gameIsPaused: this.state.get('gameIsPaused') || false,
      activeGameSessionId: this.state.get('activeGameSessionId'),
      lastUpdated: this.state.get('lastUpdated') || Date.now(),
      editors: this.editorsToObject()
    };
  }

  /**
   * Convert Y.Map stageProps back to plain object
   */
  private stagePropsToObject(): StageProps {
    const result: any = {};

    // Return empty object if stageProps has no keys (not initialized)
    if (this.stageProps.size === 0) {
      return {} as StageProps;
    }

    this.stageProps.forEach((value, key) => {
      if (value instanceof Y.Map) {
        result[key] = this.mapToObject(value);
      } else if (value instanceof Y.Array) {
        result[key] = value.toArray();
      } else {
        result[key] = value;
      }
    });

    return result as StageProps;
  }

  /**
   * Convert Y.Map editors back to plain object
   */
  private editorsToObject(): Record<string, EditorInfo> {
    const result: Record<string, EditorInfo> = {};

    this.editors.forEach((value, key) => {
      result[key] = value;
    });

    return result;
  }

  /**
   * Helper to convert Y.Map to plain object recursively
   */
  private mapToObject(map: Y.Map<any>): any {
    const result: any = {};

    map.forEach((value, key) => {
      if (value instanceof Y.Map) {
        result[key] = this.mapToObject(value);
      } else if (value instanceof Y.Array) {
        result[key] = value.toArray();
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Helper to set nested object values in Y.Map
   */
  private setNestedObject(map: Y.Map<any>, obj: any) {
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Convert regular arrays to Y.Array
        const yArray = new Y.Array();
        yArray.insert(0, value);
        map.set(key, yArray);
      } else if (typeof value === 'object' && value !== null) {
        if (!map.has(key)) {
          map.set(key, new Y.Map());
        }
        const subMap = map.get(key) as Y.Map<any>;
        this.setNestedObject(subMap, value);
      } else {
        map.set(key, value);
      }
    });
  }

  /**
   * Subscribe to changes in the collaborative document
   */
  onStateChange(callback: (state: CollaborativePlayfieldState) => void) {
    const handler = () => {
      callback(this.getState());
    };

    this.state.observe(handler);
    this.stageProps.observeDeep(handler);
    this.editors.observe(handler);

    // Return unsubscribe function
    return () => {
      this.state.unobserve(handler);
      this.stageProps.unobserveDeep(handler);
      this.editors.unobserve(handler);
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.ydoc.destroy();
  }
}
