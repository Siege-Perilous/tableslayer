import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';
export default {
  fov: 50,
  intensity: 1,
  opacity: 0.3,
  depthOfField: {
    enabled: true,
    focus: 0.75,
    focalLength: 3,
    bokehScale: 80,
    kernelSize: KernelSize.MEDIUM
  },
  particles: {
    count: 8000,
    type: 2,
    color: '#e0e0e0',
    fadeInTime: 1,
    fadeOutTime: 3,
    lifetime: 4,
    spawnArea: {
      minRadius: 0.01,
      maxRadius: 0.04
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
          x: 0,
          y: 0,
          z: 0
        },
        frequency: {
          x: 5,
          y: 5,
          z: 5
        }
      }
    },
    rotation: {
      alignRadially: true,
      offset: 270,
      velocity: 0,
      randomize: false
    },
    scale: {
      x: 0.1,
      y: 1
    },
    size: {
      min: 0.001,
      max: 0.002
    }
  }
} as WeatherLayerPreset;
