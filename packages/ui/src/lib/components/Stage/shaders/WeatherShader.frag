precision mediump float;
uniform float opacity;
uniform vec2 uResolution;

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float noise(vec2 p) {
  return hash(p.x + p.y * 57.0);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Scale the UV coordinates for raindrop density and movement speed
  vec2 p = uv * resolution.xy / resolution.y;

  // Define raindrop speed and length
  float speed = 0.1;
  float dropLength = 0.2;

  // Offset time and UV for random pattern effects
  float timeOffset = time * speed;
  p.y += timeOffset;

  float alpha = noise(p) * opacity;
  vec3 color = vec3(0.7, 0.8, 1.0); // Light blue to mimic rain

  outputColor = vec4(mix(inputColor.rgb, color, alpha), 1.0);
}