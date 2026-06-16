import { type StageProps } from '@tableslayer/stage';
import { trackChecklistItem } from './checklistTracker';
import { queuePropertyUpdate } from './propertyUpdateBroadcaster';

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
    const newMapZoom = Math.max(minZoom, Math.min(stageProps.map.zoom - scrollDelta, maxZoom));
    queuePropertyUpdate(stageProps, ['map', 'zoom'], newMapZoom, 'control');
    trackChecklistItem('scale-map');
  } else if (e.ctrlKey) {
    e.preventDefault();
    // Manual zoom opts out of auto-fit so layout changes (pane resize, toolbar
    // expand) don't snap the viewport back to the fitted zoom.
    stageProps.scene.autoFit = false;
    const newSceneZoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
    queuePropertyUpdate(stageProps, ['scene', 'zoom'], newSceneZoom, 'control');
  }
};
