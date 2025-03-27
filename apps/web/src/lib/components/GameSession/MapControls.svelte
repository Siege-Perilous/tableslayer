<script lang="ts">
  import { Icon, FormControl, Spacer, type StageProps, Input, Button, IconButton, Text, Hr } from '@tableslayer/ui';
  import type { SelectScene } from '$lib/db/app/schema';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { IconRotateClockwise2 } from '@tabler/icons-svelte';
  import { UpdateMapImage, openFileDialog } from './';
  import { type ZodIssue } from 'zod';

  let {
    socketUpdate,
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
    errors: ZodIssue[] | undefined;
  } = $props();

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    openFileDialog();
  };

  const handleMapRotation = () => {
    stageProps.map.rotation = (stageProps.map.rotation + 90) % 360;
    socketUpdate();
  };
</script>

<div class="mapControls">
  <Text size="0.85rem" color="var(--fgMuted)">Maps must be under 15MB in size.</Text>
  <Spacer size={2} />
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
