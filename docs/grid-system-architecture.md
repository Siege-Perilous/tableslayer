# Grid System Architecture

## Overview

The Table Slayer grid system supports two primary modes for displaying grids on the game stage, with automatic marker and measurement snapping. This document describes the implementation details and coordinate transformations required for proper alignment.

## Grid Modes

### 1. Fill Space Mode (`GridMode.FillSpace`)

The default mode where the grid fills the available viewport space with padding.

**Characteristics:**

- Grid is always fully visible within the viewport
- Uses padding to create a safe zone around edges
- Grid origin starts at the padding position
- Grid size is calculated to fit within `viewport - (2 * padding)`
- All grid cells are complete (no partial cells at edges)

**Grid Origin Calculation:**

```typescript
origin = { x: padding.x, y: padding.y };
```

### 2. Map Defined Mode (`GridMode.MapDefined`)

A mode where the grid has fixed dimensions that may exceed the viewport, typically matching a map's actual grid.

**Characteristics:**

- Grid has a fixed number of cells (`fixedGridCount.x` × `fixedGridCount.y`)
- Grid may overflow the viewport, showing partial cells at edges
- Grid is centered if it fits, aligned to edges if it overflows
- Useful for maps with known grid dimensions (e.g., 40×30 grid)

**Grid Origin Calculation:**

```typescript
// If grid fits horizontally: center it
// If grid overflows horizontally: align to left (x = 0)
originX = gridWidth <= viewportWidth ? (viewportWidth - gridWidth) / 2 : 0;

// If grid fits vertically: center it
// If grid overflows vertically: align to top (y = 0)
originY = gridHeight <= viewportHeight ? (viewportHeight - gridHeight) / 2 : 0;
```

## Coordinate Systems

The system uses multiple coordinate spaces that need careful transformation:

### 1. Center-Relative Coordinates

- Used by Three.js and the stage camera
- Origin at viewport center
- Y-axis points up (positive Y = up)
- Range: `[-width/2, width/2]` × `[-height/2, height/2]`

### 2. Screen Coordinates (Top-Left Relative)

- Used by the shader and grid calculations
- Origin at top-left corner
- Y-axis points down (positive Y = down)
- Range: `[0, width]` × `[0, height]`

### 3. Grid-Relative Coordinates

- Coordinates relative to the grid origin
- Used for snapping calculations
- Origin at grid's top-left corner

## Shader Grid Rendering

The grid shader (`GridShader.frag`) renders grid lines with specific offsets:

### Line Positioning

Grid lines are drawn with an offset of `lineThickness / 4.0`:

```glsl
grid = squareGrid(gridCoords_px - t / 4.0, gridSpacing_px, t, 0.0);
```

This offset shifts the visual grid lines slightly, which must be accounted for in snapping calculations.

### Grid Line Calculation

For square grids, lines are positioned at:

```glsl
gridLine_px = round(coords / spacing) * spacing
```

This creates grid lines at regular intervals, with cells centered between lines.

## Marker Snapping Algorithm

The `snapToGrid` function ensures markers align properly with the visual grid:

### Fill Space Mode

1. Convert position to grid-relative coordinates (already in correct space)
2. Snap to nearest grid point (cell centers for squares, centers/vertices for hexagons)
3. Return snapped position

### Map Defined Mode

1. **Get grid origin** using `getGridOrigin()`
2. **Convert coordinates:**
   - Center-relative → Screen coordinates
   - Screen coordinates → Grid-relative coordinates
3. **Account for shader offset:**
   - Subtract `lineThickness / 4.0` before snapping
4. **Snap to grid:**
   - Square grids: snap to cell centers (half-spacing intervals)
   - Hex grids: snap to centers or vertices
5. **Reverse transformations:**
   - Add back shader offset
   - Grid-relative → Screen coordinates
   - Screen coordinates → Center-relative

### Code Example

```typescript
// Map Defined mode snapping
const gridOrigin = getGridOrigin(grid, display);

// Transform to screen space
const screenPos = new THREE.Vector2(
  position.x + display.resolution.x / 2,
  display.resolution.y / 2 - position.y // Flip Y
);

// To grid-relative
let gridRelativePos = screenPos.sub(gridOrigin);

// Account for shader offset
gridRelativePos.sub(lineThickness / 4.0);

// Snap to grid
const snapped = snapToSquareGrid(gridRelativePos, halfSpacing);

// Reverse transformations
snapped.add(lineThickness / 4.0);
const screenSnapped = snapped.add(gridOrigin);
const result = new THREE.Vector2(
  screenSnapped.x - display.resolution.x / 2,
  display.resolution.y / 2 - screenSnapped.y // Flip Y back
);
```

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
3. Grid origin is recalculated for proper alignment
4. Grid spacing maintains 1:1 inch ratio

## Hexagonal Grid Support

The system supports hexagonal grids with proper snapping:

### Hex Grid Types

- **Flat-top hexagons**: Width is the spacing parameter
- **Two-grid system**: Hexagons arranged as two offset rectangular grids

### Snapping Options

- **Center-only**: For measurements and precise positioning
- **Full snapping**: Includes vertices and edge midpoints for tokens

## Common Issues and Solutions

### Issue: Markers appear offset from grid

**Cause**: Not accounting for shader offset or incorrect coordinate transformation
**Solution**: Ensure all coordinate transformations are applied in correct order

### Issue: Grid appears cut off in Map Defined mode

**Cause**: Expected behavior when grid overflows viewport
**Solution**: This is intentional - partial grid squares show at edges

### Issue: Snapping works in Fill Space but not Map Defined

**Cause**: Missing grid origin transformation
**Solution**: Apply grid origin offset when converting to grid-relative coordinates

## Testing Considerations

When testing grid alignment:

1. Test both Fill Space and Map Defined modes
2. Test with grids that fit within viewport
3. Test with grids that overflow viewport
4. Test marker placement at grid edges
5. Test measurement tool alignment
6. Verify snapping works after viewport resize

## Future Improvements

Potential enhancements to consider:

- Support for irregular grid shapes
- Variable grid cell sizes
- Grid rotation support
- Multiple grid overlays
- Grid visibility zones
