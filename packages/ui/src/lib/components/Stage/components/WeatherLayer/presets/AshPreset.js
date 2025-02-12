export default {
  count: 1000,
  type: 4,
  color: '#c0c0c0',
  opacity: 1,
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
      z: 0.01
    },
    exponential: {
      x: 0,
      y: 0,
      z: 0
    },
    sinusoidal: {
      amplitude: {
        x: 0.005,
        y: 0.008,
        z: 0
      },
      frequency: {
        x: 0.1,
        y: 0.2,
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
    min: 0.002,
    max: 0.005
  }
};
