import { KernelSize } from 'postprocessing';
import type { WeatherLayerPreset } from '../types';

export default {
  fov: 88,
  intensity: 0.5,
  opacity: 0.5,
  depthOfField: {
    enabled: true,
    focus: 0.967391304347826,
    focalLength: 3.804347826086957,
    bokehScale: 55.23913043478261,
    kernelSize: KernelSize.VERY_LARGE
  },
  particles: {
    count: 20,
    type: 3,
    color: '#ffffff',
    fadeInTime: 5.33,
    fadeOutTime: 2.28,
    lifetime: 10,
    spawnArea: {
      minRadius: 0.11956521739130435,
      maxRadius: 0.16304347826086957
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
        z: 0.005434782608695652
      },
      exponential: {
        x: 0,
        y: 0,
        z: 0
      },
      sinusoidal: {
        amplitude: {
          x: 0.005978260869565218,
          y: 0.007608695652173914,
          z: 0
        },
        frequency: {
          x: 0.6521739130434783,
          y: 0.9782608695652174,
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
      min: 0.015217391304347828,
      max: 0.02717391304347826
    }
  }
} as WeatherLayerPreset;
