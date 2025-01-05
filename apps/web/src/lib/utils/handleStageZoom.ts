import type { StageProps } from '@tableslayer/ui';

export const handleStageZoom = (e: WheelEvent, stageProps: StageProps) => {
  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;
  let scrollDelta;
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    scrollDelta = e.deltaX * zoomSensitivity;
  } else {
    scrollDelta = e.deltaY * zoomSensitivity;
  }

  if (e.shiftKey) {
    stageProps.map.zoom = Math.max(minZoom, Math.min(stageProps.map.zoom - scrollDelta, maxZoom));
  } else if (e.ctrlKey) {
    e.preventDefault();
    stageProps.scene.zoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
  }
};
