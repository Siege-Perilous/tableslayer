import type { DrawingLayerProps } from '../DrawingLayer/types';

export enum ToolType {
  Brush = 1,
  Rectangle = 2,
  Ellipse = 3
}

export enum DrawMode {
  Erase = 0,
  Draw = 1
}

export interface FogOfWarLayerProps extends DrawingLayerProps {
  /**
   * The outline settings
   */
  outline: {
    /**
     * The color of the outline
     */
    color: string;

    /**
     * The opacity of the outline
     */
    opacity: number;

    /**
     * The thickness of the outline
     */
    thickness: number;
  };

  /**
   * The edge settings
   */
  edge: {
    /**
     * The minimum mip map level to use for the edge mask
     */
    minMipMapLevel: number;

    /**
     * The maximum mip map level to use for the edge mask
     */
    maxMipMapLevel: number;

    /**
     * The frequency of the noise added to the mask edge
     */
    frequency: { x: number; y: number; z: number; w: number };

    /**
     * The amplitude of the noise added to the mask edge
     */
    amplitude: { x: number; y: number; z: number; w: number };

    /**
     * The offset of the noise added to the mask edge
     */
    offset: number;

    /**
     * The speed of the noise added to the mask edge
     */
    speed: number;
  };

  /**
   * The noise settings
   */
  noise: {
    /**
     * Color of the fog
     */
    baseColor: string;
    fogColor1: string;
    fogColor2: string;
    fogColor3: string;
    fogColor4: string;

    /**
     * Controls the speed of the fog
     */
    speed: { x: number; y: number; z: number; w: number };

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
  };
}

export interface FogOfWarExports {
  clearFog: () => void;
  resetFog: () => void;
  toPng: () => Promise<Blob>;
}
