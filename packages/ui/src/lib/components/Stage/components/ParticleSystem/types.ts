import ash from './particles/atlases/ash.png';
import leaves from './particles/atlases/leaves.png';
import rain from './particles/atlases/rain.png';
import snow from './particles/atlases/snow.png';

export enum ParticleType {
  Snow = 1,
  Rain = 2,
  Leaves = 3,
  Ash = 4
}

export const ParticleData = {
  [ParticleType.Snow]: {
    url: snow,
    size: 768,
    columns: 3,
    rows: 3
  },
  [ParticleType.Rain]: {
    url: rain,
    size: 768,
    columns: 3,
    rows: 3
  },
  [ParticleType.Leaves]: {
    url: leaves,
    size: 768,
    columns: 3,
    rows: 3
  },
  [ParticleType.Ash]: {
    url: ash,
    size: 768,
    columns: 3,
    rows: 3
  }
} as const;

export interface ParticleSystemProps {
  count: number;
  type: ParticleType;
  lifetime: number;
  color: string;
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
  rotation: {
    alignRadially: boolean;
    offset: number;
    velocity: number;
    randomize: boolean;
  };
  scale: {
    x: number;
    y: number;
  };
  size: {
    min: number;
    max: number;
  };
  spawnArea: {
    minRadius: number;
    maxRadius: number;
  };
}
