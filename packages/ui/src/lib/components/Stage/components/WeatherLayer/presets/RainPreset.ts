import type { WeatherLayerPreset } from '../types';
export default {
  fov: 37,
  intensity: 0.3,
  opacity: 0.5,
  depthOfField: {
    enabled: false,
    focus: 0,
    focalLength: 0,
    bokehScale: 0,
    kernelSize: 0
  },
  particles: {
    maxParticleCount: 2500,
    type: 2,
    color: '#e0e0e0',
    fadeInTime: 1,
    fadeOutTime: 3,
    lifetime: 3,
    spawnArea: {
      minRadius: 0.005,
      maxRadius: 0.01
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
      x: 0.2,
      y: 1
    },
    size: {
      min: 0.001,
      max: 0.001
    }
  }
} as WeatherLayerPreset;
