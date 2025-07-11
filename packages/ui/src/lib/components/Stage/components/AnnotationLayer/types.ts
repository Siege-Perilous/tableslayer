import type { StageMode } from '../Stage/types';

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
   * Control who can see the layer
   */
  visibility: StageMode;
}

export interface AnnotationExports {
  clear: (layerId: string) => void;
  toPng: () => Promise<Blob>;
  isDrawing: () => boolean;
}
