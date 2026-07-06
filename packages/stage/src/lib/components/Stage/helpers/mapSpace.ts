import { type GridLayerProps } from '../components/GridLayer/types';
import type { DisplayProps } from '../components/Stage/types';

/**
 * Map-space coordinate helpers for MapDefined grid mode.
 *
 * In MapDefined mode, marker/light positions are stored in center-relative
 * MAP pixels (map source-image pixels, origin at the map center, +y up) and
 * rendered inside a map-anchored group. These helpers convert between that
 * space and the center-relative display-pixel space used in FillSpace mode.
 *
 * Kept free of THREE imports so apps/web and migration scripts can share the
 * exact same math.
 */

export interface Point2 {
  x: number;
  y: number;
}

export interface MapTransform {
  offset: Point2;
  /** Rotation in degrees */
  rotation: number;
  zoom: number;
}

export interface MapImageSize {
  width: number;
  height: number;
}

type GridForMapSpace = Pick<GridLayerProps, 'fixedGridCount' | 'spacing'>;
type DisplayForMapSpace = Pick<DisplayProps, 'resolution' | 'size'>;

/**
 * Converts a center-relative display-pixel position to center-relative map pixels:
 * m = R(-θ) · (d − offset) / zoom
 */
export const displayToMapSpace = (position: Point2, map: MapTransform): Point2 => {
  const theta = (map.rotation * Math.PI) / 180;
  const cos = Math.cos(-theta);
  const sin = Math.sin(-theta);
  const dx = position.x - map.offset.x;
  const dy = position.y - map.offset.y;
  return {
    x: (cos * dx - sin * dy) / map.zoom,
    y: (sin * dx + cos * dy) / map.zoom
  };
};

/**
 * Converts a center-relative map-pixel position to center-relative display pixels:
 * d = R(θ) · (m · zoom) + offset
 */
export const mapToDisplaySpace = (position: Point2, map: MapTransform): Point2 => {
  const theta = (map.rotation * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const mx = position.x * map.zoom;
  const my = position.y * map.zoom;
  return {
    x: cos * mx - sin * my + map.offset.x,
    y: sin * mx + cos * my + map.offset.y
  };
};

/**
 * The square grid cell size in map pixels: the per-axis average of what the
 * fixed grid count implies. Grid cells are always square (battle-map squares
 * are square); when the count aspect doesn't exactly match the image aspect,
 * the residual shows up as misfit at the map edges rather than as
 * rectangular cells.
 */
export const getMapGridCellSize = (grid: Pick<GridLayerProps, 'fixedGridCount'>, mapSize: MapImageSize): number => {
  const count = grid.fixedGridCount ?? { x: 24, y: 17 };
  return (mapSize.width / count.x + mapSize.height / count.y) / 2;
};

/**
 * Builds the synthetic DisplayProps used by map-anchored layers in MapDefined
 * mode. Resolution is the map image size in source pixels; size is chosen so
 * one (square) grid cell spans exactly grid.spacing "inches" on both axes,
 * which makes all existing display-space math (cell size, snapping, brush
 * widths, distances) come out in map pixels without modification.
 */
export const getMapSpaceDisplay = (
  grid: GridForMapSpace,
  mapSize: MapImageSize,
  display: DisplayProps
): DisplayProps => {
  const cell = getMapGridCellSize(grid, mapSize);
  return {
    padding: { x: 0, y: 0 },
    resolution: { x: mapSize.width, y: mapSize.height },
    size: { x: (mapSize.width * grid.spacing) / cell, y: (mapSize.height * grid.spacing) / cell },
    maxPixelRatio: display.maxPixelRatio
  };
};

/**
 * The locked map zoom for MapDefined mode: the zoom at which one map grid
 * cell spans exactly grid.spacing inches on the physical display. The count
 * describes the map image (X along the image's width), so the cell — and the
 * locked zoom — are invariant under map rotation.
 */
export const getLockedMapZoom = (grid: GridForMapSpace, display: DisplayForMapSpace, mapSize: MapImageSize): number => {
  const cellMapPx = getMapGridCellSize(grid, mapSize);
  const cellDisplayPx = (grid.spacing * display.resolution.x) / display.size.x;
  return cellDisplayPx / cellMapPx;
};

export interface AlignedMapTransform {
  rotation: number;
  zoom: number;
  offset: Point2;
}

/**
 * Computes the full aligned map transform for MapDefined mode: cardinal
 * rotation to match the display orientation, the locked zoom, and an initial
 * offset that centers the map on the display rect when it fits and aligns
 * the map's top-left with the display rect's top-left when it overflows.
 *
 * Replaces the duplicated alignMapToGrid math in apps/web (client GridControls
 * and server scene creation).
 */
export const getAlignedMapTransform = (
  grid: GridForMapSpace,
  display: DisplayForMapSpace,
  mapSize: MapImageSize
): AlignedMapTransform => {
  // Rotate when the map's orientation mismatches the display's, so the TV
  // window covers more of the map
  const mapAspect = mapSize.width / mapSize.height;
  const displayAspect = display.resolution.x / display.resolution.y;

  const rotation = (mapAspect < 1 && displayAspect > 1) || (mapAspect > 1 && displayAspect < 1) ? 90 : 0;
  const zoom = getLockedMapZoom(grid, display, mapSize);

  const scaledWidth = (rotation === 90 ? mapSize.height : mapSize.width) * zoom;
  const scaledHeight = (rotation === 90 ? mapSize.width : mapSize.height) * zoom;

  // Centered when the map fits the display rect; top-left aligned when it overflows
  const offsetX = scaledWidth <= display.resolution.x ? 0 : -display.resolution.x / 2 + scaledWidth / 2;
  const offsetY = scaledHeight <= display.resolution.y ? 0 : display.resolution.y / 2 - scaledHeight / 2;

  return { rotation, zoom, offset: { x: offsetX, y: offsetY } };
};
