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

// Number of noise layers to render (1-4); lower performance tiers reduce this
uniform int uFogLayerCount;

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

  // Fully revealed pixels far from any fog edge produce zero alpha, so skip
  // the noise and feathering work entirely. The widest mip level is an average
  // of the whole surrounding neighborhood; if it is ~0 here, every narrower
  // mip and the base mask are ~0 too, making all mask() terms below zero.
  if (textureLod(uMaskTexture, vUv, float(uEdgeMaxMipMapLevel)).a < 0.004) {
    discard;
  }

  // Sample at multiple levels of detail to get a nice feathered edge
  vec2 texSize = vec2(textureSize(uMaskTexture, 0));

  // Layers 2-4 are skipped on lower performance tiers; the branches are on a
  // uniform, so the skipped noise work is genuinely not executed
  vec4 finalFog = vec4(
    uFogColor1 * fog(vUv, texSize, uAmplitude.x, uFrequency.x, uPersistence.x, uLacunarity.x, uOffset.x, uLevels.x, uFogSpeed.x),
    mask(vUv, texSize, uEdgeAmplitude.x, uEdgeFrequency.x)
  );

  if(uFogLayerCount >= 2) {
    finalFog += vec4(
      uFogColor2 * fog(vUv, texSize, uAmplitude.y, uFrequency.y, uPersistence.y, uLacunarity.y, uOffset.y, uLevels.y, uFogSpeed.y),
      mask(vUv, texSize, uEdgeAmplitude.y, uEdgeFrequency.y)
    );
  }

  if(uFogLayerCount >= 3) {
    finalFog += vec4(
      uFogColor3 * fog(vUv, texSize, uAmplitude.z, uFrequency.z, uPersistence.z, uLacunarity.z, uOffset.z, uLevels.z, uFogSpeed.z),
      mask(vUv, texSize, uEdgeAmplitude.z, uEdgeFrequency.z)
    );
  }

  if(uFogLayerCount >= 4) {
    finalFog += vec4(
      uFogColor4 * fog(vUv, texSize, uAmplitude.w, uFrequency.w, uPersistence.w, uLacunarity.w, uOffset.w, uLevels.w, uFogSpeed.w),
      mask(vUv, texSize, uEdgeAmplitude.w, uEdgeFrequency.w)
    );
  }

  finalFog = clamp(finalFog, 0.0, 1.0);

  gl_FragColor = vec4(uBaseColor + finalFog.rgb, finalFog.a * uOpacity);
}
