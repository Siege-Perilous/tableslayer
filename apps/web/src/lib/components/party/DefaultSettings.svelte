<script lang="ts">
  import { useUpdatePartyMutation, useUploadFileMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { IconButton, Icon, FormControl, Input, Panel, Select, Spacer, Text, Title, Button } from '@tableslayer/ui';
  import { type SelectParty, updatePartySchema } from '$lib/db/app/schema';
  import type { Thumb, PauseScreenThumb } from '$lib/server';
  import { type ZodIssue } from 'zod';
  import { invalidateAll } from '$app/navigation';

  import { IconHexagons, IconLayoutGrid, IconTrash } from '@tabler/icons-svelte';

  import { tvResolutionOptions, getTvDimensions, getResolutionOption } from '$lib/utils';
  let {
    party
  }: {
    party: SelectParty & Thumb & PauseScreenThumb;
  } = $props();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let isPartyDataChanged = false;
  let selected = $derived([
    getResolutionOption(party.defaultDisplayResolutionX, party.defaultDisplayResolutionY)?.value || ''
  ]);
  let padding = $state(party.defaultDisplayPaddingX);
  let pauseScreenFiles = $state<FileList | null>(null);
  let pauseScreenIsLoading = $state(false);
  let hiddenPauseScreenInput: HTMLInputElement | null = null;

  const openPauseScreenDialog = () => {
    hiddenPauseScreenInput?.click();
  };

  const uploadFile = useUploadFileMutation();
  let partyData = $state({
    defaultTvSize: party.defaultTvSize,
    defaultDisplayResolutionX: party.defaultDisplayResolutionX,
    defaultDisplayResolutionY: party.defaultDisplayResolutionY,
    defaultGridType: party.defaultGridType,
    defaultGridSpacing: party.defaultGridSpacing,
    defaultLineThickness: party.defaultLineThickness,
    defaultDisplaySizeX: party.defaultDisplaySizeX,
    defaultDisplaySizeY: party.defaultDisplaySizeY,
    defaultDisplayPaddingX: party.defaultDisplayPaddingX,
    defaultDisplayPaddingY: party.defaultDisplayPaddingY
  });
  let errors = $state<ZodIssue[] | undefined>(undefined);

  const handleSelectedResolution = (selected: string) => {
    let selectedResolution;

    for (const ratioKey in tvResolutionOptions) {
      const typedRatioKey = ratioKey as keyof typeof tvResolutionOptions;
      const foundOption = tvResolutionOptions[typedRatioKey].find((option) => option.value === selected);

      if (foundOption) {
        selectedResolution = foundOption;
        break;
      }
    }

    if (selectedResolution) {
      partyData.defaultDisplayResolutionX = selectedResolution.width;
      partyData.defaultDisplayResolutionY = selectedResolution.height;
      return selectedResolution;
    }
    return null;
  };

  const handleTvSizeChange = (diagonalSize: number) => {
    const { width, height } = getTvDimensions(diagonalSize);
    partyData.defaultDisplaySizeX = width;
    partyData.defaultDisplaySizeY = height;
  };

  const handleGridTypeChange = (gridType: number) => {
    partyData.defaultGridType = gridType;
  };

  $effect(() => {
    partyData.defaultDisplayPaddingX = padding;
    partyData.defaultDisplayPaddingY = padding;
  });

  const updateParty = useUpdatePartyMutation();

  const save = async () => {
    await handleMutation({
      mutation: () => updateParty.mutateAsync({ partyId: party.id, partyData }),
      formLoadingState: () => {},
      toastMessages: {
        success: { title: 'Default settings updated' },
        error: { title: 'Error updating party', body: (err) => err.message || 'Error updating party' }
      }
    });
  };

  const handleValidation = () => {
    errors = updatePartySchema.safeParse(partyData).error?.issues;
  };

  const handlePauseScreenChange = async () => {
    if (pauseScreenFiles && pauseScreenFiles.length) {
      const uploadedFile = await handleMutation({
        mutation: () =>
          uploadFile.mutateAsync({
            file: pauseScreenFiles![0],
            folder: 'pause-screen'
          }),
        formLoadingState: (loading) => (pauseScreenIsLoading = loading),
        toastMessages: {
          success: { title: 'Image uploaded' },
          error: { title: 'Error uploading image', body: (error) => error.message }
        }
      });

      if (!uploadedFile) return;

      await handleMutation({
        mutation: () =>
          updateParty.mutateAsync({
            partyId: party.id,
            partyData: { pauseScreenFileId: uploadedFile.fileId }
          }),
        formLoadingState: (loading) => (pauseScreenIsLoading = loading),
        onSuccess: () => {
          invalidateAll();
        },
        toastMessages: {
          success: { title: 'Pause screen updated' },
          error: { title: 'Error updating pause screen', body: (error) => error.message }
        }
      });
    }
  };

  const handleRemovePauseScreen = async () => {
    await handleMutation({
      mutation: () =>
        updateParty.mutateAsync({
          partyId: party.id,
          partyData: { pauseScreenFileId: 1 }
        }),
      formLoadingState: (loading) => (pauseScreenIsLoading = loading),
      onSuccess: () => {
        pauseScreenFiles = null;
        invalidateAll();
      },
      toastMessages: {
        success: { title: 'Pause screen removed' },
        error: { title: 'Error removing pause screen', body: (error) => error.message }
      }
    });
  };

  $effect(() => {
    $state.snapshot(partyData);

    if (!isPartyDataChanged) {
      isPartyDataChanged = true;
      return;
    }

    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      save();
    }, 3000);
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  });
</script>

<Spacer size="2rem" />
<Title as="h3" size="sm">Default settings</Title>
<Text color="var(--fgMuted)">These settings will be used as the default for new scenes.</Text>
<Spacer />
<Panel class="defaultSettings">
  <Spacer />
  <div class="defaultSettings__grid">
    <FormControl label="TV size" name="defaultTvSize" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          name="defaultTvSize"
          bind:value={partyData.defaultTvSize}
          oninput={() => handleTvSizeChange(partyData.defaultTvSize)}
          onblur={handleValidation}
        />
      {/snippet}
      {#snippet end()}
        in.
      {/snippet}
    </FormControl>
    <FormControl label="Resolution" name="defaultDisplayResolutionX" {errors}>
      {#snippet input({ inputProps })}
        <Select
          {selected}
          onSelectedChange={(selected) => handleSelectedResolution(selected[0])}
          options={tvResolutionOptions}
          {...inputProps}
        />
      {/snippet}
    </FormControl>
    <FormControl label="Grid type" name="defaultGridType" {errors}>
      {#snippet input({ inputProps })}
        <IconButton
          type="button"
          variant={partyData.defaultGridType === 0 ? 'primary' : 'ghost'}
          onclick={() => handleGridTypeChange(0)}
          {...inputProps}
        >
          <Icon Icon={IconLayoutGrid} size="20px" stroke={2} />
        </IconButton>
        &nbsp;
        <IconButton
          type="button"
          variant={partyData.defaultGridType === 1 ? 'primary' : 'ghost'}
          onclick={() => handleGridTypeChange(1)}
          {...inputProps}
        >
          <Icon Icon={IconHexagons} size="20px" stroke={2} />
        </IconButton>
      {/snippet}
    </FormControl>
    <FormControl label="Grid size" name="defaultGridSpacing" {errors}>
      {#snippet input({ inputProps })}
        <Input
          type="number"
          {...inputProps}
          name="defaultGridSpacing"
          onblur={handleValidation}
          bind:value={partyData.defaultGridSpacing}
        />
      {/snippet}
      {#snippet end()}
        in.
      {/snippet}
    </FormControl>
    <FormControl label="Line thickness" name="defaultLineThickness" {errors}>
      {#snippet input({ inputProps })}
        <Input type="number" {...inputProps} onblur={handleValidation} bind:value={partyData.defaultLineThickness} />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
    <FormControl label="Padding" name="defaultDisplayPaddingX" {errors}>
      {#snippet input({ inputProps })}
        <Input type="number" {...inputProps} onblur={handleValidation} bind:value={padding} />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
  </div>
  <Spacer />
  <FormControl label="Custom pause screen" name="pauseScreen">
    {#snippet input()}
      <div class="defaultSettings__pauseScreen">
        <input
          type="file"
          accept="image/png, image/jpeg, image/webp"
          bind:this={hiddenPauseScreenInput}
          bind:files={pauseScreenFiles}
          onchange={handlePauseScreenChange}
          style="display: none;"
        />
        {#if party.pauseScreenThumb}
          <button
            type="button"
            class="defaultSettings__pauseScreenPreview"
            onclick={openPauseScreenDialog}
            disabled={pauseScreenIsLoading}
          >
            <img src={party.pauseScreenThumb.resizedUrl} alt="Pause screen" class="defaultSettings__pauseScreenImage" />
            <div class="defaultSettings__pauseScreenOverlay">Click to change</div>
          </button>
          <Button onclick={handleRemovePauseScreen} disabled={pauseScreenIsLoading}>
            <Icon Icon={IconTrash} size="16px" />
            Remove
          </Button>
        {:else}
          <Button onclick={openPauseScreenDialog} disabled={pauseScreenIsLoading}>Select image</Button>
          <Text size="0.87rem" color="var(--fgMuted)">Replaces the default pause screen</Text>
        {/if}
      </div>
    {/snippet}
  </FormControl>
  <Spacer />
  <div class="superFormHack">
    {party.defaultTvSize}
  </div>
</Panel>

<style>
  :global {
    .panel.defaultSettings {
      padding: 1rem;
    }
  }
  .defaultSettings__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .superFormHack {
    display: none;
  }
  .defaultSettings__pauseScreen {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
    margin-top: 0.5rem;
  }
  .defaultSettings__pauseScreenPreview {
    position: relative;
    max-width: 320px;
    border-radius: var(--radius-2);
    overflow: hidden;
    cursor: pointer;
    border: none;
    padding: 0;
    background: none;
  }
  .defaultSettings__pauseScreenPreview img {
    width: 100%;
    height: auto;
    display: block;
  }
  .defaultSettings__pauseScreenOverlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    color: var(--fg);
    font-size: 0.875rem;
    opacity: 0;
    transition: opacity 0.15s ease;
  }
  .defaultSettings__pauseScreenImage {
    max-height: 8rem;
  }
  .defaultSettings__pauseScreenPreview:hover .defaultSettings__pauseScreenOverlay {
    opacity: 1;
  }
</style>
