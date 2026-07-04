export enum InitialState {
  Clear = 0,
  Fill = 1
}

/**
 * Reads the width/height header that DrawingMaterial.toRLE prepends to
 * persisted mask data (two little-endian uint32s). Returns null when the
 * data has no plausible header (legacy headerless masks).
 */
export const peekRLEDimensions = (rleData: Uint8Array): { width: number; height: number } | null => {
  if (rleData.length <= 8) return null;
  const view = new DataView(rleData.buffer, rleData.byteOffset, rleData.byteLength);
  const width = view.getUint32(0, true);
  const height = view.getUint32(4, true);
  if (width > 0 && width <= 8192 && height > 0 && height <= 8192) {
    return { width, height };
  }
  return null;
};

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
   * Version timestamp for mask data changes (for real-time sync)
   */
  maskVersion?: number;

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
     * in grid units (number of grid squares the brush diameter spans, 1-5)
     */
    size: number;

    /**
     * The type of drawing tool currently selected
     */
    type: ToolType;
  };
}
