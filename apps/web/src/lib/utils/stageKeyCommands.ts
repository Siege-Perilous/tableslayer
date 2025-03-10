import type { StageProps } from '@tableslayer/ui';
import { DrawMode, MapLayerType, ToolType } from '@tableslayer/ui';

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
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
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
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
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
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
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
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.tool.mode = DrawMode.Draw;
        fogOfWar.tool.type = ToolType.Ellipse;
      }
      break;

    case 'm':
      if (activeLayer === MapLayerType.Marker) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.Marker;
      }
      break;

    case 'r':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.tool.mode === DrawMode.Erase &&
        fogOfWar.tool.type === ToolType.Rectangle
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
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
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.tool.mode = DrawMode.Draw;
        fogOfWar.tool.type = ToolType.Rectangle;
      }
      break;

    case 'Shift':
      stageProps.activeLayer = MapLayerType.None;
      break;
    case 'Ctrl':
      stageProps.activeLayer = MapLayerType.None;
      break;
    case 'Escape':
      stageProps.activeLayer = MapLayerType.None;
      break;
  }

  return activeControl;
}
