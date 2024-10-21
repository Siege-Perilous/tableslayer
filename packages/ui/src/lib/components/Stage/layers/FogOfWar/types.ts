export enum DrawMode {
  Eraser = 0,
  Brush = 1,
  Rectangle = 2,
  Circle = 3
}

export enum BrushType {
  Round = 0,
  Square = 1
}

export type FogOfWarProps = {
  /**
   * The drawing tool selection
   */
  drawMode: DrawMode;

  /**
   * The type of brush shape when `drawMode` is set to `DrawMode.Brush` or `DrawMode.Eraser`
   */
  brushType: BrushType;

  /**
   * Size of the brush when `drawMode` is set to `DrawMode.Brush` or `DrawMode.Eraser`
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
