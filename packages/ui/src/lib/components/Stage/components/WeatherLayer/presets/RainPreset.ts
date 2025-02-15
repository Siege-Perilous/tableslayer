import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';
export default {
  fov: 49,
  intensity: 1,
  opacity: 0.96,
  depthOfField: {
    enabled: true,
    focus: 0.75,
    focalLength: 3.369565217391304,
    bokehScale: 17.27173913043478,
    kernelSize: KernelSize.MEDIUM
  },
  particles: {
    count: 2000,
    type: 2,
    color: '#e0e0e0',
    fadeInTime: 3.04,
    fadeOutTime: 1.85,
    lifetime: 4.619565217391305,
    spawnArea: {
      minRadius: 0.01,
      maxRadius: 0.05
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
        z: 0.043478260869565216
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
      x: 0.14130434782608695,
      y: 1
    },
    size: {
      min: 0.002,
      max: 0.004
    }
  }
} as WeatherLayerPreset;
