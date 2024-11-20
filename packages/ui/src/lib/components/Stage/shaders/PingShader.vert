attribute vec3 center;

uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseAmplitude;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;

  // The ping is rendered as a quad. This code stretches/shrinks the size
  // of the corners of the quad over time relative to the quad center.
  float pulse = uPulseAmplitude * (0.5 * sin(uTime * uPulseSpeed) + 0.5);
  vec3 pos = position + pulse * (position - center);

  vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
