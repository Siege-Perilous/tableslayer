import type { StageMode } from '../Stage/types';

/**
 * Visual effect types for annotation layers
 */
export enum AnnotationEffect {
  None = 0,
  Fire = 1,
  SpaceTear = 2,
  Water = 3,
  Magic = 4
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
