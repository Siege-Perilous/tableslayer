import circle from './particles/images/circle_05.png';

export enum ParticleType {
  Circle = 'circle'
}

export const ParticleImageURLs = {
  [ParticleType.Circle]: {
    url: circle
  }
} as const;

export interface ParticleProps {
  count: number;
  type: ParticleType;
  lifetime: number;
  spawnArea: {
    width: number;
    height: number;
  };
  velocity: {
    x: number;
    y: number;
    z: number;
  };
  forces: {
    x: (t: number) => number;
    y: (t: number) => number;
    z: (t: number) => number;
  };
  color: string;
}
