uniform vec3 uColor;
uniform float uOpacity;
uniform float uThickness;
uniform float uSharpness;

varying vec2 vUv;

void main() {
    // Center the UV coordinates at (0.5, 0.5)
  vec2 centeredUv = vUv - 0.5;
  float r = length(centeredUv);
  float innerRadius = 0.5 - uThickness;
  float outerRadius = 0.5;
  float falloff = 1.0 - uSharpness;

    // Determine if the fragment is inside the ring
  float ring = smoothstep(innerRadius - falloff, innerRadius, r) -
    smoothstep(outerRadius - falloff, outerRadius, r);

  gl_FragColor = vec4(uColor / 255.0, ring);
}
