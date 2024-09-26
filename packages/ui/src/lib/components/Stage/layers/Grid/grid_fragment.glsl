varying vec2 vUv;

uniform int gridType; // 0 for square, 1 for hex
uniform float opacity;
uniform float spacing;
uniform vec2 offset;
uniform float lineThickness;
uniform vec3 lineColor;
uniform float shadowIntensity;
uniform float shadowSize;
uniform vec3 shadowColor;

uniform sampler2D tDiffuse;
uniform vec2 targetSize;

#define PI 3.141592653589793
const vec2 s = vec2(1.0, 1.7320508); // For hexagonal grid calculations

// Function to create a square grid
// Returns floating point value between 0 and 1
float squareGrid(vec2 p, float spacing, float thickness) {
  vec2 gridPos = mod(p, spacing);
  float distToLineX = min(gridPos.x, spacing - gridPos.x);
  float distToLineY = min(gridPos.y, spacing - gridPos.y);
  float lineDist = min(distToLineX, distToLineY);

  // As distance to line decreases, increase the line intensity
  return smoothstep(thickness, 0.0, lineDist);
}

// This function helps define the shape of a hexagon by transforming a 
// 2D coordinate and determining whether the point falls inside the
// boundaries of a hexagonal cell.
float hex(vec2 p) {
  p = abs(p);
  return max(dot(p, s * 0.5), p.x); // Hexagon shape
}

// This function maps a 2D point p to its corresponding hexagonal grid 
// coordinates and returns information about the hexagonal cell it's in.
vec2 getHex(vec2 p) {
  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw;
}

void main() {
  // Sample the scene texture
  vec4 sceneColor = texture2D(tDiffuse, vUv);

  // Scale UV coords by the render target size
  vec2 p = vUv * targetSize + offset;

  float grid = 0.0;
  float shadow = 0.0;
  if(gridType == 0) { // Square grid
    grid = squareGrid(p, spacing, lineThickness);
    shadow = squareGrid(p, spacing, lineThickness * shadowSize);
  } else { // Hex grid
    vec2 hexUv = getHex(p / spacing);
    float hexValue = hex(hexUv) + 0.5; // Outputs 0 to 1
    grid = smoothstep(1.0 - lineThickness / 100.0, 1.0, hexValue);
    shadow = smoothstep(1.0 - lineThickness / 100.0 * shadowSize, 1.0, hexValue);
  }

  vec4 shadedScene = vec4(mix(sceneColor.rgb, shadowColor.rgb / 255.0, shadow * shadowIntensity * opacity), 1.0);
  vec4 finalColor = vec4(mix(shadedScene.rgb, lineColor.rgb / 255.0, grid * opacity), 1.0);

  gl_FragColor = finalColor;
}
