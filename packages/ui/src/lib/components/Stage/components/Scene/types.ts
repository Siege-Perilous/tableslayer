import type { ToneMappingMode } from 'postprocessing';

export enum SceneLoadingState {
  LoadingMap = 1,
  Resizing = 2,
  Rendering = 3,
  Initialized = 4
}

export enum SceneRotation {
  Deg0 = 0,
  Deg90 = 90,
  Deg180 = 180,
  Deg270 = 270
}

export enum SceneLayer {
  Main = 0,
  Overlay = 1,
  Input = 2
}

export enum SceneLayerOrder {
  Background = 0,
  Map = 10,
  Marker = 15,
  Fog = 20,
  Weather = 30,
  EffectAnnotation = 35, // Effect annotations render under fog of war
  FogOfWar = 40,
  Grid = 50,
  EdgeOverlay = 70,
  Annotation = 80, // Color annotations render over fog of war
  Measurement = 90,
  Cursor = 100
}

export interface SceneLayerProps {
  /**
   * Whether the scene layer should auto fit
   */
  autoFit: boolean;

  /**
   * The position of the scene layer within the canvas
   */
  offset: { x: number; y: number };

  /**
   * The rotation of the scene layer in degrees
   */
  rotation: SceneRotation;

  /**
   * The scale of the scene layer
   */
  zoom: number;
}

import type { Marker } from '../MarkerLayer/types';

export interface SceneExports {
  fill: () => void;
  fit: () => void;
  generateThumbnail: () => Promise<Blob>;
  getMarkerScreenPosition: (marker: Marker) => { x: number; y: number } | null;

  annotations: {
    clear: (layerId: string) => void;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
    loadMask: (layerId: string, rleData: Uint8Array) => Promise<void>;
    isDrawing: () => boolean;
  };

  fogOfWar: {
    clear: () => void;
    reset: () => void;
    toPng: () => Promise<Blob>;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
    isDrawing: () => boolean;
  };

  map: {
    fit: () => void;
    fill: () => void;
    getSize: () => { width: number; height: number } | null;
  };

  markers: {
    isHoveringMarker: boolean;
    isDraggingMarker: boolean;
    hoveredMarker: Marker | null;
    selectedMarker: Marker | null;
    maintainHover: (maintain: boolean) => void;
    onSceneChange: () => void;
  };

  getMarkerSizeInScreenSpace: (markerSize: number) => number;

  measurement: {
    getCurrentMeasurement: () => {
      startPoint: { x: number; y: number } | null;
      endPoint: { x: number; y: number } | null;
      type: number;
    } | null;
    isDrawing: () => boolean;
  };
}

/**
 * Properties for post-processing effects
 */
export interface PostProcessingProps {
  /**
   * Whether post-processing is enabled
   */
  enabled: boolean;

  /**
   * Bloom effect properties
   */
  bloom: {
    /**
     * Whether the bloom effect is enabled
     */
    enabled: boolean;

    /**
     * Overall intensity of the bloom effect (0-1)
     */
    intensity: number;

    /**
     * Luminance threshold for what pixels will bloom (0-1)
     */
    threshold: number;

    /**
     * How smoothly the bloom transitions at the threshold (0-1)
     */
    smoothing: number;

    /**
     * Radius of the bloom effect
     */
    radius: number;

    /**
     * Levels of the bloom effect
     */
    levels: number;

    /**
     * Whether to apply mipmap blur
     */
    mipmapBlur: boolean;
  };

  /**
   * Chromatic aberration effect properties
   */
  chromaticAberration: {
    /**
     * Whether the chromatic aberration effect is enabled
     */
    enabled: boolean;

    /**
     * The offset of the chromatic aberration effect
     */
    offset: number;
  };

  /**
   * LUT effect properties
   */
  lut: {
    /**
     * Whether the LUT3D effect is enabled
     */
    enabled: boolean;

    /**
     * The URL of the LUT to use
     */
    url: string | null;
  };

  /**
   * Tone mapping effect properties
   */
  toneMapping: {
    /**
     * Whether the tone mapping effect is enabled
     */
    enabled: boolean;

    /**
     * The mode of the tone mapping effect
     */
    mode: ToneMappingMode;
  };

  /**
   * Vignette effect properties
   */
  vignette: {
    /**
     * Whether the vignette effect is enabled
     */
    enabled: boolean;

    /**
     * How far from the center the vignette starts (0-1)
     */
    offset: number;

    /**
     * How dark the vignette effect is (0-1)
     */
    darkness: number;
  };
}
