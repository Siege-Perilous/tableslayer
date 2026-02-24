import { type AnnotationsLayerProps } from './types';
import { StageMode, type DisplayProps } from '../Stage/types';
interface Props {
    props: AnnotationsLayerProps;
    mode: StageMode;
    isActive: boolean;
    display: DisplayProps;
    sceneZoom: number;
}
declare const AnnotationLayer: import("svelte").Component<Props, {
    isDrawing: () => boolean;
    clear: (layerId: string) => void;
    toPng: () => Promise<Blob>;
    toRLE: () => Promise<Uint8Array>;
    fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void | undefined>;
    loadMask: (layerId: string, rleData: Uint8Array) => Promise<void>;
}, "">;
type AnnotationLayer = ReturnType<typeof AnnotationLayer>;
export default AnnotationLayer;
