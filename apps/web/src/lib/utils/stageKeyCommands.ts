import type { StageProps } from '@tableslayer/ui';
import { DrawMode, MapLayerType, ToolType } from '@tableslayer/ui';
import { queuePropertyUpdate } from './propertyUpdateBroadcaster';

export function handleKeyCommands(
  event: KeyboardEvent,
  stageProps: StageProps,
  activeControl: string,
  stage: { fogOfWar: { clear: () => void; reset: () => void } }
): string {
  const { activeLayer, fogOfWar } = stageProps;

  switch (event.key) {
    case 'e':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Erase &&
        fogOfWar.tool.type === ToolType.Brush
      ) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
        fogOfWar.tool.mode = DrawMode.Erase;
        fogOfWar.tool.type = ToolType.Brush;
        return 'erase';
      }
      break;

    case 'E':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Draw &&
        fogOfWar.tool.type === ToolType.Brush
      ) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
        fogOfWar.tool.mode = DrawMode.Draw;
        fogOfWar.tool.type = ToolType.Brush;
        return 'draw';
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
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
        fogOfWar.tool.mode = DrawMode.Erase;
        fogOfWar.tool.type = ToolType.Ellipse;
      }
      break;

    case 'O':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Draw &&
        fogOfWar.tool.type === ToolType.Ellipse
      ) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
        fogOfWar.tool.mode = DrawMode.Draw;
        fogOfWar.tool.type = ToolType.Ellipse;
      }
      break;

    case 'm':
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Marker, 'control');
      break;

    case 'M':
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      break;

    case 'd':
      if (activeLayer === MapLayerType.Annotation) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Annotation, 'control');
      }
      break;

    case 't':
      if (activeLayer === MapLayerType.Measurement) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.Measurement, 'control');
      }
      break;

    case 'r':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Erase &&
        fogOfWar.tool.type === ToolType.Rectangle
      ) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
        fogOfWar.tool.mode = DrawMode.Erase;
        fogOfWar.tool.type = ToolType.Rectangle;
      }
      break;

    case 'R':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Draw &&
        fogOfWar.tool.type === ToolType.Rectangle
      ) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      } else {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
        fogOfWar.tool.mode = DrawMode.Draw;
        fogOfWar.tool.type = ToolType.Rectangle;
      }
      break;

    case 'Shift':
      if (activeLayer === MapLayerType.FogOfWar) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      }
      break;
    case 'Ctrl':
      if (activeLayer === MapLayerType.FogOfWar) {
        queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      }
      break;
    case 'Escape':
      queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.None, 'control');
      break;
  }

  return activeControl;
}
