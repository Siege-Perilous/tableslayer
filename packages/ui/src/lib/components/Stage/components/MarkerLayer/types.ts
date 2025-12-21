import type { JSONContent } from '@tiptap/core';

export enum MarkerVisibility {
  Always = 0,
  DM = 1,
  Player = 2,
  Hover = 3 // Hidden from players, revealed on DM hover
}

export enum MarkerShape {
  None = 0,
  Circle = 1,
  Square = 2,
  Triangle = 3,
  Pin = 4
}

export enum MarkerSize {
  Small = 1,
  Medium = 2,
  Large = 3
}

export interface Marker {
  id: string;
  title: string;
  position: {
    x: number;
    y: number;
  };
  size: MarkerSize;
  shape: MarkerShape;
  shapeColor: string;
  label: string | null;
  imageUrl: string | null;
  imageScale: number;
  visibility: MarkerVisibility;
  note: JSONContent | null;
  pinnedTooltip?: boolean;
}

export interface MarkerLayerProps {
  /**
   * Whether the marker layer is visible
   */
  visible: boolean;

  /**
   * The shape of the marker icons
   */
  shape: {
    /**
     * The stroke color of the marker icons represented as a hex string (e.g. 0x60A3FE)
     */
    strokeColor: string;

    /**
     * The stroke width of the marker icons
     */
    strokeWidth: number;

    /**
     * The shadow color of the marker icons represented as a hex string (e.g. 0x60A3FE)
     */
    shadowColor: string;

    /**
     * The shadow blur of the marker icons
     */
    shadowBlur: number;

    /**
     * The shadow offset of the marker icons
     */
    shadowOffset: {
      x: number;
      y: number;
    };
  };

  /**
   * The text of the marker
   */
  text: {
    /**
     * The size of the marker text
     */
    size: number;

    /**
     * The color of the marker text
     */
    color: string;

    /**
     * The stroke width of the marker text
     */
    strokeWidth: number;

    /**
     * The color of the marker text stroke
     */
    strokeColor: string;
  };

  /**
   * Whether to snap the marker to the grid
   */
  snapToGrid: boolean;

  /**
   * An array of Marker objects
   */
  markers: Marker[];
}

export interface MarkerLayerExports {
  markerState: {
    isHovering: boolean;
    isDragging: boolean;
    hoveredMarker: Marker | null;
    selectedMarker: Marker | null;
  };
  maintainHover: (maintain: boolean) => void;
  onSceneChange: () => void;
}
