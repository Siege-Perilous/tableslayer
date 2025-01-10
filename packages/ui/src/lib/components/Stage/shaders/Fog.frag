precision highp float;

uniform float uTime;
uniform vec3 uBaseColor;
uniform vec3 uFogColor1;
uniform vec3 uFogColor2;
uniform vec3 uFogColor3;
uniform vec3 uFogColor4;
uniform float uOpacity;

uniform vec4 uFogSpeed;
uniform vec4 uPersistence;
uniform vec4 uLacunarity;
uniform vec4 uFrequency;
uniform vec4 uAmplitude;
uniform vec4 uOffset;
uniform ivec4 uLevels;

uniform int uEdgeMinMipMapLevel;
uniform int uEdgeMaxMipMapLevel;
uniform vec4 uEdgeFrequency;
uniform vec4 uEdgeAmplitude;
uniform float uEdgeOffset;
uniform float uEdgeSpeed;

uniform sampler2D uMaskTexture;
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

  float n = 130.0 * dot(m, g);
  return n;
}

float fog(vec2 uv, vec2 size, float amplitude, float frequency, float persistence, float lacunarity, float offset, int levels, float speed) {
  float sum = 0.0;

  // Layer multiple octaves of noise with varying brightness
  float a = 1.0;
  for(int i = 0; i < levels; i++) {
    sum += a * snoise(uv * size * frequency + uTime * speed);
    a *= persistence;
    frequency *= lacunarity;
  }

  sum /= float(levels);
  sum = sum + 0.5 + offset;

  return amplitude * clamp(sum, 0.0, 1.0);
}

float mask(vec2 uv, vec2 size, float amplitude, float frequency) {
  // Sample the mask at multiple mipmap levels to get a feathered edge
  float featheredMask = 0.0;
  float totalWeight = 0.0;
  for(int i = uEdgeMinMipMapLevel; i <= uEdgeMaxMipMapLevel; i++) {
    featheredMask += textureLod(uMaskTexture, uv, float(i)).a;
  }
  featheredMask /= float(uEdgeMaxMipMapLevel - uEdgeMinMipMapLevel + 1);
  featheredMask = clamp(featheredMask, 0.0, 1.0);

  // Add noise to the edge of the mask
  vec2 noiseUV = uv * size;
  float edgeNoise = snoise(frequency * noiseUV + uTime * uEdgeSpeed) + uEdgeOffset;

  // Create an edge mask that's only non-zero near the transition
  float edgeWidth = 0.2;
  float edgeMask = smoothstep(0.0, edgeWidth, featheredMask) * (1.0 - smoothstep(1.0 - edgeWidth, 1.0, featheredMask));

  // Blend the noise only at the edges
  float finalMask = featheredMask + edgeNoise * amplitude * edgeMask;

  float baseMask = texture2D(uMaskTexture, vUv).a;
  return amplitude * finalMask + (1.0 - amplitude) * baseMask;
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

  // Sample at multiple levels of detail to get a nice feathered edge
  vec2 texSize = vec2(textureSize(uMaskTexture, 0));

  float mask1 = mask(vUv, texSize, uEdgeAmplitude.x, uEdgeFrequency.x);
  float mask2 = mask(vUv, texSize, uEdgeAmplitude.y, uEdgeFrequency.y);
  float mask3 = mask(vUv, texSize, uEdgeAmplitude.z, uEdgeFrequency.z);
  float mask4 = mask(vUv, texSize, uEdgeAmplitude.w, uEdgeFrequency.w);

  vec3 fog1 = uFogColor1 * fog(vUv, texSize, uAmplitude.x, uFrequency.x, uPersistence.x, uLacunarity.x, uOffset.x, uLevels.x, uFogSpeed.x);
  vec3 fog2 = uFogColor2 * fog(vUv, texSize, uAmplitude.y, uFrequency.y, uPersistence.y, uLacunarity.y, uOffset.y, uLevels.y, uFogSpeed.y);
  vec3 fog3 = uFogColor3 * fog(vUv, texSize, uAmplitude.z, uFrequency.z, uPersistence.z, uLacunarity.z, uOffset.z, uLevels.z, uFogSpeed.z);
  vec3 fog4 = uFogColor4 * fog(vUv, texSize, uAmplitude.w, uFrequency.w, uPersistence.w, uLacunarity.w, uOffset.w, uLevels.w, uFogSpeed.w);

  vec4 finalFog = clamp(vec4(fog1, mask1) +
    vec4(fog2, mask2) +
    vec4(fog3, mask3) +
    vec4(fog4, mask4), 0.0, 1.0);

  gl_FragColor = vec4(uBaseColor + finalFog.rgb, finalFog.a * uOpacity);
}
