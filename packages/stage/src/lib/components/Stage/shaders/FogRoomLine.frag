precision highp float;

// Screen-space anti-aliased ribbon line: alpha falls off across the last
// device pixel of the ribbon's cross axis
uniform vec3 uColor;
uniform float uOpacity;
varying float vCross;

void main() {
  float d = abs(vCross);
  float aa = max(fwidth(d), 0.001);
  float alpha = 1.0 - smoothstep(1.0 - aa, 1.0, d);
  gl_FragColor = vec4(uColor, uOpacity * alpha);
}
