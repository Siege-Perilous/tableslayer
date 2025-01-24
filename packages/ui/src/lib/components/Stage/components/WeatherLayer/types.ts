import type { ParticleSystemProps } from '../ParticleSystem/types';

export enum WeatherType {
  Rain = 0
}

export interface WeatherLayerProps {
  camera: {
    position: { x: number; y: number; z: number };
    fov: number;
    near: number;
    far: number;
  };
  particles: ParticleSystemProps;
}
