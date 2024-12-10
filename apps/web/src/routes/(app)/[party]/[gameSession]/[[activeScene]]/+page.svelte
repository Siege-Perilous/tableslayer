<script lang="ts">
  let { data } = $props();
  import { Stage, type StageExports, type StageProps } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { SceneControls, SceneSelector } from '$lib/components';
  import { StageDefaultProps } from '../../../../../lib/utils';
  import type { SelectScene } from '$lib/db/gs/schema';
  import type { Thumb } from '$lib/server';

  let { scenes, gameSession, activeSceneNumber, activeScene, deleteSceneForm, party } = $derived(data);

  const stageProps: StageProps = $state(StageDefaultProps);
  let stage: StageExports;

  function onMapUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.map.offset.x = offset.x;
    stageProps.map.offset.y = offset.y;
    stageProps.map.zoom = zoom;
  }

  // @ts-expect-error undefined for now
  let scenesPane: PaneAPI = $state(undefined);
  // @ts-expect-error undefined for now
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

  function onSceneUpdate(offset: { x: number; y: number }, zoom: number) {
    stageProps.scene.offset.x = offset.x;
    stageProps.scene.offset.y = offset.y;
    stageProps.scene.zoom = zoom;
  }

  function onPingsUpdated(updatedLocations: { x: number; y: number }[]) {
    stageProps.ping.locations = updatedLocations;
  }
  console.log('activeScene in page', data.activeScene);
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
        <div class="stage">
          <Stage bind:this={stage} props={stageProps} {onMapUpdate} {onSceneUpdate} {onPingsUpdated} />
        </div>
        <SceneControls {stageProps} onUpdateStage={updateStage} />
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
</style>
