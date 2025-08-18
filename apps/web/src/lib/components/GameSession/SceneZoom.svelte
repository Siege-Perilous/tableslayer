<script lang="ts">
  import { Button, IconButton, Icon, type StageProps } from '@tableslayer/ui';
  import { IconPlus, IconMinus, IconRotateClockwise2, IconArrowsMaximize } from '@tabler/icons-svelte';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
    stageProps,
    handleSceneFit,
    handleMapFill
  }: {
    stageProps: StageProps;
    handleSceneFit: () => void;
    handleMapFill: () => void;
  } = $props();

  let zoomType = $state<'map' | 'scene'>('scene');

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.001;

  const handleZoom = (deltaY: number, zoomType: 'map' | 'scene') => {
    const zoom = stageProps[zoomType].zoom + deltaY * zoomSensitivity;
    const newZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
    queuePropertyUpdate(stageProps, [zoomType, 'zoom'], newZoom, 'control');
  };

  const toggleZoomType = () => {
    zoomType = zoomType === 'map' ? 'scene' : 'map';
  };

  const handleMapRotate = () => {
    const current = stageProps.map.rotation;
    const cardinals = [0, 90, 180, 270];
    const next = cardinals.find((angle) => angle > current) ?? cardinals[0];
    queuePropertyUpdate(stageProps, ['map', 'rotation'], next, 'control');
  };
  const handleSceneRotate = () => {
    const current = stageProps.scene.rotation;
    const cardinals = [0, 90, 180, 270];
    const next = cardinals.find((angle) => angle > current) ?? cardinals[0];
    queuePropertyUpdate(stageProps, ['scene', 'rotation'], next, 'control');
  };
</script>

{#snippet toolTipContent()}
  Toggle zoom mode between scene and the map
{/snippet}

<div class="sceneZoom">
  <Button onclick={toggleZoomType} variant="ghost">
    <span class={zoomType === 'map' ? 'sceneZoom__mutedText' : ''}>Scene</span>
    <span class="sceneZoom__mutedText">|</span>
    <span class={zoomType === 'scene' ? 'sceneZoom__mutedText' : ''}>Map</span>
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
      title="Fill map within scene"
      class="zoomControls__button"
      aria-label="Fit scene"
      variant="ghost"
      onclick={handleMapFill}
    >
      <Icon Icon={IconArrowsMaximize} stroke={3} />
    </IconButton>
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
  {:else}
    <IconButton
      title="Fit scene in view"
      class="zoomControls__button"
      aria-label="Fit scene"
      variant="ghost"
      onclick={handleSceneFit}
    >
      <Icon Icon={IconArrowsMaximize} stroke={3} />
    </IconButton>
    <IconButton
      title="Rotate scene"
      class="zoomControls__button"
      aria-label="Rotate scene"
      variant="ghost"
      onclick={() => {
        handleSceneRotate();
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
    .zoomControls__button svg {
      filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 4px rgba(0, 0, 0, 0.5));
    }
  }
  .sceneZoom {
    position: absolute;
    text-shadow:
      0 0 2px rgba(0, 0, 0, 0.8),
      0 0 8px rgba(0, 0, 0, 0.5);
    bottom: 1rem;
    left: 1rem;
    display: flex;
    z-index: 1;
  }
  .sceneZoom__mutedText {
    color: var(--fgMuted);
  }
</style>
