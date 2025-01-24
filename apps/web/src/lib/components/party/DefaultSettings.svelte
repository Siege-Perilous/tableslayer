<script lang="ts">
  import { createUpdatePartyMutation } from '$lib/queries';
  import {
    Button,
    IconButton,
    Icon,
    Control,
    Input,
    Panel,
    Select,
    Spacer,
    Text,
    Title,
    addToast
  } from '@tableslayer/ui';
  import type { SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';

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

  const updateParty = createUpdatePartyMutation();

  const save = async () => {
    $updateParty.mutateAsync({
      partyId: party.id,
      partyData: partyData
    });
  };

  $effect(() => {
    if ($updateParty.isSuccess) {
      addToast({
        data: {
          title: 'Default settings updated',
          type: 'success'
        }
      });
    }

    if ($updateParty.isError) {
      console.log('zod', JSON.parse($updateParty.error.message));
      addToast({
        data: {
          title: 'Error updating default settings',
          type: 'danger'
        }
      });
    }
  });
</script>

<Spacer size={8} />
<Title as="h3" size="sm">Default settings</Title>
<Text color="var(--fgMuted)">These settings will be used as the default for new scenes.</Text>
<Spacer />
<Panel class="defaultSettings">
  <Spacer />
  <div class="defaultSettings__grid">
    <Control label="TV size">
      <Input
        type="number"
        name="defaultTvSize"
        bind:value={partyData.defaultTvSize}
        oninput={() => handleTvSizeChange(partyData.defaultTvSize)}
      />
      {#snippet end()}
        in.
      {/snippet}
    </Control>
    <Control label="Resolution">
      <Select
        onSelectedChange={(selected) => handleSelectedResolution(selected.next as TvResolution)}
        {defaultSelected}
        options={selectTvResolutionOptions}
      />
    </Control>
    <Control label="Grid type">
      <IconButton
        type="button"
        variant={partyData.defaultGridType === 0 ? 'primary' : 'ghost'}
        onclick={() => handleGridTypeChange(0)}
      >
        <Icon Icon={IconLayoutGrid} size="20px" stroke={2} />
      </IconButton>
      &nbsp;
      <IconButton
        type="button"
        variant={partyData.defaultGridType === 1 ? 'primary' : 'ghost'}
        onclick={() => handleGridTypeChange(1)}
      >
        <Icon Icon={IconHexagons} size="20px" stroke={2} />
      </IconButton>
    </Control>
    <Control label="Grid size">
      <Input type="number" name="defaultGridSpacing" bind:value={partyData.defaultGridSpacing} />
      {#snippet end()}
        in.
      {/snippet}
    </Control>
    <Control label="Line thickness">
      <Input type="number" name="defaultLineThickness" bind:value={partyData.defaultLineThickness} />
      {#snippet end()}
        px
      {/snippet}
    </Control>
    <Control label="Padding">
      <Input type="number" name="padding" bind:value={padding} />
      {#snippet end()}
        px
      {/snippet}
    </Control>
  </div>
  <Spacer />
  <Button onclick={() => save()}>Save</Button>
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
