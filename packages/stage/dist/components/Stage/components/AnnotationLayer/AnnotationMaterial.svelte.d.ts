import * as THREE from 'three';
import { type AnnotationLayerData } from './types';
import type { DisplayProps } from '../Stage/types';
interface Props {
    props: AnnotationLayerData;
    display: DisplayProps;
    lineWidth?: number;
}
declare const AnnotationMaterial: import("svelte").Component<Props, {
    getId: () => string;
    revertChanges: () => void;
    resetCursor: () => void;
    clear: () => void;
    drawPath: (start: THREE.Vector2, last?: THREE.Vector2 | null, persist?: boolean) => void;
    toPng: () => Promise<Blob>;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
}, "">;
type AnnotationMaterial = ReturnType<typeof AnnotationMaterial>;
export default AnnotationMaterial;
