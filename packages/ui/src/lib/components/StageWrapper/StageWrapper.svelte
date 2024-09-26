<!--
  @component Wrapper for the `Stage` component which exposes a debug UI for modifying the stage properties
-->
<script lang="ts">
  import { Color, Pane, List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { Stage } from '../Stage';
  import type { StageProps } from '../Stage/types';
  import { GridType } from '../Stage/layers/Grid/types';
  import { LayerRotation } from '../Stage/layers/types';

  let stageProps: StageProps = $state({
    background: {
      color: { value: '#ff0000' },
      enabled: true,
      offset: { x: 0, y: 0 },
      rotation: LayerRotation.None,
      scale: 1.0
    },
    grid: {
      gridType: { value: GridType.Square },
      opacity: { value: 1 },
      spacing: { value: 200 },
      offset: { value: { x: 0, y: 0 } },
      lineColor: { value: { r: 230, g: 230, b: 230, a: 1 } },
      lineThickness: { value: 5 },
      shadowIntensity: { value: 0.7 },
      shadowColor: { value: { r: 0, g: 0, b: 0, a: 1 } },
      shadowSize: { value: 1.2 }
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
    <Color bind:value={stageProps.background.color.value} label="Color" />
  </Folder>

  <Folder title="Grid">
    <List bind:value={stageProps.grid.gridType.value} label="Type" options={gridTypeOptions} />
    <Slider bind:value={stageProps.grid.opacity.value} label="Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.spacing.value} label="Spacing" min={5} max={500} />
    <Slider bind:value={stageProps.grid.offset.value.x} label="Offset X" min={-100} max={100} step={1} />
    <Slider bind:value={stageProps.grid.offset.value.y} label="Offset Y" min={-100} max={100} step={1} />
    <Slider bind:value={stageProps.grid.lineThickness.value} label="Line Thickness" min={1} max={20} step={0.01} />
    <!-- Use on:change callback here since this is modifying the color object directly which Svelte doesn't like -->
    <Color bind:value={stageProps.grid.lineColor.value} label="Line Color" />
    <Slider bind:value={stageProps.grid.shadowIntensity.value} label="Shadow Intensity" min={0} max={1} step={0.01} />
    <Slider bind:value={stageProps.grid.shadowSize.value} label="Shadow Size" min={1} max={5} step={0.01} />
    <!-- Use on:change callback here since this is modifying the color object directly which Svelte doesn't like -->
    <Color bind:value={stageProps.grid.shadowColor.value} label="Shadow Color" />
  </Folder>
</Pane>
