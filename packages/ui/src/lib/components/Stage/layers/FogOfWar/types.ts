export enum ToolType {
  Brush = 1,
  Rectangle = 2,
  Ellipse = 3
}

export enum DrawMode {
  Erase = 0,
  Draw = 1
}

export enum BrushShape {
  Round = 0,
  Square = 1
}

export type FogOfWarProps = {
  /**
   * The type of drawing tool currently selected
   */
  toolType: ToolType;

  /**
   * The current drawing mode (`DrawMode.Erase` or `DrawMode.Draw`)
   */
  drawMode: DrawMode;

  /**
   * When `toolType = ToolType.Brush`, setting this controls the brush shape
   */
  brushShape: BrushShape;

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
