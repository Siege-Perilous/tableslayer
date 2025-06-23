import type { StageMode } from '../Stage/types';

/**
 * The properties for the annotations layer
 */
export interface AnnotationsLayerProps {
  /**
   * The layers to display
   */
  layers: AnnotationLayer[];

  /**
   * The id of the active layer
   */
  activeLayer: string | null;
}

/**
 * The properties for an individual annotation drawing layer
 */
export interface AnnotationLayer {
  /**
   * The ID of the annotation layer
   */
  id: string;

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
