<script lang="ts">
  import { List, Color, Slider, Folder } from 'svelte-tweakpane-ui';
  import type { StageProps } from '@tableslayer/ui';

  const { props = $bindable() }: { props: StageProps } = $props();
</script>

<Folder title="Fog" expanded={false}>
  <List bind:value={props.fog.enabled} label="Enabled" options={{ Yes: true, No: false }} />
  <Color bind:value={props.fog.color} label="Color" />
  <Slider bind:value={props.fog.opacity} label="Opacity" min={0} max={1} step={0.01} />
  <Slider bind:value={props.fog.speed} label="Speed" min={0} max={1} step={0.01} />
  <Slider bind:value={props.fog.persistence} label="Persistence" min={0} max={1} step={0.01} />
  <Slider bind:value={props.fog.lacunarity} label="Lacunarity" min={0} max={4} step={0.01} />
  <Slider bind:value={props.fog.frequency} label="Frequency" min={0.1} max={2} />
  <Slider bind:value={props.fog.amplitude} label="Amplitude" min={0} max={2} />
  <Slider bind:value={props.fog.offset} label="Offset" min={-1} max={1} step={0.01} />
  <Slider bind:value={props.fog.levels} label="Levels" min={0} max={8} step={1} />
</Folder>
