// Ribbon cross-axis coordinate (-1 at one edge, +1 at the other), used by the
// fragment shader to feather the line edges
attribute float aCross;
varying float vCross;

void main() {
  vCross = aCross;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
