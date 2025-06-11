<script lang="ts">
  import type { SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import { type ZodIssue } from 'zod/v4';
  import chroma from 'chroma-js';
  import { IconHexagons, IconLayoutGrid } from '@tabler/icons-svelte';
  import {
    Icon,
    ColorPicker,
    Select,
    FormControl,
    Spacer,
    type StageProps,
    type ColorUpdatePayload,
    Input,
    IconButton
  } from '@tableslayer/ui';
  import {
    tvResolutionOptions,
    getResolutionOption,
    getTvDimensions,
    to8CharHex,
    getTvSizeFromPhysicalDimensions,
    queuePropertyUpdate
  } from '$lib/utils';

  let {
    stageProps = $bindable(),
    party,
    errors
  }: {
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeScene: SelectScene | (SelectScene & Thumb) | null;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: ZodIssue[] | undefined;
  } = $props();

  /* Initial local state
   * The form UX does not match the StageProps / DB schema exactly.
   * This is on purpose to limit choice / make decisions easier.
   */
  let gridHex = $state(to8CharHex(stageProps.grid.lineColor, stageProps.grid.opacity));
  let gridTypeLabel = $derived(stageProps.grid.gridType === 0 ? 'Square size' : 'Hex size');
  let tvDiagnalSize = $state(getTvSizeFromPhysicalDimensions(stageProps.display.size.x, stageProps.display.size.y));
  let selected = $state([
    getResolutionOption(party.defaultDisplayResolutionX, party.defaultDisplayResolutionY)?.value || ''
  ]);

  // Turn the local concept of TV size into the stageProps format
  const handleTvSizeChange = (diagonalSize: number) => {
    const { width, height } = getTvDimensions(diagonalSize);
    queuePropertyUpdate(stageProps, ['display', 'size', 'x'], width, 'control');
    queuePropertyUpdate(stageProps, ['display', 'size', 'y'], height, 'control');
  };

  // We provide typical TV sizes as options, but save them as x and y values
  const handleSelectedResolution = (newSelected: string) => {
    // Find the resolution across all aspect ratio groups
    let selectedResolution;

    // Properly type the keys when iterating
    for (const ratioKey in tvResolutionOptions) {
      const typedRatioKey = ratioKey as keyof typeof tvResolutionOptions;
      const foundOption = tvResolutionOptions[typedRatioKey].find((option) => option.value === newSelected);

      if (foundOption) {
        selectedResolution = foundOption;
        break;
      }
    }

    if (selectedResolution) {
      queuePropertyUpdate(stageProps, ['display', 'resolution', 'x'], selectedResolution.width, 'control');
      queuePropertyUpdate(stageProps, ['display', 'resolution', 'y'], selectedResolution.height, 'control');
      return selectedResolution;
    }
    return null;
  };

  // Hex or Square grid toggle
  const handleGridTypeChange = (gridType: number) => {
    queuePropertyUpdate(stageProps, ['grid', 'gridType'], gridType, 'control');
  };

  // Ensure the handleGridColorUpdate function is also typed with ColorUpdatePayload
  const handleGridColorUpdate = (cd: ColorUpdatePayload) => {
    const gridColor = chroma(cd.hex).hex('rgb');
    queuePropertyUpdate(stageProps, ['grid', 'lineColor'], gridColor, 'control');
    queuePropertyUpdate(stageProps, ['grid', 'opacity'], cd.rgba.a, 'control');
  };

  /** Padding
   * The DB saves x/y padding as separate values.
   * The client uses a single value for both x and y padding.
   */
  let localPadding = $state(stageProps.display.padding.x);

  const handlePaddingChange = () => {
    queuePropertyUpdate(stageProps, ['display', 'padding', 'x'], localPadding, 'control');
    queuePropertyUpdate(stageProps, ['display', 'padding', 'y'], localPadding, 'control');
  };

  // Local state and conversion for grid color, tv size and padding
  $effect(() => {
    gridHex = to8CharHex(stageProps.grid.lineColor, stageProps.grid.opacity);
    tvDiagnalSize = getTvSizeFromPhysicalDimensions(stageProps.display.size.x, stageProps.display.size.y);

    // Find resolution option across all aspect ratio groups
    const resolutionOption = getResolutionOption(stageProps.display.resolution.x, stageProps.display.resolution.y);
    selected = [resolutionOption?.value || ''];

    if (stageProps.display.padding.x !== localPadding) {
      localPadding = stageProps.display.padding.x;
    }
  });
</script>

<div class="gridControls">
  <FormControl label="TV size" name="tvDiagnalSize" {errors}>
    {#snippet input({ inputProps })}
      <Input
        {...inputProps}
        type="number"
        min={10}
        step={1}
        bind:value={tvDiagnalSize}
        oninput={() => handleTvSizeChange(tvDiagnalSize)}
      />
    {/snippet}
    {#snippet end()}
      in.
    {/snippet}
  </FormControl>
  <FormControl label="Resolution" name="displayResolutionX" {errors}>
    {#snippet input({ inputProps })}
      <Select
        {selected}
        onSelectedChange={(selected) => handleSelectedResolution(selected[0])}
        options={tvResolutionOptions}
        {...inputProps}
      />
    {/snippet}
  </FormControl>
</div>
<Spacer />
<div class="gridControls">
  <FormControl label="Grid type" name="gridType" {errors}>
    {#snippet input({ inputProps })}
      <IconButton {...inputProps} variant="ghost" onclick={() => handleGridTypeChange(0)}>
        <Icon Icon={IconLayoutGrid} size="20px" stroke={2} />
      </IconButton>
      <IconButton {...inputProps} variant="ghost" onclick={() => handleGridTypeChange(1)}>
        <Icon Icon={IconHexagons} size="20px" stroke={2} />
      </IconButton>
    {/snippet}
  </FormControl>
  <FormControl label={gridTypeLabel} name="gridSpacing" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} step={0.25} bind:value={stageProps.grid.spacing} />
    {/snippet}
    {#snippet end()}
      in.
    {/snippet}
  </FormControl>
</div>
<Spacer />
<div class="gridControls">
  <FormControl label="Line thickness" name="gridLineThickness" {errors}>
    {#snippet end()}
      px
    {/snippet}

    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={1} step={1} bind:value={stageProps.grid.lineThickness} />
    {/snippet}
  </FormControl>
  <FormControl label="Table padding" name="displayPaddingX" {errors}>
    {#snippet input({ inputProps })}
      <Input {...inputProps} type="number" min={0} step={1} bind:value={localPadding} oninput={handlePaddingChange} />
    {/snippet}
    {#snippet end()}
      px
    {/snippet}
  </FormControl>
</div>
<Spacer />
<FormControl label="Grid Color" name="gridLineColor" {errors}>
  {#snippet input({ inputProps })}
    <ColorPicker {...inputProps} bind:hex={gridHex} onUpdate={handleGridColorUpdate} />
  {/snippet}
</FormControl>
<Spacer />

<style>
  .gridControls {
    width: 16rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
</style>
