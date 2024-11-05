export enum WeatherType {
  Rain = 0
}

export type WeatherProps = {
  /**
   * The selected weather type
   */
  weatherType: WeatherType;

  /**
   * Color of the weather effect
   */
  color: { r: number; g: number; b: number };

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
};
