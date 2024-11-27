uniform int uGridType;
uniform float uSpacing_in;
uniform float uOpacity;
uniform vec2 uPadding_px;
uniform float uLineThickness;
uniform vec3 uLineColor;
uniform float uShadowIntensity;
uniform float uShadowSize;
uniform vec3 uShadowColor;
uniform float uSceneScale;
uniform vec2 uResolution_px;
uniform vec2 uDisplaySize_in;

varying vec2 vUv;

#define PI 3.141592653589793
const vec2 s = vec2(1.0, 1.7320508); // For hexagonal grid calculations

/**
  Returns 0 or 1 to indicate if this fragment is a grid line

  Params
    - coords: The coordinates of the fragment relative to the grid origin
    - spacing: The grid spacing in pixels
*/
float squareGrid(vec2 coords, vec2 spacing) {
    // Use modulus to compute the locations of the nearest grid lines
  vec2 gridLine_px = mod(coords, spacing);

  // Compute distance to the grid line and modulate opacity based on line thickness
  vec2 distanceToLine_px = gridLine_px - coords;
  vec2 grid = 1.0 - step(vec2(uLineThickness / 2.0), gridLine_px);

  return ceil((grid.x + grid.y) / 2.0);
}

// This function maps a 2D point p to its corresponding hexagonal grid 
// coordinates and returns information about the hexagonal cell it's in.
// NOTE: Function and comments are AI generated using ChatGPT 4o
vec2 getHex(vec2 p) {
  // Step 1: Compute the approximate centers of candidate hexagons.
  // - `vec4(p, p - vec2(0.5, 1.0))` creates two shifted versions of the input `p`.
  //   - The first two components are `p` for direct scaling.
  //   - The last two components are `p - vec2(0.5, 1.0)` to account for hexagonal offsets.
  // - Divide by `s.xyxy` (grid scaling factors) to map the coordinates into a normalized hexagonal grid.
  // - `floor(...) + 0.5` maps the point to the center of the grid cell it lies in.
  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;

  // Step 2: Calculate the two potential hexagon centers in the original space.
  // - `hC.xy * s`: Maps the first candidate center back to the original space.
  // - `(hC.zw + 0.5) * s`: Maps the second candidate center back, accounting for offsets.
  // - Subtract these centers from `p` to calculate relative positions (distance vectors) to `p`.
  vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);

  // Step 3: Compare distances to the two candidate centers.
  // - Use `dot(h.xy, h.xy)` and `dot(h.zw, h.zw)` to compute the squared distances (avoids expensive sqrt).
  // - Return the center (either `h.xy` or `h.zw`) that is closer to `p`.
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? h.xy : h.zw;
}

// This function helps define the shape of a hexagon by transforming a 
// 2D coordinate and determining whether the point falls inside the
// boundaries of a hexagonal cell.
float hexGrid(vec2 coords, vec2 spacing) {
  vec2 hexUv = getHex(coords / spacing);
  hexUv = abs(hexUv);
  float hexValue = max(dot(hexUv, s * 0.5), hexUv.x);

  // 0 is max thickness, 0.5 is zero thickness
  // 0 maps to spacing * 0.5 pixels
  vec2 maxThickness = spacing * 0.5;

  // When the thickness is equal to spacing * 0.5, it must be zero
  return step(0.5 * (1.0 - uLineThickness / spacing.x / 2.0), hexValue);
}

void main() {
  // NOTE: To make it easier to determine what units a variable is, the _px suffix is used
  // for values measured in pixels and the _in suffix is for inches. 

  // Convert UV coordinates to pixels and get the coordinates of this fragment in pixels
  vec2 displayCoord_px = vUv * uResolution_px;

  // Compute the pixel pitch
  vec2 pixelPitch_in = uDisplaySize_in / uResolution_px;

  // Compute the nominal grid size in pixels and determine the maximum
  // number of grid squares that can fit inside the safe zone
  vec2 safeZoneSize_px = uResolution_px - uPadding_px * 2.0 - uLineThickness;
  vec2 gridSpacing_px = vec2(uSpacing_in) / pixelPitch_in;
  vec2 gridCount = floor(safeZoneSize_px / gridSpacing_px);

  // Compute the total grid size in pixels, then compute the position of the fragment
  // relative to the origin (lower left)
  vec2 gridSize_px = gridSpacing_px * gridCount + uLineThickness / 2.0;
  vec2 gridOrigin_px = (uResolution_px - gridSize_px) / 2.0;
  vec2 gridCoords_px = displayCoord_px - gridOrigin_px;

  float grid = 0.0;
  if(uGridType == 0) {
    grid = squareGrid(gridCoords_px, gridSpacing_px);
  } else {
    // Subtract half the grid size so the hex grid is symmetrical on the edges
    grid = hexGrid((gridCoords_px - (gridSize_px / 2.0)), gridSpacing_px);

    // Add border
    vec2 topRight = gridOrigin_px + gridSize_px - displayCoord_px;
    vec2 bottomLeft = displayCoord_px - gridOrigin_px;

    // If any coordinates are inside the border zone, set isBorder to true
    bool isBorder = (topRight.x < uLineThickness / 2.0) ||
      (topRight.y < uLineThickness / 2.0) ||
      (bottomLeft.x < uLineThickness / 2.0) ||
      (bottomLeft.y < uLineThickness / 2.0);

    grid = max(grid, float(isBorder));
  }

  /* Uncomment these lines to visualize the area outside the safe zone
  float outsideSafeZone = step(uPadding_px.x, p.x) - step((uResolution_px.x - uPadding_px.x), p.x);
  outsideSafeZone *= step(uPadding_px.y, p.y) - step((uResolution_px.y - uPadding_px.y), p.y);
  vec4 exclusionZoneColor = vec4(1.0, 0, 0, 1.0 - outsideSafeZone);
  */

  float insideGrid = step(gridOrigin_px.x, displayCoord_px.x) - step((gridOrigin_px.x + gridSize_px.x), displayCoord_px.x);
  insideGrid *= step(gridOrigin_px.y, displayCoord_px.y) - step((gridOrigin_px.y + gridSize_px.y), displayCoord_px.y);

  vec4 lineColor = vec4(uLineColor, grid * insideGrid * uOpacity);

  gl_FragColor = lineColor;
}