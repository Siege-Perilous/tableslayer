precision highp float;

uniform sampler2D uMaskTexture;
uniform vec3 uFogColor;
uniform float uFogScale;
uniform float uFogSpeed;
uniform float uTime;
uniform float uOpacity;
uniform float uPersistence;
uniform float uLacunarity;
uniform float uAmplitude;
uniform float uFrequency;
uniform int uLevels;
uniform vec4 uClippingPlanes[NUM_CLIPPING_PLANES];

varying vec2 vUv;
varying vec3 vWorldPosition;

// Simplex noise functions from https://github.com/ashima/webgl-noise
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
  0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
  -0.577350269189626,  // -1.0 + 2.0 * C.x
  0.024390243902439); // 1.0 / 41.0
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {

  vec4 plane;

	#pragma unroll_loop
  for(int i = 0; i < NUM_CLIPPING_PLANES; i++) {
    plane = uClippingPlanes[i];
    if(dot(-vWorldPosition, plane.xyz) > plane.w) {
      discard;
    }
  }

  // Fast blur
  float mask = texture2D(uMaskTexture, vUv).a;
  vec2 texSize = vec2(textureSize(uMaskTexture, 0));

  // Add time-varying fog using octave-based simplex noise
  vec4 finalColor = vec4(0.0);
  float amplitude = uAmplitude;
  float frequency = uFrequency;
  float total = 0.0;
  float brightness = 0.5;

  // Layer multiple octaves of noise with varying brightness
  for(int i = 0; i < uLevels; i++) {
    float noise = amplitude * snoise(vUv * texSize * frequency + uTime * uFogSpeed);
    noise = 1.0 + noise; // Remap to 0-1

    // Mix darker colors for low frequencies, brighter for high frequencies
    vec3 layerColor = mix(vec3(0.0), uFogColor, brightness);
    finalColor += vec4(layerColor, 1.0) * (noise * amplitude);

    total += amplitude;
    amplitude *= uPersistence;
    frequency *= uLacunarity;
    brightness *= 1.25; // Increase brightness for each octave
  }

  // Normalize the final color
  finalColor.rgb = finalColor.rgb / total;

  gl_FragColor = vec4(finalColor.rgb, mask * uOpacity);
}
