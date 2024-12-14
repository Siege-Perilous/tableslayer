<script lang="ts">
  let { data } = $props();
  import {
    Stage,
    type StageExports,
    type StageProps,
    DrawMode,
    ToolType,
    MapLayerType,
    PingEditMode
  } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { SceneControls, SceneSelector } from '$lib/components';
  import { StageDefaultProps, buildSceneProps } from '$lib/utils';
  import type { SelectScene } from '$lib/db/gs/schema';
  import type { Thumb } from '$lib/server';
  import { onMount } from 'svelte';
  import classNames from 'classnames';

  let { scenes, gameSession, activeSceneNumber, activeScene, deleteSceneForm, party } = $derived(data);

  let stageProps: StageProps = $state(buildSceneProps(data.activeScene));
  let stageElement: HTMLDivElement | undefined = $state();
  let activeControl = $state('none');

  const handleSelectActiveControl = (control: string) => {
    if (control === activeControl) {
      activeControl = 'none';
      stageProps.activeLayer = MapLayerType.None;
    } else {
      activeControl = control;
      stageProps.activeLayer = MapLayerType.FogOfWar;
    }
  };

  const minZoom = 0.1;
  const maxZoom = 10;
  const zoomSensitivity = 0.0005;

  $effect(() => {
    stageProps = buildSceneProps(data.activeScene);
    stageIsLoading = true;

    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        stage.scene.fit();
        clearInterval(interval);
      }
    }, 50);
  });
  let stage: StageExports;

  let scenesPane: PaneAPI = $state(undefined);
  let controlsPane: PaneAPI = $state(undefined);
  let isScenesCollapsed = $state(false);
  let isControlsCollapsed = $state(false);

  const handleToggleScenes = () => {
    if (isScenesCollapsed) {
      scenesPane.expand();
    } else {
      scenesPane.collapse();
    }
  };
  const handleToggleControls = () => {
    if (isControlsCollapsed) {
      controlsPane.expand();
    } else {
      controlsPane.collapse();
    }
  };

  const hasThumb = (scene: SelectScene | (SelectScene & Thumb)) => {
    return 'thumb' in scene;
  };

  $effect(() => {
    if (activeScene && hasThumb(activeScene) && activeScene.thumb) {
      stageProps.map.url = `${activeScene.thumb.resizedUrl}?cors=1`;
    } else {
      // You can clear or reset the map URL here when there's no thumb
      stageProps.map.url = StageDefaultProps.map.url;
    }
  });

  const updateStage = (newProps: Partial<StageProps>) => {
    Object.assign(stageProps, newProps);
  };

  function onBrushSizeUpdated(brushSize: number) {
    stageProps.fogOfWar.brushSize = brushSize;
  }

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.map.offset.x = offset.x;
    stageProps.map.offset.y = offset.y;
    stageProps.map.zoom = zoom;
  }

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.scene.offset.x = offset.x;
    stageProps.scene.offset.y = offset.y;
    stageProps.scene.zoom = zoom;
  }

  function onPingsUpdated(updatedLocations: { x: number; y: number }[]) {
    stageProps.ping.locations = updatedLocations;
  }

  function onMouseMove(e: MouseEvent) {
    if (!(e.buttons === 1 || e.buttons === 2)) return;

    if (e.shiftKey) {
      stageProps.map.offset.x += e.movementX / stageProps.scene.zoom;
      stageProps.map.offset.y -= e.movementY / stageProps.scene.zoom;
    } else if (e.ctrlKey) {
      stageProps.scene.offset.x += e.movementX;
      stageProps.scene.offset.y -= e.movementY;
    }
  }

  function onWheel(e: WheelEvent) {
    let scrollDelta;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      scrollDelta = e.deltaX * zoomSensitivity;
    } else {
      scrollDelta = e.deltaY * zoomSensitivity;
    }

    if (e.shiftKey) {
      stageProps.map.zoom = Math.max(minZoom, Math.min(stageProps.map.zoom - scrollDelta, maxZoom));
    } else if (e.ctrlKey) {
      e.preventDefault();
      stageProps.scene.zoom = Math.max(minZoom, Math.min(stageProps.scene.zoom - scrollDelta, maxZoom));
    }
  }

  let stageIsLoading = $state(true);
  onMount(() => {
    const interval = setInterval(() => {
      if (stage) {
        stageIsLoading = false;
        stage.scene.fit();
        clearInterval(interval);
      }
    }, 50);

    if (stageElement) {
      stageElement.addEventListener('mousemove', onMouseMove);
      stageElement.addEventListener('wheel', onWheel, { passive: false });

      stageElement.addEventListener(
        'contextmenu',
        function (e) {
          e.preventDefault();
        },
        false
      );
    }
    document.addEventListener('keydown', (event) => {
      const { activeLayer, fogOfWar, ping } = stageProps;

      switch (event.key) {
        case 'e':
          if (
            activeLayer === MapLayerType.FogOfWar &&
            fogOfWar.drawMode === DrawMode.Erase &&
            fogOfWar.toolType === ToolType.RoundBrush
          ) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.FogOfWar;
            fogOfWar.drawMode = DrawMode.Erase;
            fogOfWar.toolType = ToolType.RoundBrush;
            activeControl = 'erase';
          }
          break;

        case 'E':
          if (
            activeLayer === MapLayerType.FogOfWar &&
            fogOfWar.drawMode === DrawMode.Draw &&
            fogOfWar.toolType === ToolType.RoundBrush
          ) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.FogOfWar;
            fogOfWar.drawMode = DrawMode.Draw;
            fogOfWar.toolType = ToolType.RoundBrush;
          }
          break;

        case 'f':
          stage.fogOfWar.clear();
          break;

        case 'F':
          stage.fogOfWar.reset();
          break;

        case 'o':
          if (
            activeLayer === MapLayerType.FogOfWar &&
            fogOfWar.drawMode === DrawMode.Erase &&
            fogOfWar.toolType === ToolType.Ellipse
          ) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.FogOfWar;
            fogOfWar.drawMode = DrawMode.Erase;
            fogOfWar.toolType = ToolType.Ellipse;
          }
          break;

        case 'O':
          if (
            activeLayer === MapLayerType.FogOfWar &&
            fogOfWar.drawMode === DrawMode.Draw &&
            fogOfWar.toolType === ToolType.Ellipse
          ) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.FogOfWar;
            fogOfWar.drawMode = DrawMode.Draw;
            fogOfWar.toolType = ToolType.Ellipse;
          }
          break;

        case 'p':
          if (activeLayer === MapLayerType.Ping && ping.editMode === PingEditMode.Remove) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.Ping;
            ping.editMode = PingEditMode.Remove;
          }
          break;

        case 'P':
          if (activeLayer === MapLayerType.Ping && ping.editMode === PingEditMode.Add) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.Ping;
            ping.editMode = PingEditMode.Add;
          }
          break;

        case 'r':
          if (
            activeLayer === MapLayerType.FogOfWar &&
            fogOfWar.drawMode === DrawMode.Erase &&
            fogOfWar.toolType === ToolType.Rectangle
          ) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.FogOfWar;
            fogOfWar.drawMode = DrawMode.Erase;
            fogOfWar.toolType = ToolType.Rectangle;
          }
          break;

        case 'R':
          if (
            activeLayer === MapLayerType.FogOfWar &&
            fogOfWar.drawMode === DrawMode.Draw &&
            fogOfWar.toolType === ToolType.Rectangle
          ) {
            stageProps.activeLayer = MapLayerType.None;
          } else {
            stageProps.activeLayer = MapLayerType.FogOfWar;
            fogOfWar.drawMode = DrawMode.Draw;
            fogOfWar.toolType = ToolType.Rectangle;
          }
          break;

        case 'Escape':
          stageProps.activeLayer = MapLayerType.None;
          break;
      }
    });
  });
  let stageClasses = $derived(classNames('stage', { 'stage--loading': stageIsLoading }));
</script>

<div class="container">
  <PaneGroup direction="horizontal">
    <Pane
      defaultSize={15}
      collapsible={true}
      collapsedSize={0}
      minSize={15}
      bind:pane={scenesPane}
      onCollapse={() => (isScenesCollapsed = true)}
      onExpand={() => (isScenesCollapsed = false)}
    >
      <SceneSelector
        {deleteSceneForm}
        {activeSceneNumber}
        {gameSession}
        {scenes}
        {party}
        createSceneForm={data.createSceneForm}
      />
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle resizer__hander--left"
        aria-label="Collapse scenes column"
        onclick={handleToggleScenes}
      ></button>
    </PaneResizer>
    <Pane defaultSize={70}>
      <div class="stageWrapper">
        <div class={stageClasses} bind:this={stageElement}>
          <Stage
            bind:this={stage}
            props={stageProps}
            {onBrushSizeUpdated}
            {onMapUpdate}
            {onSceneUpdate}
            {onPingsUpdated}
          />
        </div>
        <SceneControls {stageProps} {handleSelectActiveControl} {activeControl} onUpdateStage={updateStage} />
      </div>
    </Pane>
    <PaneResizer class="resizer">
      <button
        class="resizer__handle resizer__hander--right"
        aria-label="Collapse controls column"
        onclick={handleToggleControls}
      ></button>
    </PaneResizer>
    <Pane
      defaultSize={15}
      class="controls"
      collapsible={true}
      collapsedSize={0}
      bind:pane={controlsPane}
      onCollapse={() => (isControlsCollapsed = true)}
      onExpand={() => (isControlsCollapsed = false)}
    ></Pane>
  </PaneGroup>
</div>

<style>
  :global {
    .panel.scene {
      aspect-ratio: 16 / 9;
    }
    .stageWrapper {
      display: flex;
      align-items: center;
      background: var(--contrastEmpty);
      height: 100%;
      position: relative;
    }
    .resizer {
      position: relative;
      display: flex;
      width: 0.5rem;
      z-index: 2;
      background: var(--contrastEmpty);
    }
    .resizer__handle {
      width: 100%;
      height: 2rem;
      cursor: col-resize;
      background: var(--contrastMedium);
      margin-top: 1rem;
      cursor: pointer;
    }
    .resizer__handle--left {
      position: relative;
      transform: translateX(-0.25rem);
    }
    .resizer__handle--right {
      position: relative;
      transform: translateX(0.25rem);
    }
    .controls {
      border-left: var(--borderThin);
      background: var(--bg);
    }
  }
  .container {
    height: calc(100vh - 49px);
  }
  .stage {
    width: 100%;
    height: 100%;
  }
  .stage--loading {
    visibility: hidden;
  }
</style>
