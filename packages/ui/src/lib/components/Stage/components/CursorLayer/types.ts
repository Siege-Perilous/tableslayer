export interface CursorData {
  id: string; // Unique identifier for the cursor (userId or sessionId)
  worldPosition: {
    x: number;
    y: number;
    z: number;
  };
  color: string;
  label?: string;
  opacity: number; // For fade-out effect
  lastUpdateTime: number;
}

export interface CursorLayerProps {
  cursors: CursorData[];
  showLabels: boolean;
  fadeOutDelay: number; // Time in ms before cursor starts fading
  fadeOutDuration: number; // Time in ms for fade animation
  gridSpacing?: number; // Grid spacing in inches (for sizing cursor)
  displaySize?: { x: number; y: number }; // Display size in inches
  displayResolution?: { x: number; y: number }; // Display resolution in pixels
  sceneZoom?: number; // Current scene zoom level (to compensate for scaling)
}
