export interface FogLayerProps {
  /**
   * Whether the fog layer is enabled
   */
  enabled: boolean;

  /**
   * Color of the fog
   */
  color: string;

  /**
   * Overall opacity of the fog layer
   */
  opacity: number;

  /**
   * Speed of fog movement
   */
  speed: number;

  /**
   * How quickly the amplitude decreases for each octave
   */
  persistence: number;

  /**
   * How quickly the frequency increases for each octave
   */
  lacunarity: number;

  /**
   * Base frequency of the noise
   */
  frequency: number;

  /**
   * Vertical offset of the noise
   */
  offset: number;

  /**
   * Overall amplitude of the noise
   */
  amplitude: number;

  /**
   * Number of octaves to use
   */
  levels: number;
}
