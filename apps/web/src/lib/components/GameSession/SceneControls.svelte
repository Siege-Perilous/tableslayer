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
    ToolTip
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
    IconPokerChip,
    IconPencil,
    IconRuler
  } from '@tabler/icons-svelte';
  import type { SelectGameSession, SelectParty } from '$lib/db/app/schema';
  import type { Thumb } from '$lib/server';
  import type { SelectScene } from '$lib/db/app/schema';
  import { type ZodIssue } from 'zod';
  import {
    GridControls,
    EffectsControls,
    WeatherControls,
    EdgeControls,
    MapControls,
    FogControls,
    PlayControls,
    MeasurementControls
  } from './';
  import { usePartyData } from '$lib/utils/yjs/stores';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
    socketUpdate,
    handleSelectActiveControl,
    activeControl = 'none',
    stageProps,
    stage,
    party,
    gameSession,
    selectedScene,
    activeSceneId,
    handleMapFill,
    handleMapFit,
    errors,
    partyData,
    keyboardPopoverId = null
  }: {
    socketUpdate: () => void;
    handleSelectActiveControl: (control: string) => string | null;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors: ZodIssue[] | undefined;
    stage: StageExports;
    partyData: ReturnType<typeof usePartyData> | null;
    keyboardPopoverId?: string | null;
  } = $props();

  type SceneControl = {
    id: string;
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    icon: any;
    text: string;
    tooltip: string;
    mapLayer: number;
  };

  const sceneControlArray: SceneControl[] = [
    {
      id: 'map',
      icon: IconMap,
      text: 'Map',
      tooltip: 'Change the map, scale, and position',
      mapLayer: MapLayerType.None
    },
    {
      id: 'fog',
      icon: IconShadow,
      text: 'Fog',
      tooltip: 'Adjust fog of war color and opacity',
      mapLayer: MapLayerType.None
    },
    {
      id: 'weather',
      icon: IconCloudSnow,
      text: 'Weather',
      tooltip: 'Add weather effects to the scene',
      mapLayer: MapLayerType.None
    },
    {
      id: 'grid',
      icon: IconGrid4x4,
      text: 'Grid',
      tooltip: 'Adjust the grid settings and TV size',
      mapLayer: MapLayerType.None
    },
    {
      id: 'edge',
      icon: IconBorderSides,
      text: 'Edge',
      tooltip: 'Add edge effects along the border of the scene',
      mapLayer: MapLayerType.None
    },
    {
      id: 'effects',
      icon: IconAdjustmentsHorizontal,
      text: 'Effects',
      tooltip: 'Change the mood with color and visual effects',
      mapLayer: MapLayerType.None
    },
    {
      id: 'play',
      icon: IconScreenShare,
      text: 'Play',
      tooltip: "Open or pause the player's view",
      mapLayer: MapLayerType.None
    }
  ];

  const eraseOptions = [
    {
      label: 'Erase brush',
      value: 'eraseBrush',
      icon: IconPaint,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Erase,
      tooltip: 'Erase fog from the map with a brush',
      key: 'E'
    },
    {
      label: 'Add brush',
      value: 'addBrush',
      icon: IconPaintFilled,
      toolType: ToolType.Brush,
      drawMode: DrawMode.Draw,
      tooltip: 'Add fog to the map with a brush',
      key: `Shift+E`
    },
    {
      label: 'Erase rectangle',
      value: 'areaErase',
      icon: IconSquare,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Erase,
      tooltip: 'Erase fog from the map with a rectangle',
      key: 'R'
    },
    {
      label: 'Add rectangle',
      value: 'areaAdd',
      icon: IconSquareFilled,
      toolType: ToolType.Rectangle,
      drawMode: DrawMode.Draw,
      tooltip: 'Add fog to the map with a rectangle',
      key: 'Shift+R'
    },
    {
      label: 'Erase ellipse',
      value: 'ellipseErase',
      icon: IconCircle,
      toolType: ToolType.Ellipse,
      drawMode: DrawMode.Erase,
      tooltip: 'Erase fog from the map with an ellipse',
      key: 'O'
    },
    {
      label: 'Add ellipse',
      value: 'ellipsAdd',
      icon: IconCircleFilled,
      toolType: ToolType.Ellipse,
      drawMode: DrawMode.Draw,
      tooltip: 'Add fog to the map with an ellipse',
      key: 'Shift+O'
    }
  ];

  // Derive selected fog tool from stageProps - this will reactively update when keyboard shortcuts change the tool
  const selectedFogTool = $derived(
    eraseOptions.find(
      (option) => option.toolType === stageProps.fogOfWar.tool.type && option.drawMode === stageProps.fogOfWar.tool.mode
    ) || eraseOptions[0]
  );

  const handleSelectedFogTool = (selected: string) => {
    const selectedOption = eraseOptions.find((option) => option.value === selected)!;
    activeControl = 'erase';
    queuePropertyUpdate(stageProps, ['activeLayer'], MapLayerType.FogOfWar, 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], selectedOption.toolType, 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], selectedOption.drawMode, 'control');
  };

  // Track which popover is currently open
  let openPopoverId = $state<string | null>(null);

  // React to keyboard-triggered popover changes
  $effect(() => {
    if (keyboardPopoverId !== undefined) {
      openPopoverId = keyboardPopoverId;
    }
  });

  // Also react to activeControl changes to close popovers when tools are activated
  $effect(() => {
    if (['erase', 'marker', 'annotation', 'measurement'].includes(activeControl)) {
      openPopoverId = null;
    }
  });

  // Handle popover close from outside click - sync activeControl with popover state
  const handlePopoverOpenChange = (sceneId: string) => (open: boolean) => {
    if (!open && activeControl === sceneId) {
      activeControl = 'none';
    }
    if (!open && openPopoverId === sceneId) {
      openPopoverId = null;
    }
  };
</script>

<ColorMode mode="dark">
  <div class="sceneControls">
    <div class="sceneControls__item sceneControls__item--primary">
      <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
        {#snippet children()}
          <button
            class="sceneControls__layer {stageProps.activeLayer === MapLayerType.FogOfWar &&
              'sceneControls__layer--isActive'}"
            onclick={() => {
              const newPopoverId = handleSelectActiveControl('erase');
              openPopoverId = newPopoverId;
            }}
          >
            <Icon Icon={selectedFogTool.icon} size="1.5rem" />
          </button>
        {/snippet}
        {#snippet toolTipContent()}
          {selectedFogTool.tooltip}
        {/snippet}
      </ToolTip>
      <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
        {#snippet children()}
          <SelectorMenu
            selected={selectedFogTool.value}
            options={eraseOptions}
            positioning={{ placement: 'bottom', offset: 8 }}
            onSelectedChange={(selected) => handleSelectedFogTool(selected)}
          ></SelectorMenu>
        {/snippet}
        {#snippet toolTipContent()}
          Change the tool used to erase or add fog
        {/snippet}
      </ToolTip>

      <!-- Measurement controls with integrated selector -->
      <div class="sceneControls__item">
        <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
          {#snippet children()}
            <button
              class="sceneControls__layer {stageProps.activeLayer === MapLayerType.Measurement &&
                'sceneControls__layer--isActive'}"
              onclick={() => {
                const newPopoverId = handleSelectActiveControl('measurement');
                openPopoverId = newPopoverId;
              }}
            >
              <Icon Icon={IconRuler} size="1.5rem" stroke={2} />
            </button>
          {/snippet}
          {#snippet toolTipContent()}
            Measure distances and angles on the map.
          {/snippet}
        </ToolTip>
        <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
          {#snippet children()}
            <MeasurementControls
              {stageProps}
              {party}
              {gameSession}
              {selectedScene}
              onSelectedChange={() => handleSelectActiveControl('measurement')}
            />
          {/snippet}
          {#snippet toolTipContent()}
            Change the measurement method
          {/snippet}
        </ToolTip>
      </div>
    </div>
    <div class="sceneControls__item sceneControls__item--marker">
      <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
        {#snippet children()}
          <button
            class="sceneControls__layer {stageProps.activeLayer === MapLayerType.Marker &&
              'sceneControls__layer--isActive'}"
            onclick={() => {
              const newPopoverId = handleSelectActiveControl('marker');
              openPopoverId = newPopoverId;
            }}
          >
            <Icon Icon={IconPokerChip} size="1.5rem" />
            <span class="sceneControls__layerText">Marker</span>
          </button>
        {/snippet}
        {#snippet toolTipContent()}
          Place markers to note points of interest on the map with notes.
        {/snippet}
      </ToolTip>
    </div>
    <div class="sceneControls__item sceneControls__item--annotation">
      <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
        {#snippet children()}
          <button
            class="sceneControls__layer {stageProps.activeLayer === MapLayerType.Annotation &&
              'sceneControls__layer--isActive'}"
            onclick={() => {
              const newPopoverId = handleSelectActiveControl('annotation');
              openPopoverId = newPopoverId;
            }}
          >
            <Icon Icon={IconPencil} size="1.5rem" />
            <span class="sceneControls__layerText">Draw</span>
          </button>
        {/snippet}
        {#snippet toolTipContent()}
          Draw freehand annotations on the map
        {/snippet}
      </ToolTip>
    </div>
    {#each sceneControlArray as scene}
      <!-- Regular popover controls for other tools -->
      <div class="sceneControls__item">
        <Popover
          positioning={{ placement: 'bottom', gutter: 8 }}
          isOpen={openPopoverId === scene.id}
          onIsOpenChange={handlePopoverOpenChange(scene.id)}
        >
          {#snippet trigger()}
            <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
              {#snippet children()}
                <div class="sceneControls__trigger">
                  <div
                    role="button"
                    tabindex="0"
                    class="sceneControls__layer {openPopoverId === scene.id ? 'sceneControls__layer--isActive' : ''}"
                    onclick={() => {
                      // Toggle popover: if open, close it; if closed, open it
                      if (openPopoverId === scene.id) {
                        openPopoverId = null;
                        activeControl = 'none';
                      } else {
                        openPopoverId = scene.id;
                        activeControl = scene.id;
                      }
                    }}
                    onkeydown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (openPopoverId === scene.id) {
                          openPopoverId = null;
                          activeControl = 'none';
                        } else {
                          openPopoverId = scene.id;
                          activeControl = scene.id;
                        }
                      }
                    }}
                  >
                    <Icon
                      Icon={scene.id === 'play'
                        ? party.gameSessionIsPaused
                          ? IconScreenShareOff
                          : IconScreenShare
                        : scene.icon}
                      size="1.5rem"
                      stroke={2}
                      class="sceneControls__layerBtn"
                    />
                    <span class="sceneControls__layerText">
                      {scene.text}
                    </span>
                  </div>
                </div>
              {/snippet}
              {#snippet toolTipContent()}
                {scene.tooltip}
              {/snippet}
            </ToolTip>
          {/snippet}
          {#snippet content()}
            {#if scene.id === 'grid'}
              <GridControls
                {stageProps}
                {handleSelectActiveControl}
                {activeControl}
                {party}
                {gameSession}
                {stage}
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
                {stageProps}
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
              <PlayControls {party} {selectedScene} {activeSceneId} {partyData} />
            {:else if scene.id === 'weather'}
              <WeatherControls {stageProps} {errors} />
            {:else if scene.id === 'edge'}
              <EdgeControls {stageProps} {errors} {party} />
            {:else if scene.id === 'effects'}
              <EffectsControls {stageProps} {errors} {party} />
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
      cursor: pointer;
    }

    .sceneControls__selectorBtn:hover {
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

  @container stageWrapper (max-width: 1060px) {
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
