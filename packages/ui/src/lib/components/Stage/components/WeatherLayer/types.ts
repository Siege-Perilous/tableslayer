import type { ParticleSystemProps } from '../ParticleSystem/types';

export enum WeatherType {
  None = 0,
  Rain = 1,
  Snow = 2,
  Leaves = 3,
  Debris = 4,
  Custom = 99
}

export interface WeatherLayerProps {
  color: string;
  custom: ParticleSystemProps | null;
  fov: number;
  intensity: number;
  opacity: number;
  type: WeatherType;
}
