import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import { type MeasurementLayerProps } from './types';
import { type DisplayProps } from '../Stage/types';
import { type GridLayerProps } from '../GridLayer/types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: MeasurementLayerProps;
    isActive: boolean;
    display: DisplayProps;
    grid: GridLayerProps;
    sceneRotation?: number;
    onMeasurementStart?: (startPoint: THREE.Vector2, type: number) => void;
    onMeasurementUpdate?: (startPoint: THREE.Vector2, endPoint: THREE.Vector2, type: number) => void;
    onMeasurementEnd?: () => void;
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
declare const MeasurementLayer: import("svelte").Component<Props, {
    getCurrentMeasurement: () => {
        startPoint: THREE.Vector2 | null;
        endPoint: THREE.Vector2 | null;
        type: number;
    } | null;
    isCurrentlyDrawing: () => boolean;
}, "">;
type MeasurementLayer = ReturnType<typeof MeasurementLayer>;
export default MeasurementLayer;
