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
    type StageProps,
    type StageExports,
    type ColorUpdatePayload,
    Input,
    IconButton,
    GridMode,
    Button,
    RadioButton,
    Text,
    Hr
  } from '@tableslayer/ui';
  import {
    tvResolutionOptions,
    getResolutionOption,
    getTvDimensions,
    to8CharHex,
    getTvSizeFromPhysicalDimensions,
    queuePropertyUpdate,
    resetGridOrigin,
    devLog
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

  // Handle grid mode change
  const handleGridModeChange = (value: string) => {
    const newMode = value === 'map-defined' ? GridMode.MapDefined : GridMode.FillSpace;
    isMapDefinedMode = newMode === GridMode.MapDefined;
    queuePropertyUpdate(stageProps, ['grid', 'gridMode'], newMode, 'control');

    // When switching to MapDefined mode, set padding to 0 and force square grid
    if (newMode === GridMode.MapDefined) {
      localPadding = 0;
      handlePaddingChange();
      // Map defined mode only supports square grids
      queuePropertyUpdate(stageProps, ['grid', 'gridType'], 0, 'control');
    }

    // Reset grid origin when switching modes
    resetGridOrigin();
  };

  // Handle map-defined grid count changes
  const handleMapDefinedGridX = (value: number) => {
    mapDefinedGridX = value;
    queuePropertyUpdate(stageProps, ['grid', 'fixedGridCount', 'x'], value, 'control');
  };

  const handleMapDefinedGridY = (value: number) => {
    mapDefinedGridY = value;
    queuePropertyUpdate(stageProps, ['grid', 'fixedGridCount', 'y'], value, 'control');
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

  // Auto-align map to grid
  const alignMapToGrid = () => {
    if (!stage) return;

    const mapSize = stage.map.getSize();
    if (!mapSize) return;

    // Get map-defined grid count
    const gridCountX = stageProps.grid.fixedGridCount?.x || 24;
    const gridCountY = stageProps.grid.fixedGridCount?.y || 17;

    // Determine if map needs rotation (if width < height but grid width > height)
    const mapAspect = mapSize.width / mapSize.height;
    const gridAspect = gridCountX / gridCountY;

    let rotation = 0;
    let effectiveMapWidth = mapSize.width;
    let effectiveMapHeight = mapSize.height;

    // If aspects don't match (one is portrait, other is landscape), rotate
    if ((mapAspect < 1 && gridAspect > 1) || (mapAspect > 1 && gridAspect < 1)) {
      rotation = 90;
      // Swap dimensions for rotated map
      effectiveMapWidth = mapSize.height;
      effectiveMapHeight = mapSize.width;
    }

    // Calculate pixel pitch (inches per pixel)
    const pixelPitchX = stageProps.display.size.x / stageProps.display.resolution.x;
    const pixelPitchY = stageProps.display.size.y / stageProps.display.resolution.y;

    // Calculate grid spacing in pixels (matching the shader logic)
    // gridSpacing_px = vec2(uSpacing_in) / pixelPitch_in
    const gridSpacingX = stageProps.grid.spacing / pixelPitchX;
    const gridSpacingY = stageProps.grid.spacing / pixelPitchY;

    // Calculate total grid size in pixels (matching shader)
    // gridSize_px = gridSpacing_px * gridCount + uLineThickness / 2.0
    const gridWidthPx = gridSpacingX * gridCountX + stageProps.grid.lineThickness / 2.0;
    const gridHeightPx = gridSpacingY * gridCountY + stageProps.grid.lineThickness / 2.0;

    // Calculate grid origin (matching shader positioning logic)
    let gridOriginX: number;
    let gridOriginY: number;

    // If grid fits horizontally, center it; otherwise align left
    if (gridWidthPx <= stageProps.display.resolution.x) {
      gridOriginX = (stageProps.display.resolution.x - gridWidthPx) / 2.0;
    } else {
      gridOriginX = 0;
    }

    // If grid fits vertically, center it; otherwise align top
    // In UV space: Y=0 is bottom, Y=resolution is top
    // To start at top when overflowing: originY = resolution - gridSize
    if (gridHeightPx <= stageProps.display.resolution.y) {
      gridOriginY = (stageProps.display.resolution.y - gridHeightPx) / 2.0;
    } else {
      gridOriginY = stageProps.display.resolution.y - gridHeightPx;
    }

    // Calculate how many pixels per map grid square
    const mapGridSquareWidth = effectiveMapWidth / gridCountX;
    const mapGridSquareHeight = effectiveMapHeight / gridCountY;

    // Calculate zoom so map grid squares match display grid squares
    const zoomX = gridSpacingX / mapGridSquareWidth;
    const zoomY = gridSpacingY / mapGridSquareHeight;

    // Use average for uniform scaling
    const zoom = (zoomX + zoomY) / 2;

    // Calculate the scaled map dimensions
    const scaledMapWidth = effectiveMapWidth * zoom;
    const scaledMapHeight = effectiveMapHeight * zoom;

    // Position map so its top-left aligns with grid's top-left
    // For X: align map's left edge with grid's left edge
    const offsetX = gridOriginX - stageProps.display.resolution.x / 2 + scaledMapWidth / 2;

    // For Y: Align map's top edge with grid's top edge
    // In this WebGL coordinate system: -Y is up (toward top of screen), +Y is down
    // Screen top = -(resolution.y / 2), Screen bottom = +(resolution.y / 2)
    // Grid top in screen coords: gridOriginY (0 when overflow, centered value when fits)
    // Grid top in WebGL: -(resolution.y / 2) + gridOriginY
    // Map center position for top alignment: gridTopWebGL + (scaledMapHeight / 2)

    const gridTopWebGL = -(stageProps.display.resolution.y / 2) + gridOriginY;
    const offsetY = gridTopWebGL + scaledMapHeight / 2;

    devLog('grid', '[CLIENT alignMapToGrid]', {
      gridOrigin: { x: gridOriginX, y: gridOriginY },
      gridSize: { widthPx: gridWidthPx, heightPx: gridHeightPx },
      gridTopWebGL,
      scaledMap: { width: scaledMapWidth, height: scaledMapHeight },
      mapGridSquare: {
        original: { width: mapGridSquareWidth, height: mapGridSquareHeight },
        scaled: { width: mapGridSquareWidth * zoom, height: mapGridSquareHeight * zoom }
      },
      finalValues: { rotation, zoom, offsetX, offsetY }
    });

    // Apply the calculated values
    queuePropertyUpdate(stageProps, ['map', 'rotation'], rotation, 'control');
    queuePropertyUpdate(stageProps, ['map', 'zoom'], zoom, 'control');
    queuePropertyUpdate(stageProps, ['map', 'offset', 'x'], offsetX, 'control');
    queuePropertyUpdate(stageProps, ['map', 'offset', 'y'], offsetY, 'control');
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
        oninput={(e) =>
          queuePropertyUpdate(stageProps, ['grid', 'spacing'], parseFloat(e.currentTarget.value), 'control')}
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
    <FormControl label="Grid width" name="mapDefinedGridX" {errors}>
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
    <FormControl label="Grid height" name="mapDefinedGridY" {errors}>
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
<Spacer />
<Button onclick={alignMapToGrid} style="width: 100%">Auto fit map to grid</Button>
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
