export default {
  count: 1000,
  type: 1,
  color: '#e0e0e0',
  opacity: 1,
  fadeInTime: 4,
  fadeOutTime: 3,
  lifetime: 7,
  spawnArea: {
    minRadius: 0.02,
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
      z: 0.05
    },
    exponential: {
      x: 0,
      y: 0,
      z: 0
    },
    sinusoidal: {
      amplitude: {
        x: 0.002,
        y: 0.003,
        z: 0
      },
      frequency: {
        x: 3,
        y: 1.9,
        z: 5
      }
    }
  },
  rotation: {
    alignRadially: false,
    offset: 0,
    velocity: 0,
    randomize: true
  },
  scale: {
    x: 1,
    y: 1
  },
  size: {
    min: 0.003,
    max: 0.007
  }
};
