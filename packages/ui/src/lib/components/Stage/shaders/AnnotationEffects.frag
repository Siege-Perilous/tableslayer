precision highp float;

uniform sampler2D uMaskTexture;
uniform float uTime;
uniform int uEffectType;
uniform vec3 uBaseColor;
uniform float uOpacity;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSoftness;

uniform int uEdgeMinMipMapLevel;
uniform int uEdgeMaxMipMapLevel;

uniform vec4 uClippingPlanes[NUM_CLIPPING_PLANES];

varying vec2 vUv;
varying vec3 vWorldPosition;

// Simplex noise from ashima/webgl-noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m * m * m;
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

// Fractal Brownian Motion
float fbm(vec2 p, int octaves, float persistence, float lacunarity) {
  float sum = 0.0;
  float amp = 1.0;
  float freq = 1.0;
  float maxSum = 0.0;
  for(int i = 0; i < 8; i++) {
    if(i >= octaves) break;
    sum += amp * snoise(p * freq);
    maxSum += amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return sum / maxSum;
}

// Simplified fbm for performance
float fbm3(vec2 p) {
  return fbm(p, 3, 0.5, 2.0);
}

float fbm5(vec2 p) {
  return fbm(p, 5, 0.5, 2.0);
}

// Domain warping - creates organic, natural patterns (Inigo Quilez technique)
float domainWarp(vec2 p, float time) {
  vec2 q = vec2(fbm3(p + vec2(0.0, 0.0) + time * 0.1),
                fbm3(p + vec2(5.2, 1.3) + time * 0.15));
  vec2 r = vec2(fbm3(p + 4.0 * q + vec2(1.7, 9.2) + time * 0.2),
                fbm3(p + 4.0 * q + vec2(8.3, 2.8) + time * 0.1));
  return fbm3(p + 4.0 * r);
}

// Get feathered mask with animated rolling edges (like Fog.frag)
float getVolumeMask(vec2 uv, vec2 texSize, float time, float edgeFreq, float edgeAmp, float edgeSpeed) {
  // Remap softness to a much higher range
  // 0 -> 0.8, 1 -> 2.0 (very strong effect across the board)
  float softnessFactor = uSoftness * 1.2 + 0.8;

  // Sample mask at multiple mipmap levels for soft edges
  // Always sample at least 7 mip levels, up to 12 at max softness
  float featheredMask = 0.0;
  float totalWeight = 0.0;
  int maxMip = int(7.0 + uSoftness * 5.0); // 7-12 mip levels

  for(int i = 0; i <= 12; i++) {
    if(i > maxMip) break;
    // Higher softness = much more weight on higher mip levels
    float weight = 1.0 + float(i) * softnessFactor;
    featheredMask += textureLod(uMaskTexture, uv, float(i)).a * weight;
    totalWeight += weight;
  }
  featheredMask /= totalWeight;
  featheredMask = clamp(featheredMask, 0.0, 1.0);

  // Edge width scales with softness - even wider range
  float edgeWidth = 0.45 + uSoftness * 0.45; // 0.45-0.9 based on softness

  // Create edge mask - only non-zero near the transition zone
  float edgeMask = smoothstep(0.0, edgeWidth, featheredMask) *
                   (1.0 - smoothstep(1.0 - edgeWidth, 1.0, featheredMask));

  // Add animated noise to the edges for rolling effect
  // Scale noise UV based on softness (larger softness = larger scale noise)
  float noiseScale = 0.005 + uSoftness * 0.008;
  vec2 noiseUV = uv * texSize * noiseScale;
  float edgeNoise = snoise(noiseUV * edgeFreq + time * edgeSpeed);

  // Additional lower frequency noise for broader variance
  float broadNoise = snoise(noiseUV * edgeFreq * 0.2 + time * edgeSpeed * 0.3);

  // Blend noise at edges - combine frequencies for natural look
  // More softness = more noise influence
  float noiseInfluence = edgeAmp * (1.5 + uSoftness * 1.0);
  float combinedNoise = edgeNoise * 0.5 + broadNoise * 0.5;
  float finalMask = featheredMask + combinedNoise * noiseInfluence * edgeMask;

  finalMask = clamp(finalMask, 0.0, 1.0);

  // Outer falloff curve - softness controls how gradual the fade is
  // Even at 0, we want a decent fade. At 1, very gradual fade.
  float fadeStart = 0.2 - uSoftness * 0.18;  // 0.2 to 0.02
  float fadeEnd = 0.35 - uSoftness * 0.25;   // 0.35 to 0.1

  // Create smooth falloff - values below fadeEnd fade gradually to 0
  float outerFalloff = smoothstep(0.0, fadeStart + 0.1, finalMask);
  float innerRegion = smoothstep(fadeEnd, fadeEnd + 0.25, finalMask);

  // Mix creates gradual fade at edges, solid in center
  // Higher softness = more gradual outer fade (lower max for outerFalloff)
  float outerMax = 0.65 - uSoftness * 0.35; // 0.65 to 0.3
  return mix(outerFalloff * outerMax, 1.0, innerRegion);
}

// Calculate edge intensity for distortion amplification
// Returns higher values near the mask boundaries (both inside and outside)
float getEdgeDistortion(vec2 uv, vec2 texSize) {
  // Sample at multiple mip levels to get soft edge detection
  float mask0 = textureLod(uMaskTexture, uv, 0.0).a;
  float mask2 = textureLod(uMaskTexture, uv, 2.0).a;
  float mask4 = textureLod(uMaskTexture, uv, 4.0).a;
  float mask6 = textureLod(uMaskTexture, uv, 6.0).a;

  // Edge is where there's difference between sharp and blurred versions
  float edge = abs(mask0 - mask4) + abs(mask2 - mask6) * 0.5;

  // Also detect transition zones in the blurred mask
  float transitionZone = smoothstep(0.1, 0.4, mask4) * (1.0 - smoothstep(0.6, 0.9, mask4));

  // Combine edge detection methods
  float edgeIntensity = edge * 2.0 + transitionZone;

  // Scale by softness - more softness = wider edge distortion zone
  edgeIntensity *= (1.0 + uSoftness * 1.5);

  return clamp(edgeIntensity, 0.0, 1.0);
}

// Helper: get fire color from intensity
vec3 getFireColor(float t) {
  vec3 black = vec3(0.1, 0.0, 0.0);
  vec3 darkRed = vec3(0.5, 0.05, 0.0);
  vec3 red = vec3(0.9, 0.15, 0.0);
  vec3 orange = vec3(1.0, 0.4, 0.05);
  vec3 yellow = vec3(1.1, 0.85, 0.2);
  vec3 white = vec3(1.4, 1.2, 0.9);

  if(t < 0.15) return mix(black, darkRed, t / 0.15);
  if(t < 0.3) return mix(darkRed, red, (t - 0.15) / 0.15);
  if(t < 0.5) return mix(red, orange, (t - 0.3) / 0.2);
  if(t < 0.75) return mix(orange, yellow, (t - 0.5) / 0.25);
  return mix(yellow, white, (t - 0.75) / 0.25);
}

// Fire effect - multi-layered flames (top-down view)
vec4 fireEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 3.0, 0.25, 1.5);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 noiseUV = uv * texSize * 0.001;
  float warpScale = 1.0 + edgeDist * 2.0 * uIntensity;

  // === LAYER 1: Deep/base fire (large scale, slow) ===
  float base1 = domainWarp(noiseUV * 0.8, time * 0.15);
  float base2 = domainWarp(noiseUV * 1.0 + 50.0, time * 0.2 + 10.0);
  float baseLayer = (base1 + base2) * 0.5;
  baseLayer = baseLayer * 0.5 + 0.5;
  float baseIntensity = baseLayer * mask * uIntensity * 0.7;

  // === LAYER 2: Mid fire (medium scale, medium speed) ===
  float mid1 = domainWarp(noiseUV * 1.5 + 100.0, time * 0.3) * warpScale;
  float mid2 = domainWarp(noiseUV * 2.0 + 150.0, time * 0.35 + 5.0) * warpScale;
  float midLayer = (mid1 + mid2) * 0.5;
  midLayer = midLayer * 0.5 + 0.5;
  // Offset the mid layer mask slightly for depth
  float midMask = getVolumeMask(uv, texSize, time * 1.1, 2.5, 0.3, 1.2);
  float midIntensity = midLayer * midMask * uIntensity * 0.85;

  // === LAYER 3: Hot spots/flickers (small scale, fast) ===
  float hot1 = domainWarp(noiseUV * 3.0 + 200.0, time * 0.5);
  float hot2 = fbm3(noiseUV * 4.0 + time * 0.6 + 250.0);
  float hotLayer = (hot1 + hot2) * 0.5;
  hotLayer = hotLayer * 0.5 + 0.5;
  hotLayer = pow(hotLayer, 0.7); // Boost hot spots
  // Tighter mask for hot spots
  float hotMask = getVolumeMask(uv, texSize, time * 1.3, 2.0, 0.2, 1.8);
  float hotIntensity = hotLayer * hotMask * uIntensity;

  // === LAYER 4: Edge turbulence ===
  float edgeTurb = fbm5(noiseUV * 5.0 + time * 0.4) * edgeDist;

  // Composite layers with screen-like blending
  // Each layer contributes color independently
  vec3 baseColor = getFireColor(baseIntensity) * baseIntensity;
  vec3 midColor = getFireColor(midIntensity) * midIntensity;
  vec3 hotColor = getFireColor(hotIntensity * 1.2) * hotIntensity; // Hotter = brighter colors

  // Screen blend: result = 1 - (1-a)(1-b)(1-c)
  vec3 color = baseColor + midColor + hotColor;
  color += vec3(1.0, 0.5, 0.2) * edgeTurb * 0.4 * uIntensity;

  // Composite alpha from all layers
  float alpha = max(max(baseIntensity, midIntensity), hotIntensity);
  alpha = smoothstep(0.0, 0.2, alpha);
  alpha *= mask * uOpacity;

  return vec4(color, alpha);
}

// Helper: get void color from intensity
vec3 getVoidColor(float t) {
  vec3 deepPurple = vec3(0.1, 0.02, 0.2);
  vec3 purple = vec3(0.3, 0.1, 0.5);
  vec3 blue = vec3(0.2, 0.3, 0.7);
  vec3 cyan = vec3(0.3, 0.8, 1.0);
  vec3 white = vec3(1.3, 1.2, 1.5);

  if(t < 0.25) return mix(deepPurple, purple, t * 4.0);
  if(t < 0.5) return mix(purple, blue, (t - 0.25) * 4.0);
  if(t < 0.75) return mix(blue, cyan, (t - 0.5) * 4.0);
  return mix(cyan, white, (t - 0.75) * 4.0);
}

// Space tear - multi-layered void (top-down view)
vec4 spaceTearEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 2.0, 0.3, 0.8);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 noiseUV = uv * texSize * 0.001;
  float warpScale = 1.0 + edgeDist * 2.5 * uIntensity;

  // === LAYER 1: Deep void (large scale, slow swirl) ===
  float deep1 = domainWarp(noiseUV * 0.6, time * 0.1);
  float deep2 = domainWarp(noiseUV * 0.8 + 40.0, time * 0.15 + 8.0);
  float deepLayer = (deep1 + deep2) * 0.5;
  deepLayer = deepLayer * 0.5 + 0.5;
  float deepIntensity = deepLayer * mask * uIntensity * 0.6;

  // === LAYER 2: Mid void swirl (medium scale) ===
  float mid1 = domainWarp(noiseUV * 1.2 + 80.0, time * 0.25) * warpScale;
  float mid2 = domainWarp(noiseUV * 1.5 + 120.0, time * 0.3 + 4.0) * warpScale;
  float midLayer = (mid1 + mid2) * 0.5;
  midLayer = midLayer * 0.5 + 0.5;
  float midMask = getVolumeMask(uv, texSize, time * 1.15, 1.8, 0.35, 0.9);
  float midIntensity = midLayer * midMask * uIntensity * 0.8;

  // === LAYER 3: Energy crackles (small scale, faster) ===
  float energy1 = domainWarp(noiseUV * 2.5 + 160.0, time * 0.4);
  float energy2 = fbm3(noiseUV * 3.0 + time * 0.45 + 200.0);
  float energyLayer = (energy1 + energy2) * 0.5;
  energyLayer = energyLayer * 0.5 + 0.5;
  energyLayer = pow(energyLayer, 0.8);
  float energyMask = getVolumeMask(uv, texSize, time * 1.25, 1.5, 0.25, 1.1);
  float energyIntensity = energyLayer * energyMask * uIntensity;

  // === LAYER 4: Sparkles (high frequency) ===
  float sparkleBase = snoise(noiseUV * 6.0 + time * 0.3);
  float sparkle = smoothstep(0.5, 0.85, sparkleBase) * (1.0 + edgeDist * 0.5);

  // Composite layers
  vec3 deepColor = getVoidColor(deepIntensity * 0.8) * deepIntensity;
  vec3 midColor = getVoidColor(midIntensity) * midIntensity;
  vec3 energyColor = getVoidColor(energyIntensity * 1.3) * energyIntensity;

  vec3 color = deepColor + midColor + energyColor;
  color += vec3(0.8, 0.9, 1.0) * sparkle * 0.4 * uIntensity;
  color += vec3(0.3, 0.1, 0.5) * edgeDist * 0.5 * uIntensity; // Edge glow

  float alpha = max(max(deepIntensity, midIntensity), energyIntensity);
  alpha = smoothstep(0.0, 0.15, alpha);
  alpha *= mask * uOpacity;

  return vec4(color, alpha);
}

// Helper: get water color from intensity
vec3 getWaterColor(float t) {
  vec3 deepBlue = vec3(0.02, 0.1, 0.25);
  vec3 midBlue = vec3(0.05, 0.2, 0.45);
  vec3 lightBlue = vec3(0.2, 0.5, 0.7);
  vec3 highlight = vec3(0.6, 0.85, 1.0);

  if(t < 0.3) return mix(deepBlue, midBlue, t / 0.3);
  if(t < 0.6) return mix(midBlue, lightBlue, (t - 0.3) / 0.3);
  return mix(lightBlue, highlight, (t - 0.6) / 0.4);
}

// Water effect - multi-layered caustics (top-down view)
vec4 waterEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 4.0, 0.2, 2.0);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 noiseUV = uv * texSize * 0.001;
  float warpScale = 1.0 + edgeDist * 1.8 * uIntensity;

  // === LAYER 1: Deep water (large scale, slow) ===
  float deep1 = domainWarp(noiseUV * 0.8, time * 0.1);
  float deep2 = domainWarp(noiseUV * 1.0 + 30.0, time * 0.12 + 6.0);
  float deepLayer = (deep1 + deep2) * 0.5;
  deepLayer = deepLayer * 0.5 + 0.5;
  float deepIntensity = deepLayer * mask * uIntensity * 0.5;

  // === LAYER 2: Mid-depth caustics (medium scale) ===
  float mid1 = domainWarp(noiseUV * 1.8 + 60.0, time * 0.2) * warpScale;
  float mid2 = domainWarp(noiseUV * 2.2 + 90.0, time * 0.25 + 3.0) * warpScale;
  float midLayer = (mid1 + mid2) * 0.5;
  midLayer = midLayer * 0.5 + 0.5;
  float midMask = getVolumeMask(uv, texSize, time * 1.1, 3.5, 0.25, 1.8);
  float midIntensity = midLayer * midMask * uIntensity * 0.7;

  // === LAYER 3: Surface shimmer (small scale, faster) ===
  float surf1 = domainWarp(noiseUV * 3.0 + 120.0, time * 0.35);
  float surf2 = fbm3(noiseUV * 3.5 + time * 0.3 + 150.0);
  float surfLayer = (surf1 + surf2) * 0.5;
  surfLayer = surfLayer * 0.5 + 0.5;
  float surfMask = getVolumeMask(uv, texSize, time * 1.2, 3.0, 0.2, 2.2);
  float surfIntensity = surfLayer * surfMask * uIntensity * 0.85;

  // === LAYER 4: Highlights/sparkles ===
  float shimmer = fbm5(noiseUV * 4.0 + time * 0.15);
  shimmer = smoothstep(0.3, 0.7, shimmer) * smoothstep(1.0, 0.5, shimmer);
  shimmer *= (1.0 + edgeDist * 0.4);

  // Composite layers
  vec3 deepColor = getWaterColor(deepIntensity * 0.7) * deepIntensity;
  vec3 midColor = getWaterColor(midIntensity) * midIntensity;
  vec3 surfColor = getWaterColor(surfIntensity * 1.2) * surfIntensity;

  vec3 color = deepColor + midColor + surfColor;
  color += vec3(0.15, 0.25, 0.35) * shimmer * 0.5 * uIntensity;
  color += vec3(0.2, 0.3, 0.4) * edgeDist * 0.4 * uIntensity; // Edge foam

  float alpha = max(max(deepIntensity, midIntensity), surfIntensity);
  alpha = smoothstep(0.0, 0.15, alpha);
  alpha *= mask * uOpacity * 0.85;

  return vec4(color, alpha);
}

// Helper: get magic color from intensity (uses base color)
vec3 getMagicColor(float t) {
  vec3 darkColor = uBaseColor * 0.2;
  vec3 midColor = uBaseColor * 0.6;
  vec3 brightColor = uBaseColor * 1.0;
  vec3 glow = uBaseColor * 1.4 + vec3(0.2);
  vec3 white = vec3(1.3, 1.3, 1.4);

  if(t < 0.2) return mix(darkColor, midColor, t * 5.0);
  if(t < 0.45) return mix(midColor, brightColor, (t - 0.2) * 4.0);
  if(t < 0.7) return mix(brightColor, glow, (t - 0.45) * 4.0);
  return mix(glow, white, (t - 0.7) / 0.3);
}

// Magic effect - multi-layered arcane energy (top-down view)
vec4 magicEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 2.5, 0.2, 1.2);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 noiseUV = uv * texSize * 0.001;
  float warpScale = 1.0 + edgeDist * 2.2 * uIntensity;

  // Soft pulsating - affects all layers
  float pulseNoise = fbm3(noiseUV * 0.2 + time * 0.25);
  float pulse = pulseNoise * 0.12 + 0.88;

  // === LAYER 1: Deep arcane base (large scale, slow) ===
  float deep1 = domainWarp(noiseUV * 0.7, time * 0.12);
  float deep2 = domainWarp(noiseUV * 0.9 + 25.0, time * 0.15 + 7.0);
  float deepLayer = (deep1 + deep2) * 0.5;
  deepLayer = deepLayer * 0.5 + 0.5;
  float deepIntensity = deepLayer * mask * uIntensity * pulse * 0.6;

  // === LAYER 2: Mid energy swirls (medium scale) ===
  float mid1 = domainWarp(noiseUV * 1.4 + 50.0, time * 0.25) * warpScale;
  float mid2 = domainWarp(noiseUV * 1.8 + 75.0, time * 0.3 + 4.0) * warpScale;
  float midLayer = (mid1 + mid2) * 0.5;
  midLayer = midLayer * 0.5 + 0.5;
  float midMask = getVolumeMask(uv, texSize, time * 1.1, 2.2, 0.25, 1.0);
  float midIntensity = midLayer * midMask * uIntensity * pulse * 0.8;

  // === LAYER 3: Surface energy crackle (small scale, faster) ===
  float surf1 = domainWarp(noiseUV * 2.5 + 100.0, time * 0.4);
  float surf2 = fbm3(noiseUV * 3.0 + time * 0.35 + 130.0);
  float surfLayer = (surf1 + surf2) * 0.5;
  surfLayer = surfLayer * 0.5 + 0.5;
  surfLayer = pow(surfLayer, 0.85); // Slight boost
  float surfMask = getVolumeMask(uv, texSize, time * 1.25, 2.0, 0.2, 1.4);
  float surfIntensity = surfLayer * surfMask * uIntensity * pulse;

  // === LAYER 4: Edge turbulence and sparkles ===
  float edgeTurb = fbm5(noiseUV * 4.5 + time * 0.5) * edgeDist;

  // Soft sparkles - concentrated at edges
  float sparkleBase = fbm5(noiseUV * 5.0 + time * 0.18);
  float sparkle = smoothstep(0.45, 0.75, sparkleBase) * smoothstep(1.0, 0.65, sparkleBase);
  sparkle *= (1.0 + edgeDist * 0.8);

  // Composite layers with colors
  vec3 deepColor = getMagicColor(deepIntensity * 0.9) * deepIntensity;
  vec3 midColor = getMagicColor(midIntensity) * midIntensity;
  vec3 surfColor = getMagicColor(surfIntensity * 1.2) * surfIntensity;

  vec3 color = deepColor + midColor + surfColor;

  // Add edge turbulence glow
  color += uBaseColor * edgeTurb * 0.5 * uIntensity;

  // Soft white sparkles
  color += vec3(1.2, 1.2, 1.3) * sparkle * 0.35 * uIntensity;

  // Enhanced edge glow
  float edgeGlow = edgeDist * 0.6 * uIntensity;
  color += uBaseColor * edgeGlow;

  // Composite alpha from all layers
  float alpha = max(max(deepIntensity, midIntensity), surfIntensity);
  alpha = smoothstep(0.0, 0.12, alpha);
  alpha *= mask * uOpacity;

  return vec4(color, alpha);
}

void main() {
  // Clipping planes
  vec4 plane;
  #pragma unroll_loop
  for(int i = 0; i < NUM_CLIPPING_PLANES; i++) {
    plane = uClippingPlanes[i];
    if(dot(-vWorldPosition, plane.xyz) > plane.w) {
      discard;
    }
  }

  float time = uTime * uSpeed;
  vec2 texSize = vec2(textureSize(uMaskTexture, 0));

  vec4 result;

  if(uEffectType == 1) {
    result = fireEffect(vUv, texSize, time);
  } else if(uEffectType == 2) {
    result = spaceTearEffect(vUv, texSize, time);
  } else if(uEffectType == 3) {
    result = waterEffect(vUv, texSize, time);
  } else if(uEffectType == 4) {
    result = magicEffect(vUv, texSize, time);
  } else {
    // No effect - solid color
    float mask = texture2D(uMaskTexture, vUv).a;
    if(mask < 0.001) discard;
    result = vec4(uBaseColor, mask * uOpacity);
  }

  if(result.a < 0.001) discard;

  gl_FragColor = result;
}
