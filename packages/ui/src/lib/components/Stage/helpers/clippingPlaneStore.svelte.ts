import * as THREE from 'three';
import type { SceneLayerProps } from '../components/Scene/types';
import type { DisplayProps } from '../components/Stage/types';

export const clippingPlaneStore: { value: THREE.Plane[] } = $state({
  value: [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(1, 0, 0)),
    new THREE.Plane(new THREE.Vector3(0, 1, 0)),
    new THREE.Plane(new THREE.Vector3(0, -1, 0))
  ]
});

export function updateClippingPlanes(sceneProps: SceneLayerProps, displayProps: DisplayProps) {
  // Whenever the scene is translated/zoomed, update the clipping planes
  const { x, y } = sceneProps.offset;
  const worldExtents = {
    x: sceneProps.zoom * (displayProps.resolution.x / 2),
    y: sceneProps.zoom * (displayProps.resolution.y / 2)
  };

  clippingPlaneStore.value = [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), worldExtents.x + x),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), worldExtents.x - x),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), worldExtents.y - y),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), worldExtents.y + y)
  ];
}
