precision highp float;

uniform sampler2D uMaskTexture;
uniform vec3 uColor;
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

  // Sample at multiple levels of detail to get a nice feathered edge
  vec2 texSize = vec2(textureSize(uMaskTexture, 0));

  float mask = texture2D(uMaskTexture, vUv);

  gl_FragColor = vec4(uColor, mask);
}
