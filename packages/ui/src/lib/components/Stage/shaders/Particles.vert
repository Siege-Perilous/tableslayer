precision highp float;

attribute float ageOffset;
attribute float size;

uniform float uTime;
uniform float uLifetime;

uniform vec3 uColor;
uniform float uOpacity;
uniform sampler2D uTexture;

uniform vec3 uInitialVelocity;
uniform vec3 uLinearForceAmplitude;
uniform vec3 uExponentialForceAmplitude;
uniform vec3 uSinusoidalForceAmplitude;
uniform vec3 uSinusoidalForceFrequency;
uniform vec3 uNoiseForceAmplitude;
uniform vec3 uNoiseForceFrequency;

varying float particleAge;

void main() {
  particleAge = mod(ageOffset + uTime, uLifetime);

  vec3 velocity = uInitialVelocity + particleAge * uLinearForceAmplitude;
  velocity += uExponentialForceAmplitude * exp(particleAge);
  velocity += uSinusoidalForceAmplitude * sin(particleAge * uSinusoidalForceFrequency);
  //velocity += uNoiseForceAmplitude * noise(particleAge * uNoiseForceFrequency);
  vec3 pos = position + particleAge * velocity;

    // Scale point size based on distance from camera
  float distanceToCamera = length(modelViewMatrix * vec4(pos, 1.0));
  gl_PointSize = size * (1000.0 / distanceToCamera);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}