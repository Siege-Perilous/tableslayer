import type { StageProps } from '@tableslayer/ui';
import { DrawMode, MapLayerType, PingEditMode, ToolType } from '@tableslayer/ui';

export function handleKeyCommands(
  event: KeyboardEvent,
  stageProps: StageProps,
  activeControl: string,
  stage: { fogOfWar: { clear: () => void; reset: () => void } }
): string {
  const { activeLayer, fogOfWar, ping } = stageProps;

  switch (event.key) {
    case 'e':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.drawMode === DrawMode.Erase &&
        fogOfWar.toolType === ToolType.Brush
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.drawMode = DrawMode.Erase;
        fogOfWar.toolType = ToolType.Brush;
        return 'erase';
      }
      break;

    case 'E':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.drawMode === DrawMode.Draw &&
        fogOfWar.toolType === ToolType.Brush
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.drawMode = DrawMode.Draw;
        fogOfWar.toolType = ToolType.Brush;
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
        fogOfWar.drawMode === DrawMode.Erase &&
        fogOfWar.toolType === ToolType.Ellipse
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.drawMode = DrawMode.Erase;
        fogOfWar.toolType = ToolType.Ellipse;
      }
      break;

    case 'O':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.drawMode === DrawMode.Draw &&
        fogOfWar.toolType === ToolType.Ellipse
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.drawMode = DrawMode.Draw;
        fogOfWar.toolType = ToolType.Ellipse;
      }
      break;

    case 'p':
      if (activeLayer === MapLayerType.Ping && ping.editMode === PingEditMode.Remove) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.Ping;
        ping.editMode = PingEditMode.Remove;
      }
      break;

    case 'P':
      if (activeLayer === MapLayerType.Ping && ping.editMode === PingEditMode.Add) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.Ping;
        ping.editMode = PingEditMode.Add;
      }
      break;

    case 'r':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.drawMode === DrawMode.Erase &&
        fogOfWar.toolType === ToolType.Rectangle
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.drawMode = DrawMode.Erase;
        fogOfWar.toolType = ToolType.Rectangle;
      }
      break;

    case 'R':
      if (
        activeLayer === MapLayerType.FogOfWar &&
        fogOfWar.drawMode === DrawMode.Draw &&
        fogOfWar.toolType === ToolType.Rectangle
      ) {
        stageProps.activeLayer = MapLayerType.None;
      } else {
        stageProps.activeLayer = MapLayerType.FogOfWar;
        fogOfWar.drawMode = DrawMode.Draw;
        fogOfWar.toolType = ToolType.Rectangle;
      }
      break;

    case 'Escape':
      stageProps.activeLayer = MapLayerType.None;
      break;
  }

  return activeControl;
}
