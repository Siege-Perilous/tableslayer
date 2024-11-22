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
    grid = squareGrid(gridCoords_px, gridSpacing_px);
  }

  /* Uncomment these lines to visualize the area outside the safe zone
  float outsideSafeZone = step(uPadding_px.x, p.x) - step((uResolution_px.x - uPadding_px.x), p.x);
  outsideSafeZone *= step(uPadding_px.y, p.y) - step((uResolution_px.y - uPadding_px.y), p.y);
  vec4 exclusionZoneColor = vec4(1.0, 0, 0, 1.0 - outsideSafeZone);
  */

  // Exclude anything outside of the grid
  vec2 o = gridOrigin_px;
  vec2 s = gridSize_px;
  vec2 p = displayCoord_px;

  float insideGrid = step(o.x, p.x) - step((o.x + s.x), p.x);
  insideGrid *= step(o.y, p.y) - step((o.y + s.y), p.y);

  vec4 lineColor = vec4(uLineColor, grid * insideGrid * uOpacity);

  gl_FragColor = lineColor;
}