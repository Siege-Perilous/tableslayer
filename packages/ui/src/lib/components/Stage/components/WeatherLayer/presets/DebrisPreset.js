export default {
  count: 500,
  type: 4,
  color: '#808080',
  opacity: 1.0,
  fadeInTime: 4,
  fadeOutTime: 3,
  lifetime: 10,
  spawnArea: {
    minRadius: 0.06,
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
        x: 0.01,
        y: 0.007,
        z: 0
      },
      frequency: {
        x: 0.2,
        y: 0.4,
        z: 0
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
    min: 0.015,
    max: 0.02
  }
};
