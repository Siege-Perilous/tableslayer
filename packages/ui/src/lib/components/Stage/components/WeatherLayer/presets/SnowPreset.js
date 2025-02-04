export default {
  count: 1000,
  type: 1,
  color: '#42d8d3',
  opacity: 0.76,
  fadeInTime: 4,
  fadeOutTime: 3,
  lifetime: 7,
  spawnArea: {
    minRadius: 0.1409646739130435,
    maxRadius: 0.6020720108695652
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
      z: 0.1
    },
    exponential: {
      x: 0,
      y: 0,
      z: 0
    },
    sinusoidal: {
      amplitude: {
        x: 0.02,
        y: 0.01,
        z: 0
      },
      frequency: {
        x: 4.344429347826087,
        y: 6.192255434782608,
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
    min: 0.005,
    max: 0.01
  }
};
