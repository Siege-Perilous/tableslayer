<script lang="ts">
  import { useUpdatePartyMutation } from '$lib/queries';
  import { handleMutation } from '$lib/factories';
  import { IconButton, Icon, FormControl, Input, Panel, Select, Spacer, Text, Title } from '@tableslayer/ui';
  import { type SelectParty, updatePartySchema } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import { type ZodIssue } from 'zod';

  import { IconHexagons, IconLayoutGrid } from '@tabler/icons-svelte';

  import {
    type TvResolution,
    tvResolutionOptions,
    getTvDimensions,
    selectTvResolutionOptions,
    getResolutionOption
  } from '$lib/utils';
  let {
    party
  }: {
    party: SelectParty & Thumb;
  } = $props();

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let isPartyDataChanged = false;
  let defaultSelected = $derived(getResolutionOption(party.defaultDisplayResolutionX, party.defaultDisplayResolutionY));
  let padding = $state(party.defaultDisplayPaddingX);
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

  const handleSelectedResolution = (selected: TvResolution) => {
    const selectedResolution = tvResolutionOptions.find((option) => option.value === selected.value)!;
    partyData.defaultDisplayResolutionX = selectedResolution.width;
    partyData.defaultDisplayResolutionY = selectedResolution.height;
    return selectedResolution;
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
      mutation: () => $updateParty.mutateAsync({ partyId: party.id, partyData }),
      formLoadingState: () => {},
      toastMessages: {
        success: { title: 'Default settings updated' },
        error: { title: 'Error updating party', body: (err) => err.message || 'Error updating party' }
      }
    });
  };

  const handleValidation = () => {
    errors = updatePartySchema.safeParse(partyData).error?.errors;
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

<Spacer size={8} />
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
          ids={{ trigger: inputProps.id as string }}
          onSelectedChange={(selected) => handleSelectedResolution(selected.next as TvResolution)}
          {...inputProps}
          {defaultSelected}
          options={selectTvResolutionOptions}
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
</style>
