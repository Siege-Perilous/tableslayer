import * as THREE from 'three';
import { type FogOfWarLayerProps } from './types';
import type { Size } from '../../types';
interface Props {
    props: FogOfWarLayerProps;
    mapSize: Size | null;
}
declare const FogOfWarMaterial: import("svelte").Component<Props, {
    revertChanges: () => void;
    clear: () => void;
    fill: () => void;
    drawPath: (start: THREE.Vector2, last?: THREE.Vector2 | null, persist?: boolean) => void;
    toPng: () => Promise<Blob>;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
}, "">;
type FogOfWarMaterial = ReturnType<typeof FogOfWarMaterial>;
export default FogOfWarMaterial;
