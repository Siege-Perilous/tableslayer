export enum WeatherType {
  Rain = 0,
  Snow = 1,
  Leaves = 2
}

export type WeatherProps = {
  /**
   * The selected weather type
   */
  weatherType: WeatherType;

  /**
   * The opacity of the weather layer
   */
  opacity: number;

  /**
   * The scale the weather effects
   */
  scale: number;
};
