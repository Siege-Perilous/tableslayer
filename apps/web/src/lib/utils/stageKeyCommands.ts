import { DrawMode, GridMode, MapLayerType, ToolType, type StageProps } from '@tableslayer/stage';
import { trackChecklistItem } from './checklistTracker';
import { queuePropertyUpdate } from './propertyUpdateBroadcaster';

// Arrow-key pan distance: one grid cell in MapDefined mode (the grid is
// anchored to the map, so moving the map a cell keeps everything aligned),
// 1px in FillSpace mode
function arrowPanDistance(stageProps: StageProps, axis: 'x' | 'y'): number {
  if ((stageProps.grid.gridMode || 0) === GridMode.MapDefined) {
    const pixelPitch = stageProps.display.size[axis] / stageProps.display.resolution[axis];
    return stageProps.grid.spacing / pixelPitch;
  }
  return 1;
}

type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

// Map a browser arrow key to the scene-local offset axis/direction, compensating
// for scene rotation so arrows always pan relative to the browser viewport rather
// than the rotated scene. Matches the rotated mouse-drag panning behavior.
function getRotatedPanAxis(key: ArrowKey, rotation: number): { axis: 'x' | 'y'; direction: 1 | -1 } {
  const normalized = (((Math.round(rotation / 90) * 90) % 360) + 360) % 360;
  const byRotation: Record<number, Record<ArrowKey, { axis: 'x' | 'y'; direction: 1 | -1 }>> = {
    0: {
      ArrowRight: { axis: 'x', direction: 1 },
      ArrowLeft: { axis: 'x', direction: -1 },
      ArrowUp: { axis: 'y', direction: 1 },
      ArrowDown: { axis: 'y', direction: -1 }
    },
    90: {
      ArrowRight: { axis: 'y', direction: 1 },
      ArrowLeft: { axis: 'y', direction: -1 },
      ArrowUp: { axis: 'x', direction: -1 },
      ArrowDown: { axis: 'x', direction: 1 }
    },
    180: {
      ArrowRight: { axis: 'x', direction: -1 },
      ArrowLeft: { axis: 'x', direction: 1 },
      ArrowUp: { axis: 'y', direction: -1 },
      ArrowDown: { axis: 'y', direction: 1 }
    },
    270: {
      ArrowRight: { axis: 'y', direction: -1 },
      ArrowLeft: { axis: 'y', direction: 1 },
      ArrowUp: { axis: 'x', direction: 1 },
      ArrowDown: { axis: 'x', direction: -1 }
    }
  };
  return byRotation[normalized][key];
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
      trackChecklistItem('fog-erase');
      break;

    case 'F':
      stage.fogOfWar.reset();
      trackChecklistItem('fog-reset');
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

    case 'l':
      if (activeLayer === MapLayerType.Light) {
        handleSelectActiveControl('light'); // Toggle off
        return 'none';
      } else {
        handleSelectActiveControl('light'); // Activate
        return 'light';
      }
      break;

    case 'L':
      handleSelectActiveControl('none'); // Deactivate all
      return 'none';

    case 'd':
      if (activeLayer === MapLayerType.Annotation) {
        handleSelectActiveControl('annotation'); // Toggle off
        return 'none';
      } else {
        handleSelectActiveControl('annotation'); // Activate
        trackChecklistItem('spell-effect');
        return 'annotation';
      }
      break;

    case 't':
      if (activeLayer === MapLayerType.Measurement) {
        handleSelectActiveControl('measurement'); // Toggle off
        return 'none';
      } else {
        handleSelectActiveControl('measurement'); // Activate
        trackChecklistItem('measurement');
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

    // Precise map movement with Shift+Arrow keys (rotation-aware so arrows
    // always pan relative to the browser viewport, not the rotated scene)
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown':
      if (event.shiftKey) {
        event.preventDefault();
        const { axis, direction } = getRotatedPanAxis(event.key, stageProps.scene.rotation);
        const newOffset = stageProps.map.offset[axis] + direction * arrowPanDistance(stageProps, axis);
        queuePropertyUpdate(stageProps, ['map', 'offset', axis], newOffset, 'control');
        trackChecklistItem('pan-map');
      }
      break;
  }

  return activeControl;
}
