import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

// Fireflies hover in a narrow depth band (no falling), wander sinusoidally,
// and the fade in/out over a short lifetime gives each one a random glow cycle
export default {
  fov: 90,
  intensity: 0.4,
  opacity: 1.0,
  depthOfField: {
    enabled: true,
    focus: 0.7,
    focalLength: 5.0,
    bokehScale: 60.0,
    kernelSize: KernelSize.LARGE
  },
  particles: {
    maxParticleCount: 180,
    opacity: 1.0,
    type: 5,
    color: '#d9f56a',
    fadeInTime: 1.5,
    fadeOutTime: 1.5,
    lifetime: 4,
    spawnArea: {
      minRadius: 0.02,
      maxRadius: 0.15
    },
    initialVelocity: {
      x: 0,
      y: 0,
      z: 0.12
    },
    force: {
      linear: {
        x: 0,
        y: 0,
        z: -0.024
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.008,
          y: 0.009,
          z: 0
        },
        frequency: {
          x: 0.7,
          y: 0.55,
          z: 0
        }
      }
    },
    rotation: {
      alignRadially: false,
      offset: 0,
      velocity: 0,
      randomize: false
    },
    scale: {
      x: 1,
      y: 1
    },
    size: {
      min: 0.0015,
      max: 0.004
    }
  }
} as WeatherLayerPreset;
