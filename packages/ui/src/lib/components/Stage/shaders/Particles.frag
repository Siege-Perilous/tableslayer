precision highp float;

uniform sampler2D uTexture;

uniform float uTime;

uniform float uOpacity;
uniform vec3 uColor;

uniform float uLifetime;
uniform float uFadeInTime;
uniform float uFadeOutTime;

varying vec2 vUv;
varying vec3 vPos;
varying float vAge;

void main() {
  vec4 textureColor = texture2D(uTexture, vUv);

  float opacity = uOpacity * textureColor.a;

  // Fade particles in and out at beginning and end of their lifetime
  opacity *= smoothstep(0.0, uFadeInTime, vAge);
  opacity *= 1.0 - smoothstep(uLifetime - uFadeOutTime, uLifetime, vAge);

  gl_FragColor = vec4(textureColor.rgb * uColor, opacity);
}
