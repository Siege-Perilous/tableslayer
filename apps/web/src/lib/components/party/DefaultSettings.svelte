<script lang="ts">
  import { Field } from 'formsnap';
  import { superForm } from 'sveltekit-superforms';
  import { type SuperValidated } from 'sveltekit-superforms/client';
  import SuperDebug from 'sveltekit-superforms';
  import { zodClient } from 'sveltekit-superforms/adapters';
  import { type DefaultSceneSettingsFormType, defaultSceneSettingsSchema } from '$lib/schemas';
  import {
    Button,
    IconButton,
    Icon,
    Control,
    FSControl,
    Input,
    MessageError,
    Panel,
    Select,
    Spacer,
    Text,
    Title
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
    party,
    defaultSceneSettingsForm
  }: {
    party: SelectParty & Thumb;
    defaultSceneSettingsForm: SuperValidated<DefaultSceneSettingsFormType>;
  } = $props();

  const defaultSceneSettingsSuperForm = superForm(defaultSceneSettingsForm, {
    id: `settings-${party.slug}`,
    delayMs: 100,
    timeoutMs: 2000,
    validators: zodClient(defaultSceneSettingsSchema),
    resetForm: false,
    invalidateAll: true
  });

  let padding = $state(party.defaultDisplayPaddingX);
  let defaultSelected = $derived(getResolutionOption(party.defaultDisplayResolutionX, party.defaultDisplayResolutionY));

  const {
    form: settingsForm,
    enhance: settingsEnhance,
    message: settingsMessage,
    delayed: settingsDelayed
  } = defaultSceneSettingsSuperForm;

  const handleSelectedResolution = (selected: TvResolution) => {
    const selectedResolution = tvResolutionOptions.find((option) => option.value === selected.value)!;
    $settingsForm.defaultDisplayResolutionX = selectedResolution.width;
    $settingsForm.defaultDisplayResolutionY = selectedResolution.height;
    return selectedResolution;
  };

  const handleTvSizeChange = (diagonalSize: number) => {
    const { width, height } = getTvDimensions(diagonalSize);
    $settingsForm.defaultDisplaySizeX = width;
    $settingsForm.defaultDisplaySizeY = height;
  };

  const handleGridTypeChange = (gridType: number) => {
    $settingsForm.defaultGridType = gridType;
  };

  $effect(() => {
    $settingsForm.defaultDisplayPaddingX = padding;
    $settingsForm.defaultDisplayPaddingY = padding;
  });
</script>

<Spacer size={8} />
<Title as="h3" size="sm">Default settings</Title>
<Text color="var(--fgMuted)">These settings will be used as the default for new scenes.</Text>
<Spacer />
<Panel class="defaultSettings">
  <Spacer />
  <form method="POST" action="?/updateDefaultSceneSettings" use:settingsEnhance>
    <div class="defaultSettings__grid">
      <Field form={defaultSceneSettingsSuperForm} name="defaultTvSize">
        <FSControl label="TV size">
          {#snippet content({ props })}
            <Input
              {...props}
              type="number"
              name="defaultTvSize"
              bind:value={$settingsForm.defaultTvSize}
              oninput={() => handleTvSizeChange($settingsForm.defaultTvSize)}
            />
          {/snippet}
          {#snippet end()}
            in.
          {/snippet}
        </FSControl>
      </Field>
      <Control label="Resolution">
        <Select
          onSelectedChange={(selected) => handleSelectedResolution(selected.next as TvResolution)}
          {defaultSelected}
          options={selectTvResolutionOptions}
        />
      </Control>
      {#if $settingsForm.defaultGridType === 0}
        <Control label="Grid type">
          <IconButton type="button" variant="primary" onclick={() => handleGridTypeChange(0)}>
            <Icon Icon={IconLayoutGrid} size="20px" stroke={2} />
          </IconButton>
          &nbsp;
          <IconButton type="button" variant="ghost" onclick={() => handleGridTypeChange(1)}>
            <Icon Icon={IconHexagons} size="20px" stroke={2} />
          </IconButton>
        </Control>
      {:else}
        <Control label="Grid type">
          <IconButton type="button" variant="ghost" onclick={() => handleGridTypeChange(0)}>
            <Icon Icon={IconLayoutGrid} size="20px" stroke={2} />
          </IconButton>
          &nbsp;
          <IconButton type="button" variant="primary" onclick={() => handleGridTypeChange(1)}>
            <Icon Icon={IconHexagons} size="20px" stroke={2} />
          </IconButton>
        </Control>
      {/if}
      <Field form={defaultSceneSettingsSuperForm} name="gridSize">
        <FSControl label="Grid size">
          {#snippet content({ props })}
            <Input {...props} type="number" name="defaultGridSpacing" bind:value={$settingsForm.defaultGridSpacing} />
          {/snippet}
          {#snippet end()}
            in.
          {/snippet}
        </FSControl>
      </Field>
      <Field form={defaultSceneSettingsSuperForm} name="lineThickness">
        <FSControl label="Line thickness">
          {#snippet content({ props })}
            <Input
              {...props}
              type="number"
              name="defaultLineThickness"
              bind:value={$settingsForm.defaultLineThickness}
            />
          {/snippet}
          {#snippet end()}
            px
          {/snippet}
        </FSControl>
      </Field>
      <Control label="Padding">
        <Input type="number" name="padding" bind:value={padding} />
        {#snippet end()}
          px
        {/snippet}
      </Control>
    </div>
    <input type="hidden" name="defaultDisplayResolutionX" bind:value={$settingsForm.defaultDisplayResolutionX} />
    <input type="hidden" name="defaultDisplayResolutionY" bind:value={$settingsForm.defaultDisplayResolutionY} />
    <input type="hidden" name="defaultDisplayPaddingX" bind:value={$settingsForm.defaultDisplayPaddingX} />
    <input type="hidden" name="defaultDisplayPaddingY" bind:value={$settingsForm.defaultDisplayPaddingY} />
    <input type="hidden" name="defaultDisplaySizeX" bind:value={$settingsForm.defaultDisplaySizeX} />
    <input type="hidden" name="defaultDisplaySizeY" bind:value={$settingsForm.defaultDisplaySizeY} />
    <input type="hidden" name="defaultGridType" bind:value={$settingsForm.defaultGridType} />
    <Spacer />
    <Button type="submit" isLoading={$settingsDelayed}>Save</Button>
    {#if $settingsMessage}
      <MessageError message={$settingsMessage} />
    {/if}
  </form>
  <div class="superFormHack">
    {party.defaultTvSize}
  </div>
  <SuperDebug data={$settingsForm} display={false} />
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
