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
  fogColor1: string;
  fogColor2: string;
  fogColor3: string;
  fogColor4: string;

  /**
   * Controls the opacity of the entire fog of war layer
   */
  opacity: number;

  /**
   * Controls the speed of the fog
   */
  fogSpeed: { x: number; y: number; z: number; w: number };

  /**
   * Controls the frequency of the fog
   */
  frequency: { x: number; y: number; z: number; w: number };

  /**
   * Controls the persistence of the fog
   */
  persistence: { x: number; y: number; z: number; w: number };

  /**
   * Controls the lacunarity of the fog
   */
  lacunarity: { x: number; y: number; z: number; w: number };

  /**
   * Controls the levels of the fog
   */
  levels: { x: number; y: number; z: number; w: number };

  /**
   * Controls the offset of the fog
   */
  offset: { x: number; y: number; z: number; w: number };

  /**
   * Controls the amplitude of the fog
   */
  amplitude: { x: number; y: number; z: number; w: number };
}

export interface FogOfWarExports {
  clearFog: () => void;
  resetFog: () => void;
  toBase64: () => string | null;
}
