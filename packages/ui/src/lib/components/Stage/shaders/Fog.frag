precision highp float;

uniform sampler2D uMaskTexture;
uniform float uBlurRadius;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vUv;

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
  // Fast blur
  vec4 sum = vec4(0.0);
  vec2 texelSize = 1.0 / vec2(textureSize(uMaskTexture, 0));

  // 9-tap gaussian blur
  sum += texture2D(uMaskTexture, vUv + vec2(-uBlurRadius, -uBlurRadius) * texelSize) * 0.0625;
  sum += texture2D(uMaskTexture, vUv + vec2(0.0, -uBlurRadius) * texelSize) * 0.125;
  sum += texture2D(uMaskTexture, vUv + vec2(uBlurRadius, -uBlurRadius) * texelSize) * 0.0625;
  sum += texture2D(uMaskTexture, vUv + vec2(-uBlurRadius, 0.0) * texelSize) * 0.125;
  sum += texture2D(uMaskTexture, vUv) * 0.25;
  sum += texture2D(uMaskTexture, vUv + vec2(uBlurRadius, 0.0) * texelSize) * 0.125;
  sum += texture2D(uMaskTexture, vUv + vec2(-uBlurRadius, uBlurRadius) * texelSize) * 0.0625;
  sum += texture2D(uMaskTexture, vUv + vec2(0.0, uBlurRadius) * texelSize) * 0.125;
  sum += texture2D(uMaskTexture, vUv + vec2(uBlurRadius, uBlurRadius) * texelSize) * 0.0625;

  // Add time-varying fog using simplex noise
  float noise = snoise(vUv * 3.0 + uTime * 0.2);
  noise = 0.5 + 0.5 * noise; // Remap to 0-1 range

  // Mix the blurred texture with the noise using fog color and opacity uniforms
  vec4 fogColor = vec4(uColor, 1.0);
  vec4 noiseColor = mix(fogColor, vec4(noise), 0.5);
  vec4 finalColor = mix(vec4(0.0), noiseColor, sum * uOpacity);

  gl_FragColor = finalColor;
}
