<script lang="ts">
  import { List, Slider, Button, Folder, type ListOptions, Separator } from 'svelte-tweakpane-ui';
  import type { StageProps, StageExports } from '@tableslayer/ui';

  let { props = $bindable(), stage } = $props<{
    props: StageProps;
    stage: StageExports;
  }>();

  const mapOptions: ListOptions<string> = {
    'Map 1': 'https://files.tableslayer.com/maps/01.jpeg',
    'Map 2': 'https://files.tableslayer.com/maps/02.jpeg',
    'Map 3': 'https://files.tableslayer.com/maps/03.jpeg',
    'Map 4': 'https://files.tableslayer.com/maps/04.jpeg',
    'Map 5': 'https://files.tableslayer.com/maps/05.jpeg',
    'Map 6': 'https://files.tableslayer.com/maps/06.jpeg',
    'Map 7': 'https://files.tableslayer.com/maps/07.jpeg',
    'Map 8': 'https://files.tableslayer.com/maps/08.jpeg',
    'Map 9': 'https://files.tableslayer.com/maps/09.jpeg',
    'Map 10': 'https://files.tableslayer.com/maps/10.jpeg',
    'Map 11': 'https://files.tableslayer.com/maps/11.jpeg',
    'Map 12': 'https://files.tableslayer.com/maps/12.jpeg'
  };

  // svelte-ignore state_referenced_locally
  let mapUrl = $state(props.map.url);

  function updateMapUrl() {
    props.map.url = mapUrl;
    // Reset fog of war data and ping locations
    props.fogOfWar.url = null;
    props.marker.markers = [];
  }
</script>

<Folder title="Map" expanded={false}>
  <List bind:value={mapUrl} label="Map" options={mapOptions} />
  <Button on:click={() => updateMapUrl()} title="Load" />
  <Separator />
  <Slider bind:value={props.map.rotation} label="Rotation" min={0} max={360} step={1} />
  <Button on:click={() => (props.map.offset = { x: 0, y: 0 })} title="Center" />
  <Button on:click={() => stage?.map.fill()} title="Fill" />
  <Button on:click={() => stage?.map.fit()} title="Fit" />
</Folder>
