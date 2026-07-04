uniform vec2 uQuadSize_px;
uniform vec2 uRectHalf_px;
uniform float uOutlineThickness_px;
uniform vec3 uOutlineColor;
uniform float uOutlineOpacity;
uniform vec3 uDimColor;
uniform float uDimOpacity;

varying vec2 vUv;

void main() {
  // Position in scene units, quad centered on the scene origin
  vec2 p = (vUv - 0.5) * uQuadSize_px;

  // Signed distance to the TV rectangle boundary (negative inside)
  vec2 d = abs(p) - uRectHalf_px;
  float dist = length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0);

  float halfThickness = uOutlineThickness_px * 0.5;

  if (abs(dist) <= halfThickness) {
    // The rectangle outline
    gl_FragColor = vec4(uOutlineColor, uOutlineOpacity);
  } else if (dist > 0.0) {
    // Dim everything outside the playfield-visible region
    gl_FragColor = vec4(uDimColor, uDimOpacity);
  } else {
    gl_FragColor = vec4(0.0);
  }
}
