<script lang="ts">
  import type { StageProps } from '@tableslayer/ui';

  let {
    onUpdateStage,
    stageProps
  }: {
    onUpdateStage: (newProps: Partial<StageProps>) => void;
    stageProps: StageProps;
  } = $props();

  let zoomType = $state<'map' | 'scene'>('scene');

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.001;

  const handleZoom = (deltaY: number, zoomType: 'map' | 'scene') => {
    const zoom = stageProps[zoomType].zoom + deltaY * zoomSensitivity;
    const newZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
    onUpdateStage({
      [zoomType]: {
        ...stageProps[zoomType],
        zoom: newZoom
      }
    });
  };

  const toggleZoomType = () => {
    zoomType = zoomType === 'map' ? 'scene' : 'map';
  };
</script>

<div class="zoomControls">
  <button onclick={toggleZoomType}>
    {zoomType === 'map' ? 'Map' : 'Scene'}
  </button>
  <button
    class="zoomControls__button"
    aria-label="Zoom in"
    onclick={() => {
      handleZoom(100, zoomType);
    }}
  >
    +
  </button>
  <button
    class="zoomControls__button"
    aria-label="Zoom out"
    onclick={() => {
      handleZoom(-100, zoomType);
    }}
  >
    -
  </button>
</div>

<style>
  .zoomControls {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    display: flex;
    gap: 0.5rem;
  }
</style>
