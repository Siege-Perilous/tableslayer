import * as THREE from 'three';
import type { MapLayerProps } from '../components/MapLayer/types';
import type { SceneLayerProps } from '../components/Scene/types';
import type { DisplayProps } from '../components/Stage/types';
import type { Size } from '../types';

export const clippingPlaneStore: { value: THREE.Plane[] } = $state({
  value: [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(0, 1, 0)),
    new THREE.Plane(new THREE.Vector3(0, -1, 0))
  ]
});

export const mapClippingPlaneStore: { value: THREE.Plane[] } = $state({
  value: [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(0, 1, 0)),
    new THREE.Plane(new THREE.Vector3(0, -1, 0))
  ]
});

// Builds world-space clipping planes for a rectangle defined in scene-local
// coordinates (center, rotation in radians, half extents), accounting for the
// scene's offset and zoom
const rectClippingPlanes = (
  sceneProps: SceneLayerProps,
  center: { x: number; y: number },
  rotation: number,
  halfExtents: { x: number; y: number }
) => {
  const { x: offsetX, y: offsetY } = sceneProps.offset;
  const zoom = sceneProps.zoom;
  const axisX = new THREE.Vector3(Math.cos(rotation), Math.sin(rotation), 0);
  const axisY = new THREE.Vector3(-Math.sin(rotation), Math.cos(rotation), 0);
  const centerAlongX = center.x * axisX.x + center.y * axisX.y;
  const centerAlongY = center.x * axisY.x + center.y * axisY.y;
  const offsetAlongX = offsetX * axisX.x + offsetY * axisX.y;
  const offsetAlongY = offsetX * axisY.x + offsetY * axisY.y;

  return [
    new THREE.Plane(axisX.clone().negate(), zoom * (halfExtents.x + centerAlongX) + offsetAlongX),
    new THREE.Plane(axisX, zoom * (halfExtents.x - centerAlongX) - offsetAlongX),
    new THREE.Plane(axisY.clone().negate(), zoom * (halfExtents.y + centerAlongY) + offsetAlongY),
    new THREE.Plane(axisY, zoom * (halfExtents.y - centerAlongY) - offsetAlongY)
  ];
};

export function updateClippingPlanes(sceneProps: SceneLayerProps, displayProps: DisplayProps) {
  // Whenever the scene is translated/zoomed, update the clipping planes
  clippingPlaneStore.value = rectClippingPlanes(sceneProps, { x: 0, y: 0 }, 0, {
    x: displayProps.resolution.x / 2,
    y: displayProps.resolution.y / 2
  });
}

export function updateMapClippingPlanes(
  sceneProps: SceneLayerProps,
  mapProps: MapLayerProps,
  mapSize: Size | null,
  displayProps: DisplayProps
) {
  // Until the map image has loaded, fall back to the display bounds
  if (!mapSize) {
    mapClippingPlaneStore.value = rectClippingPlanes(sceneProps, { x: 0, y: 0 }, 0, {
      x: displayProps.resolution.x / 2,
      y: displayProps.resolution.y / 2
    });
    return;
  }

  mapClippingPlaneStore.value = rectClippingPlanes(sceneProps, mapProps.offset, (mapProps.rotation / 180.0) * Math.PI, {
    x: (mapSize.width * mapProps.zoom) / 2,
    y: (mapSize.height * mapProps.zoom) / 2
  });
}
