attribute vec3 center;

uniform float uTime;
uniform float uPulseSpeed;
uniform float uPulseAmplitude;

varying vec2 vUv;

void main() {
  vUv = uv;
  float pulse = uPulseAmplitude * (0.5 * sin(uTime * uPulseSpeed) + 0.5);
  vec3 pos = position + pulse * (position - center);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
