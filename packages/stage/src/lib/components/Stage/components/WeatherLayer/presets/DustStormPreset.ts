import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

// Grit streams sideways in a narrow depth band (constant apparent size),
// with a secondary layer of huge faint puffs billowing along behind it
export default {
  fov: 80,
  intensity: 0.8,
  opacity: 0.75,
  depthOfField: {
    enabled: false,
    focus: 0,
    focalLength: 0,
    bokehScale: 0,
    kernelSize: KernelSize.LARGE
  },
  particles: {
    maxParticleCount: 4500,
    opacity: 0.55,
    type: 4,
    color: '#c2a36b',
    fadeInTime: 0.75,
    fadeOutTime: 0.75,
    lifetime: 3.5,
    spawnArea: {
      minRadius: 0.01,
      maxRadius: 0.25
    },
    initialVelocity: {
      x: 0.06,
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
          x: 0.006,
          y: 0.008,
          z: 0
        },
        frequency: {
          x: 2,
          y: 1.6,
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
      min: 0.0008,
      max: 0.0022
    }
  },
  secondaryParticles: {
    maxParticleCount: 250,
    opacity: 0.14,
    type: 4,
    color: '#b89a66',
    fadeInTime: 1.5,
    fadeOutTime: 1.5,
    lifetime: 5,
    spawnArea: {
      minRadius: 0.05,
      maxRadius: 0.3
    },
    initialVelocity: {
      x: 0.045,
      y: 0,
      z: 0.11
    },
    force: {
      linear: {
        x: 0.003,
        y: 0.001,
        z: -0.018
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.004,
          y: 0.004,
          z: 0
        },
        frequency: {
          x: 0.4,
          y: 0.5,
          z: 0
        }
      }
    },
    rotation: {
      alignRadially: false,
      offset: 0,
      velocity: 0.3,
      randomize: true
    },
    scale: {
      x: 1,
      y: 1
    },
    size: {
      min: 0.015,
      max: 0.04
    }
  }
} as WeatherLayerPreset;
