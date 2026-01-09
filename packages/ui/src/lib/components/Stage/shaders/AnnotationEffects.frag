precision highp float;

uniform sampler2D uMaskTexture;
uniform float uTime;
uniform int uEffectType;
uniform vec3 uBaseColor;
uniform float uOpacity;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSoftness;
uniform float uBorder;
uniform float uRoughness;

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
  // === ROUGHNESS: Add jagged edges via UV displacement ===
  // Multiple noise frequencies for organic, random-looking edges
  vec2 roughnessUV = uv * texSize * 0.008;

  // Layer 1: Medium-scale jagged edges
  float roughNoise1 = snoise(roughnessUV * 3.0 + time * 0.02);
  float roughNoise2 = snoise(roughnessUV * 3.0 + vec2(50.0, 50.0) + time * 0.015);

  // Layer 2: Fine detail roughness
  float roughNoise3 = snoise(roughnessUV * 8.0 + time * 0.01);
  float roughNoise4 = snoise(roughnessUV * 8.0 + vec2(100.0, 100.0) + time * 0.008);

  // Layer 3: Large-scale variation
  float roughNoise5 = snoise(roughnessUV * 1.0 + time * 0.005);

  // Combine noise layers
  vec2 roughnessOffset = vec2(
    roughNoise1 * 0.5 + roughNoise3 * 0.3 + roughNoise5 * 0.2,
    roughNoise2 * 0.5 + roughNoise4 * 0.3 + roughNoise5 * 0.2
  );

  // Scale offset by roughness - max displacement of ~3% of texture size
  float roughnessStrength = uRoughness * 0.03;
  vec2 displacedUV = uv + roughnessOffset * roughnessStrength;

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
    // Use displaced UV for roughness effect
    featheredMask += textureLod(uMaskTexture, displacedUV, float(i)).a * weight;
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
  color += vec3(1.0, 0.5, 0.2) * edgeTurb * uBorder * uIntensity;

  // Composite alpha from all layers
  float alpha = max(max(baseIntensity, midIntensity), hotIntensity);
  alpha = smoothstep(0.0, 0.2, alpha);
  alpha *= mask * uOpacity;

  return vec4(color, alpha);
}

// Space tear - dark void with stars (top-down view)
// Hash function for consistent random values per grid cell
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Hash that returns vec2
vec2 hash2(vec2 p) {
  return vec2(
    fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453),
    fract(sin(dot(p, vec2(269.5, 183.3))) * 43758.5453)
  );
}

// Generate a single star layer with grid-based placement
// Returns: x = star intensity, yzw = star color
vec4 starLayer(vec2 uv, float time, float gridSize, float speed, float brightness, float twinkleSpeed) {
  // Grid cell
  vec2 gridUV = uv * gridSize;
  vec2 cellId = floor(gridUV);
  vec2 cellUV = fract(gridUV);

  float totalStar = 0.0;
  vec3 totalColor = vec3(0.0);

  // Check this cell and neighbors for stars
  for(int x = -1; x <= 1; x++) {
    for(int y = -1; y <= 1; y++) {
      vec2 neighborId = cellId + vec2(float(x), float(y));

      // Random position within cell
      vec2 starPos = hash2(neighborId);

      // Add slow drift movement
      starPos += vec2(
        sin(time * speed * 0.3 + hash(neighborId) * 6.28) * 0.1,
        cos(time * speed * 0.2 + hash(neighborId + 100.0) * 6.28) * 0.1
      );

      // Distance from current pixel to star center
      vec2 toStar = (cellUV - vec2(float(x), float(y))) - starPos;
      float dist = length(toStar);

      // Star visibility (only some cells have stars)
      float hasStar = step(0.7, hash(neighborId + 50.0));

      // Star size varies
      float starSize = 0.02 + hash(neighborId + 80.0) * 0.03;

      // Core star (sharp point)
      float star = smoothstep(starSize, 0.0, dist) * hasStar;

      // Soft glow around star
      float glow = smoothstep(starSize * 4.0, 0.0, dist) * 0.3 * hasStar;

      // Independent twinkle per star
      float twinklePhase = hash(neighborId + 200.0) * 6.28;
      float twinkleFreq = 0.5 + hash(neighborId + 300.0) * 1.5;
      float twinkle = sin(time * twinkleSpeed * twinkleFreq + twinklePhase);
      twinkle = twinkle * 0.4 + 0.6;

      // Some stars blink more dramatically
      float blinkStrength = hash(neighborId + 400.0);
      if(blinkStrength > 0.8) {
        float blink = sin(time * twinkleSpeed * 0.3 + hash(neighborId + 500.0) * 6.28);
        twinkle *= smoothstep(-0.8, 0.2, blink);
      }

      // Star color based on temperature
      float temp = hash(neighborId + 600.0);
      vec3 starColor;
      if(temp < 0.3) {
        starColor = vec3(0.7, 0.85, 1.0); // Blue-white hot
      } else if(temp < 0.7) {
        starColor = vec3(1.0, 1.0, 1.0); // Pure white
      } else if(temp < 0.9) {
        starColor = vec3(1.0, 0.95, 0.8); // Yellow-white
      } else {
        starColor = vec3(1.0, 0.7, 0.5); // Orange-red cool
      }

      float finalStar = (star + glow) * twinkle * brightness;
      totalStar += finalStar;
      totalColor += starColor * finalStar;
    }
  }

  if(totalStar > 0.001) {
    totalColor /= totalStar;
  }

  return vec4(totalStar, totalColor);
}

vec4 spaceTearEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 1.5, 0.2, 0.5);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 baseUV = uv * texSize * 0.001;

  // === BASE: Deep black void with subtle variation ===
  float voidNoise = fbm3(baseUV * 0.5 + time * 0.02);
  vec3 voidColor = vec3(0.01, 0.01, 0.02) + vec3(0.01, 0.005, 0.02) * voidNoise;

  // === STAR LAYERS with parallax movement ===
  vec3 starColor = vec3(0.0);

  // Layer 1: Distant tiny stars (many, dim, slow)
  vec2 layer1UV = baseUV + vec2(time * 0.002, time * 0.001);
  vec4 stars1 = starLayer(layer1UV, time, 25.0, 0.3, 0.5, 1.5);
  starColor += stars1.yzw * stars1.x;

  // Layer 2: Medium distance stars
  vec2 layer2UV = baseUV + vec2(time * 0.004, -time * 0.002);
  vec4 stars2 = starLayer(layer2UV, time, 15.0, 0.5, 0.8, 1.2);
  starColor += stars2.yzw * stars2.x;

  // Layer 3: Closer bright stars (fewer, brighter, faster drift)
  vec2 layer3UV = baseUV + vec2(-time * 0.006, time * 0.003);
  vec4 stars3 = starLayer(layer3UV, time, 8.0, 0.8, 1.2, 0.8);
  starColor += stars3.yzw * stars3.x;

  // Layer 4: Rare very bright stars with strong glow
  vec2 layer4UV = baseUV + vec2(time * 0.003, time * 0.005);
  vec4 stars4 = starLayer(layer4UV, time, 4.0, 0.4, 1.8, 0.5);
  starColor += stars4.yzw * stars4.x;

  // === NEBULA WISPS at edges ===
  float nebula = domainWarp(baseUV * 1.5 + 300.0, time * 0.05);
  nebula = nebula * 0.5 + 0.5;
  nebula *= edgeDist * uBorder;
  vec3 nebulaColor = vec3(0.12, 0.04, 0.2) * nebula;

  // Occasional colored nebula patches
  float nebulaHue = snoise(baseUV * 2.0 + 500.0);
  if(nebulaHue > 0.3) {
    nebulaColor = mix(nebulaColor, vec3(0.05, 0.1, 0.2), (nebulaHue - 0.3) * nebula);
  }

  // === COMBINE ===
  vec3 color = voidColor + starColor * uIntensity + nebulaColor * uIntensity;

  // Edge glow - subtle purple rim
  color += vec3(0.08, 0.02, 0.12) * edgeDist * uBorder * uIntensity;

  float alpha = mask * uOpacity;

  return vec4(color, alpha);
}

// Water effect - proper ripples using sum of sine waves with lighting
vec4 waterEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 2.0, 0.1, 1.0);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 basePos = uv * texSize * 0.004; // Higher scale = smaller waves (viewing from ~100ft)

  // === DOMAIN WARPING - bend waves organically to break up repetition ===
  float warpStrength = 0.15;
  vec2 warp = vec2(
    snoise(basePos * 0.3 + time * 0.05),
    snoise(basePos * 0.3 + vec2(50.0, 50.0) + time * 0.04)
  );
  vec2 pos = basePos + warp * warpStrength;

  // === SUM OF DIRECTIONAL SINE WAVES ===
  // Each wave has: direction, frequency, amplitude, speed
  // Directions slowly rotate over time for organic movement
  float height = 0.0;
  vec2 gradient = vec2(0.0); // For normal calculation

  // Local noise for phase variation - breaks up sync
  float phaseNoise1 = snoise(basePos * 0.5) * 2.0;
  float phaseNoise2 = snoise(basePos * 0.7 + 100.0) * 2.0;

  // Wave 1: Primary wave - direction slowly rotates
  float angle1 = time * 0.02;
  vec2 dir1 = normalize(vec2(cos(angle1) + 0.3, sin(angle1) * 0.5 + 0.7));
  float freq1 = 25.0;
  float amp1 = 0.25 * (0.8 + snoise(basePos * 0.2) * 0.2); // Vary amplitude locally
  float phase1 = dot(dir1, pos) * freq1 - time * 2.0 + phaseNoise1;
  height += amp1 * sin(phase1);
  gradient += dir1 * amp1 * freq1 * cos(phase1);

  // Wave 2: Cross wave - counter-rotating
  float angle2 = -time * 0.015 + 1.5;
  vec2 dir2 = normalize(vec2(cos(angle2) - 0.5, sin(angle2) + 0.3));
  float freq2 = 35.0;
  float amp2 = 0.18 * (0.85 + snoise(basePos * 0.25 + 30.0) * 0.15);
  float phase2 = dot(dir2, pos) * freq2 - time * 2.5 + phaseNoise2;
  height += amp2 * sin(phase2);
  gradient += dir2 * amp2 * freq2 * cos(phase2);

  // Wave 3: Diagonal - slight wobble
  float angle3 = sin(time * 0.03) * 0.2 + 2.35;
  vec2 dir3 = normalize(vec2(cos(angle3), sin(angle3)));
  float freq3 = 20.0;
  float amp3 = 0.2;
  float phase3 = dot(dir3, pos) * freq3 - time * 1.5 + phaseNoise1 * 0.5;
  height += amp3 * sin(phase3);
  gradient += dir3 * amp3 * freq3 * cos(phase3);

  // Wave 4: Fine detail
  float angle4 = time * 0.025 + 4.0;
  vec2 dir4 = normalize(vec2(cos(angle4) - 0.3, sin(angle4) - 0.9));
  float freq4 = 50.0;
  float amp4 = 0.1;
  float phase4 = dot(dir4, pos) * freq4 - time * 3.0 + phaseNoise2 * 0.7;
  height += amp4 * sin(phase4);
  gradient += dir4 * amp4 * freq4 * cos(phase4);

  // Wave 5: Extra fine detail - faster rotation
  float angle5 = -time * 0.03 + 1.0;
  vec2 dir5 = normalize(vec2(cos(angle5) + 0.9, sin(angle5) + 0.5));
  float freq5 = 65.0;
  float amp5 = 0.08;
  float phase5 = dot(dir5, pos) * freq5 - time * 3.5;
  height += amp5 * sin(phase5);
  gradient += dir5 * amp5 * freq5 * cos(phase5);

  // === CONCENTRIC RIPPLES - centers drift slowly ===
  for(int i = 0; i < 8; i++) {
    // Ripple centers drift over time
    float drift = time * 0.02;
    vec2 center = vec2(
      fract(sin(float(i) * 127.1) * 43758.5453 + drift * 0.1) * 0.8 + 0.1,
      fract(sin(float(i) * 269.5) * 43758.5453 + drift * 0.07) * 0.8 + 0.1
    );
    // Add noise-based wobble to centers
    center += vec2(
      snoise(vec2(float(i) * 3.0, time * 0.1)) * 0.05,
      snoise(vec2(time * 0.1, float(i) * 5.0)) * 0.05
    );

    vec2 toCenter = pos - center * texSize.x * 0.004;
    float dist = length(toCenter);
    float rippleFreq = 40.0 + float(i) * 5.0;
    float rippleAmp = 0.12 / (1.0 + dist * 3.0);
    // Vary ripple speed slightly per source
    float rippleSpeed = 4.0 + snoise(vec2(float(i) * 10.0, 0.0)) * 0.5;
    float ripplePhase = dist * rippleFreq - time * rippleSpeed - float(i) * 1.0;

    height += rippleAmp * sin(ripplePhase);
    if(dist > 0.001) {
      vec2 rippleDir = toCenter / dist;
      gradient += rippleDir * rippleAmp * rippleFreq * cos(ripplePhase);
    }
  }

  // === CALCULATE NORMAL FROM GRADIENT ===
  vec3 normal = normalize(vec3(-gradient.x, -gradient.y, 1.0));

  // === LIGHTING ===
  vec3 lightDir = normalize(vec3(0.3, 0.3, 1.0)); // Light from above-front
  float diffuse = max(dot(normal, lightDir), 0.0);

  // Specular highlight (Blinn-Phong) - high exponent for small sharp highlights
  vec3 viewDir = vec3(0.0, 0.0, 1.0); // Top-down view
  vec3 halfDir = normalize(lightDir + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), 128.0);

  // === DEPTH FROM CENTER OF DRAWING ===
  // Sample mask at multiple mipmap levels to find how "inside" we are
  float maskHigh = textureLod(uMaskTexture, uv, 0.0).a;
  float maskMid = textureLod(uMaskTexture, uv, 3.0).a;
  float maskLow = textureLod(uMaskTexture, uv, 5.0).a;
  // The more all levels agree, the more "inside" we are (center of blob)
  float centerDepth = min(maskHigh, min(maskMid, maskLow));
  // Subtle center effect - don't darken too much
  centerDepth = smoothstep(0.5, 0.95, centerDepth) * 0.4;

  // === COLORS ===
  vec3 deepColor = vec3(0.08, 0.2, 0.4);        // Darker blue for centers (but still visible)
  vec3 shallowColor = vec3(0.15, 0.4, 0.6);     // Brighter blue near edges
  vec3 highlightColor = vec3(0.9, 0.95, 1.0);   // Slight blue tint to highlights
  vec3 foamColor = vec3(0.95, 0.9, 0.75);       // Sandy/beachy foam color

  // Height affects color (deeper in troughs)
  float heightNorm = height * 0.5 + 0.5;

  // Blend based on center depth - centers are slightly darker
  vec3 baseWaterColor = mix(shallowColor, deepColor, centerDepth);

  // Wave height creates visible color variation
  vec3 waterColor = mix(baseWaterColor * 0.85, baseWaterColor * 1.3, heightNorm * 0.5 + diffuse * 0.4);

  // Add specular highlights
  waterColor += highlightColor * specular * 1.5 * uIntensity;

  // === FOAM AT EDGES - multiple layers for wide spread ===
  float foamMask0 = textureLod(uMaskTexture, uv, 0.0).a;

  // Inner foam band (close to edge)
  float foamMask2 = textureLod(uMaskTexture, uv, 2.0 + uBorder * 1.5).a;
  float innerFoam = abs(foamMask0 - foamMask2);

  // Middle foam band (spreads further in)
  float foamMask4 = textureLod(uMaskTexture, uv, 4.0 + uBorder * 2.5).a;
  float midFoam = abs(foamMask0 - foamMask4) * 0.6;

  // Outer foam band (reaches deep into the water)
  float foamMask6 = textureLod(uMaskTexture, uv, 6.0 + uBorder * 3.0).a;
  float outerFoam = abs(foamMask0 - foamMask6) * 0.3;

  // Foam follows wave peaks
  float foamWave = smoothstep(0.2, 0.6, heightNorm);

  // Combine foam layers
  float foam = (innerFoam + midFoam + outerFoam) * (0.3 + foamWave * 0.7) * uBorder;
  foam += edgeDist * foamWave * uBorder * 0.4;

  // Add foam noise - different frequencies for variety
  float foamNoise1 = snoise(pos * 6.0 + time * 0.4) * 0.5 + 0.5;
  float foamNoise2 = snoise(pos * 12.0 + time * 0.6 + 30.0) * 0.5 + 0.5;
  float foamNoise = foamNoise1 * 0.7 + foamNoise2 * 0.3;
  foam *= (0.5 + foamNoise * 0.5);

  // Apply beachy foam color
  waterColor += foamColor * foam * 1.2;

  // Final color with intensity
  vec3 finalColor = waterColor * uIntensity;

  float alpha = mask * uOpacity;

  return vec4(finalColor, alpha);
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

  // Add edge turbulence glow - controlled by border
  color += uBaseColor * edgeTurb * uBorder * uIntensity;

  // Soft white sparkles
  color += vec3(1.2, 1.2, 1.3) * sparkle * 0.35 * uIntensity;

  // Enhanced edge glow - controlled by border
  float edgeGlow = edgeDist * uBorder * uIntensity;
  color += uBaseColor * edgeGlow;

  // Composite alpha from all layers
  float alpha = max(max(deepIntensity, midIntensity), surfIntensity);
  alpha = smoothstep(0.0, 0.12, alpha);
  alpha *= mask * uOpacity;

  return vec4(color, alpha);
}

// Grease effect - iridescent oil slick
// Adapted from "Liquid toy" by Leon Denise (Shadertoy)
vec4 greaseEffect(vec2 uv, vec2 texSize, float time) {
  float mask = getVolumeMask(uv, texSize, time, 1.5, 0.1, 0.6);
  if(mask < 0.001) return vec4(0.0);

  float edgeDist = getEdgeDistortion(uv, texSize);
  vec2 baseUV = uv * texSize * 0.002;

  // === CREATE HEIGHTMAP using animated FBM ===
  // Slow swirling motion
  vec2 flowUV = baseUV + vec2(
    sin(time * 0.1 + baseUV.y * 2.0) * 0.1,
    cos(time * 0.08 + baseUV.x * 2.0) * 0.1
  );

  // Multiple layers of noise for organic flow
  float height1 = fbm5(flowUV * 1.5 + time * 0.05);
  float height2 = fbm3(flowUV * 3.0 - time * 0.03 + 50.0);
  float height3 = domainWarp(flowUV * 0.8 + 100.0, time * 0.08);

  float height = height1 * 0.5 + height2 * 0.3 + height3 * 0.2;
  height = height * 0.5 + 0.5; // Normalize to 0-1

  // === CALCULATE NORMALS from heightmap gradient ===
  float range = 3.0;
  vec2 unit = vec2(range / texSize.x, range / texSize.y);

  // Sample height at offset positions
  vec2 flowUV_px = flowUV + vec2(unit.x, 0.0);
  vec2 flowUV_nx = flowUV - vec2(unit.x, 0.0);
  vec2 flowUV_py = flowUV + vec2(0.0, unit.y);
  vec2 flowUV_ny = flowUV - vec2(0.0, unit.y);

  float h_px = fbm5(flowUV_px * 1.5 + time * 0.05) * 0.5 +
               fbm3(flowUV_px * 3.0 - time * 0.03 + 50.0) * 0.3;
  float h_nx = fbm5(flowUV_nx * 1.5 + time * 0.05) * 0.5 +
               fbm3(flowUV_nx * 3.0 - time * 0.03 + 50.0) * 0.3;
  float h_py = fbm5(flowUV_py * 1.5 + time * 0.05) * 0.5 +
               fbm3(flowUV_py * 3.0 - time * 0.03 + 50.0) * 0.3;
  float h_ny = fbm5(flowUV_ny * 1.5 + time * 0.05) * 0.5 +
               fbm3(flowUV_ny * 3.0 - time * 0.03 + 50.0) * 0.3;

  vec3 normal = normalize(vec3(
    h_px - h_nx,
    h_py - h_ny,
    height * height * height * 0.5 + 0.1
  ));

  // === LIGHTING - from original shader ===
  vec3 lightDir = normalize(vec3(0.0, 1.0, 2.0));
  float lightDot = dot(normal, lightDir);

  // Backlight - rim effect
  float backlight = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
  vec3 color = vec3(0.3) * backlight;

  // Specular highlight
  float specular = pow(lightDot * 0.5 + 0.5, 20.0);
  color += vec3(0.5) * smoothstep(0.2, 1.0, specular);

  // === RAINBOW IRIDESCENCE - the key effect ===
  // This creates the oil-slick rainbow colors
  vec3 rainbow = 0.5 + 0.5 * cos(
    vec3(1.0, 2.0, 3.0) * 1.0 +  // Phase offset per channel
    lightDot * 4.0 -              // Based on light angle
    uv.y * 3.0 -                  // Vertical gradient
    3.0 +                         // Base offset
    time * 0.2                    // Slow color shift
  );

  // Rainbow shows more at thin areas (edges)
  float thinFilm = smoothstep(0.15, 0.0, height * mask);
  color += rainbow * thinFilm * uIntensity;

  // Also add rainbow based on edge distance
  color += rainbow * edgeDist * uBorder * 0.5;

  // === EDGE EFFECTS ===
  // Darker at very thin edges
  color *= smoothstep(0.0, 0.1, mask);

  // Subtle glow at border
  color += vec3(0.2, 0.15, 0.1) * edgeDist * uBorder * 0.3;

  color *= uIntensity;

  // Alpha
  float alpha = mask * uOpacity;

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

  // === OUTER SHADOW - makes effects feel inset (color burn style) ===
  // Sample mask at increasing mip levels to get expanded/blurred versions
  // Higher mip = more blur = wider spread
  float maskSharp = textureLod(uMaskTexture, vUv, 0.0).a;
  float maskBlur1 = textureLod(uMaskTexture, vUv, 4.0 + uBorder * 3.0).a;
  float maskBlur2 = textureLod(uMaskTexture, vUv, 6.0 + uBorder * 4.0).a;
  float maskBlur3 = textureLod(uMaskTexture, vUv, 8.0 + uBorder * 5.0).a;
  float maskBlur4 = textureLod(uMaskTexture, vUv, 10.0 + uBorder * 6.0).a;

  // Noise for organic shadow edges
  vec2 shadowNoiseUV = vUv * texSize * 0.003;
  float shadowNoise1 = snoise(shadowNoiseUV * 2.0 + time * 0.03) * 0.5 + 0.5;
  float shadowNoise2 = snoise(shadowNoiseUV * 4.0 + time * 0.02 + 50.0) * 0.5 + 0.5;
  float combinedShadowNoise = shadowNoise1 * 0.6 + shadowNoise2 * 0.4;

  // Inner shadow zone: close to the edge, darkest
  float innerZone = smoothstep(0.0, 0.7, maskBlur1) * (1.0 - smoothstep(0.0, 0.1, maskSharp));
  // Mid-inner shadow zone
  float midInnerZone = smoothstep(0.0, 0.6, maskBlur2) * (1.0 - smoothstep(0.0, 0.3, maskBlur1));
  // Mid-outer shadow zone
  float midOuterZone = smoothstep(0.0, 0.5, maskBlur3) * (1.0 - smoothstep(0.0, 0.25, maskBlur2));
  // Outer shadow zone: farthest, lightest
  float outerZone = smoothstep(0.0, 0.4, maskBlur4) * (1.0 - smoothstep(0.0, 0.2, maskBlur3));

  // Apply noise to break up the shadow - more noise on outer zones
  innerZone *= (0.85 + combinedShadowNoise * 0.15);
  midInnerZone *= (0.7 + combinedShadowNoise * 0.3);
  midOuterZone *= (0.5 + combinedShadowNoise * 0.5);
  outerZone *= (0.3 + combinedShadowNoise * 0.7);

  // Combine with heavier weight near the edge (color burn effect)
  float shadowIntensity = innerZone * 1.0 + midInnerZone * 0.7 + midOuterZone * 0.4 + outerZone * 0.2;
  shadowIntensity *= uBorder * uOpacity;

  vec4 result;

  if(uEffectType == 1) {
    result = fireEffect(vUv, texSize, time);
  } else if(uEffectType == 2) {
    result = spaceTearEffect(vUv, texSize, time);
  } else if(uEffectType == 3) {
    result = waterEffect(vUv, texSize, time);
  } else if(uEffectType == 4) {
    result = magicEffect(vUv, texSize, time);
  } else if(uEffectType == 5) {
    result = greaseEffect(vUv, texSize, time);
  } else {
    // No effect - solid color
    float mask = texture2D(uMaskTexture, vUv).a;
    if(mask < 0.001 && shadowIntensity < 0.001) discard;
    result = vec4(uBaseColor, mask * uOpacity);
  }

  // Blend outer shadow under the effect
  // Shadow is dark, high opacity near edge for color burn effect
  vec3 shadowColor = vec3(0.0, 0.0, 0.0);
  float shadowAlpha = shadowIntensity * 0.85;

  // If we have shadow but no effect, show just the shadow
  if(result.a < 0.001 && shadowAlpha > 0.001) {
    gl_FragColor = vec4(shadowColor, shadowAlpha);
    return;
  }

  // Composite: shadow underneath, effect on top
  // Use standard alpha blending: result over shadow
  float finalAlpha = result.a + shadowAlpha * (1.0 - result.a);
  vec3 finalColor = (result.rgb * result.a + shadowColor * shadowAlpha * (1.0 - result.a)) / max(finalAlpha, 0.001);

  if(finalAlpha < 0.001) discard;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
