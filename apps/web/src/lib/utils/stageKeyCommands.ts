import type { StageProps } from '@tableslayer/ui';
import { DrawMode, GridMode, MapLayerType, ToolType } from '@tableslayer/ui';
import { queuePropertyUpdate } from './propertyUpdateBroadcaster';

// Calculate grid-snapped position for arrow key movement
function calculateGridSnappedOffset(stageProps: StageProps, axis: 'x' | 'y', direction: 1 | -1): number {
  // In Fixed Count mode, move by one grid square
  if ((stageProps.grid.gridMode || 0) === GridMode.FixedCount && stageProps.grid.fixedGridCount) {
    // Get current offset
    const currentOffset = axis === 'x' ? stageProps.map.offset.x : stageProps.map.offset.y;

    // Calculate pixel pitch (inches per pixel)
    const pixelPitch = stageProps.display.size[axis] / stageProps.display.resolution[axis];

    // Calculate grid spacing in pixels (this is how the grid is actually drawn)
    const gridSpacingPx = stageProps.grid.spacing / pixelPitch;

    // The map offset is in screen space pixels. The grid is drawn at a fixed size on screen.
    // To move the map by one visual grid square, we move by the grid spacing in pixels.
    // We do NOT scale by zoom - the zoom affects how the map IMAGE is scaled, not the movement.
    const mapMovementPerGrid = gridSpacingPx;

    // Simply move by one grid unit from current position
    // Don't snap first - just move by the exact grid increment
    const newOffset = currentOffset + direction * mapMovementPerGrid;

    console.log('[GRID-SNAP Arrow]', {
      axis,
      direction,
      gridSpacing: stageProps.grid.spacing,
      pixelPitch,
      gridSpacingPx,
      zoom: stageProps.map.zoom,
      mapMovementPerGrid,
      currentOffset,
      newOffset,
      moveDistance: direction * mapMovementPerGrid,
      totalGridsMoved: (newOffset - currentOffset) / mapMovementPerGrid
    });

    return newOffset;
  }

  // Default to 1px movement in AutoFit mode
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
        handleSelectActiveControl('erase'); // Activate
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
        handleSelectActiveControl('erase'); // Activate fog tool
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
        handleSelectActiveControl('erase'); // Activate
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
        handleSelectActiveControl('erase'); // Activate
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
        handleSelectActiveControl('erase'); // Activate
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
        handleSelectActiveControl('erase'); // Activate
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
      }
      break;

    case 'ArrowRight':
      if (event.shiftKey) {
        event.preventDefault();
        const newX = calculateGridSnappedOffset(stageProps, 'x', 1);
        queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], newX, 'control');
      }
      break;

    case 'ArrowUp':
      if (event.shiftKey) {
        event.preventDefault();
        const newY = calculateGridSnappedOffset(stageProps, 'y', 1); // Inverted: up is positive Y
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], newY, 'control');
      }
      break;

    case 'ArrowDown':
      if (event.shiftKey) {
        event.preventDefault();
        const newY = calculateGridSnappedOffset(stageProps, 'y', -1); // Inverted: down is negative Y
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], newY, 'control');
      }
      break;
  }

  return activeControl;
}
