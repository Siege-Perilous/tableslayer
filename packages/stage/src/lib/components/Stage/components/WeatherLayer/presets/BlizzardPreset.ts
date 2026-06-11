import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

// Driving snow: dense flakes stream diagonally in a narrow depth band
// so their apparent size stays steady as they cross the map
export default {
  fov: 70,
  intensity: 0.85,
  opacity: 0.95,
  depthOfField: {
    enabled: false,
    focus: 0,
    focalLength: 0,
    bokehScale: 0,
    kernelSize: KernelSize.LARGE
  },
  particles: {
    maxParticleCount: 6000,
    opacity: 0.9,
    type: 1,
    color: '#ffffff',
    fadeInTime: 0.5,
    fadeOutTime: 0.75,
    lifetime: 3.5,
    spawnArea: {
      minRadius: 0.01,
      maxRadius: 0.2
    },
    initialVelocity: {
      x: 0.05,
      y: 0,
      z: 0.11
    },
    force: {
      linear: {
        x: 0.004,
        y: 0.002,
        z: -0.022
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.008,
          y: 0.006,
          z: 0
        },
        frequency: {
          x: 3,
          y: 2.5,
          z: 0
        }
      }
    },
    rotation: {
      alignRadially: false,
      offset: 0,
      velocity: 2,
      randomize: true
    },
    scale: {
      x: 1,
      y: 1
    },
    size: {
      min: 0.0007,
      max: 0.0022
    }
  }
} as WeatherLayerPreset;
