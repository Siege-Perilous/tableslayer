import * as THREE from 'three';
import type { SceneLayerProps } from '../components/Scene/types';
import type { DisplayProps } from '../components/Stage/types';
export declare const clippingPlaneStore: {
    value: THREE.Plane[];
};
export declare function updateClippingPlanes(sceneProps: SceneLayerProps, displayProps: DisplayProps): void;
