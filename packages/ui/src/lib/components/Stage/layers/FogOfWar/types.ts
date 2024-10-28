export enum ToolType {
  RoundBrush = 1,
  SquareBrush = 2,
  Rectangle = 3,
  Ellipse = 4
}

export enum DrawMode {
  Erase = 0,
  Draw = 1
}

export type FogOfWarProps = {
  /**
   * Initial texture data used to populate the fog of war layer
   */
  data: string;

  /**
   * The type of drawing tool currently selected
   */
  toolType: ToolType;

  /**
   * The current drawing mode (`DrawMode.Erase` or `DrawMode.Draw`)
   */
  drawMode: DrawMode;

  /**
   * When `toolType = ToolType.Brush`, setting this controls the brush size
   */
  brushSize: number;

  /**
   * Color of the fog
   */
  fogColor: string;

  /**
   * Controls the opacity of the entire fog of war layer
   */
  opacity: number;
};
