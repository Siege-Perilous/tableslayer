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
    Input
  } from '@tableslayer/ui';
  import {
    IconGrid4x4,
    IconLayersSelectedBottom,
    IconLayersSelected,
    IconEraser,
    IconShadow,
    IconTexture,
    IconSelector,
    IconMap,
    IconCloudSnow
  } from '@tabler/icons-svelte';

  let {
    onUpdateStage,
    stageProps
  }: { onUpdateStage: (newProps: Partial<StageProps>) => void; stageProps: StageProps } = $props();

  let activeControl = $state('none');
  let activeLayer = $state(0);
  let colorData: ColorUpdatePayload = $state({
    hex: '#000000ff',
    rgba: { r: 0, g: 0, b: 0, a: 1 },
    hsva: { h: 0, s: 0, v: 0, a: 1 },
    hsla: { h: 0, s: 0, l: 0, a: 1 }
  });
  let gridHex = $state('#ffffff80');
  let fogHex = $state('#00000080');
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

  const handleSelectActiveControl = (control: string) => {
    if (control === activeControl) {
      activeControl = 'none';
      activeLayer = MapLayerType.None;
    } else {
      activeControl = control;
      activeLayer = MapLayerType.FogOfWar;
    }
    onUpdateStage({
      scene: {
        ...stageProps.scene,
        activeLayer
      }
    });
  };

  // Ensure the handleFogColorUpdate function is typed with ColorUpdatePayload
  const handleFogColorUpdate = (cd: ColorUpdatePayload) => {
    colorData = cd;
    onUpdateStage({
      fogOfWar: {
        ...stageProps.fogOfWar,
        fogColor: colorData.hex.slice(0, -2), // Remove last two characters (opacity)
        opacity: colorData.rgba.a
      }
    });
  };

  // Ensure the handleGridColorUpdate function is also typed with ColorUpdatePayload
  const handleGridColorUpdate = (cd: ColorUpdatePayload) => {
    colorData = cd;
    gridHex = colorData.hex;
    onUpdateStage({
      grid: {
        ...stageProps.grid,
        lineColor: { r: colorData.rgba.r, g: colorData.rgba.g, b: colorData.rgba.b },
        opacity: colorData.rgba.a
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

  const calculateHorizontalInches = (diagonalSize: number) => {
    const aspectRatioWidth = 16;
    const aspectRatioHeight = 9;
    const ratioFactor = Math.sqrt(aspectRatioWidth ** 2 + aspectRatioHeight ** 2);
    const horizontalSize = (diagonalSize * aspectRatioWidth) / ratioFactor;
    return Math.floor(horizontalSize);
  };

  const handleSelectedResolution = (selected: TvResolution) => {
    const selectedResolution = tvResolutionOptions.find((option) => option.value === selected.value);
    onUpdateStage({
      scene: {
        ...stageProps.scene,
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
    const horizontalInches = calculateHorizontalInches(diagonalSize);
    onUpdateStage({
      grid: {
        ...stageProps.grid,
        divisions: horizontalInches
      }
    });
  };

  const eraseOptions = [
    {
      label: 'Erase fog',
      value: 'eraseBrush',
      icon: IconEraser,
      toolType: ToolType.RoundBrush,
      drawMode: DrawMode.Erase
    },
    { label: 'Add fog', value: 'addBrush', icon: IconTexture, toolType: ToolType.RoundBrush, drawMode: DrawMode.Draw },
    {
      label: 'Erase fog area',
      value: 'areaErase',
      icon: IconLayersSelectedBottom,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Erase
    },
    {
      label: 'Add fog area',
      value: 'areaAdd',
      icon: IconLayersSelected,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Draw
    }
  ];

  let selectedFogTool = $state(eraseOptions[0]);

  const handleSelectedFogTool = (selected: string) => {
    const selectedOption = eraseOptions.find((option) => option.value === selected);
    selectedFogTool = selectedOption;
    activeLayer = MapLayerType.FogOfWar;
    activeControl = 'erase';
    onUpdateStage({
      scene: {
        ...stageProps.scene,
        activeLayer
      },
      fogOfWar: {
        ...stageProps.fogOfWar,
        toolType: selectedOption.toolType,
        drawMode: selectedOption.drawMode
      }
    });
    return selectedOption.value;
  };

  $inspect(stageProps);
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
{/snippet}
{#snippet fogControls()}
  <ColorPicker bind:hex={fogHex} onUpdate={handleFogColorUpdate} />
{/snippet}

<ColorMode mode="dark">
  <div class="sceneControls">
    <div class="sceneControls__item sceneControls__item--primary">
      <button
        class="sceneControls__layer {activeControl === 'erase' && 'sceneControls__layer--isActive'}"
        onclick={() => handleSelectActiveControl('erase')}
      >
        <Icon Icon={selectedFogTool.icon} size="1.5rem" />
        {selectedFogTool.label}
      </button>
      <DropdownRadioMenu
        defaultItem={eraseOptions[0]}
        items={eraseOptions}
        positioning={{ placement: 'bottom', gutter: 8 }}
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
  }
  .sceneControls__layer:hover:not(.sceneControls__layer--isActive) {
    cursor: pointer;
    background: var(--sceneControlItemBgHover);
    border: var(--sceneControlItemBorderHover);
  }
  .sceneControls__layer--isActive {
    background: var(--fgPrimary);
  }
  .sceneControls__settings {
    display: flex;
    padding: 0 0.25rem 0 0.5rem;
    align-items: center;
    justify-content: center;
    border-left: var(--borderThin);
    height: 2rem;
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
