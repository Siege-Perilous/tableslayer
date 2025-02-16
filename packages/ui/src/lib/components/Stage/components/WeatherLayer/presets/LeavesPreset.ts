import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';
export default {
  fov: 30,
  intensity: 0.5,
  opacity: 0.5,
  depthOfField: {
    enabled: true,
    focus: 0.6,
    focalLength: 1.5,
    bokehScale: 10.0,
    kernelSize: KernelSize.MEDIUM
  },
  particles: {
    count: 20,
    type: 3,
    color: '#ffffff',
    fadeInTime: 8,
    fadeOutTime: 3,
    lifetime: 12,
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
        z: 0.002
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.001,
          y: 0.0012,
          z: 0
        },
        frequency: {
          x: 0.1,
          y: 0.07,
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
      min: 0.001,
      max: 0.004
    }
  }
} as WeatherLayerPreset;
