import { LayerRotation } from './Layers/enums';

/**
 * Props for the Stage component
 */
export default interface StageProps {
  /**
   * Configuration for the Background layer
   */
  background: {
    /**
     * Set to true to enable the layer. Default is true.
     */
    enabled: boolean;

    /**
     * The background color represented as a hexadecimal string. If undefined, black is used as the default color.
     */
    color: string;

    /**
     * Primary image of the background layer represented as a base64 string
     */
    image?: string;

    /**
     * Rotation of the background image
     */
    rotation: LayerRotation;

    /**
     * Scale factor controlling image zoom
     */
    scale: number;

    /**
     * x/y offset of the image
     */
    offset: { x: number; y: number };
  };
}
