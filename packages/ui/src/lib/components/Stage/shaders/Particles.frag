precision highp float;

uniform sampler2D uTexture;

uniform float uTime;

uniform float uOpacity;
uniform vec3 uColor;

uniform float uSize;

uniform float uLifetime;
uniform float uFadeInTime;
uniform float uFadeOutTime;

varying float particleAge;

void main() {
  vec4 textureColor = texture2D(uTexture, gl_PointCoord);

  float opacity = uOpacity * textureColor.a;

  // Fade particles in and out at beginning and end of their lifetime
  opacity *= smoothstep(0.0, uFadeInTime, particleAge);
  opacity *= 1.0 - smoothstep(uLifetime - uFadeOutTime, uLifetime, particleAge);

  gl_FragColor = vec4(textureColor.rgb * uColor, opacity);
}
