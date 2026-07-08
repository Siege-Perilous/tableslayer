precision highp float;

// Screen-space anti-aliased disc rendered on a unit quad
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float d = length(vUv * 2.0 - 1.0);
  float aa = max(fwidth(d), 0.001);
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  gl_FragColor = vec4(uColor, uOpacity * alpha);
}
