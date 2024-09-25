<!--
  @component Wrapper for the `Stage` component which exposes a debug UI for modifying the stage properties
-->
<script lang="ts">
  import { Color, Pane, List, Slider, Folder, type ValueChangeEvent, type ListOptions } from 'svelte-tweakpane-ui';
  import { Stage } from '../Stage';
  import type { StageProps } from '../Stage/types';
  import { GridType } from '../Stage/layers/Grid/types';
  import { LayerRotation } from '../Stage/layers/types';
  import { Vector2 } from 'three';

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
      lineThickness: 1
    }
  });

  const gridTypeOptions: ListOptions<number> = {
    Square: GridType.Square,
    Hex: GridType.Hex
  };
</script>

<div id="stage-wrapper">
  <Stage {...stageProps} />
</div>
<Pane position="draggable">
  <Folder title="Background">
    <Color bind:value={stageProps.background.color} label="Color" />
  </Folder>

  <Folder title="Grid">
    <List bind:value={stageProps.grid.type} label="Type" options={gridTypeOptions} />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.spacing} label="Spacing" min={5} max={50} />
    <Slider bind:value={stageProps.grid.offset.x} label="Offset X" min={-100} max={100} step={1} />
    <Slider bind:value={stageProps.grid.offset.y} label="Offset Y" min={-100} max={100} step={1} />
    <Slider bind:value={stageProps.grid.lineThickness} label="Line Thickness" min={0} max={2} step={0.01} />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" />
  </Folder>
</Pane>
