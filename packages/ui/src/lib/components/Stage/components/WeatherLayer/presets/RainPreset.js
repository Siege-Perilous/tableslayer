export default {
  count: 200,
  type: 2,
  color: '#42d8d3',
  opacity: 0.7,
  fadeInTime: 0,
  fadeOutTime: 1.5,
  lifetime: 3,
  spawnArea: {
    minRadius: 0.1,
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
    x: 0,
    y: 0,
    z: 90
  },
  scale: {
    x: 1,
    y: 1
  },
  size: {
    min: 0.02,
    max: 0.03
  }
};
