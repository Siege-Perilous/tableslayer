import type { KernelSize } from 'postprocessing';
import type { ParticleSystemProps } from '../ParticleSystem/types';

export enum WeatherType {
  None = 0,
  Rain = 1,
  Snow = 2,
  Leaves = 3,
  Ash = 4,
  Custom = 99
}

export interface DepthOfFieldConfig {
  enabled: boolean;
  focus: number;
  focalLength: number;
  bokehScale: number;
  kernelSize: KernelSize;
}

export interface WeatherLayerPreset {
  fov: number;
  intensity: number;
  opacity: number;
  depthOfField: DepthOfFieldConfig;
  particles: ParticleSystemProps;
}

export interface WeatherLayerProps {
  type: WeatherType;
  fov?: number;
  intensity?: number;
  opacity?: number;
  custom?: WeatherLayerPreset;
}
