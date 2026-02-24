import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import { type FogOfWarLayerProps } from './types';
import type { Size } from '../../types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: FogOfWarLayerProps;
    isActive: boolean;
    mapSize: Size | null;
}
declare const FogOfWarLayer: import("svelte").Component<Props, {
    isDrawing: () => boolean;
    clearFog: () => void;
    resetFog: () => void;
    toPng: () => Promise<Blob>;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void | undefined>;
}, "">;
type FogOfWarLayer = ReturnType<typeof FogOfWarLayer>;
export default FogOfWarLayer;
