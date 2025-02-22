<script lang="ts">
  import { Folder, Slider } from 'svelte-tweakpane-ui';
  import type { StageProps } from '@tableslayer/ui';

  const { props = $bindable() }: { props: StageProps } = $props();
</script>

<Folder title="Display" expanded={false}>
  <Slider bind:value={props.display.size.x} label="Width (in)" />
  <Slider bind:value={props.display.size.y} label="Height (in)" />
  <Slider bind:value={props.display.resolution.x} label="Resolution (X)" />
  <Slider bind:value={props.display.resolution.y} label="Resolution (Y)" />
  <Slider bind:value={props.display.padding.x} label="Padding (X)" min={0} />
  <Slider bind:value={props.display.padding.y} label="Padding (Y)" min={0} />
</Folder>
