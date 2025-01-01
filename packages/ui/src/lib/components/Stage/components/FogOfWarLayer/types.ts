export enum ToolType {
  Brush = 1,
  Rectangle = 2,
  Ellipse = 3
}

export enum DrawMode {
  Erase = 0,
  Draw = 1
}

export interface FogOfWarLayerProps {
  /**
   * Initial texture data used to populate the fog of war layer
   */
  data: string | null;

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
}

export interface FogOfWarExports {
  clearFog: () => void;
  resetFog: () => void;
  toBase64: () => string | null;
}
