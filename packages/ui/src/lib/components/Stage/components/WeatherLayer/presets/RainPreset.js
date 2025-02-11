export default {
  count: 5000,
  type: 2,
  color: '#e0e0e0',
  opacity: 0.7,
  fadeInTime: 0,
  fadeOutTime: 1.5,
  lifetime: 3,
  spawnArea: {
    minRadius: 0.04,
    maxRadius: 0.4
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
      z: 0.4
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
    x: 0.5,
    y: 1
  },
  size: {
    min: 0.001,
    max: 0.003
  }
};
