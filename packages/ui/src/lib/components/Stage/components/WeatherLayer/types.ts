import type { ParticleSystemProps } from '../ParticleSystem/types';

export enum WeatherType {
  Rain = 0
}

export interface WeatherLayerProps {
  camera: {
    fov: number;
  };
  particles: ParticleSystemProps;
}
