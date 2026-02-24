import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import type { GridLayerProps } from '../../GridLayer/types';
import { type MeasurementLayerProps } from '../types';
import { BaseMeasurement } from './BaseMeasurement';
export declare class BeamMeasurement extends BaseMeasurement {
    private beamWidth;
    constructor(startPoint: THREE.Vector2, measurementProps: MeasurementLayerProps, displayProps: DisplayProps, gridProps: GridLayerProps);
    renderShape(): void;
}
