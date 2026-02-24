uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform vec2 uResolution;
uniform float uScale;

varying vec2 vUv;

void main() {
  vec2 uv = fract(vUv * uResolution / max(uResolution.x, uResolution.y) * uScale);
  vec4 texColor = texture2D(uTexture, uv);

        // Calculate distance from center (0.5, 0.5)
  vec2 center = vec2(0.5, 0.5);
  float dist = length(vUv - center);

        // Fade based on distance
  float fade = 1.0 - smoothstep(uFadeStart, uFadeEnd, dist);

  gl_FragColor = texColor;
  gl_FragColor.a *= (1.0 - fade) * uOpacity;
}