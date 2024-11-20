export enum WeatherType {
  Rain = 0
}

export interface WeatherProps {
  /**
   * The selected weather type
   */
  weatherType: WeatherType;

  /**
   * Tint color applied to the weather effect, represented as a hex string (e.g. 0x60A3FE)
   */
  color: string;

  /**
   * The angle that the weather is falling down
   */
  angle: number;

  /**
   * The opacity of the weather layer
   */
  opacity: number;

  /**
   * The speed of the rainfall
   */
  speed: number;

  /**
   * The intensity of the rain
   */
  intensity: number;

  /**
   * The scale of the weather effect in each axis
   */
  scale: {
    x: number;
    y: number;
  };
}
