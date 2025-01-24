import snow from './particles/images/circle_05.png';
import rain from './particles/images/trace_01.png';

export enum ParticleType {
  Snow = 1,
  Rain = 2
}

export const ParticleImageURLs = {
  [ParticleType.Snow]: {
    url: snow
  },
  [ParticleType.Rain]: {
    url: rain
  }
} as const;

export interface ParticleSystemProps {
  count: number;
  type: ParticleType;
  lifetime: number;
  color: string;
  opacity: number;
  fadeInTime: number;
  fadeOutTime: number;
  initialVelocity: {
    x: number;
    y: number;
    z: number;
  };
  force: {
    linear: {
      x: number;
      y: number;
      z: number;
    };
    exponential: {
      x: number;
      y: number;
      z: number;
    };
    sinusoidal: {
      amplitude: {
        x: number;
        y: number;
        z: number;
      };
      frequency: {
        x: number;
        y: number;
        z: number;
      };
    };
  };
  size: {
    min: number;
    max: number;
  };
  spawnArea: {
    width: number;
    height: number;
  };
}
