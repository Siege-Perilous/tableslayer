<script lang="ts">
  import { ColorMode, Icon, Popover, SelectorMenu, ToolTip } from '@tableslayer/ui';
  import { DrawMode, ToolType, type StageProps, MapLayerType, type StageExports } from '@tableslayer/stage';
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
    IconDots,
    IconPokerChip,
    IconPencil,
    IconPolygon,
    IconRuler,
    IconFlame
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
  import type { SessionDocClient } from '$lib/realtime';
  import { queuePropertyUpdate } from '$lib/utils';

  let {
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
    errors = undefined,
    client,
    isCompact = false,
    onFogClear
  }: {
    handleSelectActiveControl: (control: string, opts?: { toggle?: boolean }) => void;
    activeControl: string;
    stageProps: StageProps;
    party: SelectParty & Thumb;
    gameSession: SelectGameSession;
    selectedScene: SelectScene | (SelectScene & Thumb);
    activeSceneId: string | undefined;
    handleMapFill: () => void;
    handleMapFit: () => void;
    errors?: ZodIssue[] | undefined;
    stage: StageExports;
    client: SessionDocClient | null;
    isCompact?: boolean;
    onFogClear?: () => void;
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

  // Play stays visible on compact toolbars; the rest collapse into the overflow menu
  const popoverControls = sceneControlArray.filter((scene) => scene.id !== 'play');
  const playControl = sceneControlArray.find((scene) => scene.id === 'play')!;

  const drawingOverflowItems = [
    { id: 'marker', icon: IconPokerChip, text: 'Marker', testId: 'markerToolButton' },
    { id: 'annotation', icon: IconPencil, text: 'Draw', testId: undefined },
    { id: 'light', icon: IconFlame, text: 'Light', testId: 'lightToolButton' }
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
    },
    {
      label: 'Fog room',
      value: 'fogRoom',
      icon: IconPolygon,
      toolType: ToolType.Polygon,
      drawMode: DrawMode.Draw,
      tooltip:
        'Click to outline a fog room. Enter commits, right-click toggles a room, Delete while hovering removes it',
      key: 'P'
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
    handleSelectActiveControl('erase', { toggle: false });
    queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'type'], selectedOption.toolType, 'control');
    queuePropertyUpdate(stageProps, ['fogOfWar', 'tool', 'mode'], selectedOption.drawMode, 'control');
  };

  // activeControl (owned by the page) is the single source of truth: button
  // highlights and popover visibility all derive from it
  const handleToolPopoverChange = (id: string) => (open: boolean) => {
    if (open !== (activeControl === id)) handleSelectActiveControl(id);
  };

  // Overflow menu: overflowListOpen only tracks whether the list view is
  // showing; an active popover tool keeps the popover open in controls view
  let overflowListOpen = $state(false);
  const overflowToolActive = $derived(popoverControls.some((scene) => scene.id === activeControl));
  const overflowAnyActive = $derived(
    overflowToolActive || drawingOverflowItems.some((item) => item.id === activeControl)
  );

  const handleOverflowOpenChange = (open: boolean) => {
    if (open) {
      overflowListOpen = true;
    } else {
      overflowListOpen = false;
      if (overflowToolActive) handleSelectActiveControl(activeControl);
    }
  };

  // Popover tools reopen on the next task: the popover must close and remount
  // so floating-ui measures the controls view (it only positions on open), and
  // the reopen must happen after the click event so the popover's global
  // outside-click handler doesn't see the detached list item and self-close
  const handleOverflowItemSelect = (id: string) => {
    overflowListOpen = false;
    const isPopoverTool = popoverControls.some((scene) => scene.id === id);
    if (isPopoverTool && activeControl !== id) {
      setTimeout(() => handleSelectActiveControl(id), 0);
    } else {
      handleSelectActiveControl(id);
    }
  };
</script>

{#snippet toolControls(controlId: string)}
  {#if controlId === 'grid'}
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
  {:else if controlId === 'fog'}
    <FogControls {stage} {stageProps} {onFogClear} />
  {:else if controlId === 'map'}
    <MapControls
      {stage}
      {stageProps}
      {handleSelectActiveControl}
      {activeControl}
      {party}
      {selectedScene}
      {activeSceneId}
      {handleMapFill}
      {handleMapFit}
      {errors}
      {client}
    />
  {:else if controlId === 'weather'}
    <WeatherControls {stageProps} {errors} />
  {:else if controlId === 'edge'}
    <EdgeControls {stageProps} {errors} {party} />
  {:else if controlId === 'effects'}
    <EffectsControls {stageProps} {errors} {party} />
  {/if}
{/snippet}

{#snippet overflowItem(id: string, ItemIcon: typeof IconMap, text: string, testId: string | undefined)}
  <button
    data-testid={testId}
    class="sceneControls__layer sceneControls__layer--overflow {activeControl === id
      ? 'sceneControls__layer--isActive'
      : ''}"
    onclick={() => handleOverflowItemSelect(id)}
  >
    <Icon Icon={ItemIcon} size="1.5rem" />
    <span class="sceneControls__overflowLabel">{text}</span>
  </button>
{/snippet}

<ColorMode mode="dark">
  <div class="sceneControls">
    <div class="sceneControls__item sceneControls__item--primary">
      <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
        {#snippet children()}
          <button
            class="sceneControls__layer {activeControl === 'erase' ? 'sceneControls__layer--isActive' : ''}"
            onclick={() => handleSelectActiveControl('erase')}
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
              class="sceneControls__layer {activeControl === 'measurement' ? 'sceneControls__layer--isActive' : ''}"
              onclick={() => handleSelectActiveControl('measurement')}
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
              onSelectedChange={() => handleSelectActiveControl('measurement', { toggle: false })}
            />
          {/snippet}
          {#snippet toolTipContent()}
            Change the measurement method
          {/snippet}
        </ToolTip>
      </div>
    </div>
    {#if !isCompact}
      <div class="sceneControls__item sceneControls__item--marker">
        <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
          {#snippet children()}
            <button
              data-testid="markerToolButton"
              class="sceneControls__layer {activeControl === 'marker' ? 'sceneControls__layer--isActive' : ''}"
              onclick={() => handleSelectActiveControl('marker')}
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
              class="sceneControls__layer {activeControl === 'annotation' ? 'sceneControls__layer--isActive' : ''}"
              onclick={() => handleSelectActiveControl('annotation')}
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
      <div class="sceneControls__item sceneControls__item--light">
        <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
          {#snippet children()}
            <button
              data-testid="lightToolButton"
              class="sceneControls__layer {activeControl === 'light' ? 'sceneControls__layer--isActive' : ''}"
              onclick={() => handleSelectActiveControl('light')}
            >
              <Icon Icon={IconFlame} size="1.5rem" />
              <span class="sceneControls__layerText">Light</span>
            </button>
          {/snippet}
          {#snippet toolTipContent()}
            Place light sources on the map for atmospheric effects.
          {/snippet}
        </ToolTip>
      </div>
      {#each popoverControls as scene}
        <div class="sceneControls__item">
          <Popover
            positioning={{ placement: 'bottom', gutter: 8 }}
            isOpen={activeControl === scene.id}
            onIsOpenChange={handleToolPopoverChange(scene.id)}
          >
            {#snippet trigger()}
              <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
                {#snippet children()}
                  <div class="sceneControls__trigger">
                    <div
                      class="sceneControls__layer {activeControl === scene.id ? 'sceneControls__layer--isActive' : ''}"
                    >
                      <Icon Icon={scene.icon} size="1.5rem" stroke={2} class="sceneControls__layerBtn" />
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
              {@render toolControls(scene.id)}
            {/snippet}
          </Popover>
        </div>
      {/each}
    {:else}
      <div class="sceneControls__item sceneControls__item--overflow">
        <Popover
          positioning={{ placement: 'bottom', gutter: 8 }}
          isOpen={overflowListOpen || overflowToolActive}
          onIsOpenChange={handleOverflowOpenChange}
        >
          {#snippet trigger()}
            <div class="sceneControls__trigger">
              <div
                data-testid="sceneControlsOverflowButton"
                class="sceneControls__layer {overflowAnyActive ? 'sceneControls__layer--isActive' : ''}"
              >
                <Icon Icon={IconDots} size="1.5rem" stroke={2} />
              </div>
            </div>
          {/snippet}
          {#snippet content()}
            {#if overflowToolActive && !overflowListOpen}
              {@render toolControls(activeControl)}
            {:else}
              <div class="sceneControls__overflowList">
                {#each drawingOverflowItems as item}
                  {@render overflowItem(item.id, item.icon, item.text, item.testId)}
                {/each}
                {#each popoverControls as scene}
                  {@render overflowItem(scene.id, scene.icon, scene.text, undefined)}
                {/each}
              </div>
            {/if}
          {/snippet}
        </Popover>
      </div>
    {/if}
    <div class="sceneControls__item">
      <Popover
        positioning={{ placement: 'bottom', gutter: 8 }}
        isOpen={activeControl === playControl.id}
        onIsOpenChange={handleToolPopoverChange(playControl.id)}
      >
        {#snippet trigger()}
          <ToolTip positioning={{ placement: 'bottom' }} openDelay={500} closeOnPointerDown disableHoverableContent>
            {#snippet children()}
              <div class="sceneControls__trigger">
                <div
                  class="sceneControls__layer {activeControl === playControl.id
                    ? 'sceneControls__layer--isActive'
                    : ''}"
                >
                  <Icon
                    Icon={party.gameSessionIsPaused ? IconScreenShareOff : IconScreenShare}
                    size="1.5rem"
                    stroke={2}
                    class="sceneControls__layerBtn"
                  />
                  <span class="sceneControls__layerText">
                    {playControl.text}
                  </span>
                </div>
              </div>
            {/snippet}
            {#snippet toolTipContent()}
              {playControl.tooltip}
            {/snippet}
          </ToolTip>
        {/snippet}
        {#snippet content()}
          <PlayControls {party} {selectedScene} {activeSceneId} {client} />
        {/snippet}
      </Popover>
    </div>
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
    z-index: 2;
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
  /* Tool controls panels are taller than a phone viewport; keep them scrollable */
  .sceneControls__item--overflow :global(.popContent) {
    max-height: 50dvh;
    overflow-y: auto;
  }
  .sceneControls__overflowList {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 10rem;
  }
  .sceneControls__layer--overflow {
    width: 100%;
    font-size: 0.85rem;
    font-weight: 700;
  }
  .sceneControls__overflowLabel {
    white-space: nowrap;
  }

  @container stageWrapper (max-width: 1120px) {
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
