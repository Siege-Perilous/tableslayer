import * as THREE from 'three';
export declare function textureToBase64(texture: THREE.DataTexture): string;
export declare function base64ToTexture(base64: string): Promise<unknown>;
