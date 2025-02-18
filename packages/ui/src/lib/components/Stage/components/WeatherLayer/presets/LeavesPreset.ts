import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

export default {
  fov: 30,
  intensity: 0.5,
  opacity: 1,
  depthOfField: {
    enabled: true,
    focus: 0.7,
    focalLength: 4,
    bokehScale: 50,
    kernelSize: KernelSize.VERY_LARGE
  },
  particles: {
    maxParticleCount: 50,
    type: 3,
    color: '#ffffff',
    fadeInTime: 7,
    fadeOutTime: 1,
    lifetime: 15,
    spawnArea: {
      minRadius: 0.20142663043478262,
      maxRadius: 0.27751358695652173
    },
    initialVelocity: {
      x: 0,
      y: 0,
      z: 0
    },
    force: {
      linear: {
        x: 0,
        y: 0,
        z: 0.02
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.01,
          y: 0.015,
          z: 0
        },
        frequency: {
          x: 0.3,
          y: 0.5,
          z: 0
        }
      }
    },
    rotation: {
      alignRadially: false,
      offset: 0,
      velocity: 0.9,
      randomize: true
    },
    scale: {
      x: 1,
      y: 1
    },
    size: {
      min: 0.025611413043478262,
      max: 0.0484375
    }
  }
} as WeatherLayerPreset;
