import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

// Embers rise: particles are thrown deep, then drawn back toward the camera,
// so they grow as they "float up" off the map before winking out
export default {
  fov: 25,
  intensity: 0.8,
  opacity: 0.9,
  depthOfField: {
    enabled: true,
    focus: 0.75,
    focalLength: 6.6,
    bokehScale: 150.0,
    kernelSize: KernelSize.LARGE
  },
  particles: {
    maxParticleCount: 500,
    opacity: 0.85,
    type: 4,
    color: '#ff7733',
    fadeInTime: 3,
    fadeOutTime: 1,
    lifetime: 6,
    spawnArea: {
      minRadius: 0.01,
      maxRadius: 0.1
    },
    initialVelocity: {
      x: 0,
      y: 0,
      z: 0.3
    },
    force: {
      linear: {
        x: 0.002,
        y: 0.0015,
        z: -0.05
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.01,
          y: 0.009,
          z: 0
        },
        frequency: {
          x: 0.6,
          y: 0.75,
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
      min: 0.0012,
      max: 0.002
    }
  }
} as WeatherLayerPreset;
