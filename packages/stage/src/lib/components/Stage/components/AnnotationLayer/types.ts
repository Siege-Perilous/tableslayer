import type { StageMode } from '../Stage/types';

/**
 * Visual effect types for annotation layers
 */
export enum AnnotationEffect {
  None = 0,
  Fire = 1,
  SpaceTear = 2,
  Water = 3,
  Magic = 4,
  Grease = 5,
  Ice = 6
}

/**
 * Properties for annotation visual effects
 */
export interface AnnotationEffectProps {
  /**
   * The type of visual effect to apply
   */
  type: AnnotationEffect;

  /**
   * Animation speed multiplier (0.0 - 2.0)
   */
  speed: number;

  /**
   * Intensity of the effect (0.0 - 1.0)
   */
  intensity: number;

  /**
   * Edge softness - how much the effect fades at the boundaries (0.0 - 1.0)
   * Higher values create a more gradual fade to transparent
   */
  softness: number;

  /**
   * Border/edge effect intensity (0.0 - 1.0)
   * Controls foam, glow, nebula wisps, etc. at the edges
   */
  border: number;

  /**
   * Edge roughness - adds random noise to effect edges (0.0 - 1.0)
   * Higher values create more jagged, organic-looking boundaries
   */
  roughness: number;
}

/**
 * The properties for the annotations layer
 */
export interface AnnotationsLayerProps {
  /**
   * The layers to display
   */
  layers: AnnotationLayerData[];

  /**
   * The id of the active layer
   */
  activeLayer: string | null;

  /**
   * The line width for drawing (global setting)
   */
  lineWidth?: number;

  /**
   * Whether to enable brush smoothing for drawing
   * When true, uses lazy brush algorithm for smoother lines
   * Default: true in editor, false in play view
   */
  smoothingEnabled?: boolean;
}

/**
 * The properties for an individual annotation drawing layer
 */
export interface AnnotationLayerData {
  /**
   * The ID of the annotation layer
   */
  id: string;

  /**
   * The name of the annotation layer
   */
  name?: string;

  /**
   * The opacity of the annotation layer
   */
  opacity: number;

  /**
   * The color of the annotation layer
   */
  color: string;

  /**
   * The URL of the texture to use for the annotation layer
   */
  url: string | null;

  /**
   * Version timestamp for mask data changes (for real-time sync)
   */
  maskVersion?: number;

  /**
   * Control who can see the layer
   */
  visibility: StageMode;

  /**
   * Visual effect settings for this annotation layer (experimental, not persisted)
   */
  effect?: AnnotationEffectProps;
}

export interface AnnotationExports {
  clear: (layerId: string) => void;
  toPng: () => Promise<Blob>;
  toRLE: () => Promise<Uint8Array>;
  fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
  loadMask: (layerId: string, rleData: Uint8Array) => Promise<void>;
  isDrawing: () => boolean;
}

/**
 * Default effect properties for each annotation effect type
 */
export const AnnotationEffectDefaults: Record<AnnotationEffect, Omit<AnnotationEffectProps, 'type'>> = {
  [AnnotationEffect.None]: {
    speed: 1.0,
    intensity: 1.0,
    softness: 0.5,
    border: 0.5,
    roughness: 0.0
  },
  [AnnotationEffect.Fire]: {
    speed: 0.94,
    intensity: 1.04,
    softness: 0.37,
    border: 0.4,
    roughness: 0.62
  },
  [AnnotationEffect.SpaceTear]: {
    speed: 1.5,
    intensity: 1.96,
    softness: 0.35,
    border: 0.36,
    roughness: 0.34
  },
  [AnnotationEffect.Water]: {
    speed: 0.42,
    intensity: 1.06,
    softness: 0.0,
    border: 0.36,
    roughness: 0.32
  },
  [AnnotationEffect.Magic]: {
    speed: 0.5,
    intensity: 0.98,
    softness: 0.24,
    border: 0.18,
    roughness: 0.5
  },
  [AnnotationEffect.Grease]: {
    speed: 0.26,
    intensity: 1.52,
    softness: 0.13,
    border: 0.57,
    roughness: 0.26
  },
  [AnnotationEffect.Ice]: {
    speed: 0.92,
    intensity: 1.2,
    softness: 0.32,
    border: 0.44,
    roughness: 0.55
  }
};

/**
 * Get the default effect properties for a given effect type
 */
export const getDefaultEffectProps = (effectType: AnnotationEffect): AnnotationEffectProps => ({
  type: effectType,
  ...AnnotationEffectDefaults[effectType]
});
