<script lang="ts">
  import { List, Color, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { GridType, type StageProps } from '@tableslayer/ui';

  const { props = $bindable() }: { props: StageProps } = $props();
  const gridTypeOptions: ListOptions<number> = {
    Square: GridType.Square,
    Hex: GridType.Hex
  };
</script>

<Folder title="Grid" expanded={false}>
  <List bind:value={props.grid.gridType} label="Type" options={gridTypeOptions} />
  <Color bind:value={props.grid.lineColor} label="Line Color" />
  <Color bind:value={props.grid.shadowColor} label="Shadow Color" />
  <Slider bind:value={props.grid.opacity} label="Opacity" min={0} max={1} step={0.01} />
  <Slider bind:value={props.grid.lineThickness} label="Line Thickness" min={0} max={100} />
  <Slider bind:value={props.grid.spacing} label="Spacing (in)" min={0.25} max={3} step={0.25} />
  <Folder title="Drop Shadow" expanded={false}>
    <Slider bind:value={props.grid.shadowOpacity} label="Shadow Opacity" min={0} max={1} step={0.01} />
    <Slider bind:value={props.grid.shadowBlur} label="Shadow Blur" min={0} max={1} step={0.01} />
    <Slider bind:value={props.grid.shadowSpread} label="Shadow Spread" min={1} max={10} step={0.01} />
  </Folder>
</Folder>
