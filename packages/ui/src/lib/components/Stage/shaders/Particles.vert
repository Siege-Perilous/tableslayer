precision highp float;

attribute float ageOffset;

uniform sampler2D uTexture;

uniform float uOpacity;
uniform float uTime;
uniform float uLifetime;

uniform vec3 uColor;
uniform vec2 uScale;

uniform vec3 uInitialVelocity;
uniform vec3 uLinearForceAmplitude;
uniform vec3 uExponentialForceAmplitude;
uniform vec3 uSinusoidalForceAmplitude;
uniform vec3 uSinusoidalForceFrequency;

varying vec2 vUv;
varying vec3 vPos;
varying float vAge;

void main() {
  vAge = mod(ageOffset + uTime, uLifetime);

  vec3 velocity = uInitialVelocity + vAge * uLinearForceAmplitude;
  velocity += uExponentialForceAmplitude * exp(vAge);
  velocity += uSinusoidalForceAmplitude * sin(vAge * uSinusoidalForceFrequency);

  vec3 pos = position;
  pos.xy *= uScale;
  pos += vAge * velocity;

    // Scale point size based on distance from camera
  float distanceToCamera = length(modelViewMatrix * vec4(pos, 1.0));

  vUv = uv;

  vec4 transformedPosition = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vPos = transformedPosition.xyz / transformedPosition.w;

  gl_Position = transformedPosition;
}