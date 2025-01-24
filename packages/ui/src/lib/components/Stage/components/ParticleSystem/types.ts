import circle from './particles/images/circle_05.png';

export enum ParticleType {
  Circle = 1
}

export const ParticleImageURLs = {
  [ParticleType.Circle]: {
    url: circle
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
    amplitude: {
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
        x: number;
        y: number;
        z: number;
      };
      noise: {
        x: number;
        y: number;
        z: number;
      };
    };
    frequency: {
      sinusoidal: {
        x: number;
        y: number;
        z: number;
      };
      noise: {
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
