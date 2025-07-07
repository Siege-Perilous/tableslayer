import { type StageProps, MapLayerType } from '@tableslayer/ui';
import { setPreferenceDebounced } from './gameSessionPreferences';
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
  } else if (e.ctrlKey) {
    e.preventDefault();
    const newSceneZoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
    queuePropertyUpdate(stageProps, ['scene', 'zoom'], newSceneZoom, 'control');
  } else if (stageProps.activeLayer === MapLayerType.FogOfWar) {
    const newFogSize = Math.max(10, Math.min(stageProps.fogOfWar.tool.size + 500.0 * scrollDelta, 1000));
    queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'size'], newFogSize, 'control');
    // Save brush size to cookie with debouncing
    setPreferenceDebounced('brushSize', newFogSize);
  } else if (stageProps.activeLayer === MapLayerType.Annotation) {
    // Handle annotation line width adjustment
    const currentLineWidth = stageProps.annotations.lineWidth || 50;
    const lineWidthDelta = scrollDelta * 200; // Scale to make it more responsive
    const newLineWidth = Math.round(Math.max(1, Math.min(currentLineWidth - lineWidthDelta, 200)));

    // Update annotation line width locally
    queuePropertyUpdate(stageProps, ['annotations', 'lineWidth'], newLineWidth, 'control');

    // Save preference with debouncing
    setPreferenceDebounced('annotationLineWidth', newLineWidth);
  }
};
