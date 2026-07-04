<script lang="ts">
  import { Icon, FormControl, Spacer, Input, Button, IconButton, Text, Hr } from '@tableslayer/ui';
  import { GridMode, type StageExports, type StageProps } from '@tableslayer/stage';
  import type { SelectScene } from '$lib/db/app/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconRotateClockwise2 } from '@tabler/icons-svelte';
  import { UpdateMapImage, openFileDialog } from './';
  import { type ZodIssue } from 'zod';
  import type { SessionDocClient } from '$lib/realtime';
  import { queuePropertyUpdate, relockMapZoom, trackChecklistItem } from '$lib/utils';

  let {
    stage,
    stageProps,
    selectedScene,
    handleMapFill,
    handleMapFit,
    errors,
    client
  }: {
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stage?: StageExports;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: ZodIssue[] | undefined;
    client: SessionDocClient | null;
  } = $props();

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    openFileDialog();
  };

  const handleMapRotation = () => {
    const newRotation = (stageProps.map.rotation + 90) % 360;
    queuePropertyUpdate(stageProps, ['map', 'rotation'], newRotation, 'control');
    // Rotation swaps the map's effective axes, so the locked zoom must follow
    relockMapZoom(stageProps, stage);
    // Track checklist completion for rotating map
    trackChecklistItem('rotate-map');
  };

  // In map-defined mode the map zoom is locked (one grid cell = grid spacing
  // inches on the TV) and rotation is cardinal-only; the grid, tokens, fog and
  // drawings are anchored to the map, so panning is the only free transform
  const isMapDefined = $derived((stageProps.grid.gridMode ?? GridMode.FillSpace) === GridMode.MapDefined);
</script>

<div class="mapControls">
  <Text size="0.85rem" color="var(--fgMuted)">Maps must be under 15MB (image) or 100MB (video) in size.</Text>
  <Spacer size="0.5rem" />
  <Button onclick={() => handleMapImageChange(selectedScene.id)}>Replace map</Button>
  <Spacer />
  <Hr />
  <Spacer />
  <div class="mapControls__grid">
    {#if !isMapDefined}
      <FormControl label="Scale" name="mapZoom" {errors}>
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            value={stageProps.map.zoom}
            oninput={(e) => {
              queuePropertyUpdate(stageProps, ['map', 'zoom'], parseFloat(e.currentTarget.value), 'control');
              trackChecklistItem('scale-map');
            }}
          />
        {/snippet}
        {#snippet start()}
          x
        {/snippet}
      </FormControl>
      <FormControl label="Rotate" class="sceneControls__rotate" name="mapRotation" {errors}>
        {#snippet input({ inputProps })}
          <Input
            {...inputProps}
            type="number"
            value={stageProps.map.rotation}
            oninput={(e) => {
              queuePropertyUpdate(stageProps, ['map', 'rotation'], parseFloat(e.currentTarget.value), 'control');
              trackChecklistItem('rotate-map');
            }}
          />
        {/snippet}
        {#snippet end()}
          <IconButton variant="ghost" onclick={handleMapRotation}>
            <Icon Icon={IconRotateClockwise2} />
          </IconButton>
        {/snippet}
      </FormControl>
    {:else}
      <Button onclick={handleMapRotation}>
        <Icon Icon={IconRotateClockwise2} />
        Rotate 90°
      </Button>
    {/if}
  </div>
  <Spacer />
  <div class="mapControls__grid">
    <FormControl label="Offset X" name="mapOffsetX" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          value={stageProps.map.offset.x}
          oninput={(e) =>
            queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], parseFloat(e.currentTarget.value), 'control')}
        />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
    <FormControl label="Offset Y" name="mapOffsetY" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          value={stageProps.map.offset.y}
          oninput={(e) =>
            queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], parseFloat(e.currentTarget.value), 'control')}
        />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
    {#if !isMapDefined}
      <Button onclick={handleMapFill}>Fill in scene</Button>
      <Button onclick={handleMapFit}>Fit in scene</Button>
    {/if}
  </div>
  <UpdateMapImage sceneId={contextSceneId} {client} />
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
