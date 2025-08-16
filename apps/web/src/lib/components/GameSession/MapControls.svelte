<script lang="ts">
  import { Icon, FormControl, Spacer, type StageProps, Input, Button, IconButton, Text, Hr } from '@tableslayer/ui';
  import type { SelectScene } from '$lib/db/app/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconRotateClockwise2 } from '@tabler/icons-svelte';
  import { UpdateMapImage, openFileDialog } from './';
  import { type $ZodIssue } from 'zod/v4/core';
  import { usePartyData } from '$lib/utils/yjs/stores';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
    stageProps,
    selectedScene,
    handleMapFill,
    handleMapFit,
    errors,
    party,
    partyData
  }: {
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: $ZodIssue[] | undefined;
    partyData: ReturnType<typeof usePartyData> | null;
  } = $props();

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    openFileDialog();
  };

  const handleMapRotation = () => {
    const newRotation = (stageProps.map.rotation + 90) % 360;
    queuePropertyUpdate(stageProps, ['map', 'rotation'], newRotation, 'control');
  };
</script>

<div class="mapControls">
  <Text size="0.85rem" color="var(--fgMuted)">Maps must be under 15MB (image) or 100MB (video) in size.</Text>
  <Spacer size="0.5rem" />
  <Button onclick={() => handleMapImageChange(selectedScene.id)}>Replace map</Button>
  <Spacer />
  <Hr />
  <Spacer />
  <div class="mapControls__grid">
    <FormControl label="Scale" name="mapZoom" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          value={stageProps.map.zoom}
          oninput={(e) =>
            queuePropertyUpdate(stageProps, ['map', 'zoom'], parseFloat(e.currentTarget.value), 'control')}
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
          oninput={(e) =>
            queuePropertyUpdate(stageProps, ['map', 'rotation'], parseFloat(e.currentTarget.value), 'control')}
        />
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
    <Button onclick={handleMapFill}>Fill in scene</Button>
    <Button onclick={handleMapFit}>Fit in scene</Button>
  </div>
  <UpdateMapImage sceneId={contextSceneId} partyId={party.id} {partyData} />
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
