<script lang="ts">
  import {
    ColorMode,
    Icon,
    Popover,
    DrawMode,
    ToolType,
    type StageProps,
    MapLayerType,
    SelectorMenu,
    type StageExports,
    InputSlider,
    FormControl,
    Hr,
    Spacer
  } from '@tableslayer/ui';
  import {
    IconGrid4x4,
    IconPaint,
    IconPaintFilled,
    IconShadow,
    IconMap,
    IconCloudSnow,
    IconCircle,
    IconCircleFilled,
    IconSquare,
    IconSquareFilled,
    IconScreenShare,
    IconScreenShareOff,
    IconBorderSides,
    IconAdjustmentsHorizontal,
    IconPokerChip
  } from '@tabler/icons-svelte';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectScene } from '$lib/db/app/schema';
  import { type $ZodIssue } from 'zod/v4/core';
  import {
    GridControls,
    EffectsControls,
    WeatherControls,
    EdgeControls,
    MapControls,
    FogControls,
    PlayControls
  } from './';
  import { usePartyData } from '$lib/utils/yjs/stores';

  let {
    socketUpdate,
    handleSelectActiveControl,
    activeControl = 'none',
    stageProps = $bindable(),
    stage,
    party,
    gameSession,
    selectedScene,
    activeSceneId,
    handleMapFill,
    handleMapFit,
    errors,
    partyData
  }: {
    socketUpdate: () => void;
    handleSelectActiveControl: (control: string) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: $ZodIssue[] | undefined;
    stage: StageExports;
    partyData: ReturnType<typeof usePartyData> | null;
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
      id: 'edge',
      icon: IconBorderSides,
      text: 'Edge',
      mapLayer: MapLayerType.None
    },
    {
      id: 'effects',
      icon: IconAdjustmentsHorizontal,
      text: 'Effects',
      mapLayer: MapLayerType.None
    },
    {
      id: 'play',
      icon: gameSession.isPaused ? IconScreenShareOff : IconScreenShare,
      text: 'Play',
      mapLayer: MapLayerType.None
    }
  ]);

  const eraseOptions = [
    {
      label: 'Erase brush',
      value: 'eraseBrush',
      icon: IconPaint,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Erase,
      key: 'E'
    },
    {
      label: 'Add brush',
      value: 'addBrush',
      icon: IconPaintFilled,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Draw,
      key: `Shift+E`
    },
    {
      label: 'Erase rectangle',
      value: 'areaErase',
      icon: IconSquare,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Erase,
      key: 'R'
    },
    {
      label: 'Add rectangle',
      value: 'areaAdd',
      icon: IconSquareFilled,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Draw,
      key: 'Shift+R'
    },
    {
      label: 'Erase ellipse',
      value: 'ellipseErase',
      icon: IconCircle,
      toolType: ToolType.Ellipse,
      drawMode: DrawMode.Erase,
      key: 'O'
    },
    {
      label: 'Add ellipse',
      value: 'ellipsAdd',
      icon: IconCircleFilled,
      toolType: ToolType.Ellipse,
      drawMode: DrawMode.Draw,
      key: 'Shift+O'
    }
  ];

  // Set initial state based on current stageProps matching the toolType and drawMode
  let selectedFogTool = $state(
    eraseOptions.find(
      (option) => option.toolType === stageProps.fogOfWar.tool.type && option.drawMode === stageProps.fogOfWar.tool.mode
    ) || eraseOptions[0]
  );

  $effect(() => {
    selectedFogTool =
      eraseOptions.find(
        (option) =>
          option.toolType === stageProps.fogOfWar.tool.type && option.drawMode === stageProps.fogOfWar.tool.mode
      ) || eraseOptions[0];
  });

  const handleSelectedFogTool = (selected: string) => {
    const selectedOption = eraseOptions.find((option) => option.value === selected)!;
    selectedFogTool = selectedOption!;
    activeControl = 'erase';
    stageProps.activeLayer = MapLayerType.FogOfWar;
    stageProps.fogOfWar.tool.type = selectedOption.toolType;
    stageProps.fogOfWar.tool.mode = selectedOption.drawMode;
    socketUpdate();
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
      </button>
      <SelectorMenu
        selected={selectedFogTool.value}
        options={eraseOptions}
        positioning={{ placement: 'bottom', offset: 8 }}
        onSelectedChange={(selected) => handleSelectedFogTool(selected)}
      >
        {#snippet footer()}
          <Spacer />
          <Hr />
          <div class="sceneControls__eraserFooter">
            <FormControl label="Eraser brush size" name="brushSize">
              {#snippet input(inputProps)}
                <InputSlider {...inputProps} bind:value={stageProps.fogOfWar.tool.size} min={50} max={300} step={1} />
              {/snippet}
            </FormControl>
          </div>
        {/snippet}
      </SelectorMenu>
    </div>
    <div class="sceneControls__item sceneControls__item--marker">
      <button
        class="sceneControls__layer {stageProps.activeLayer === MapLayerType.Marker &&
          'sceneControls__layer--isActive'}"
        onclick={() => handleSelectActiveControl('marker')}
      >
        <Icon Icon={IconPokerChip} size="1.5rem" />
        <span class="sceneControls__layerText">Marker</span>
      </button>
    </div>
    {#each sceneControlArray as scene}
      <div class="sceneControls__item">
        <Popover positioning={{ placement: 'bottom', gutter: 8 }}>
          {#snippet trigger()}
            <div class="sceneControls__trigger">
              <div class="sceneControls__layer {activeControl === scene.id ? 'sceneControls__layer--isActive' : ''}">
                <Icon Icon={scene.icon} size="1.5rem" stroke={2} class="sceneControls__layerBtn" />
                <span class="sceneControls__layerText">
                  {scene.text}
                </span>
              </div>
            </div>
          {/snippet}
          {#snippet content()}
            {#if scene.id === 'grid'}
              <GridControls
                bind:stageProps
                {handleSelectActiveControl}
                {activeControl}
                {party}
                {gameSession}
                {selectedScene}
                {activeSceneId}
                {handleMapFill}
                {handleMapFit}
                {errors}
              />
            {:else if scene.id === 'fog'}
              <FogControls {stage} {stageProps} {socketUpdate} />
            {:else if scene.id === 'map'}
              <MapControls
                bind:stageProps
                {socketUpdate}
                {handleSelectActiveControl}
                {activeControl}
                {party}
                {selectedScene}
                {activeSceneId}
                {handleMapFill}
                {handleMapFit}
                {errors}
                {partyData}
              />
            {:else if scene.id === 'play'}
              <PlayControls {socketUpdate} {party} {gameSession} {selectedScene} {activeSceneId} {partyData} />
            {:else if scene.id === 'weather'}
              <WeatherControls bind:stageProps {errors} />
            {:else if scene.id === 'edge'}
              <EdgeControls bind:stageProps {socketUpdate} {errors} {party} />
            {:else if scene.id === 'effects'}
              <EffectsControls bind:stageProps {errors} {party} />
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

  .sceneControls__eraserFooter {
    padding: 1rem 1rem 0.5rem 1rem;
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

  @container stageWrapper (max-width: 840px) {
    .sceneControls {
      gap: 0.25rem !important;
    }
    .sceneControls__item--primary {
      padding-right: 0.25rem !important;
    }
    .sceneControls__layerText {
      display: none;
    }
  }
</style>
