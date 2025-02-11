import type { ParticleSystemProps } from '../ParticleSystem/types';

export enum WeatherType {
  None = 0,
  Rain = 1,
  Snow = 2,
  Leaves = 3,
  Ash = 4,
  Custom = 99
}

export interface WeatherLayerProps {
  custom: ParticleSystemProps | null;
  fov: number;
  intensity: number;
  opacity: number;
  type: WeatherType;
}
