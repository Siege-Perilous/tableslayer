<script lang="ts">
  import { Color, Slider, Folder, Text, List, type ListOptions } from 'svelte-tweakpane-ui';
  import type { Marker, StageProps } from '@tableslayer/ui';
  import { MarkerShape, MarkerSize, MarkerVisibility } from '@tableslayer/ui';

  import imgDruid from './tokens/druid.png';
  import imgElf from './tokens/elf.png';
  import imgGnome from './tokens/gnome.png';
  import imgWitch from './tokens/witch.png';

  let { props = $bindable(), selectedMarker = $bindable() } = $props<{
    props: StageProps;
    selectedMarker: Marker | undefined;
  }>();

  const markerSizeOptions: ListOptions<MarkerSize> = [
    { text: 'Small', value: MarkerSize.Small },
    { text: 'Medium', value: MarkerSize.Medium },
    { text: 'Large', value: MarkerSize.Large }
  ];

  // Define available shape options
  const shapeOptions: ListOptions<MarkerShape> = [
    { text: 'None', value: MarkerShape.None },
    { text: 'Circle', value: MarkerShape.Circle },
    { text: 'Square', value: MarkerShape.Square },
    { text: 'Triangle', value: MarkerShape.Triangle }
  ];

  const imageOptions: ListOptions<string | null> = [
    { text: 'None', value: null },
    { text: 'Druid', value: imgDruid },
    { text: 'Elf', value: imgElf },
    { text: 'Gnome', value: imgGnome },
    { text: 'Witch', value: imgWitch }
  ];

  const visibilityOptions: ListOptions<MarkerVisibility> = [
    { text: 'Always', value: MarkerVisibility.Always },
    { text: 'DM', value: MarkerVisibility.DM },
    { text: 'Player', value: MarkerVisibility.Player }
  ];
</script>

<Folder title="Marker" expanded={false}>
  <List bind:value={props.marker.visible} label="Visible" options={{ Yes: true, No: false }} />
  <List bind:value={props.marker.snapToGrid} label="Snap to Grid" options={{ Yes: true, No: false }} />

  <Folder title="Shape" expanded={true}>
    <Color bind:value={props.marker.shape.strokeColor} label="Shape Stroke Color" />
    <Slider bind:value={props.marker.shape.strokeWidth} label="Shape Stroke Width" min={0} max={64} step={1} />
  </Folder>

  <Folder title="Text" expanded={true}>
    <Color bind:value={props.marker.text.color} label="Text Color" />
    <Slider bind:value={props.marker.text.size} label="Text Size" min={1} max={1000} step={1} />
    <Slider bind:value={props.marker.text.strokeWidth} label="Text Stroke Width" min={0} max={1} step={0.1} />
    <Color bind:value={props.marker.text.strokeColor} label="Text Stroke Color" />
  </Folder>

  <Folder title="Selected Marker" expanded={true}>
    {#if selectedMarker}
      <Text bind:value={selectedMarker.id} label="Id" disabled={true} />
      <List bind:value={selectedMarker.visibility} label="Visibility" options={visibilityOptions} />
      <Text bind:value={selectedMarker.name} label="Name" />
      <List bind:value={selectedMarker.size} label="Size" options={markerSizeOptions} />
      <List bind:value={selectedMarker.shape} label="Shape" options={shapeOptions} />
      <Color bind:value={selectedMarker.shapeColor} label="Shape Color" />
      <Text bind:value={selectedMarker.text} label="Text" />
      <List bind:value={selectedMarker.imageUrl} label="Image" options={imageOptions} />
      <Slider bind:value={selectedMarker.imageScale} label="Image Scale" min={0.1} max={10} />
    {/if}
  </Folder>
  <Folder title="Markers" expanded={true}>
    {#each props.marker.markers as marker}
      <Folder title={marker.name} expanded={false}>
        <Text bind:value={marker.id} label="Id" disabled={true} />
        <List bind:value={marker.visibility} label="Visibility" options={visibilityOptions} />
        <Text bind:value={marker.name} label="Name" />
        <List bind:value={marker.size} label="Size" options={markerSizeOptions} />
        <List bind:value={marker.shape} label="Shape" options={shapeOptions} />
        <Color bind:value={marker.shapeColor} label="Shape Color" />
        <Text bind:value={marker.text} label="Text" />
        <List bind:value={marker.imageUrl} label="Image" options={imageOptions} />
        <Slider bind:value={marker.imageScale} label="Image Scale" min={0.1} max={10} />
      </Folder>
    {/each}
  </Folder>
</Folder>
