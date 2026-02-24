import type { Callbacks, StageProps } from './types';
import type { CursorData } from './types';
interface Props {
    props: StageProps;
    callbacks: Callbacks;
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
    cursors?: CursorData[];
    trackLocalCursor?: boolean;
    hoveredMarkerId?: string | null;
    pinnedMarkerIds?: string[];
    onPinToggle?: (markerId: string, pinned: boolean) => void;
}
declare const Stage: import("svelte").Component<Props, {
    annotations: {
        clear: (layerId: string) => void | undefined;
        toRLE: () => Promise<Uint8Array<ArrayBufferLike>>;
        fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
        loadMask: (layerId: string, rleData: Uint8Array) => Promise<void>;
        isDrawing: () => boolean;
    };
    map: {
        fill: () => void | undefined;
        fit: () => void | undefined;
        getSize: () => {
            width: number;
            height: number;
        } | null;
    };
    fogOfWar: {
        clear: () => void | undefined;
        reset: () => void | undefined;
        toPng: () => Promise<Blob>;
        toRLE: () => Promise<Uint8Array<ArrayBufferLike>>;
        fromRLE: (rleData: Uint8Array, width: number, height: number) => Promise<void>;
        isDrawing: () => boolean;
    };
    scene: {
        fill: () => void | undefined;
        fit: () => void | undefined;
        generateThumbnail: () => Promise<Blob>;
    };
    markers: {
        readonly isHoveringMarker: boolean;
        readonly isDraggingMarker: boolean;
    };
    measurement: {
        getCurrentMeasurement: () => {
            startPoint: {
                x: number;
                y: number;
            } | null;
            endPoint: {
                x: number;
                y: number;
            } | null;
            type: number;
        } | null;
        isDrawing: () => boolean;
    };
    onSceneChange: () => void;
}, "">;
type Stage = ReturnType<typeof Stage>;
export default Stage;
