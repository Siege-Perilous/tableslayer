uniform vec3 uColor;
uniform float uOpacity;
uniform float uThickness;
uniform float uSharpness;
uniform vec4 uClippingPlanes[NUM_CLIPPING_PLANES];

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {

  vec4 plane;

	#pragma unroll_loop
  for(int i = 0; i < NUM_CLIPPING_PLANES; i++) {
    plane = uClippingPlanes[i];
    if(dot(-vWorldPosition, plane.xyz) > plane.w) {
      discard;
    }
  }

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
