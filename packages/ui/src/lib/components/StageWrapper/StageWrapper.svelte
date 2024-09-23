<!--
  @component Wrapper for the `Stage` component which exposes a debug UI for modifying the stage properties
-->
<script lang="ts">
  import { Color, Pane, List, Slider, Folder, type ValueChangeEvent, type ListOptions } from 'svelte-tweakpane-ui';
  import Stage from '../Stage/Stage.svelte';
  import type { StageProps } from '../Stage/types';
  import { LayerRotation } from '../Stage/effects/enums';
  import { Vector2 } from 'three';
  import { GridType } from '../Stage/effects/GridPass';

  let stageProps: StageProps = $state({
    background: {
      color: '#ff0000',
      enabled: true,
      offset: { x: 0, y: 0 },
      rotation: LayerRotation.None,
      scale: 1.0
    },
    grid: {
      type: GridType.Square,
      opacity: 1,
      spacing: 10,
      offset: new Vector2(5, 5),
      lineColor: '0xffffff',
      lineThickness: 0.2
    }
  });

  const gridTypeOptions: ListOptions<number> = {
    Square: GridType.Square,
    Hex: GridType.Hex
  };

  let stage: Stage;

  function onUpdate() {
    stage.updateProps(stageProps);
  }
</script>

<div id="stage-wrapper">
  <Stage {...stageProps} bind:this={stage} />
</div>
<Pane position="draggable">
  <Folder title="Background">
    <Color bind:value={stageProps.background.color} label="Color" />
  </Folder>

  <Folder title="Grid">
    <List bind:value={stageProps.grid.type} label="Type" options={gridTypeOptions} on:change={onUpdate} />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} on:change={onUpdate} />
    <Slider bind:value={stageProps.grid.spacing} label="Spacing" min={5} max={50} on:change={onUpdate} />
    <Slider bind:value={stageProps.grid.offset.x} label="Offset X" min={-100} max={100} step={1} on:change={onUpdate} />
    <Slider bind:value={stageProps.grid.offset.y} label="Offset Y" min={-100} max={100} step={1} on:change={onUpdate} />
    <Slider
      bind:value={stageProps.grid.lineThickness}
      label="Line Thickness"
      min={0}
      max={1}
      step={0.01}
      on:change={onUpdate}
    />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" on:change={onUpdate} />
  </Folder>
</Pane>
