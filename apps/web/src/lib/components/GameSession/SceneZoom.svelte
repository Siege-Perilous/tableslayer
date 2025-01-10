<script lang="ts">
  import { Button, IconButton, Icon, type StageProps } from '@tableslayer/ui';
  import { IconPlus, IconMinus, IconRotateClockwise2 } from '@tabler/icons-svelte';

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

  const handleMapRotate = () => {
    onUpdateStage({
      map: {
        ...stageProps.map,
        rotation: stageProps.map.rotation + 90
      }
    });
  };
</script>

<div class="sceneZoom">
  <Button onclick={toggleZoomType} variant="ghost">
    <span class={zoomType === 'map' ? 'sceneZoom__mutedText' : ''}> Scene </span>
    <span class="sceneZoom__mutedText"> | </span>
    <span class={zoomType === 'scene' ? 'sceneZoom__mutedText' : ''}> Map </span>
  </Button>
  <IconButton
    title={zoomType === 'map' ? 'SHIFT + mouse wheel' : 'CTRL + mouse wheel'}
    class="zoomControls__button"
    aria-label="Zoom in"
    variant="ghost"
    onclick={() => {
      handleZoom(100, zoomType);
    }}
  >
    <Icon Icon={IconPlus} stroke={3} />
  </IconButton>
  <IconButton
    title={zoomType === 'map' ? 'SHIFT + mouse wheel' : 'CTRL + mouse wheel'}
    class="zoomControls__button"
    aria-label="Zoom out"
    variant="ghost"
    onclick={() => {
      handleZoom(-100, zoomType);
    }}
  >
    <Icon Icon={IconMinus} stroke={3} />
  </IconButton>
  {#if zoomType === 'map'}
    <IconButton
      title="Rotate map"
      class="zoomControls__button"
      aria-label="Rotate map"
      variant="ghost"
      onclick={() => {
        handleMapRotate();
      }}
    >
      <Icon Icon={IconRotateClockwise2} stroke={3} />
    </IconButton>
  {/if}
</div>

<style>
  :global {
    .sceneZoomButton {
      padding: 0.25rem;
    }
  }
  .sceneZoom {
    position: absolute;
    bottom: 1rem;
    left: 1rem;
    display: flex;
    z-index: 1;
  }
  .sceneZoom__mutedText {
    color: var(--fgMuted);
  }
</style>
