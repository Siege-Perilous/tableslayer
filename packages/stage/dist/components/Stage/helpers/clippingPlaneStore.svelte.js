import * as THREE from 'three';
export const clippingPlaneStore = $state({
    value: [
        new THREE.Plane(new THREE.Vector3(-1, 0, 0)),
        new THREE.Plane(new THREE.Vector3(1, 0, 0)),
        new THREE.Plane(new THREE.Vector3(0, 1, 0)),
        new THREE.Plane(new THREE.Vector3(0, -1, 0))
    ]
});
export function updateClippingPlanes(sceneProps, displayProps) {
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
