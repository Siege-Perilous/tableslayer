precision highp float;

uniform sampler2D uTexture;

uniform float uTime;

uniform float uOpacity;
uniform vec3 uColor;

uniform float uSize;

uniform float uLifetime;
uniform float uFadeInTime;
uniform float uFadeOutTime;

varying vec3 vPos;
varying float vAge;

void main() {
  // Calculate angle from position to origin in XY plane
  float angle = atan(vPos.y, vPos.x) - (3.1415926535897932384626433832795 / 2.0);

  // Rotate texture coordinates around center point
  vec2 centeredCoord = gl_PointCoord - 0.5;
  float s = sin(angle);
  float c = cos(angle);
  vec2 rotatedCoord = vec2(centeredCoord.x * c - centeredCoord.y * s, centeredCoord.x * s + centeredCoord.y * c);
  vec2 finalCoord = rotatedCoord + 0.5;

  vec4 textureColor = texture2D(uTexture, finalCoord);

  float opacity = uOpacity * textureColor.a;

  // Fade particles in and out at beginning and end of their lifetime
  opacity *= smoothstep(0.0, uFadeInTime, vAge);
  opacity *= 1.0 - smoothstep(uLifetime - uFadeOutTime, uLifetime, vAge);

  gl_FragColor = vec4(textureColor.rgb * uColor, opacity);
}
