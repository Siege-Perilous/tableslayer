import * as THREE from 'three';
import { type MeasurementLayerProps } from './types';
import type { DisplayProps } from '../Stage/types';
import type { GridLayerProps } from '../GridLayer/types';
interface Props {
    props: MeasurementLayerProps;
    visible: boolean;
    displayProps: DisplayProps;
    gridProps: GridLayerProps;
    sceneRotation?: number;
    onFadeComplete?: () => void;
}
declare const MeasurementManager: import("svelte").Component<Props, {
    startMeasurement: (startPoint: THREE.Vector2) => void;
    updateMeasurement: (endPoint: THREE.Vector2) => void;
    finishMeasurement: () => void;
    clearMeasurement: () => void;
    updatePreview: (position: THREE.Vector2 | null, visible?: boolean) => void;
    hidePreview: () => void;
    showPreviewIndicator: () => void;
    displayReceivedMeasurement: (startPoint: THREE.Vector2, endPoint: THREE.Vector2, type: number, beamWidth?: number, coneAngle?: number, color?: string, thickness?: number, outlineColor?: string, outlineThickness?: number, opacity?: number, markerSize?: number, autoHideDelay?: number, fadeoutTime?: number, showDistance?: boolean, snapToGrid?: boolean, enableDMG252?: boolean) => void;
}, "">;
type MeasurementManager = ReturnType<typeof MeasurementManager>;
export default MeasurementManager;
