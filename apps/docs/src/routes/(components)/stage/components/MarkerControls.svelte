<script lang="ts">
  import { Color, Slider, Folder, Text, Separator } from 'svelte-tweakpane-ui';
  import type { StageProps } from '@tableslayer/ui';

  let { props = $bindable() } = $props<{ props: StageProps }>();
</script>

<Folder title="Marker" expanded={false}>
  <Color bind:value={props.marker.color} label="Color" />
  <Slider bind:value={props.marker.markerSize} label="Marker Size" min={1} max={500} step={1} />
  <Slider bind:value={props.marker.thickness} label="Thickness" min={0} max={1} />
  <Slider bind:value={props.marker.sharpness} label="Edge Sharpness" min={0} max={1} />
  <Slider bind:value={props.marker.pulseAmplitude} label="Pulse Amplitude" min={0} max={1} step={0.01} />
  <Slider bind:value={props.marker.pulseSpeed} label="Pulse Speed" min={0} max={5} step={0.01} />

  <Separator />

  {#each props.marker.markers as marker}
    <Folder title={marker.name}>
      <Text bind:value={marker.id} label="Id" disabled={true} />
      <Slider bind:value={marker.position.x} label="X" />
      <Slider bind:value={marker.position.y} label="Y" />
    </Folder>
  {/each}
</Folder>
