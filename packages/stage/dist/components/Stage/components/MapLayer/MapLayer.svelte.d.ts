import * as THREE from 'three';
import type { Size } from '../../types';
import type { StageProps } from '../Stage/types';
interface Props {
    props: StageProps;
    onMapLoading: () => void;
    onMapLoaded: (mapUrl: string, mapSize: Size) => void;
}
declare const MapLayer: import("svelte").Component<Props, {
    getCompositeMapTexture: () => THREE.Texture | null;
    fill: () => void;
    fit: () => void;
    mapSize: Size | null;
    fogOfWar: {
        clear: () => void;
        reset: () => void;
        toPng: () => Promise<Blob>;
        toRLE: () => Promise<Uint8Array<ArrayBufferLike>>;
        fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
        isDrawing: () => boolean;
    };
}, "">;
type MapLayer = ReturnType<typeof MapLayer>;
export default MapLayer;
