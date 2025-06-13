<script lang="ts">
  import { Icon, FormControl, Spacer, type StageProps, Input, Button, IconButton, Text, Hr } from '@tableslayer/ui';
  import type { SelectScene } from '$lib/db/app/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconRotateClockwise2 } from '@tabler/icons-svelte';
  import { UpdateMapImage, openFileDialog } from './';
  import { type $ZodIssue } from 'zod/v4/core';
  import { queuePropertyUpdate } from '$lib/utils';
  import { throttle } from '$lib/utils';

  let {
    stageProps = $bindable(),
    selectedScene,
    handleMapFill,
    handleMapFit,
    errors,
    party
  }: {
    socketUpdate: () => void;
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeScene: SelectScene | (SelectScene & Thumb) | null;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: $ZodIssue[] | undefined;
  } = $props();

  let contextSceneId = $state('');

  // Track previous values to detect changes and queue collaborative updates
  let prevZoom = stageProps.map.zoom;
  let prevRotation = stageProps.map.rotation;
  let prevOffsetX = stageProps.map.offset.x;
  let prevOffsetY = stageProps.map.offset.y;

  // Throttled function to update collaborative state
  const throttledMapUpdate = throttle((path: string[], value: number) => {
    queuePropertyUpdate(stageProps, path, value, 'control');
  }, 100);

  $effect(() => {
    if (stageProps.map.zoom !== prevZoom) {
      throttledMapUpdate(['map', 'zoom'], stageProps.map.zoom);
      prevZoom = stageProps.map.zoom;
    }
  });

  $effect(() => {
    if (stageProps.map.rotation !== prevRotation) {
      throttledMapUpdate(['map', 'rotation'], stageProps.map.rotation);
      prevRotation = stageProps.map.rotation;
    }
  });

  $effect(() => {
    if (stageProps.map.offset.x !== prevOffsetX) {
      throttledMapUpdate(['map', 'offset', 'x'], stageProps.map.offset.x);
      prevOffsetX = stageProps.map.offset.x;
    }
  });

  $effect(() => {
    if (stageProps.map.offset.y !== prevOffsetY) {
      throttledMapUpdate(['map', 'offset', 'y'], stageProps.map.offset.y);
      prevOffsetY = stageProps.map.offset.y;
    }
  });

  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    openFileDialog();
  };

  const handleMapRotation = () => {
    stageProps.map.rotation = (stageProps.map.rotation + 90) % 360;
  };
</script>

<div class="mapControls">
  <Text size="0.85rem" color="var(--fgMuted)">Maps must be under 15MB in size.</Text>
  <Spacer size="0.5rem" />
  <Button onclick={() => handleMapImageChange(selectedScene.id)}>Replace map</Button>
  <Spacer />
  <Hr />
  <Spacer />
  <div class="mapControls__grid">
    <FormControl label="Scale" name="mapZoom" {errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="number" bind:value={stageProps.map.zoom} />
      {/snippet}
      {#snippet start()}
        x
      {/snippet}
    </FormControl>
    <FormControl label="Rotate" class="sceneControls__rotate" name="mapRotation" {errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="number" bind:value={stageProps.map.rotation} />
      {/snippet}
      {#snippet end()}
        <IconButton variant="ghost" onclick={handleMapRotation}>
          <Icon Icon={IconRotateClockwise2} />
        </IconButton>
      {/snippet}
    </FormControl>
  </div>
  <Spacer />
  <div class="mapControls__grid">
    <FormControl label="Offset X" name="mapOffsetX" {errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="number" bind:value={stageProps.map.offset.x} />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
    <FormControl label="Offset Y" name="mapOffsetY" {errors}>
      {#snippet input({ inputProps })}
        <Input {...inputProps} type="number" bind:value={stageProps.map.offset.y} />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
    <Button onclick={handleMapFill}>Fill in scene</Button>
    <Button onclick={handleMapFit}>Fit in scene</Button>
  </div>
  <UpdateMapImage sceneId={contextSceneId} partyId={party.id} />
</div>

<style>
  .mapControls {
    max-width: 16rem;
  }

  .mapControls__grid {
    width: 16rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
</style>
