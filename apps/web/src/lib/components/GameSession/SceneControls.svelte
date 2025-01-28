<script lang="ts">
  import {
    ColorMode,
    Icon,
    Popover,
    DropdownRadioMenu,
    DrawMode,
    ToolType,
    type StageProps,
    MapLayerType
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
    IconSquareFilled,
    IconScreenShare,
    IconScreenShareOff
  } from '@tabler/icons-svelte';
  import { writable } from 'svelte/store';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { SelectGameSettings } from '$lib/db/gs/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectScene } from '$lib/db/gs/schema';
  import { type ZodIssue } from 'zod';
  import { GridControls, MapControls, FogControls, PlayControls } from './';

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
    gameSettings,
    errors
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
    errors: ZodIssue[] | undefined;
  } = $props();

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
</script>

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
              <GridControls
                {stageProps}
                {socketUpdate}
                {handleSelectActiveControl}
                {activeControl}
                {party}
                {gameSession}
                {selectedScene}
                {activeScene}
                {handleSceneFit}
                {handleMapFill}
                {handleMapFit}
                {gameSettings}
                {errors}
              />
            {:else if scene.id === 'fog'}
              <FogControls {stageProps} {socketUpdate} />
            {:else if scene.id === 'map'}
              <MapControls
                {stageProps}
                {socketUpdate}
                {handleSelectActiveControl}
                {activeControl}
                {party}
                {gameSession}
                {selectedScene}
                {activeScene}
                {handleSceneFit}
                {handleMapFill}
                {handleMapFit}
                {gameSettings}
                {errors}
              />
            {:else if scene.id === 'play'}
              <PlayControls {socketUpdate} {party} {gameSession} {selectedScene} {activeScene} {gameSettings} />
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
</style>
