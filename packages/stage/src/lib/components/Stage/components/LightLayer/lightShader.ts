import * as THREE from 'three';
import { LightStyle } from './types';

// Vertex shader - simple passthrough with UV
export const lightVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Fragment shader using proven fire techniques
// Based on techniques from:
// - Shadertoy "Fires" by xbe (shadertoy.com/view/XsXSWS)
// - FBM fire approach from fixermark blog
// - Glow techniques from inspirnathan.com
export const lightFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform float uTime;
  uniform float uOpacity;
  uniform float uPulse; // 0.0 to 1.0, affects radius expansion
  uniform int uStyle;
  uniform vec3 uColor;
  uniform bool uSelected;

  // Hash function for noise
  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  // Simplex-like noise (from Inigo Quilez)
  float noise(vec2 p) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2
    const float K2 = 0.211324865; // (3-sqrt(3))/6

    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    vec2 o = step(a.yx, a.xy);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;

    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));

    return dot(n, vec3(70.0));
  }

  // Fractal Brownian Motion
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rot = mat2(1.6, 1.2, -1.2, 1.6); // Rotation to reduce artifacts

    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p = rot * p;
      amplitude *= 0.5;
    }
    return value;
  }

  // Fire color gradient (temperature-based)
  vec3 fireGradient(float t) {
    // Black -> Red -> Orange -> Yellow -> White
    vec3 c;
    t = clamp(t, 0.0, 1.0);
    if (t < 0.25) {
      c = mix(vec3(0.0, 0.0, 0.0), vec3(0.5, 0.0, 0.0), t * 4.0);
    } else if (t < 0.5) {
      c = mix(vec3(0.5, 0.0, 0.0), vec3(1.0, 0.3, 0.0), (t - 0.25) * 4.0);
    } else if (t < 0.75) {
      c = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.7, 0.0), (t - 0.5) * 4.0);
    } else {
      c = mix(vec3(1.0, 0.7, 0.0), vec3(1.0, 1.0, 0.8), (t - 0.75) * 4.0);
    }
    return c;
  }

  // Candle color gradient (warmer, softer)
  vec3 candleGradient(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 dark = vec3(0.3, 0.1, 0.0);
    vec3 mid = vec3(1.0, 0.5, 0.1);
    vec3 bright = vec3(1.0, 0.9, 0.6);

    if (t < 0.5) {
      return mix(dark, mid, t * 2.0);
    } else {
      return mix(mid, bright, (t - 0.5) * 2.0);
    }
  }

  void main() {
    // Center UV coordinates (-0.5 to 0.5)
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);

    // Geometry is 2x larger than light radius - scale dist for main effects
    // so they appear at the correct size, while glow uses full geometry
    float coreDist = dist * 2.0;
    vec2 coreUv = uv * 2.0;

    vec3 finalColor = vec3(0.0);
    float alpha = 0.0;

    // Soft outer glow that extends beyond the main effect (shared by all styles)
    // Uses unscaled dist so it can extend to the full geometry bounds
    float outerGlowFactor = 8.0 - uPulse * 2.0;
    float outerGlowIntensity = exp(-dist * dist * outerGlowFactor);
    // Edge mask to prevent square clipping at geometry bounds
    float outerGlowMask = 1.0 - smoothstep(0.45, 0.5, dist);
    float outerGlow = outerGlowIntensity * outerGlowMask * 0.5;

    // === TORCH (style 0) ===
    if (uStyle == 0) {
      // Warm glow with animated flickering edges
      float speed = uTime * 0.15;

      // Pulse affects radius (0.0 = normal, 1.0 = expanded)
      float pulseRadius = 1.0 + uPulse * 0.15;

      // Noise for edge variation (use coreDist for main effect sizing)
      vec2 noiseCoord = vec2(angle * 2.0, coreDist * 3.0 - speed);
      float n = fbm(noiseCoord * 1.2);

      // Secondary slower noise for overall intensity variation
      float n2 = fbm(vec2(angle * 0.5, speed * 0.5)) * 0.5 + 0.5;

      // Shape with noise-distorted edge - pulse expands radius
      float radius = (0.38 + n * 0.06) * pulseRadius;
      float shape = 1.0 - smoothstep(radius * 0.6, radius, coreDist);

      // Soft inner glow - pulse makes it spread further
      float glowFactor = 12.0 - uPulse * 4.0;
      float glow = exp(-coreDist * coreDist * glowFactor) * 0.3;
      shape = shape + glow;

      // Edge mask - expands with pulse
      float edgeMask = 1.0 - smoothstep(0.38 * pulseRadius, 0.5, coreDist);
      shape *= edgeMask;

      // Intensity varies with noise
      float intensity = shape * (0.85 + n2 * 0.15);

      finalColor = fireGradient(intensity);
      alpha = smoothstep(0.0, 0.1, intensity);

      // Add outer glow - blend underneath main effect
      vec3 glowColor = vec3(1.0, 0.4, 0.1);
      finalColor = finalColor * alpha + glowColor * outerGlow * (1.0 - alpha);
      alpha = alpha + outerGlow * (1.0 - alpha);
    }

    // === CANDLE (style 1) ===
    else if (uStyle == 1) {
      // Softer, smaller flame
      float speed = uTime * 0.2;

      // Pulse affects radius
      float pulseRadius = 1.0 + uPulse * 0.12;

      vec2 noiseCoord = vec2(angle * 1.5, coreDist * 3.0 - speed);
      float n = fbm(noiseCoord * 1.2);

      // Tighter radius, softer edges - pulse expands
      float radius = 0.35 * pulseRadius;
      float edge = radius + n * 0.1 - 0.05;
      float shape = 1.0 - smoothstep(edge * 0.4, edge, coreDist);

      float intensity = shape * (0.6 + n * 0.4);
      intensity = pow(intensity, 0.9);

      finalColor = candleGradient(intensity);
      alpha = smoothstep(0.0, 0.15, intensity);

      // Add outer glow - blend underneath main effect
      vec3 glowColor = vec3(1.0, 0.6, 0.2);
      finalColor = finalColor * alpha + glowColor * outerGlow * (1.0 - alpha);
      alpha = alpha + outerGlow * (1.0 - alpha);
    }

    // === MAGICAL (style 2) ===
    else if (uStyle == 2) {
      // Swirling glow with sparkles
      float speed = uTime * 0.15;

      // Pulse affects the glow spread
      float pulseFactor = 1.0 + uPulse * 0.2;

      // Swirling motion (use coreDist for main effect sizing)
      float swirl = angle + coreDist * 3.0 + speed * 2.0;
      vec2 swirlCoord = vec2(cos(swirl), sin(swirl)) * coreDist + speed * 0.5;
      float n = fbm(swirlCoord * 2.0);

      // Edge mask - expands with pulse
      float edgeMask = 1.0 - smoothstep(0.35 * pulseFactor, 0.5, coreDist);

      // Gaussian falloff - pulse makes it spread wider
      float coreFactor = 18.0 - uPulse * 6.0;
      float innerGlowFactor = 8.0 - uPulse * 3.0;
      float shape = exp(-coreDist * coreDist * coreFactor);
      float innerGlow = exp(-coreDist * coreDist * innerGlowFactor) * 0.4;
      shape = (shape + innerGlow) * edgeMask;

      // Sparkles
      float sparkle = pow(max(0.0, noise(coreUv * 30.0 + uTime * 0.5)), 8.0);
      sparkle *= edgeMask * (1.0 - coreDist * 2.5);
      sparkle = max(0.0, sparkle);

      float intensity = shape * (0.7 + n * 0.3) + sparkle * 0.5;

      // Purple/blue magical color
      vec3 magicCore = vec3(1.0, 1.0, 1.0);
      vec3 magicMid = uColor;
      vec3 magicEdge = uColor * 0.3;

      if (intensity > 0.6) {
        finalColor = mix(magicMid, magicCore, (intensity - 0.6) / 0.4);
      } else {
        finalColor = mix(magicEdge, magicMid, intensity / 0.6);
      }
      finalColor += vec3(sparkle);

      alpha = intensity * 1.2;
      alpha = clamp(alpha, 0.0, 1.0);

      // Add outer glow - blend underneath main effect
      vec3 glowColor = uColor * 0.8;
      finalColor = finalColor * alpha + glowColor * outerGlow * (1.0 - alpha);
      alpha = alpha + outerGlow * (1.0 - alpha);
    }

    // === FIRE (style 3) ===
    else if (uStyle == 3) {
      // More intense, chaotic fire
      float speed = uTime * 0.4;

      // Pulse affects radius
      float pulseRadius = 1.0 + uPulse * 0.18;

      // Multiple noise layers for chaos (use coreDist for main effect sizing)
      vec2 noiseCoord = vec2(angle * 2.5, coreDist * 5.0 - speed);
      float n1 = fbm(noiseCoord * 1.5);
      float n2 = fbm(noiseCoord * 2.5 + 5.0);
      float n = n1 * 0.6 + n2 * 0.4;

      // Larger, more irregular shape - pulse expands
      float radius = 0.45 * pulseRadius;
      float edge = radius + n * 0.2 - 0.15;
      float shape = 1.0 - smoothstep(edge * 0.4, edge, coreDist);

      // Hot spots
      float hotspots = pow(max(0.0, n1), 3.0) * shape;

      float intensity = shape * (0.4 + n * 0.6) + hotspots * 0.3;
      intensity = pow(intensity, 0.7);

      finalColor = fireGradient(intensity * 1.1);
      alpha = smoothstep(0.0, 0.08, intensity);

      // Add outer glow - blend underneath main effect
      vec3 glowColor = vec3(1.0, 0.3, 0.05);
      finalColor = finalColor * alpha + glowColor * outerGlow * (1.0 - alpha);
      alpha = alpha + outerGlow * (1.0 - alpha);
    }

    // === LANTERN (style 4) ===
    else if (uStyle == 4) {
      // Steady warm glow with grain texture

      // Pulse affects the falloff spread (use coreDist for main effect sizing)
      float intensityFactor = 20.0 - uPulse * 6.0;
      float alphaFactor = 8.0 - uPulse * 3.0;

      // Gaussian falloff for intensity (color brightness)
      float intensity = exp(-coreDist * coreDist * intensityFactor);

      // Separate alpha falloff - more gradual for transparency
      float alphaFalloff = exp(-coreDist * coreDist * alphaFactor);

      // Edge mask - expands with pulse
      float edgeMaskStart = 0.4 + uPulse * 0.05;
      float edgeMask = 1.0 - smoothstep(edgeMaskStart, 0.5, coreDist);

      // High-frequency grain noise to break up the gradient
      // Rotates slowly for organic movement
      float rotSpeed = uTime * 0.3;
      vec2 rotatedUv = vec2(
        coreUv.x * cos(rotSpeed) - coreUv.y * sin(rotSpeed),
        coreUv.x * sin(rotSpeed) + coreUv.y * cos(rotSpeed)
      );
      float grain = noise(rotatedUv * 50.0);
      grain = grain * 0.1;

      // Warm lantern colors - white core to orange edge
      vec3 lanternCore = vec3(1.0, 0.98, 0.9);
      vec3 lanternMid = uColor;
      vec3 lanternEdge = uColor * 0.6;

      if (intensity > 0.5) {
        finalColor = mix(lanternMid, lanternCore, (intensity - 0.5) / 0.5);
      } else {
        finalColor = mix(lanternEdge, lanternMid, intensity / 0.5);
      }

      // Apply grain to color
      finalColor += grain * alphaFalloff;

      // Very subtle overall flicker
      float flicker = noise(vec2(uTime * 0.3, 0.0)) * 0.05 + 0.975;

      // Alpha fades out towards edges for transparency
      alpha = alphaFalloff * edgeMask * flicker;

      // Add outer glow - blend underneath main effect
      vec3 glowColor = uColor * 0.7;
      finalColor = finalColor * alpha + glowColor * outerGlow * (1.0 - alpha);
      alpha = alpha + outerGlow * (1.0 - alpha);
    }

    // === SPOTLIGHT (style 5) ===
    else if (uStyle == 5) {
      // Soft, ethereal glow with very gradual gaussian falloff
      float speed = uTime * 0.03;

      // Pulse affects the glow spread (use coreDist for main effect sizing)
      float shapeFactor = 15.0 - uPulse * 5.0;
      float haloFactor = 6.0 - uPulse * 2.0;

      vec2 noiseCoord = vec2(angle * 0.5, coreDist + speed);
      float n = fbm(noiseCoord * 0.6);

      // Edge mask - expands with pulse
      float edgeMaskStart = 0.3 + uPulse * 0.08;
      float edgeMask = 1.0 - smoothstep(edgeMaskStart, 0.5, coreDist);

      // Soft gaussian falloff - pulse makes it spread wider
      float shape = exp(-coreDist * coreDist * shapeFactor);

      // Soft inner halo
      float halo = exp(-coreDist * coreDist * haloFactor) * 0.5;
      shape = (shape + halo) * edgeMask;

      float intensity = shape * (0.95 + n * 0.05);

      // Cool spotlight colors
      vec3 moonCore = vec3(0.95, 0.97, 1.0);
      vec3 moonMid = uColor;
      vec3 moonEdge = uColor * 0.5;

      // Subtle shimmer
      float shimmer = noise(coreUv * 15.0 + uTime * 0.2) * 0.03 + 1.0;

      if (intensity > 0.4) {
        finalColor = mix(moonMid, moonCore, (intensity - 0.4) / 0.6);
      } else {
        finalColor = mix(moonEdge, moonMid, intensity / 0.4);
      }
      finalColor *= shimmer;

      alpha = intensity;
      alpha = clamp(alpha, 0.0, 1.0);

      // Add outer glow - blend underneath main effect
      vec3 glowColor = uColor * 0.6;
      finalColor = finalColor * alpha + glowColor * outerGlow * (1.0 - alpha);
      alpha = alpha + outerGlow * (1.0 - alpha);
    }

    // Selection indicator (use coreDist to keep it centered on the light)
    if (uSelected) {
      float ring = smoothstep(0.14, 0.15, coreDist) * (1.0 - smoothstep(0.16, 0.17, coreDist));
      finalColor = mix(finalColor, vec3(1.0), ring * 0.8);
      alpha = max(alpha, ring * 0.8);
    }

    gl_FragColor = vec4(finalColor, alpha * uOpacity);
  }
`;

// Style configurations for uniforms
export interface LightStyleConfig {
  baseColor: THREE.Color;
  flickerSpeed: number;
}

export const lightStyleConfigs: Record<LightStyle, LightStyleConfig> = {
  [LightStyle.Torch]: {
    baseColor: new THREE.Color('#FF6B35'),
    flickerSpeed: 1.0
  },
  [LightStyle.Candle]: {
    baseColor: new THREE.Color('#FFD700'),
    flickerSpeed: 0.8
  },
  [LightStyle.Magical]: {
    baseColor: new THREE.Color('#8A2BE2'),
    flickerSpeed: 0.5
  },
  [LightStyle.Fire]: {
    baseColor: new THREE.Color('#FF4500'),
    flickerSpeed: 1.5
  },
  [LightStyle.Lantern]: {
    baseColor: new THREE.Color('#FFA500'),
    flickerSpeed: 0.3
  },
  [LightStyle.Spotlight]: {
    baseColor: new THREE.Color('#E6E6FA'),
    flickerSpeed: 0.1
  }
};

// Get style index for shader
export const getStyleIndex = (style: LightStyle): number => {
  const styles = [
    LightStyle.Torch,
    LightStyle.Candle,
    LightStyle.Magical,
    LightStyle.Fire,
    LightStyle.Lantern,
    LightStyle.Spotlight
  ];
  return styles.indexOf(style);
};

// Create shader material for a light
export const createLightMaterial = (style: LightStyle, color: THREE.Color): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    vertexShader: lightVertexShader,
    fragmentShader: lightFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPulse: { value: 0 },
      uStyle: { value: getStyleIndex(style) },
      uColor: { value: color },
      uSelected: { value: false }
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
};
