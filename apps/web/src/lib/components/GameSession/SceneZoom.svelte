<script lang="ts">
  import { Button, IconButton, Icon } from '@tableslayer/ui';
  import { GridMode, type StageExports, type StageProps } from '@tableslayer/stage';
  import { IconPlus, IconMinus, IconRotateClockwise2, IconArrowsMaximize } from '@tabler/icons-svelte';
  import { queuePropertyUpdate, relockMapZoom, trackChecklistItem } from '$lib/utils';

  let {
    stage,
    stageProps,
    handleSceneFit,
    handleMapFill
  }: {
    stage?: StageExports;
    stageProps: StageProps;
    handleSceneFit: () => void;
    handleMapFill: () => void;
  } = $props();

  let zoomType = $state<'map' | 'scene'>('scene');

  // Map zoom is locked in map-defined mode (derived from the grid), so the
  // map side of the toggle only offers rotation there
  const isMapDefined = $derived((stageProps.grid.gridMode ?? GridMode.FillSpace) === GridMode.MapDefined);

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.001;

  const handleZoom = (deltaY: number, zoomType: 'map' | 'scene') => {
    if (zoomType === 'map' && isMapDefined) return;
    const zoom = stageProps[zoomType].zoom + deltaY * zoomSensitivity;
    const newZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
    queuePropertyUpdate(stageProps, [zoomType, 'zoom'], newZoom, 'control');
    // Track checklist completion for scaling map
    if (zoomType === 'map') {
      trackChecklistItem('scale-map');
    }
  };

  const toggleZoomType = () => {
    zoomType = zoomType === 'map' ? 'scene' : 'map';
  };

  const handleMapRotate = () => {
    const current = stageProps.map.rotation;
    const cardinals = [0, 90, 180, 270];
    const next = cardinals.find((angle) => angle > current) ?? cardinals[0];
    queuePropertyUpdate(stageProps, ['map', 'rotation'], next, 'control');
    // Rotation swaps the map's effective axes, so the locked zoom must follow
    relockMapZoom(stageProps, stage);
    // Track checklist completion for rotating map
    trackChecklistItem('rotate-map');
  };
  const handleSceneRotate = () => {
    const current = stageProps.scene.rotation;
    const cardinals = [0, 90, 180, 270];
    const next = cardinals.find((angle) => angle > current) ?? cardinals[0];
    queuePropertyUpdate(stageProps, ['scene', 'rotation'], next, 'control');
    // Track checklist completion for rotating scene
    trackChecklistItem('rotate-scene');
  };
</script>

<div class="sceneZoom">
  <Button onclick={toggleZoomType} variant="ghost">
    <span class={zoomType === 'map' ? 'sceneZoom__mutedText' : ''}>Scene</span>
    <span class="sceneZoom__mutedText">|</span>
    <span class={zoomType === 'scene' ? 'sceneZoom__mutedText' : ''}>Map</span>
  </Button>

  {#if !(zoomType === 'map' && isMapDefined)}
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
  {/if}
  {#if zoomType === 'map'}
    {#if !isMapDefined}
      <IconButton
        title="Fit map within scene"
        class="zoomControls__button"
        aria-label="Fit scene"
        variant="ghost"
        onclick={handleMapFill}
      >
        <Icon Icon={IconArrowsMaximize} stroke={3} />
      </IconButton>
    {/if}
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
