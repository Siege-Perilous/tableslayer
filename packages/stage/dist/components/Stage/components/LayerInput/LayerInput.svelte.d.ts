import * as THREE from 'three';
import type { Size } from '../../types';
interface Props {
    id?: string;
    isActive: boolean;
    target?: THREE.Mesh;
    layerSize?: Size | null;
    onMouseDown?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseUp?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseMove?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onContextMenu?: (e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onWheel?: (e: WheelEvent) => void;
}
declare const LayerInput: import("svelte").Component<Props, {
    getId: () => string | undefined;
}, "">;
type LayerInput = ReturnType<typeof LayerInput>;
export default LayerInput;
