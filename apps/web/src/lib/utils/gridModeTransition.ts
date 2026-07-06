import {
  displayToMapSpace,
  getAlignedMapTransform,
  getLockedMapZoom,
  GridMode,
  mapToDisplaySpace,
  type StageExports,
  type StageProps
} from '@tableslayer/stage';
import { queuePropertyUpdate, queueRawSettingsUpdate } from './propertyUpdateBroadcaster';

/**
 * Switches a scene between grid modes, converting marker/light positions
 * between coordinate spaces so tokens stay visually put.
 *
 * MapDefined stores positions in center-relative map pixels; FillSpace stores
 * them in center-relative display pixels. All updates land in the same
 * microtask, i.e. one Y transaction and one undo step. Annotation drawings
 * convert lazily inside the stage when entering MapDefined; callers are
 * responsible for confirm-and-clear when leaving it.
 *
 * Entering MapDefined also applies the aligned map transform (locked zoom,
 * cardinal rotation, initial offset) when the map size is available.
 */
export const applyGridModeTransition = (stageProps: StageProps, newMode: GridMode, stage?: StageExports) => {
  const oldMode = (stageProps.grid.gridMode as GridMode) ?? GridMode.FillSpace;
  if (oldMode === newMode) return;

  // Snapshot the map transform BEFORE any alignment change: positions were
  // authored against this transform
  const map = {
    offset: { ...stageProps.map.offset },
    rotation: stageProps.map.rotation,
    zoom: stageProps.map.zoom || 1
  };

  const convert = newMode === GridMode.MapDefined ? displayToMapSpace : mapToDisplaySpace;
  const markers = stageProps.marker.markers.map((marker) => ({
    ...marker,
    position: convert(marker.position, map)
  }));
  const lights = stageProps.light.lights.map((light) => ({
    ...light,
    position: convert(light.position, map)
  }));

  queuePropertyUpdate(stageProps, ['grid', 'gridMode'], newMode, 'control');
  queuePropertyUpdate(stageProps, ['marker', 'markers'], markers, 'marker');
  queuePropertyUpdate(stageProps, ['light', 'lights'], lights, 'light');
  queueRawSettingsUpdate({ mapCoordVersion: newMode === GridMode.MapDefined ? 1 : 0 });

  if (newMode === GridMode.MapDefined) {
    alignMapForMapDefined(stageProps, stage);
  }
};

/**
 * Re-derives the locked MapDefined zoom (one grid cell = grid.spacing inches
 * on the TV) after any of its inputs change: grid count, grid spacing, or the
 * display size/resolution. The map scales about its center, so its offset and
 * all map-anchored content stay put. No-op in FillSpace mode or before the
 * map image has loaded.
 */
export const relockMapZoom = (stageProps: StageProps, stage?: StageExports) => {
  if (((stageProps.grid.gridMode as GridMode) ?? GridMode.FillSpace) !== GridMode.MapDefined) return;
  const mapSize = stage?.map.getSize();
  if (!mapSize) return;

  const zoom = getLockedMapZoom(stageProps.grid, stageProps.display, mapSize);
  queuePropertyUpdate(stageProps, ['map', 'zoom'], zoom, 'control');
};

/**
 * Applies the aligned MapDefined transform: cardinal rotation matching the
 * display orientation, the locked zoom (one grid cell = grid.spacing inches on
 * the TV), and an offset that centers the map on the TV rect or aligns
 * top-left corners when the map overflows.
 */
export const alignMapForMapDefined = (stageProps: StageProps, stage?: StageExports) => {
  const mapSize = stage?.map.getSize();
  if (!mapSize) return;

  const aligned = getAlignedMapTransform(stageProps.grid, stageProps.display, mapSize);
  queuePropertyUpdate(stageProps, ['map', 'rotation'], aligned.rotation, 'control');
  queuePropertyUpdate(stageProps, ['map', 'zoom'], aligned.zoom, 'control');
  queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], aligned.offset.x, 'control');
  queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], aligned.offset.y, 'control');
};
