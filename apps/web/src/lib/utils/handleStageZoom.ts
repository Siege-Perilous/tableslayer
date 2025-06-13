import { type StageProps, MapLayerType } from '@tableslayer/ui';
import { queuePropertyUpdate, updateLocalProperty } from './propertyUpdateBroadcaster';

export const handleStageZoom = (e: WheelEvent, stageProps: StageProps) => {
  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.00025;

  let scrollDelta;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    scrollDelta = e.deltaX * zoomSensitivity;
  } else {
    scrollDelta = e.deltaY * zoomSensitivity;
  }

  if (e.shiftKey) {
    // Map zoom should be collaborative
    const newZoom = Math.max(minZoom, Math.min(stageProps.map.zoom - scrollDelta, maxZoom));
    queuePropertyUpdate(stageProps, ['map', 'zoom'], newZoom, 'control');
  } else if (e.ctrlKey) {
    // Scene zoom should be local only
    e.preventDefault();
    const newZoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
    updateLocalProperty(stageProps, ['scene', 'zoom'], newZoom);
  } else if (stageProps.activeLayer === MapLayerType.FogOfWar) {
    // Fog tool size should remain collaborative
    const newSize = Math.max(10, Math.min(stageProps.fogOfWar.tool.size + 500.0 * scrollDelta, 1000));
    queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'size'], newSize, 'control');
  }
};
