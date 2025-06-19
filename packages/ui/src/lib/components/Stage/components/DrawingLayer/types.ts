export enum ToolType {
  Brush = 1,
  Rectangle = 2,
  Ellipse = 3
}

export enum DrawMode {
  Erase = 0,
  Draw = 1
}

export interface DrawingLayerProps {
  url: string | null;
  opacity: number;
  tool: {
    mode: DrawMode;
    size: number;
    type: ToolType;
  };
}
