<script lang="ts">
  import type { SelectScene } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import { type ZodIssue } from 'zod';
  import chroma from 'chroma-js';
  import { IconHexagons, IconLayoutGrid } from '@tabler/icons-svelte';
  import {
    Icon,
    ColorPicker,
    Select,
    FormControl,
    Spacer,
    type ColorUpdatePayload,
    Input,
    IconButton,
    Button,
    RadioButton,
    Text,
    Hr
  } from '@tableslayer/ui';
  import { type StageProps, type StageExports, GridMode } from '@tableslayer/stage';
  import {
    tvResolutionOptions,
    getResolutionOption,
    getTvDimensions,
    to8CharHex,
    getTvSizeFromPhysicalDimensions,
    queuePropertyUpdate,
    applyGridModeTransition,
    alignMapForMapDefined,
    relockMapZoom,
    trackChecklistItem
  } from '$lib/utils';

  let {
    stageProps,
    party,
    errors,
    stage
  }: {
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: ZodIssue[] | undefined;
    stage?: StageExports;
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

  // Grid mode state
  let isMapDefinedMode = $state((stageProps.grid.gridMode || 0) === GridMode.MapDefined);
  let mapDefinedGridX = $state(stageProps.grid.fixedGridCount?.x || 24);
  let mapDefinedGridY = $state(stageProps.grid.fixedGridCount?.y || 17);

  // Grid counts describe the map image; when the map sits at a 90°/270°
  // rotation (auto-applied for portrait maps on a landscape TV), width and
  // height appear swapped on screen
  let mapIsRotatedOnScreen = $derived(Math.abs(Math.round(stageProps.map.rotation / 90)) % 2 === 1);

  // Turn the local concept of TV size into the stageProps format
  const handleTvSizeChange = (diagonalSize: number) => {
    const { width, height } = getTvDimensions(diagonalSize);
    queuePropertyUpdate(stageProps, ['display', 'size', 'x'], width, 'control');
    queuePropertyUpdate(stageProps, ['display', 'size', 'y'], height, 'control');
    relockMapZoom(stageProps, stage);
    // Track checklist completion for changing TV size
    trackChecklistItem('tv-size');
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
      relockMapZoom(stageProps, stage);
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

  // Handle grid mode change: converts marker/light positions between display
  // and map coordinate spaces (one undo step) and applies the aligned map
  // transform when entering map-defined mode
  const handleGridModeChange = (value: string) => {
    const newMode = value === 'map-defined' ? GridMode.MapDefined : GridMode.FillSpace;
    if (((stageProps.grid.gridMode as GridMode) ?? GridMode.FillSpace) === newMode) return;

    // Annotation drawings are map-sized textures in map-defined mode and
    // cannot be numerically converted back to display space
    if (newMode === GridMode.FillSpace && stageProps.annotations.layers.length > 0) {
      if (!confirm('Switching to fill space clears annotation drawings. Markers, lights and fog are kept. Continue?')) {
        isMapDefinedMode = true;
        return;
      }
      stageProps.annotations.layers.forEach((layer) => stage?.annotations.clear(layer.id));
    }

    isMapDefinedMode = newMode === GridMode.MapDefined;
    applyGridModeTransition(stageProps, newMode, stage);

    // When switching to MapDefined mode, set padding to 0 and force square grid
    if (newMode === GridMode.MapDefined) {
      localPadding = 0;
      handlePaddingChange();
      // Map defined mode only supports square grids
      queuePropertyUpdate(stageProps, ['grid', 'gridType'], 0, 'control');
    }
  };

  // Handle map-defined grid count changes; the locked zoom derives from the
  // count, so it must follow (one grid cell = grid spacing inches on the TV)
  const handleMapDefinedGridX = (value: number) => {
    mapDefinedGridX = value;
    queuePropertyUpdate(stageProps, ['grid', 'fixedGridCount', 'x'], value, 'control');
    relockMapZoom(stageProps, stage);
  };

  const handleMapDefinedGridY = (value: number) => {
    mapDefinedGridY = value;
    queuePropertyUpdate(stageProps, ['grid', 'fixedGridCount', 'y'], value, 'control');
    relockMapZoom(stageProps, stage);
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

  // Reset the map to its aligned map-defined transform (locked zoom, cardinal
  // rotation, centered/top-left offset). The grid, tokens, fog and drawings
  // are anchored to the map, so they all move with it.
  const alignMapToGrid = () => {
    alignMapForMapDefined(stageProps, stage);
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
<Spacer size="0.5rem" />
<FormControl label="Grid mode" name="gridMode" {errors}>
  {#snippet input({ inputProps })}
    <RadioButton
      selected={isMapDefinedMode ? 'map-defined' : 'fill-space'}
      onSelectedChange={handleGridModeChange}
      class="gridModeRadio"
      options={[
        { value: 'fill-space', label: 'Fill space' },
        { value: 'map-defined', label: 'Map defined' }
      ]}
      {...inputProps}
    />
  {/snippet}
</FormControl>
<Spacer size="0.5rem" />
<Text size="0.875" color="var(--fgMuted)" class="gridControls__explanation">
  Pick map defined if you know the exact number of grid units in your map.
</Text>
<Spacer size="0.5rem" />
<Hr />
<Spacer size="0.5rem" />
<div class="gridControls">
  {#if !isMapDefinedMode}
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
  {/if}
  <FormControl label={gridTypeLabel} name="gridSpacing" {errors}>
    {#snippet input({ inputProps })}
      <Input
        {...inputProps}
        type="number"
        min={0}
        step={0.25}
        value={stageProps.grid.spacing}
        oninput={(e) => {
          queuePropertyUpdate(stageProps, ['grid', 'spacing'], parseFloat(e.currentTarget.value), 'control');
          relockMapZoom(stageProps, stage);
        }}
      />
    {/snippet}
    {#snippet end()}
      in.
    {/snippet}
  </FormControl>
  <FormControl label="Line thickness" name="gridLineThickness" {errors}>
    {#snippet end()}
      px
    {/snippet}

    {#snippet input({ inputProps })}
      <Input
        {...inputProps}
        type="number"
        min={1}
        step={1}
        value={stageProps.grid.lineThickness}
        oninput={(e) =>
          queuePropertyUpdate(stageProps, ['grid', 'lineThickness'], parseInt(e.currentTarget.value), 'control')}
      />
    {/snippet}
  </FormControl>
  {#if !isMapDefinedMode}
    <FormControl label="Table padding" name="displayPaddingX" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          min={0}
          step={1}
          bind:value={localPadding}
          oninput={() => handlePaddingChange()}
        />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </FormControl>
  {/if}
  {#if isMapDefinedMode}
    <FormControl label="Map width" name="mapDefinedGridX" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          min={1}
          step={1}
          value={mapDefinedGridX}
          oninput={(e) => handleMapDefinedGridX(parseInt(e.currentTarget.value))}
        />
      {/snippet}
      {#snippet end()}
        sq.
      {/snippet}
    </FormControl>
    <FormControl label="Map height" name="mapDefinedGridY" {errors}>
      {#snippet input({ inputProps })}
        <Input
          {...inputProps}
          type="number"
          min={1}
          step={1}
          value={mapDefinedGridY}
          oninput={(e) => handleMapDefinedGridY(parseInt(e.currentTarget.value))}
        />
      {/snippet}
      {#snippet end()}
        sq.
      {/snippet}
    </FormControl>
  {/if}
</div>
{#if isMapDefinedMode && mapIsRotatedOnScreen}
  <Spacer size="0.5rem" />
  <Text size="0.875" color="var(--fgDanger)" class="gridControls__explanation">
    You've rotated the map, so the width and height values are swapped.
  </Text>
{/if}
<Spacer />
<Button onclick={alignMapToGrid} style="width: 100%">Reset map position</Button>
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
  :global(.radioGroup.gridModeRadio) {
    width: 100%;
    display: flex;
  }

  :global(.radioGroup.gridModeRadio .radioButton) {
    flex: 1;
    flex-basis: 0;
  }
  :global(.gridControls__explanation) {
    max-width: 16rem;
  }
</style>
