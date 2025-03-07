<script lang="ts">
  import { List, Color, Slider, Button, Binding, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import { DrawMode, ToolType, type StageExports, type StageProps } from '@tableslayer/ui';

  const { props = $bindable(), stage }: { props: StageProps; stage: StageExports } = $props();

  const drawModeOptions: ListOptions<number> = {
    Eraser: DrawMode.Erase,
    Draw: DrawMode.Draw
  };

  const toolTypeOptions: ListOptions<number> = {
    Brush: ToolType.Brush,
    Rectangle: ToolType.Rectangle,
    Ellipse: ToolType.Ellipse
  };
</script>

<Folder title="Fog of War" expanded={false}>
  <List bind:value={props.fogOfWar.tool.type} label="Tool" options={toolTypeOptions} />
  <List bind:value={props.fogOfWar.tool.mode} label="Draw Mode" options={drawModeOptions} />
  <Slider
    bind:value={props.fogOfWar.tool.size}
    label="Brush Size"
    min={1}
    max={500}
    step={1}
    disabled={props.fogOfWar.tool.type !== ToolType.Brush}
  />

  <Slider bind:value={props.fogOfWar.opacity} label="Opacity" min={0} max={1} step={0.01} />

  <Folder title="Outline" expanded={false}>
    <Color bind:value={props.fogOfWar.outline.color} label="Color" />
    <Slider bind:value={props.fogOfWar.outline.thickness} label="Thickness" min={0} max={100} step={1} />
    <Slider bind:value={props.fogOfWar.outline.opacity} label="Opacity" min={0} max={1} step={0.01} />
  </Folder>

  <Folder title="Edge" expanded={false}>
    <Slider bind:value={props.fogOfWar.edge.minMipMapLevel} label="Min Mip Map Level" min={0} max={10} step={1} />
    <Slider bind:value={props.fogOfWar.edge.maxMipMapLevel} label="Max Mip Map Level" min={0} max={10} step={1} />
    <Binding bind:object={props.fogOfWar.edge} key={'frequency'} label="Frequency" />
    <Binding bind:object={props.fogOfWar.edge} key={'amplitude'} label="Amplitude" />
    <Slider bind:value={props.fogOfWar.edge.offset} label="Offset" min={0} max={2} step={0.01} />
    <Slider bind:value={props.fogOfWar.edge.speed} label="Speed" min={0} max={1} step={0.01} />
  </Folder>

  <Folder title="Noise" expanded={false}>
    <Color bind:value={props.fogOfWar.noise.baseColor} label="Base Color" />
    <Color bind:value={props.fogOfWar.noise.fogColor1} label="Color 1" />
    <Color bind:value={props.fogOfWar.noise.fogColor2} label="Color 2" />
    <Color bind:value={props.fogOfWar.noise.fogColor3} label="Color 3" />
    <Color bind:value={props.fogOfWar.noise.fogColor4} label="Color 4" />
    <Binding bind:object={props.fogOfWar.noise} key={'speed'} label="Fog Speed" />
    <Binding bind:object={props.fogOfWar.noise} key={'frequency'} label="Frequency" />
    <Binding bind:object={props.fogOfWar.noise} key={'offset'} label="Offset" />
    <Binding bind:object={props.fogOfWar.noise} key={'amplitude'} label="Amplitude" />
    <Binding bind:object={props.fogOfWar.noise} key={'persistence'} label="Persistence" />
    <Binding bind:object={props.fogOfWar.noise} key={'lacunarity'} label="Lacunarity" />
    <Binding bind:object={props.fogOfWar.noise} key={'levels'} label="Levels" />
  </Folder>
  <Button on:click={() => stage?.fogOfWar.reset()} title="Reset Fog Of War" />
  <Button on:click={() => stage?.fogOfWar.clear()} title="Clear Fog Of War" />
  <Button
    on:click={async () => {
      const blob = await stage?.fogOfWar.toPng();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fog-of-war.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    }}
    title="Export PNG"
  />
</Folder>
