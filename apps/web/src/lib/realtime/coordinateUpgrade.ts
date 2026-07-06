import { displayToMapSpace, GridMode } from '@tableslayer/stage';
import { getSceneSnapshot } from './docSchema';
import type { SessionDocClient } from './SessionDocClient.svelte';
import type { SceneSettings } from './types';

/**
 * Derives a legacy MapDefined scene's grid count from its stored map
 * transform. In the old display-space model the grid always drew 1-inch
 * (grid.spacing) cells and alignment came purely from the map zoom, so
 * fixedGridCount could be stale (often the 24×17 default) while the scene
 * still looked aligned. The count implied by the transform reproduces the
 * exact cell size the scene used to show:
 *
 *   cells = (map px × zoom) / display px per cell
 *
 * Returns null when the stored count should be kept: it matches the implied
 * count within rounding wobble (±1, e.g. filename-derived counts where the
 * aligned zoom averages both axes).
 */
export const reconcileGridCount = (
  settings: Pick<
    SceneSettings,
    'gridSpacing' | 'displayResolutionX' | 'displaySizeX' | 'mapZoom' | 'gridMapDefinedX' | 'gridMapDefinedY'
  >,
  mapSize: { width: number; height: number }
): { x: number; y: number } | null => {
  // Display pixels per grid cell (pixel pitch is uniform on square-pixel displays)
  const cellPx = (settings.gridSpacing ?? 1) * ((settings.displayResolutionX ?? 1920) / (settings.displaySizeX || 1));
  if (!cellPx || !Number.isFinite(cellPx)) return null;

  // The count describes the map image (X along the image's width, invariant
  // under rotation); a cell's on-screen size is zoom-scaled the same way on
  // both axes, so rotation never enters the formula. This also corrects
  // legacy rotated scenes, whose counts were stored display-oriented.
  const zoom = settings.mapZoom || 1;
  const implied = {
    x: Math.max(1, Math.round((mapSize.width * zoom) / cellPx)),
    y: Math.max(1, Math.round((mapSize.height * zoom) / cellPx))
  };

  const storedX = settings.gridMapDefinedX;
  const storedY = settings.gridMapDefinedY;
  if (storedX != null && storedY != null && Math.abs(implied.x - storedX) < 2 && Math.abs(implied.y - storedY) < 2) {
    return null;
  }
  return implied;
};

/**
 * Upgrades a MapDefined scene from legacy display-space marker/light
 * coordinates (mapCoordVersion 0) to center-relative map pixels (version 1),
 * and reconciles a stale fixedGridCount with the count implied by the stored
 * map transform (requires the loaded map's pixel size — call after the stage
 * has loaded the map).
 *
 * All rows and the version flag are written in one system transaction
 * (excluded from undo). Safe to call unconditionally on scene load: it no-ops
 * for FillSpace scenes and already-upgraded scenes, and concurrent upgraders
 * converge because the conversion is deterministic from the same v0 base.
 *
 * Returns true if an upgrade was performed.
 */
export const upgradeSceneCoordinates = (
  client: SessionDocClient,
  sceneId: string,
  mapSize: { width: number; height: number } | null = null
): boolean => {
  const snapshot = getSceneSnapshot(client.doc, sceneId);
  if (!snapshot) return false;

  const settings = snapshot.settings;
  if ((settings.gridMode ?? 0) !== GridMode.MapDefined) return false;
  if ((settings.mapCoordVersion ?? 0) === 1) return false;

  const map = {
    offset: { x: settings.mapOffsetX ?? 0, y: settings.mapOffsetY ?? 0 },
    rotation: settings.mapRotation ?? 0,
    zoom: settings.mapZoom || 1
  };

  const settingsFields: Partial<SceneSettings> = { mapCoordVersion: 1 };
  if (mapSize) {
    const count = reconcileGridCount(settings, mapSize);
    if (count) {
      settingsFields.gridMapDefinedX = count.x;
      settingsFields.gridMapDefinedY = count.y;
    }
  }

  client.systemWrite.transaction(() => {
    for (const marker of snapshot.markers) {
      const position = displayToMapSpace({ x: marker.positionX, y: marker.positionY }, map);
      client.systemWrite.setMarkerFields(sceneId, marker.id, { positionX: position.x, positionY: position.y });
    }
    for (const light of snapshot.lights) {
      const position = displayToMapSpace({ x: light.positionX, y: light.positionY }, map);
      client.systemWrite.setLightFields(sceneId, light.id, { positionX: position.x, positionY: position.y });
    }
    client.systemWrite.setSceneSettings(sceneId, settingsFields);
  });

  return true;
};
