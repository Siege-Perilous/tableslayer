import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

export default {
  fov: 20,
  intensity: 0.5,
  opacity: 0.9,
  depthOfField: {
    enabled: true,
    focus: 0.75,
    focalLength: 6.6,
    bokehScale: 250.0,
    kernelSize: KernelSize.LARGE
  },
  particles: {
    count: 100,
    type: 4,
    color: '#404040',
    fadeInTime: 7,
    fadeOutTime: 2,
    lifetime: 10,
    spawnArea: {
      minRadius: 0.01,
      maxRadius: 0.08
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
          y: 0.0011,
          z: 0
        },
        frequency: {
          x: 0.001,
          y: 0.0008,
          z: 0
        }
      }
    },
    rotation: {
      alignRadially: false,
      offset: 0,
      velocity: 1,
      randomize: true
    },
    scale: {
      x: 1,
      y: 1
    },
    size: {
      min: 0.001,
      max: 0.002
    }
  }
} as WeatherLayerPreset;
