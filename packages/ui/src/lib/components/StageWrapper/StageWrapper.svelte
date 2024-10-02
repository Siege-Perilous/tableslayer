<!--
  @component Wrapper for the `Stage` component which exposes a debug UI for modifying the stage properties
-->
<script lang="ts">
  import { Color, Pane, List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { Stage } from '../Stage';
  import type { StageProps } from '../Stage/types';
  import { GridType } from '../Stage/layers/Grid/types';

  let stageProps: StageProps = $state({
    background: {
      color: '#505050'
    },
    grid: {
      gridType: GridType.Square,
      opacity: 1,
      spacing: 50,
      offset: { x: 0, y: 0 },
      lineColor: { r: 230, g: 230, b: 230, a: 1 },
      lineThickness: 2,
      shadowIntensity: 0.7,
      shadowColor: { r: 0, g: 0, b: 0, a: 1 },
      shadowSize: 1.2
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
    <List bind:value={stageProps.grid.gridType} label="Type" options={gridTypeOptions} />
    <Slider bind:value={stageProps.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.spacing} label="Spacing" min={5} max={500} />
    <Slider bind:value={stageProps.grid.offset.x} label="Offset X" min={0} max={1} />
    <Slider bind:value={stageProps.grid.offset.y} label="Offset Y" min={0} max={1} />
    <Slider bind:value={stageProps.grid.lineThickness} label="Line Thickness" min={1} max={20} step={0.01} />
    <Color bind:value={stageProps.grid.lineColor} label="Line Color" />
    <Slider bind:value={stageProps.grid.shadowIntensity} label="Shadow Intensity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.shadowSize} label="Shadow Size" min={1} max={5} step={0.01} />
    <Color bind:value={stageProps.grid.shadowColor} label="Shadow Color" />
  </Folder>
</Pane>
