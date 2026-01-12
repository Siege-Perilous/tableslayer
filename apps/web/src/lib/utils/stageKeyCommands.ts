import type { StageProps } from '@tableslayer/ui';
import { DrawMode, GridMode, MapLayerType, ToolType } from '@tableslayer/ui';
import { devLog } from './debug';
import { queuePropertyUpdate } from './propertyUpdateBroadcaster';

// Track the grid origin (the initial aligned position when first used)
let gridOrigin: { x?: number; y?: number } = {};

// Snap the other axis if it's misaligned
function snapOtherAxisIfNeeded(stageProps: StageProps, axis: 'x' | 'y'): void {
  if ((stageProps.grid.gridMode || 0) !== GridMode.MapDefined || !stageProps.grid.fixedGridCount) {
    return;
  }

  const currentOffset = axis === 'x' ? stageProps.map.offset.x : stageProps.map.offset.y;
  const pixelPitch = stageProps.display.size[axis] / stageProps.display.resolution[axis];
  const gridSpacingPx = stageProps.grid.spacing / pixelPitch;

  // Initialize grid origin if not set - calculate the aligned grid position
  if (gridOrigin[axis] === undefined) {
    // Calculate where the grid should be positioned (matching GridControls alignment logic)
    const gridCount = axis === 'x' ? stageProps.grid.fixedGridCount.x : stageProps.grid.fixedGridCount.y;
    const gridSizePx = gridSpacingPx * gridCount + stageProps.grid.lineThickness / 2.0;

    let gridOriginPx: number;
    const resolution = stageProps.display.resolution[axis];

    if (gridSizePx <= resolution) {
      // Grid fits - center it
      gridOriginPx = (resolution - gridSizePx) / 2.0;
    } else {
      // Grid overflows
      if (axis === 'x') {
        gridOriginPx = 0; // Align left
      } else {
        gridOriginPx = resolution - gridSizePx; // Align top
      }
    }

    // Convert grid origin to map coordinates
    // This should match the offset calculation from GridControls
    if (axis === 'x') {
      gridOrigin[axis] = gridOriginPx - resolution / 2 + gridSizePx / 2;
    } else {
      // Y axis: convert from UV space to WebGL coordinates
      const gridTopWebGL = -(resolution / 2) + gridOriginPx;
      gridOrigin[axis] = gridTopWebGL + gridSizePx / 2;
    }
  }

  const origin = gridOrigin[axis]!;
  const offsetFromOrigin = currentOffset - origin;
  const gridSteps = Math.round(offsetFromOrigin / gridSpacingPx);
  const alignedPosition = origin + gridSteps * gridSpacingPx;
  const misalignment = Math.abs(currentOffset - alignedPosition);

  // If misaligned by more than 5%, snap to nearest grid line
  if (misalignment > gridSpacingPx * 0.05) {
    devLog('grid', '[GRID-SNAP Other Axis]', {
      axis,
      currentOffset,
      alignedPosition,
      misalignment,
      snapping: true
    });
    queuePropertyUpdate(stageProps, ['map', 'offset', axis], alignedPosition, 'control');
  }
}

// Calculate grid-snapped position for arrow key movement
function calculateGridSnappedOffset(stageProps: StageProps, axis: 'x' | 'y', direction: 1 | -1): number {
  // In MapDefined mode, move by one grid square
  if ((stageProps.grid.gridMode || 0) === GridMode.MapDefined && stageProps.grid.fixedGridCount) {
    // Get current offset
    const currentOffset = axis === 'x' ? stageProps.map.offset.x : stageProps.map.offset.y;

    // Calculate pixel pitch (inches per pixel)
    const pixelPitch = stageProps.display.size[axis] / stageProps.display.resolution[axis];

    // Calculate grid spacing in pixels
    const gridSpacingPx = stageProps.grid.spacing / pixelPitch;

    // Initialize grid origin if not set - calculate the aligned grid position
    if (gridOrigin[axis] === undefined) {
      // Calculate where the grid should be positioned (matching GridControls alignment logic)
      const gridCount = axis === 'x' ? stageProps.grid.fixedGridCount.x : stageProps.grid.fixedGridCount.y;
      const gridSizePx = gridSpacingPx * gridCount + stageProps.grid.lineThickness / 2.0;

      let gridOriginPx: number;
      const resolution = stageProps.display.resolution[axis];

      if (gridSizePx <= resolution) {
        // Grid fits - center it
        gridOriginPx = (resolution - gridSizePx) / 2.0;
      } else {
        // Grid overflows
        if (axis === 'x') {
          gridOriginPx = 0; // Align left
        } else {
          gridOriginPx = resolution - gridSizePx; // Align top
        }
      }

      // Convert grid origin to map coordinates
      // This should match the offset calculation from GridControls
      if (axis === 'x') {
        gridOrigin[axis] = gridOriginPx - resolution / 2 + gridSizePx / 2;
      } else {
        // Y axis: convert from UV space to WebGL coordinates
        const gridTopWebGL = -(resolution / 2) + gridOriginPx;
        gridOrigin[axis] = gridTopWebGL + gridSizePx / 2;
      }
    }

    const origin = gridOrigin[axis]!;
    let newOffset: number;
    let snapAction = 'none';

    // Calculate how far we are from the grid origin
    const offsetFromOrigin = currentOffset - origin;
    const gridSteps = Math.round(offsetFromOrigin / gridSpacingPx);
    const alignedPosition = origin + gridSteps * gridSpacingPx;
    const misalignment = Math.abs(currentOffset - alignedPosition);

    // If we're close to aligned (within 5% of grid spacing), move from aligned position
    // Otherwise, snap to the next grid line in the direction of movement
    if (misalignment < gridSpacingPx * 0.05) {
      // We're aligned, move by one grid unit
      newOffset = alignedPosition + direction * gridSpacingPx;
      snapAction = 'aligned-move';
    } else {
      // We're misaligned, snap to next grid line in movement direction
      const nextGridStep =
        direction > 0 ? Math.ceil(offsetFromOrigin / gridSpacingPx) : Math.floor(offsetFromOrigin / gridSpacingPx);
      newOffset = origin + nextGridStep * gridSpacingPx;
      snapAction = 'snap-to-grid';
    }

    devLog('grid', '[GRID-SNAP Arrow]', {
      axis,
      direction,
      gridSpacingPx,
      currentOffset,
      gridOrigin: origin,
      offsetFromOrigin,
      gridSteps,
      alignedPosition,
      misalignment,
      newOffset,
      moveDistance: newOffset - currentOffset,
      snapAction
    });

    return newOffset;
  }

  // Default to 1px movement in FillSpace mode
  const currentOffset = axis === 'x' ? stageProps.map.offset.x : stageProps.map.offset.y;
  return currentOffset + direction;
}

export function handleKeyCommands(
  event: KeyboardEvent,
  stageProps: StageProps,
  activeControl: string,
  stage: { fogOfWar: { clear: () => void; reset: () => void } },
  handleSelectActiveControl: (control: string) => string | null
): string {
  const { activeLayer, fogOfWar } = stageProps;

  // Skip single-key shortcuts if Ctrl/Alt/Meta is pressed (unless it's a capital letter with Shift)
  // This prevents conflicts with browser shortcuts like Ctrl+R for refresh
  if (event.ctrlKey || event.altKey || event.metaKey) {
    return activeControl;
  }

  switch (event.key) {
    case 'e':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Erase &&
        fogOfWar.tool.type === ToolType.Brush
      ) {
        handleSelectActiveControl('erase'); // Toggle off
        return 'none';
      } else {
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], DrawMode.Erase, 'control');
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], ToolType.Brush, 'control');
        // Only call handleSelectActiveControl if not already in fog mode to avoid toggle-off
        if (activeLayer !== MapLayerType.FogOfWar) {
          handleSelectActiveControl('erase');
        }
        return 'erase';
      }
      break;

    case 'E':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Draw &&
        fogOfWar.tool.type === ToolType.Brush
      ) {
        handleSelectActiveControl('erase'); // Toggle off
        return 'none';
      } else {
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], DrawMode.Draw, 'control');
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], ToolType.Brush, 'control');
        // Only call handleSelectActiveControl if not already in fog mode to avoid toggle-off
        if (activeLayer !== MapLayerType.FogOfWar) {
          handleSelectActiveControl('erase');
        }
        return 'erase';
      }
      break;

    case 'f':
      stage.fogOfWar.clear();
      break;

    case 'F':
      stage.fogOfWar.reset();
      break;

    case 'o':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Erase &&
        fogOfWar.tool.type === ToolType.Ellipse
      ) {
        handleSelectActiveControl('erase'); // Toggle off
        return 'none';
      } else {
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], DrawMode.Erase, 'control');
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], ToolType.Ellipse, 'control');
        // Only call handleSelectActiveControl if not already in fog mode to avoid toggle-off
        if (activeLayer !== MapLayerType.FogOfWar) {
          handleSelectActiveControl('erase');
        }
        return 'erase';
      }
      break;

    case 'O':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Draw &&
        fogOfWar.tool.type === ToolType.Ellipse
      ) {
        handleSelectActiveControl('erase'); // Toggle off
        return 'none';
      } else {
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], DrawMode.Draw, 'control');
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], ToolType.Ellipse, 'control');
        // Only call handleSelectActiveControl if not already in fog mode to avoid toggle-off
        if (activeLayer !== MapLayerType.FogOfWar) {
          handleSelectActiveControl('erase');
        }
        return 'erase';
      }
      break;

    case 'm':
      if (activeLayer === MapLayerType.Marker) {
        handleSelectActiveControl('marker'); // Toggle off
        return 'none';
      } else {
        handleSelectActiveControl('marker'); // Activate
        return 'marker';
      }
      break;

    case 'M':
      handleSelectActiveControl('none'); // Deactivate all
      return 'none';

    case 'd':
      if (activeLayer === MapLayerType.Annotation) {
        handleSelectActiveControl('annotation'); // Toggle off
        return 'none';
      } else {
        handleSelectActiveControl('annotation'); // Activate
        return 'annotation';
      }
      break;

    case 't':
      if (activeLayer === MapLayerType.Measurement) {
        handleSelectActiveControl('measurement'); // Toggle off
        return 'none';
      } else {
        handleSelectActiveControl('measurement'); // Activate
        return 'measurement';
      }
      break;

    case 'r':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Erase &&
        fogOfWar.tool.type === ToolType.Rectangle
      ) {
        handleSelectActiveControl('erase'); // Toggle off
        return 'none';
      } else {
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], DrawMode.Erase, 'control');
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], ToolType.Rectangle, 'control');
        // Only call handleSelectActiveControl if not already in fog mode to avoid toggle-off
        if (activeLayer !== MapLayerType.FogOfWar) {
          handleSelectActiveControl('erase');
        }
        return 'erase';
      }
      break;

    case 'R':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Draw &&
        fogOfWar.tool.type === ToolType.Rectangle
      ) {
        handleSelectActiveControl('erase'); // Toggle off
        return 'none';
      } else {
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], DrawMode.Draw, 'control');
        queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], ToolType.Rectangle, 'control');
        // Only call handleSelectActiveControl if not already in fog mode to avoid toggle-off
        if (activeLayer !== MapLayerType.FogOfWar) {
          handleSelectActiveControl('erase');
        }
        return 'erase';
      }
      break;

    case 'Shift':
      if (activeLayer === MapLayerType.FogOfWar) {
        handleSelectActiveControl('none');
        return 'none';
      }
      break;
    case 'Ctrl':
      if (activeLayer === MapLayerType.FogOfWar) {
        handleSelectActiveControl('none');
        return 'none';
      }
      break;
    case 'Escape':
      handleSelectActiveControl('none');
      return 'none';

    // Precise map movement with Shift+Arrow keys
    case 'ArrowLeft':
      if (event.shiftKey) {
        event.preventDefault();
        const newX = calculateGridSnappedOffset(stageProps, 'x', -1);
        queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], newX, 'control');
        // Also snap Y axis if misaligned
        snapOtherAxisIfNeeded(stageProps, 'y');
      }
      break;

    case 'ArrowRight':
      if (event.shiftKey) {
        event.preventDefault();
        const newX = calculateGridSnappedOffset(stageProps, 'x', 1);
        queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], newX, 'control');
        // Also snap Y axis if misaligned
        snapOtherAxisIfNeeded(stageProps, 'y');
      }
      break;

    case 'ArrowUp':
      if (event.shiftKey) {
        event.preventDefault();
        const newY = calculateGridSnappedOffset(stageProps, 'y', 1); // Inverted: up is positive Y
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], newY, 'control');
        // Also snap X axis if misaligned
        snapOtherAxisIfNeeded(stageProps, 'x');
      }
      break;

    case 'ArrowDown':
      if (event.shiftKey) {
        event.preventDefault();
        const newY = calculateGridSnappedOffset(stageProps, 'y', -1); // Inverted: down is negative Y
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], newY, 'control');
        // Also snap X axis if misaligned
        snapOtherAxisIfNeeded(stageProps, 'x');
      }
      break;
  }

  return activeControl;
}

// Reset grid origin when scene changes or grid mode switches
export function resetGridOrigin(): void {
  gridOrigin = {};
}
