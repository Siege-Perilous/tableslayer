<script lang="ts">
  //  let { data } = $props();
  //  const { gameSession } = $derived(data);
  import { Stage, type StageProps } from '@tableslayer/ui';
  import { PaneGroup, Pane, PaneResizer, type PaneAPI } from 'paneforge';
  import { SceneControls, SceneSelector } from '$lib/components';
  import { StageDefaultProps } from '../../../../lib/utils';

  let stage;
  const stageProps: StageProps = $state(StageDefaultProps);

  // @ts-expect-error undefined for now
  let scenesPane: PaneAPI = $state(undefined);
  // @ts-expect-error undefined for now
  let controlsPane: PaneAPI = $state(undefined);
  let isScenesCollapsed = $state(false);
  let isControlsCollapsed = $state(false);

  const handleToggleScenes = () => {
    if (isScenesCollapsed) {
      console.log('expand scenes');
      scenesPane.expand();
    } else {
      console.log('collapse scenes');
      scenesPane.collapse();
    }
  };
  const handleToggleControls = () => {
    console.log('handleToggleControls');
    if (isControlsCollapsed) {
      controlsPane.expand();
    } else {
      controlsPane.collapse();
    }
  };

  function onPan(dx: number, dy: number) {
    stageProps.scene.offset.x += dx;
    stageProps.scene.offset.y += dy;
  }

  function onZoom(dy: number) {
    stageProps.scene.zoom += dy;
    stageProps.scene.zoom = Math.max(
      stageProps.scene.minZoom,
      Math.min(stageProps.scene.zoom, stageProps.scene.maxZoom)
    );
  }
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
      <SceneSelector />
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
          <Stage bind:this={stage} props={stageProps} onpan={onPan} onzoom={onZoom} />
        </div>
        <SceneControls />
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
    max-width: calc(100% - 64px);
    margin: auto;
    aspect-ratio: 16 / 9;
  }
</style>
