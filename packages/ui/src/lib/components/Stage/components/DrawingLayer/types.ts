export enum InitialState {
  Clear = 0,
  Fill = 1
}

export enum ToolType {
  Brush = 1,
  Rectangle = 2,
  Ellipse = 3
}

export enum DrawMode {
  Erase = 0,
  Draw = 1
}

export enum RenderMode {
  Draw = 'draw',
  Clear = 'clear',
  Revert = 'revert',
  Fill = 'fill'
}

/**
 * The properties for a drawing layer
 */
export interface DrawingLayerProps {
  /**
   * The URL of the texture to use for the drawing layer
   */
  url: string | null;

  /**
   * The opacity of the drawing layer
   */
  opacity: {
    dm: number;
    player: number;
  };

  /**
   * The tool settings
   */
  tool: {
    /**
     * The current drawing mode (`DrawMode.Erase` or `DrawMode.Draw`)
     */
    mode: DrawMode;

    /**
     * When `toolType = ToolType.Brush`, setting this controls the brush size
     */
    size: number;

    /**
     * The type of drawing tool currently selected
     */
    type: ToolType;
  };
}
