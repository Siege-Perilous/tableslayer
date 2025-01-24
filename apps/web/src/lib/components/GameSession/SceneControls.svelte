<script lang="ts">
  import {
    ColorMode,
    Icon,
    Popover,
    ColorPicker,
    type ColorUpdatePayload,
    Select,
    Control,
    Spacer,
    DropdownRadioMenu,
    DrawMode,
    ToolType,
    type StageProps,
    MapLayerType,
    Input,
    Button,
    IconButton,
    Text,
    Hr,
    addToast
  } from '@tableslayer/ui';
  import {
    IconHexagons,
    IconGrid4x4,
    IconPaint,
    IconPaintFilled,
    IconShadow,
    IconSelector,
    IconMap,
    IconCloudSnow,
    IconCircle,
    IconCircleFilled,
    IconSquare,
    IconLayoutGrid,
    IconSquareFilled,
    IconScreenShare,
    IconScreenShareOff
  } from '@tabler/icons-svelte';
  import chroma from 'chroma-js';
  import { writable } from 'svelte/store';
  import {
    generateGradientColors,
    to8CharHex,
    type TvResolution,
    tvResolutionOptions,
    getTvDimensions,
    selectTvResolutionOptions,
    getResolutionOption,
    getTvSizeFromPhysicalDimensions
  } from '$lib/utils';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { SelectGameSettings } from '$lib/db/gs/schema';
  import type { Thumb } from '$lib/server';
  import { createSetActiveSceneMutation, createToggleGamePauseMutation } from '$lib/queries';
  import type { SelectScene } from '$lib/db/gs/schema';
  import { IconRotateClockwise2 } from '@tabler/icons-svelte';
  import { UpdateMapImage, openFileDialog } from './';

  let {
    socketUpdate,
    handleSelectActiveControl,
    activeControl = 'none',
    stageProps = $bindable(),
    party,
    gameSession,
    selectedScene,
    activeScene,
    handleSceneFit,
    handleMapFill,
    handleMapFit,
    gameSettings
  }: {
    socketUpdate: () => void;
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeScene: SelectScene | (SelectScene & Thumb) | null;
    handleSceneFit: () => void;
    handleMapFill: () => void;
    handleMapFit: () => void;
    gameSettings: SelectGameSettings;
  } = $props();

  let gridHex = $state(to8CharHex(stageProps.grid.lineColor, stageProps.grid.opacity));
  let fogHex = $state(to8CharHex(stageProps.fogOfWar.noise.baseColor, stageProps.fogOfWar.opacity));
  let tvDiagnalSize = $state(getTvSizeFromPhysicalDimensions(stageProps.display.size.x, stageProps.display.size.y));
  let defaultSelectedResoltion = $derived(
    getResolutionOption(party.defaultDisplayResolutionX, party.defaultDisplayResolutionY)
  );

  type SceneControl = {
    id: string;
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    icon: any;
    text: string;
    mapLayer: number;
  };

  const sceneControlArray: SceneControl[] = $derived([
    {
      id: 'map',
      icon: IconMap,
      text: 'Map',
      mapLayer: MapLayerType.None
    },
    {
      id: 'fog',
      icon: IconShadow,
      text: 'Fog',
      mapLayer: MapLayerType.None
    },
    {
      id: 'weather',
      icon: IconCloudSnow,
      text: 'Weather',
      mapLayer: MapLayerType.None
    },
    {
      id: 'grid',
      icon: IconGrid4x4,
      text: 'Grid',
      mapLayer: MapLayerType.None
    },
    {
      id: 'play',
      icon: gameSettings.isPaused ? IconScreenShareOff : IconScreenShare,
      text: 'Play',
      mapLayer: MapLayerType.None
    }
  ]);

  // Ensure the handleFogColorUpdate function is typed with ColorUpdatePayload
  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    const fogColor = chroma(cd.hex).hex('rgb');
    const fogColors = generateGradientColors(fogColor);
    stageProps.fogOfWar = {
      ...stageProps.fogOfWar,
      opacity: cd.rgba.a,
      noise: {
        ...stageProps.fogOfWar.noise,
        baseColor: fogColors[0],
        fogColor1: fogColors[1],
        fogColor2: fogColors[2],
        fogColor3: fogColors[3],
        fogColor4: fogColors[4]
      }
    };
    socketUpdate();
  };

  // Ensure the handleGridColorUpdate function is also typed with ColorUpdatePayload
  const handleGridColorUpdate = (cd: ColorUpdatePayload) => {
    const gridColor = chroma(cd.hex).hex('rgb');
    stageProps.grid = {
      ...stageProps.grid,
      lineColor: gridColor,
      opacity: cd.rgba.a
    };
    socketUpdate();
  };

  const handleSelectedResolution = (selected: TvResolution) => {
    const selectedResolution = tvResolutionOptions.find((option) => option.value === selected.value)!;
    stageProps.display.resolution = {
      x: selectedResolution.width,
      y: selectedResolution.height
    };
    handleSceneFit();
    socketUpdate();
    return selectedResolution;
  };

  const handleTvSizeChange = (diagonalSize: number) => {
    console.log('update tv size');
    const { width, height } = getTvDimensions(diagonalSize);
    stageProps.display.size = {
      x: width,
      y: height
    };
    socketUpdate();
  };

  const eraseOptions = [
    {
      label: 'Freehand erase',
      value: 'eraseBrush',
      icon: IconPaint,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Erase
    },
    {
      label: 'Freehand add',
      value: 'addBrush',
      icon: IconPaintFilled,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Draw
    },
    {
      label: 'Erase rectangle',
      value: 'areaErase',
      icon: IconSquare,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Erase
    },
    {
      label: 'Add rectangle',
      value: 'areaAdd',
      icon: IconSquareFilled,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Draw
    },
    {
      label: 'Erase ellipse',
      value: 'ellipseErase',
      icon: IconCircle,
      toolType: ToolType.Ellipse,
      drawMode: DrawMode.Erase
    },
    {
      label: 'Add ellipse',
      value: 'ellipsAdd',
      icon: IconCircleFilled,
      toolType: ToolType.Ellipse,
      drawMode: DrawMode.Draw
    }
  ];

  // Set initial state based on current stageProps matching the toolType and drawMode
  let selectedFogTool = $state(
    eraseOptions.find(
      (option) => option.toolType === stageProps.fogOfWar.tool.type && option.drawMode === stageProps.fogOfWar.tool.mode
    ) || eraseOptions[0]
  );

  let selectedFogToolValue = writable(eraseOptions[0].value);

  $effect(() => {
    selectedFogTool =
      eraseOptions.find(
        (option) =>
          option.toolType === stageProps.fogOfWar.tool.type && option.drawMode === stageProps.fogOfWar.tool.mode
      ) || eraseOptions[0];
  });

  $effect(() => {
    selectedFogToolValue.set(selectedFogTool.value);
  });

  const handleSelectedFogTool = (selected: string) => {
    const selectedOption = eraseOptions.find((option) => option.value === selected)!;
    selectedFogTool = selectedOption!;
    activeControl = 'erase';
    stageProps.activeLayer = MapLayerType.FogOfWar;
    stageProps.fogOfWar.tool.type = selectedOption.toolType;
    stageProps.fogOfWar.tool.mode = selectedOption.drawMode;
    socketUpdate();
    return selectedOption.value;
  };

  const handleMapRotation = () => {
    stageProps.map.rotation = (stageProps.map.rotation + 90) % 360;
    socketUpdate();
  };

  const handleGridTypeChange = (gridType: number) => {
    console.log('grid type change', gridType);
    stageProps.grid.gridType = gridType;
    socketUpdate();
  };

  const setActiveScene = createSetActiveSceneMutation();
  const handleSetActiveScene = async () => {
    if (!selectedScene || (activeScene && selectedScene.id === activeScene.id)) return;

    const response = await $setActiveScene.mutateAsync({
      dbName: gameSession.dbName,
      sceneId: selectedScene.id,
      partyId: party.id
    });
    if (response.success == true) {
      addToast({
        data: {
          title: 'Active scene set',
          type: 'success'
        }
      });
    }
  };

  const toggleGamePause = createToggleGamePauseMutation();
  const handleToggleGamePause = async () => {
    console.log(`toggle game pause for ${gameSession.dbName}`);
    if (!selectedScene) return;
    const response = await $toggleGamePause.mutateAsync({
      dbName: gameSession.dbName,
      partyId: party.id
    });
    if (response.success == true) {
      addToast({
        data: {
          title: 'Game paused',
          type: 'success'
        }
      });
    }
    socketUpdate();
  };

  let localPadding = $state(stageProps.display.padding.x);

  $effect(() => {
    if (stageProps.display.padding.x !== localPadding) {
      localPadding = stageProps.display.padding.x;
    }
  });

  const handlePaddingChange = () => {
    stageProps.display.padding.x = localPadding;
    stageProps.display.padding.y = localPadding;
    socketUpdate();
  };

  let gridTypeLabel = $derived(stageProps.grid.gridType === 0 ? 'Square size' : 'Hex size');

  let contextSceneId = $state('');
  const handleMapImageChange = (sceneId: string) => {
    contextSceneId = sceneId;
    openFileDialog();
  };
  $effect(() => {
    gridHex = to8CharHex(stageProps.grid.lineColor, stageProps.grid.opacity);
    fogHex = to8CharHex(stageProps.fogOfWar.noise.baseColor, stageProps.fogOfWar.opacity);
    tvDiagnalSize = getTvSizeFromPhysicalDimensions(stageProps.display.size.x, stageProps.display.size.y);
  });
</script>

<!-- Usage of ColorPicker -->
{#snippet gridControls()}
  <div class="sceneControls__settingsPopover">
    <Control label="TV size">
      {#snippet content({ id })}
        <Input
          {id}
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
    </Control>
    <Control label="Resolution">
      {#snippet content({ id })}
        <Select
          ids={{ trigger: id }}
          defaultSelected={defaultSelectedResoltion}
          onSelectedChange={(selected) => handleSelectedResolution(selected.next as TvResolution)}
          options={selectTvResolutionOptions}
        />
      {/snippet}
    </Control>
  </div>
  <Spacer />
  <div class="sceneControls__settingsPopover">
    <Control label="Grid type">
      <IconButton variant="ghost" onclick={() => handleGridTypeChange(0)}>
        <Icon Icon={IconLayoutGrid} size="20px" stroke={2} />
      </IconButton>
      <IconButton variant="ghost" onclick={() => handleGridTypeChange(1)}>
        <Icon Icon={IconHexagons} size="20px" stroke={2} />
      </IconButton>
    </Control>
    <Control label={gridTypeLabel}>
      {#snippet content({ id })}
        <Input {id} type="number" min={0} step={0.25} bind:value={stageProps.grid.spacing} />
      {/snippet}
      {#snippet end()}
        in.
      {/snippet}
    </Control>
  </div>
  <Spacer />
  <div class="sceneControls__settingsPopover">
    <Control label="Line thickness">
      {#snippet end()}
        px
      {/snippet}

      {#snippet content({ id })}
        <Input {id} type="number" min={1} step={1} bind:value={stageProps.grid.lineThickness} />
      {/snippet}
    </Control>
    <Control label="Table padding">
      {#snippet content({ id })}
        <Input {id} type="number" min={0} step={1} bind:value={localPadding} oninput={handlePaddingChange} />
      {/snippet}
      {#snippet end()}
        px
      {/snippet}
    </Control>
  </div>
  <Spacer />
  <Control label="Grid Color">
    {#snippet content({ id })}
      <ColorPicker {id} bind:hex={gridHex} onUpdate={handleGridColorUpdate} />
    {/snippet}
  </Control>
  <Spacer />
{/snippet}

{#snippet fogControls()}
  <ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} />
{/snippet}

{#snippet mapControls()}
  <div class="sceneControls__mapPopover">
    <Text size="0.85rem" color="var(--fgMuted)">Maps must be under 5MB in size.</Text>
    <Spacer size={2} />
    <Button onclick={() => handleMapImageChange(selectedScene.id)}>Replace map</Button>
    <Spacer />
    <Hr />
    <Spacer />
    <div class="sceneControls__settingsPopover">
      <Control label="Scale">
        {#snippet content({ id })}
          <Input {id} type="number" bind:value={stageProps.map.zoom} />
        {/snippet}
        {#snippet start()}
          x
        {/snippet}
      </Control>
      <Control label="Rotate" class="sceneControls__rotate">
        {#snippet content({ id })}
          <Input {id} type="number" bind:value={stageProps.map.rotation} />
        {/snippet}
        {#snippet end()}
          <IconButton variant="ghost" onclick={handleMapRotation}>
            <Icon Icon={IconRotateClockwise2} />
          </IconButton>
        {/snippet}
      </Control>
    </div>
    <Spacer />
    <div class="sceneControls__settingsPopover">
      <Control label="Offset X">
        {#snippet content({ id })}
          <Input {id} type="number" bind:value={stageProps.map.offset.x} />
        {/snippet}
        {#snippet end()}
          px
        {/snippet}
      </Control>
      <Control label="Offset Y">
        {#snippet content({ id })}
          <Input {id} type="number" bind:value={stageProps.map.offset.y} />
        {/snippet}
        {#snippet end()}
          px
        {/snippet}
      </Control>
      <Button onclick={handleMapFill}>Fill in scene</Button>
      <Button onclick={handleMapFit}>Fit in scene</Button>
    </div>
    <UpdateMapImage sceneId={contextSceneId} dbName={gameSession.dbName} />
  </div>
{/snippet}
{#snippet playControls()}
  <div class="sceneControls__playPopover">
    <Button href={`/${party.slug}/${gameSession.slug}/share`} target="_blank">Open playfield</Button>
    <Spacer size={2} />
    <Text size="0.85rem" color="var(--fgMuted)"
      >This will open a new tab with the playfield. Fullscreen it on your display.</Text
    >
    <Spacer />
    <Hr />
    <Spacer />
    {#if !activeScene || selectedScene.id !== activeScene.id}
      <Button onclick={handleSetActiveScene}>Set active scene</Button>
      <Spacer size={2} />
      <Text size="0.85rem" color="var(--fgMuted)">Projects the current scene to your playfield.</Text>
      <Spacer />
      <Hr />
      <Spacer />
    {/if}
    <Button variant="danger" onclick={handleToggleGamePause}>
      {#if gameSettings.isPaused}Unpause playfield{:else}Pause playfield{/if}
    </Button>
    <Spacer size={2} />
    <Text size="0.85rem" color="var(--fgMuted)">Displays your party's pause screen instead of a scene.</Text>
  </div>
{/snippet}

<ColorMode mode="dark">
  <div class="sceneControls">
    <div class="sceneControls__item sceneControls__item--primary">
      <button
        class="sceneControls__layer {stageProps.activeLayer === MapLayerType.FogOfWar &&
          'sceneControls__layer--isActive'}"
        onclick={() => handleSelectActiveControl('erase')}
      >
        <Icon Icon={selectedFogTool.icon} size="1.5rem" />
        {selectedFogTool.label}
      </button>
      <DropdownRadioMenu
        defaultItem={eraseOptions[0]}
        items={eraseOptions}
        positioning={{ placement: 'bottom', gutter: 8 }}
        value={selectedFogToolValue}
        onValueChange={(selected) => handleSelectedFogTool(selected.next)}
      >
        {#snippet trigger()}
          <div class="sceneControls__selectorBtn">
            <Icon Icon={IconSelector} size="0.85rem" class="sceneControls__selectorIcon" />
          </div>
        {/snippet}
      </DropdownRadioMenu>
    </div>
    {#each sceneControlArray as scene}
      <div class="sceneControls__item">
        <Popover positioning={{ placement: 'bottom', gutter: 8 }}>
          {#snippet trigger()}
            <div class="sceneControls__trigger">
              <div class="sceneControls__layer {activeControl === scene.id ? 'sceneControls__layer--isActive' : ''}">
                <Icon Icon={scene.icon} size="1.5rem" stroke={2} />
                {scene.text}
              </div>
            </div>
          {/snippet}
          {#snippet content()}
            {#if scene.id === 'grid'}
              {@render gridControls()}
            {:else if scene.id === 'fog'}
              {@render fogControls()}
            {:else if scene.id === 'map'}
              {@render mapControls()}
            {:else if scene.id === 'play'}
              {@render playControls()}
            {/if}
          {/snippet}
        </Popover>
      </div>
    {/each}
  </div>
</ColorMode>

<style>
  :global {
    .light {
      --sceneControlItemBgHover: var(--primary-50);
      --sceneControlItemBorder: solid 2px var(--fg);
      --sceneControlItemBorderHover: solid 2px var(--primary-600);
    }
    .dark {
      --sceneControlItemBgHover: var(--primary-950);
      --sceneControlItemBorder: solid 2px transparent;
      --sceneControlItemBorderHover: solid 2px var(--primary-500);
    }
    .sceneControls__selectorBtn {
      display: flex;
      align-items: center;
      justify-content: space-around;
      height: 2rem;
      border-radius: var(--radius-2);
      width: 1.25rem;
      border: var(--sceneControlItemBorder);
    }

    .sceneControls__selectorBtn:hover {
      cursor: pointer;
      background: var(--sceneControlItemBgHover);
      border: var(--sceneControlItemBorderHover);
    }
    .sceneControls__selectorIcon {
      color: var(--contrastHigh);
    }
    .sceneControls__rotate .control__end {
      padding: 0;
    }
  }
  .sceneControls {
    background: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.25rem;
    width: auto;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }
  .sceneControls__item {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    font-weight: 700;
    gap: 0.125rem;
  }

  .sceneControls__item--primary {
    border-right: var(--borderThin);
    padding-right: 1rem;
  }
  .sceneControls__layer {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.125rem 0.5rem;
    border-radius: var(--radius-2);
    border: var(--sceneControlItemBorder);
    cursor: pointer;
    white-space: nowrap;
  }
  .sceneControls__layer:hover:not(.sceneControls__layer--isActive) {
    cursor: pointer;
    background: var(--sceneControlItemBgHover);
    border: var(--sceneControlItemBorderHover);
  }
  .sceneControls__layer--isActive {
    background: var(--fgPrimary);
  }
  .sceneControls__trigger {
    display: flex;
    align-items: center;
  }
  .sceneControls__settingsPopover {
    width: 16rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .sceneControls__playPopover {
    width: 16rem;
  }
  .sceneControls__mapPopover {
    max-width: 16rem;
  }
</style>
