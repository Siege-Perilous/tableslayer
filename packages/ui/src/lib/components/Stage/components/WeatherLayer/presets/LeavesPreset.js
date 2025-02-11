export default {
  count: 500,
  type: 3,
  color: '#ffffff',
  opacity: 0.76,
  fadeInTime: 3,
  fadeOutTime: 2,
  lifetime: 5,
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
      z: 0.05
    },
    exponential: {
      x: 0,
      y: 0,
      z: 0
    },
    sinusoidal: {
      amplitude: {
        x: 0.007,
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
    velocity: 0.2,
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
