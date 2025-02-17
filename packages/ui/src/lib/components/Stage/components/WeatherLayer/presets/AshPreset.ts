import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

export default {
  fov: 20,
  intensity: 0.5,
  opacity: 0.8,
  depthOfField: {
    enabled: true,
    focus: 0.75,
    focalLength: 6.6,
    bokehScale: 250.0,
    kernelSize: KernelSize.LARGE
  },
  particles: {
    maxParticleCount: 500,
    opacity: 0.5,
    type: 4,
    color: '#404040',
    fadeInTime: 5,
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
        z: 0.01
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.015,
          y: 0.014,
          z: 0
        },
        frequency: {
          x: 0.002,
          y: 0.0025,
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
      max: 0.0013
    }
  }
} as WeatherLayerPreset;
