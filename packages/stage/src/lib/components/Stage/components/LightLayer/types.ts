export enum LightStyle {
  Torch = 'torch',
  Candle = 'candle',
  Magical = 'magical',
  Fire = 'fire',
  Lantern = 'lantern',
  Spotlight = 'spotlight'
}

export enum LightPulse {
  None = 0,
  Slow = 1,
  Medium = 2,
  Fast = 3
}

export interface Light {
  id: string;
  position: {
    x: number;
    y: number;
  };
  radius: number; // Diameter in grid units
  color: string; // Hex color
  style: LightStyle;
  pulse: LightPulse;
}

export interface LightLayerProps {
  /**
   * Whether the light layer is visible
   */
  visible: boolean;

  /**
   * Whether to snap lights to the grid
   */
  snapToGrid: boolean;

  /**
   * An array of Light objects
   */
  lights: Light[];
}

export interface LightLayerExports {
  lightState: {
    isHovering: boolean;
    isDragging: boolean;
    hoveredLight: Light | null;
    selectedLight: Light | null;
  };
  onSceneChange: () => void;
}

/**
 * Default colors for each light style
 */
export const LIGHT_STYLE_COLORS: Record<LightStyle, string> = {
  [LightStyle.Torch]: '#FF6B35',
  [LightStyle.Candle]: '#FFD700',
  [LightStyle.Magical]: '#8A2BE2',
  [LightStyle.Fire]: '#FF4500',
  [LightStyle.Lantern]: '#FFA500',
  [LightStyle.Spotlight]: '#E6E6FA'
};

/**
 * Pulse animation durations in milliseconds
 */
export const LIGHT_PULSE_DURATION: Record<LightPulse, number> = {
  [LightPulse.None]: 0,
  [LightPulse.Slow]: 2000,
  [LightPulse.Medium]: 1000,
  [LightPulse.Fast]: 500
};
