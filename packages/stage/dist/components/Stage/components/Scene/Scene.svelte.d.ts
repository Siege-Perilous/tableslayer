import * as THREE from 'three';
import { type StageProps } from '../Stage/types';
import type { CursorData } from '../CursorLayer/types';
interface Props {
    props: StageProps;
    cursors?: CursorData[];
    trackLocalCursor?: boolean;
    receivedMeasurement?: {
        startPoint: {
            x: number;
            y: number;
        };
        endPoint: {
            x: number;
            y: number;
        };
        type: number;
        beamWidth?: number;
        coneAngle?: number;
        color?: string;
        thickness?: number;
        outlineColor?: string;
        outlineThickness?: number;
        opacity?: number;
        markerSize?: number;
        autoHideDelay?: number;
        fadeoutTime?: number;
        showDistance?: boolean;
        snapToGrid?: boolean;
        enableDMG252?: boolean;
    } | null;
}
declare const Scene: import("svelte").Component<Props, {
    fill: () => void;
    fit: () => void;
    generateThumbnail: (quality?: number) => Promise<Blob>;
    annotations: {
        clear: (layerId: string) => void;
        toRLE: () => Promise<Uint8Array<ArrayBufferLike>>;
        fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
        loadMask: (layerId: string, rleData: Uint8Array) => Promise<void>;
        isDrawing: () => boolean;
    };
    map: {
        fill: () => void;
        fit: () => void;
        getSize: () => {
            width: number;
            height: number;
        } | null;
    };
    fogOfWar: {
        clear: () => void;
        reset: () => void;
        toPng: () => Promise<Blob>;
        toRLE: () => Promise<Uint8Array<ArrayBufferLike>>;
        fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
        isDrawing: () => boolean;
    };
    markers: {
        readonly isHoveringMarker: boolean;
        readonly isDraggingMarker: boolean;
        readonly hoveredMarker: import("../MarkerLayer/types").Marker | null;
        readonly selectedMarker: import("../MarkerLayer/types").Marker | null;
        maintainHover: (maintain: boolean) => void;
        onSceneChange: () => void;
    };
    measurement: {
        getCurrentMeasurement: () => {
            startPoint: THREE.Vector2 | null;
            endPoint: THREE.Vector2 | null;
            type: number;
        } | null;
        isDrawing: () => boolean;
    };
    getMarkerSizeInScreenSpace: (markerSize?: number) => number;
    getMarkerScreenPosition: (marker: {
        position?: {
            x: number;
            y: number;
        };
    }) => {
        x: number;
        y: number;
    } | null;
}, "">;
type Scene = ReturnType<typeof Scene>;
export default Scene;
