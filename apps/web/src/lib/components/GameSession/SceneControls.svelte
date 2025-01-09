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
    Button
  } from '@tableslayer/ui';
  import {
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
    IconSquareFilled
  } from '@tabler/icons-svelte';
  import chroma from 'chroma-js';
  import { writable } from 'svelte/store';

  let {
    onUpdateStage,
    handleSelectActiveControl,
    activeControl = 'none',
    stageProps
  }: {
    onUpdateStage: (newProps: Partial<StageProps>) => void;
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
  } = $props();

  let gridHex = $state(stageProps.grid.lineColor);
  let fogHex = $state(stageProps.fogOfWar.fogColor);
  let tvDiagnalSize = $state(40);

  type SceneControl = {
    id: string;
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    icon: any;
    text: string;
    mapLayer: number;
  };

  const sceneControlArray: SceneControl[] = [
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
    }
  ];

  // Ensure the handleFogColorUpdate function is typed with ColorUpdatePayload
  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    const fogColor = chroma(cd.hex).hex('rgb');
    onUpdateStage({
      fogOfWar: {
        ...stageProps.fogOfWar,
        fogColor: fogColor,
        opacity: cd.rgba.a
      }
    });
  };

  // Ensure the handleGridColorUpdate function is also typed with ColorUpdatePayload
  const handleGridColorUpdate = (cd: ColorUpdatePayload) => {
    const gridColor = chroma(cd.hex).hex('rgb');
    onUpdateStage({
      grid: {
        ...stageProps.grid,
        lineColor: gridColor,
        opacity: cd.rgba.a
      }
    });
  };

  type TvResolution = {
    label: string;
    value: string;
    width: number;
    height: number;
  };

  const tvResolutionOptions = [
    { label: '720p', value: '720p', width: 1280, height: 720 },
    { label: '1080p', value: '1080p', width: 1920, height: 1080 },
    { label: '1440p', value: '1440p', width: 2560, height: 1440 },
    { label: '4K', value: '4K', width: 3840, height: 2160 }
  ];
  const selectTvResolutionOptions = tvResolutionOptions.map(({ label, value }) => ({ label, value }));

  const getTvDimensions = (
    diagonalInches: number,
    aspectRatio: { width: number; height: number } = { width: 16, height: 9 }
  ): { width: number; height: number } => {
    const { width: aspectRatioWidth, height: aspectRatioHeight } = aspectRatio;
    // Calculate the diagonal factor using the Pythagorean theorem
    const diagonalFactor = Math.sqrt(aspectRatioWidth ** 2 + aspectRatioHeight ** 2);
    // Calculate height and width
    const height = (diagonalInches * aspectRatioHeight) / diagonalFactor;
    const width = (diagonalInches * aspectRatioWidth) / diagonalFactor;
    return { width, height };
  };

  const handleSelectedResolution = (selected: TvResolution) => {
    const selectedResolution = tvResolutionOptions.find((option) => option.value === selected.value)!;
    onUpdateStage({
      display: {
        ...stageProps.display,
        resolution: {
          x: selectedResolution.width,
          y: selectedResolution.height
        }
      }
    });
    return selectedResolution;
  };

  const handleTvSizeChange = (diagonalSize: number) => {
    console.log('update tv size');
    const { width, height } = getTvDimensions(diagonalSize);
    onUpdateStage({
      display: {
        ...stageProps.display,
        size: {
          x: width,
          y: height
        }
      }
    });
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
      (option) => option.toolType === stageProps.fogOfWar.toolType && option.drawMode === stageProps.fogOfWar.drawMode
    ) || eraseOptions[0]
  );

  let selectedFogToolValue = writable(eraseOptions[0].value);

  $effect(() => {
    selectedFogTool =
      eraseOptions.find(
        (option) => option.toolType === stageProps.fogOfWar.toolType && option.drawMode === stageProps.fogOfWar.drawMode
      ) || eraseOptions[0];
  });

  $effect(() => {
    selectedFogToolValue.set(selectedFogTool.value);
  });

  const handleSelectedFogTool = (selected: string) => {
    const selectedOption = eraseOptions.find((option) => option.value === selected)!;
    selectedFogTool = selectedOption!;
    activeControl = 'erase';
    onUpdateStage({
      activeLayer: MapLayerType.FogOfWar,
      scene: {
        ...stageProps.scene
      },
      fogOfWar: {
        ...stageProps.fogOfWar,
        toolType: selectedOption.toolType,
        drawMode: selectedOption.drawMode
      }
    });
    return selectedOption.value;
  };

  const handleMapRotation = () => {
    onUpdateStage({
      map: {
        ...stageProps.map,
        rotation: stageProps.map.rotation + 90
      }
    });
  };
</script>

<!-- Usage of ColorPicker -->
{#snippet gridControls()}
  <div class="sceneControls__settingsPopover">
    <Control label="TV size">
      <Input
        type="number"
        min={10}
        step={1}
        bind:value={tvDiagnalSize}
        oninput={() => handleTvSizeChange(tvDiagnalSize)}
      />
      {#snippet end()}
        in.
      {/snippet}
    </Control>
    <Control label="Resolution">
      <Select
        onSelectedChange={(selected) => handleSelectedResolution(selected.next as TvResolution)}
        options={selectTvResolutionOptions}
      />
    </Control>
  </div>
  <Spacer />
  <Control label="Grid Color">
    <ColorPicker bind:hex={gridHex} onUpdate={handleGridColorUpdate} />
  </Control>
  <Spacer />
  <Control label="Grid thickness">
    <Input type="number" min={1} step={1} bind:value={stageProps.grid.lineThickness} />
  </Control>
{/snippet}

{#snippet fogControls()}
  <ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} />
{/snippet}

{#snippet mapControls()}
  <Button>Fit map</Button>
  <Button onclick={handleMapRotation}>Rotate map</Button>
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
</style>
