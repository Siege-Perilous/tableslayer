import * as THREE from 'three';
import { type DrawingLayerProps, InitialState } from './types';
import type { Size } from '../../types';
import { RenderMode } from './types';
interface Props {
    props: DrawingLayerProps;
    size: Size | null;
    initialState: InitialState;
    onRender: (texture: THREE.Texture) => void;
}
declare const DrawingMaterial: import("svelte").Component<Props, {
    clear: () => void;
    fill: () => void;
    revert: () => void;
    resetCursor: () => void;
    render: (operation: RenderMode, persist?: boolean, lastTexture?: THREE.Texture | null) => void;
    drawPath: (start: THREE.Vector2, last: THREE.Vector2 | null, persist: boolean) => void;
    getTexture: () => THREE.Texture<unknown>;
    toPng: () => Promise<Blob>;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width?: number, height?: number) => Promise<void>;
}, "">;
type DrawingMaterial = ReturnType<typeof DrawingMaterial>;
export default DrawingMaterial;
