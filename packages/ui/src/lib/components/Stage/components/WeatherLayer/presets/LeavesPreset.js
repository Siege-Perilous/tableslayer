export default {
  count: 1000,
  type: 3,
  color: '#ffffff',
  opacity: 1.0,
  fadeInTime: 8,
  fadeOutTime: 6,
  lifetime: 12,
  spawnArea: {
    minRadius: 0.03,
    maxRadius: 0.5
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
      z: 0.006
    },
    exponential: {
      x: 0,
      y: 0,
      z: 0
    },
    sinusoidal: {
      amplitude: {
        x: 0.003,
        y: 0.002,
        z: 0
      },
      frequency: {
        x: 0.2,
        y: 0.1,
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
    min: 0.005,
    max: 0.007
  }
};
