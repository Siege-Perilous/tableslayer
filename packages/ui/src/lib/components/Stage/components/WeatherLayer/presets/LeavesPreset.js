export default {
  count: 500,
  type: 3,
  color: '#ffffff',
  opacity: 0.5,
  fadeInTime: 3,
  fadeOutTime: 2,
  lifetime: 10,
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
      z: 0.01
    },
    exponential: {
      x: 0,
      y: 0,
      z: 0
    },
    sinusoidal: {
      amplitude: {
        x: 0.003,
        y: 0.004,
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
    velocity: 0.9,
    randomize: true
  },
  scale: {
    x: 1,
    y: 1
  },
  size: {
    min: 0.01,
    max: 0.012
  }
};
