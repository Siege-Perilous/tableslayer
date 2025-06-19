import type { StageMode } from '../Stage/types';

/**
 * The properties for a drawing layer
 */
export interface AnnotationLayerProps {
  /**
   * The layers of the annotation layer
   */
  layers: AnnotationLayer[];

  /**
   * Global visibility of all annotation layer
   */
  visible: boolean;
}

export interface AnnotationLayer {
  /**
   * The ID of the annotation layer
   */
  id: string;

  /**
   * The URL of the texture to use for the annotation layer
   */
  url: string | null;

  /**
   * The opacity of the annotation layer
   */
  opacity: number;

  /**
   * Control who can see the layer
   */
  visibility: StageMode;
}
