import type { StageProps } from '@tableslayer/ui';
import { DrawMode, MapLayerType, ToolType } from '@tableslayer/ui';
import { queuePropertyUpdate } from './propertyUpdateBroadcaster';

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

    // Precise map movement with Shift+Arrow keys (1px increments)
    case 'ArrowLeft':
      if (event.shiftKey) {
        event.preventDefault();
        const currentX = stageProps.map.offset.x;
        queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], currentX - 1, 'control');
      }
      break;

    case 'ArrowRight':
      if (event.shiftKey) {
        event.preventDefault();
        const currentX = stageProps.map.offset.x;
        queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], currentX + 1, 'control');
      }
      break;

    case 'ArrowUp':
      if (event.shiftKey) {
        event.preventDefault();
        const currentY = stageProps.map.offset.y;
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], currentY - 1, 'control');
      }
      break;

    case 'ArrowDown':
      if (event.shiftKey) {
        event.preventDefault();
        const currentY = stageProps.map.offset.y;
        queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], currentY + 1, 'control');
      }
      break;
  }

  return activeControl;
}
