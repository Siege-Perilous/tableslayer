import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

export default {
  fov: 90,
  intensity: 0.5,
  opacity: 0.5,
  depthOfField: {
    enabled: true,
    focus: 0.8,
    focalLength: 6.0,
    bokehScale: 180.0,
    kernelSize: KernelSize.MEDIUM
  },
  particles: {
    count: 1000,
    type: 1,
    color: '#ffffff',
    fadeInTime: 8,
    fadeOutTime: 2,
    lifetime: 10,
    spawnArea: {
      minRadius: 0.02,
      maxRadius: 0.5
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
        z: 0.005
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.001,
          y: 0.002,
          z: 0
        },
        frequency: {
          x: 2,
          y: 1,
          z: 0
        }
      }
    },
    rotation: {
      alignRadially: false,
      offset: 0,
      velocity: 0,
      randomize: true
    },
    scale: {
      x: 1,
      y: 1
    },
    size: {
      min: 0.001,
      max: 0.005
    }
  }
} as WeatherLayerPreset;
