<script lang="ts">
  import { Button, IconButton, Icon, type StageProps } from '@tableslayer/ui';
  import { IconPlus, IconMinus, IconRotateClockwise2, IconArrowsMaximize } from '@tabler/icons-svelte';

  let {
    stageProps = $bindable(),
    socketUpdate,
    handleSceneFit,
    handleMapFill
  }: {
    stageProps: StageProps;
    socketUpdate: () => void;
    handleSceneFit: () => void;
    handleMapFill: () => void;
  } = $props();

  // Initialize with scene as default target
  let gestureTarget = $state<'map' | 'scene'>('scene');

  // Always keep stageProps.gestureTarget in sync with our local state
  $effect(() => {
    stageProps.gestureTarget = gestureTarget;
  });

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.001;

  const handleZoom = (deltaY: number, target: 'map' | 'scene') => {
    const zoom = stageProps[target].zoom + deltaY * zoomSensitivity;
    const newZoom = Math.min(Math.max(zoom, minZoom), maxZoom);
    stageProps[target].zoom = newZoom;
    socketUpdate();
  };

  const toggleGestureTarget = () => {
    gestureTarget = gestureTarget === 'map' ? 'scene' : 'map';
  };

  const handleMapRotate = () => {
    stageProps.map.rotation = (stageProps.map.rotation + 90) % 360;
    socketUpdate();
  };
  const handleSceneRotate = () => {
    stageProps.scene.rotation = (stageProps.scene.rotation + 90) % 360;
    socketUpdate();
  };
</script>

<div class="sceneZoom">
  <Button onclick={toggleGestureTarget} variant="ghost">
    <span class={gestureTarget === 'map' ? 'sceneZoom__mutedText' : ''}>Scene</span>
    <span class="sceneZoom__mutedText">|</span>
    <span class={gestureTarget === 'scene' ? 'sceneZoom__mutedText' : ''}>Map</span>
  </Button>
  <IconButton
    title={gestureTarget === 'map' ? 'SHIFT + mouse wheel or pinch' : 'CTRL + mouse wheel or pinch'}
    class="zoomControls__button"
    aria-label="Zoom in"
    variant="ghost"
    onclick={() => {
      handleZoom(100, gestureTarget);
    }}
  >
    <Icon Icon={IconPlus} stroke={3} />
  </IconButton>
  <IconButton
    title={gestureTarget === 'map' ? 'SHIFT + mouse wheel or pinch' : 'CTRL + mouse wheel or pinch'}
    class="zoomControls__button"
    aria-label="Zoom out"
    variant="ghost"
    onclick={() => {
      handleZoom(-100, gestureTarget);
    }}
  >
    <Icon Icon={IconMinus} stroke={3} />
  </IconButton>
  {#if gestureTarget === 'map'}
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
      title="Rotate map (or use two-finger twist)"
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
      title="Rotate scene (or use two-finger twist)"
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
