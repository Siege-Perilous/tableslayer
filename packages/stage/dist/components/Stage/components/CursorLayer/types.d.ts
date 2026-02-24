export interface CursorData {
    id: string;
    worldPosition: {
        x: number;
        y: number;
        z: number;
    };
    color: string;
    label?: string;
    opacity: number;
    lastUpdateTime: number;
}
export interface CursorLayerProps {
    cursors: CursorData[];
    showLabels: boolean;
    fadeOutDelay: number;
    fadeOutDuration: number;
    gridSpacing?: number;
    displaySize?: {
        x: number;
        y: number;
    };
    displayResolution?: {
        x: number;
        y: number;
    };
    sceneZoom?: number;
}
