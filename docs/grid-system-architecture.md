# Grid System Architecture

## Overview

The Table Slayer grid system supports two primary modes for displaying grids on the game stage, with automatic marker and measurement snapping. This document describes the implementation details and coordinate transformations required for proper alignment.

## Grid Modes

### 1. Fill Space Mode (`GridMode.FillSpace`)

The default mode where the grid fills the available viewport space with padding. The grid is drawn in **display space** and floats above the map; the map can be freely panned, zoomed, and rotated underneath it.

**Characteristics:**

- Grid is always fully visible within the viewport
- Uses padding to create a safe zone around edges
- Grid origin starts at the padding position
- Grid size is calculated to fit within `viewport - (2 * padding)`
- All grid cells are complete (no partial cells at edges)
- Marker/light positions are center-relative **display pixels**

**Grid Origin Calculation:**

```typescript
origin = { x: padding.x, y: padding.y };
```

### 2. Map Defined Mode (`GridMode.MapDefined`)

A mode where the grid has a fixed cell count matching the map's actual grid (e.g., a `dungeon_40x30.jpg` map). **Everything is anchored to the map**: the grid, markers, lights, annotations, measurements, and fog all render inside a map-anchored group (`mapAnchor` in `Scene.svelte`), so panning the map moves the entire board together.

**Characteristics:**

- Grid has a fixed number of cells (`fixedGridCount.x` × `fixedGridCount.y`) covering the map image
- Cells are **always square** — the per-axis average of what the count implies (`getMapGridCellSize`); the grid is centered on the map, and a count/aspect mismatch shows as misfit at the map edges rather than as rectangular cells
- The count describes the **map image itself** (X along the image's width, matching the `name_WxH` filename convention) and is **invariant under rotation** — rotating the map never requires swapping the values, and the locked zoom doesn't change with rotation
- Map **zoom is locked/derived** (`getLockedMapZoom`): one grid cell spans `grid.spacing` inches on the physical display
- Map **rotation is cardinal-only** (90° steps); free-form rotation is disabled
- Map **pan is the synced control** for what the TV shows — anchored content rides along
- Marker/light positions are **center-relative map pixels** (map source-image pixels, origin at map center, +y up); the scene's `mapCoordVersion` column records this (0 = legacy display-space, 1 = map-local)
- In the editor (DM mode), the display-rect clipping is disabled so the whole map is visible; a `TvViewportLayer` rectangle (outline + dim mask) shows the playfield-visible region, and `scene.fit()` frames the map plus the TV rect
- The playfield (Player mode) renders exactly as before: clipped to the display rect, map transform applied

**Map alignment** (`getAlignedMapTransform` in `helpers/mapSpace.ts`, used by the editor's "Reset map position" and server-side scene creation): cardinal rotation to match display orientation, locked zoom, and an offset that centers the map when it fits the display rect or aligns top-left corners when it overflows.

## Coordinate Systems

The system uses multiple coordinate spaces that need careful transformation:

### 1. Center-Relative Display Coordinates

- Used by Three.js and the stage camera; 1 world unit = 1 display pixel
- Origin at viewport center, Y-axis points up
- Range: `[-width/2, width/2]` × `[-height/2, height/2]`
- FillSpace marker/light positions live here

### 2. Center-Relative Map Coordinates (MapDefined)

- Map source-image pixels, origin at the map center, +y up
- MapDefined marker/light positions live here; they render inside the uniform-scale `mapAnchor` group (`position = map.offset`, `rotation = map.rotation`, `scale = map.zoom`)
- Conversion contract (THREE-free helpers in `helpers/mapSpace.ts`, shared by apps/web):
  - display → map-local: `m = R(−θ) · (d − map.offset) / map.zoom`
  - map-local → display: `d = R(θ) · (m · map.zoom) + map.offset`

### 3. Screen Coordinates (Top-Left Relative)

- Used by the shader and grid calculations
- Origin at top-left corner, Y-axis points down
- Range: `[0, width]` × `[0, height]`

### The synthetic map-space display

Anchored layers receive a synthetic `DisplayProps` (`getMapSpaceDisplay`): `resolution = mapSize` (map px) and `size = fixedGridCount × grid.spacing` ("inches"). All existing display-space math — `getGridCellSize`, `snapToGrid` spacing, brush widths, marker sizes, measurement distances — then computes correctly in map pixels with no per-layer changes. In FillSpace the synthetic display **is** `props.display`, so behavior is identical by construction. `localScale` (= `map.zoom` when anchored, 1 otherwise) converts screen-space style values (line thickness, outline widths) into local pixels.

## Shader Grid Rendering

The grid shader (`GridShader.frag`) renders grid lines with specific offsets:

### Line Positioning

Grid lines are drawn with an offset of `lineThickness / 4.0`:

```glsl
grid = squareGrid(gridCoords_px - t / 4.0, gridSpacing_px, t, 0.0);
```

This offset shifts the visual grid lines slightly, which must be accounted for in snapping calculations (in local pixels: `lineThickness / localScale / 4`).

### Mode branches

```glsl
if (uGridMode == 0) {
  // FillSpace: padding-based safe zone, whole cells, centered in the display rect
} else {
  // MapDefined: the quad IS the map (uResolution_px = map size in map px).
  // pixelPitch is uniform per axis (getMapSpaceDisplay), so this yields the
  // square average cell; the grid is centered on the map
  gridCount      = vec2(uFixedGridCountX, uFixedGridCountY);
  gridSpacing_px = vec2(uSpacing_in) / pixelPitch_in;
  gridSize_px    = gridSpacing_px * gridCount;
  gridOrigin_px  = (uResolution_px - gridSize_px) / 2.0;
}
```

Line rendering is analytically anti-aliased inside `squareGrid`/`hexGrid` using `fwidth()` (the fragment footprint in local px, device-pixel-ratio included): the line half-width and the edge falloff both floor at one device pixel, so every line keeps a solid core regardless of its sub-pixel phase. Hard or sub-pixel bands alias into patchy moiré and phase-dependent bright/dim lines.

`helpers/grid.ts` (`getGridOrigin`, `snapToGrid`) is a hand-ported mirror of this shader — if one changes, the other must change to match.

## Marker Snapping Algorithm

The `snapToGrid` function ensures markers align properly with the visual grid. Because anchored layers work against the synthetic map-space display, the same function serves both modes:

### Fill Space Mode

1. Position is already center-relative display px
2. Snap to nearest grid point (cell centers for squares, centers/vertices for hexagons)

### Map Defined Mode

1. Position is center-relative **map px** (input meshes live inside `mapAnchor`, so `worldToLocal` raycasting yields map-local coordinates directly)
2. Grid origin centers the square-cell grid on the map quad (mirrors the shader)
3. Spacing is the square average cell on both axes (falls out of the synthetic display's uniform pixel pitch)
4. The shader offset compensation uses `lineThickness / localScale / 4`

## Map Image Grid Detection

When uploading a map image, the system can automatically detect grid dimensions from the filename:

### Filename Format

```
mapname_[width]x[height].extension
```

Examples:

- `dungeon_40x30.jpg` → 40×30 grid
- `tavern_25x20.png` → 25×20 grid

### Auto-Configuration

When grid dimensions are detected:

1. Grid mode switches to `MapDefined`
2. `fixedGridCount` is set to detected dimensions
3. Existing marker/light positions are converted to map-local coordinates (`upgradeSceneCoordinates`) and `mapCoordVersion` is set to 1
4. On scene creation the server computes the aligned map transform (`getAlignedMapTransform`)

## Legacy data migration (mapCoordVersion)

Scenes created before the map-anchored refactor stored MapDefined marker/light positions in display space. `scene.mapCoordVersion` versions the coordinate space:

- `buildSceneProps` converts v0 positions on read using the scene's stored map transform (the stage never sees legacy coordinates)
- `upgradeSceneCoordinates` rewrites all rows and sets `mapCoordVersion = 1` in one system transaction on first open (editor and play routes, called from `applyMasks` once the stage has loaded the map)
- The upgrade also **reconciles a stale `fixedGridCount`**: in the legacy model the count only bounded the display-space overlay (alignment came purely from the map zoom), so many scenes carry the 24×17 default over a differently-sized map. `reconcileGridCount` derives the count the transform implies — `round(mapSize × mapZoom / displayCellPx)` — which reproduces the exact cell size the scene used to show, and keeps the stored count when it already matches within ±1 (filename-derived scenes)
- Legacy display-sized annotation masks are detected by their embedded RLE dimensions and GPU re-projected into the map-sized texture on load (`AnnotationMaterial` + `helpers/annotationSpaceConversion.ts`), then persisted once through the normal annotation update flow
- `DOC_SCHEMA_VERSION` 2 fences stale clients from writing legacy coordinates into upgraded scenes

## Hexagonal Grid Support

The system supports hexagonal grids with proper snapping in FillSpace mode:

### Hex Grid Types

- **Flat-top hexagons**: Width is the spacing parameter
- **Two-grid system**: Hexagons arranged as two offset rectangular grids

### Snapping Options

- **Center-only**: For measurements and precise positioning
- **Full snapping**: Includes vertices and edge midpoints for tokens

Note: MapDefined mode forces square grids (hex + MapDefined is unsupported).

## Common Issues and Solutions

### Issue: Markers appear offset from grid

**Cause**: Not accounting for shader offset or incorrect coordinate transformation
**Solution**: Ensure all coordinate transformations are applied in correct order

### Issue: Tokens desync from the map when panning (MapDefined)

**Cause**: Scene not yet upgraded to map-local coordinates, or positions written in the wrong space
**Solution**: Check `mapCoordVersion`; in MapDefined mode all marker/light positions must be center-relative map pixels

### Issue: Snapping works in Fill Space but not Map Defined

**Cause**: Layer not receiving the synthetic map-space display, or `localScale` not passed to `snapToGrid`
**Solution**: Anchored layers must use `anchoredDisplay` and pass `localScale` through

## Testing Considerations

When testing grid alignment:

1. Test both Fill Space and Map Defined modes
2. Test with maps that fit within the display rect and maps that overflow it
3. Test marker placement and snapping under map pan and 90/180/270 rotation
4. Test measurement tool distances (N cells should read N × worldGridSize regardless of map zoom)
5. Test mode toggling round-trips (positions convert, annotations clear on MapDefined → FillSpace)
6. Verify the playfield output is clipped to the display rect and matches the editor's TV rectangle
