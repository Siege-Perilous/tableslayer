uniform int uGridType;
uniform int uGridMode;
uniform float uSpacing_in;
uniform float uOpacity;
uniform vec2 uPadding_px;
uniform float uLineThickness;
uniform vec3 uLineColor;
uniform float uShadowOpacity;
uniform float uShadowBlur;
uniform float uShadowSpread;
uniform vec3 uShadowColor;
uniform float uSceneScale;
uniform vec2 uResolution_px;
uniform vec2 uDisplaySize_in;
uniform float uFixedGridCountX;
uniform float uFixedGridCountY;

// NUM_CLIPPING_PLANES is provided via material defines (three.js rewrites the
// token in shader source, so it must not be #define'd here)
uniform vec4 uClippingPlanes[NUM_CLIPPING_PLANES];

varying vec2 vUv;
varying vec3 vWorldPosition;

#define PI 3.141592653589793

const vec2 s = vec2(1.0, 1.7320508); // For hexagonal grid calculations

/**
  Returns 0 or 1 to indicate if this fragment is a grid line

  Params
    - coords: The coordinates of the fragment relative to the grid origin
    - spacing: The grid spacing in pixels
*/
float squareGrid(vec2 coords, vec2 spacing, float thickness, float sharpness) {
    // Use modulus to compute the locations of the nearest grid lines
  vec2 gridLine_px = vec2(round(coords.x / spacing.x) * spacing.x, round(coords.y / spacing.y) * spacing.y);

  // Compute distance to the grid line and modulate opacity based on line thickness
  vec2 distanceToLine_px = abs(coords - gridLine_px);

  // Analytic anti-aliasing: fwidth() is this fragment's footprint in local px
  // (device-pixel-ratio included). The half-width floors at one device pixel
  // so every line keeps a solid core regardless of its sub-pixel phase — hard
  // or sub-pixel bands alias into patchy, phase-dependent moiré — and edges
  // always get at least a pixel of falloff.
  vec2 aa = fwidth(coords);
  vec2 halfWidth = max(vec2(thickness / 4.0), aa);
  vec2 edge = max(vec2(50.0 * sharpness), aa);

  vec2 grid = 1.0 - smoothstep(halfWidth - edge, halfWidth + edge, distanceToLine_px);

  return max(grid.x, grid.y);
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
float hexGrid(vec2 coords, vec2 spacing, float thickness, float sharpness) {
  vec2 hexUv = getHex(coords / spacing);
  hexUv = abs(hexUv);
  float hexValue = max(dot(hexUv, s * 0.5), hexUv.x);

  // 0 is max thickness, 0.5 is zero thickness
  // 0 maps to spacing * 0.5 pixels
  vec2 maxThickness = spacing * 0.5;

  // Anti-alias over at least one device pixel of the hex field (see squareGrid)
  float aa = fwidth(hexValue);
  float edge = max(sharpness, aa);

  // When the thickness is equal to spacing * 0.5, it must be zero
  float edgePosition = 0.5 * (1.0 - thickness / spacing.x / 2.0);
  return smoothstep(edgePosition - edge, edgePosition + edge, hexValue);
}

void main() {
  // Manual clipping against the display-rect planes (raw ShaderMaterials skip
  // the renderer's global clipping planes). In MapDefined mode the quad is
  // map-sized and can extend beyond the playfield; the DM whole-map view
  // disables these planes, the Player view clips like every other layer.
  vec4 plane;
  for (int i = 0; i < NUM_CLIPPING_PLANES; i++) {
    plane = uClippingPlanes[i];
    if (dot(-vWorldPosition, plane.xyz) > plane.w) {
      discard;
    }
  }

  // NOTE: To make it easier to determine what units a variable is, the _px suffix is used
  // for values measured in pixels and the _in suffix is for inches.

  // Convert UV coordinates to pixels and get the coordinates of this fragment in pixels
  vec2 displayCoord_px = vUv * uResolution_px;

  // Compute the pixel pitch
  vec2 pixelPitch_in = uDisplaySize_in / uResolution_px;

  vec2 gridSpacing_px;
  vec2 gridCount;
  vec2 gridSize_px;
  vec2 gridOrigin_px;

  if (uGridMode == 0) {
    // FillSpace mode - use padding-based calculation
    vec2 safeZoneSize_px = uResolution_px - uPadding_px * 2.0 - uLineThickness;
    gridSpacing_px = vec2(uSpacing_in) / pixelPitch_in;
    gridCount = floor(safeZoneSize_px / gridSpacing_px);
    gridSize_px = gridSpacing_px * gridCount + uLineThickness / 2.0;
    gridOrigin_px = (uResolution_px - gridSize_px) / 2.0;
  } else {
    // MapDefined mode - the layer is anchored to the map and the quad IS the
    // map (uResolution_px is the map size in map pixels). Cells are always
    // square: pixelPitch is uniform per axis (see getMapSpaceDisplay), so this
    // yields the average cell the fixed count implies. The grid is centered on
    // the map; a count/aspect mismatch shows as misfit at the map edges.
    gridCount = vec2(uFixedGridCountX, uFixedGridCountY);
    gridSpacing_px = vec2(uSpacing_in) / pixelPitch_in;
    gridSize_px = gridSpacing_px * gridCount;
    gridOrigin_px = (uResolution_px - gridSize_px) / 2.0;
  }

  vec2 gridCoords_px = displayCoord_px - gridOrigin_px;

  float grid = 0.0;
  float shadow = 0.0;
  float t = uLineThickness * uSceneScale < 2.0 ? 2.0 / uSceneScale : uLineThickness;

  if(uGridType == 0) {
    grid = squareGrid(gridCoords_px - t / 4.0, gridSpacing_px, t, 0.0);
    shadow = squareGrid(gridCoords_px - t / 4.0, gridSpacing_px, t * uShadowSpread, uShadowBlur);
  } else {
    // Subtract half the grid size so the hex grid is symmetrical on the edges
    grid = hexGrid((gridCoords_px - (gridSize_px / 2.0)), gridSpacing_px, t, 0.0);
    shadow = hexGrid((gridCoords_px - (gridSize_px / 2.0)), gridSpacing_px, t * uShadowSpread, uShadowBlur);
  }

  // Add border
  vec2 topRight = gridOrigin_px + gridSize_px - displayCoord_px;
  vec2 bottomLeft = displayCoord_px - gridOrigin_px;

    // If any coordinates are inside the border zone, set isBorder to true
  bool isBorder = (topRight.x < t / 2.0) ||
    (topRight.y < t / 2.0) ||
    (bottomLeft.x < t / 2.0) ||
    (bottomLeft.y < t / 2.0);

  grid = max(grid, float(isBorder));
  shadow = max(shadow, float(isBorder));

  /* Uncomment these lines to visualize the area outside the safe zone
  float outsideSafeZone = step(uPadding_px.x, p.x) - step((uResolution_px.x - uPadding_px.x), p.x);
  outsideSafeZone *= step(uPadding_px.y, p.y) - step((uResolution_px.y - uPadding_px.y), p.y);
  vec4 exclusionZoneColor = vec4(1.0, 0, 0, 1.0 - outsideSafeZone);
  */

  float insideGrid = step(gridOrigin_px.x, displayCoord_px.x) - step((gridOrigin_px.x + gridSize_px.x), displayCoord_px.x);
  insideGrid *= step(gridOrigin_px.y, displayCoord_px.y) - step((gridOrigin_px.y + gridSize_px.y), displayCoord_px.y);

  vec4 lineColor = vec4(uLineColor, grid * insideGrid * uOpacity);
  vec4 shadedScene = vec4(uShadowColor.rgb, shadow * uShadowOpacity * uOpacity);
  vec4 finalColor = mix(shadedScene, lineColor, grid);

  gl_FragColor = finalColor;
}