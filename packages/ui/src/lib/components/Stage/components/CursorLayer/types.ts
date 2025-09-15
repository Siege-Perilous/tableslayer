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
}
