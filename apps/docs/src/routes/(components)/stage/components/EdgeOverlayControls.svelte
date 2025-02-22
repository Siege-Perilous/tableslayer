<script lang="ts">
  import { List, Slider, Folder, type ListOptions } from 'svelte-tweakpane-ui';
  import frostImageUrl from './overlays/frost.png?url';
  import heatImageUrl from './overlays/heat.png?url';
  import type { StageProps } from '@tableslayer/ui';

  const { props = $bindable() }: { props: StageProps } = $props();

  const edgeOverlayOptions: ListOptions<string> = {
    Frost: frostImageUrl,
    Heat: heatImageUrl
  };
</script>

<Folder title="Edge Overlay" expanded={false}>
  <List bind:value={props.edgeOverlay.enabled} label="Enabled" options={{ Yes: true, No: false }} />
  <List bind:value={props.edgeOverlay.url} label="URL" options={edgeOverlayOptions} />
  <Slider bind:value={props.edgeOverlay.opacity} label="Opacity" min={0} max={1} step={0.01} />
  <Slider bind:value={props.edgeOverlay.scale} label="Scale" min={1} max={100} step={1} />
  <Slider bind:value={props.edgeOverlay.fadeStart} label="Fade Start" min={0} max={1} step={0.01} />
  <Slider bind:value={props.edgeOverlay.fadeEnd} label="Fade End" min={0} max={1} step={0.01} />
</Folder>
