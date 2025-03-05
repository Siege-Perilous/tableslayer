<script lang="ts">
  import { Color, Slider, Folder, Text, Separator, List, type ListOptions } from 'svelte-tweakpane-ui';
  import type { StageProps } from '@tableslayer/ui';
  import { MarkerShape } from '@tableslayer/ui';

  import imgDruid from './tokens/druid.png';
  import imgElf from './tokens/elf.png';
  import imgGnome from './tokens/gnome.png';
  import imgWitch from './tokens/witch.png';

  let { props = $bindable() } = $props<{ props: StageProps }>();

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
</script>

<Folder title="Marker" expanded={false}>
  <Slider bind:value={props.marker.size} label="Size" min={10} max={500} step={1} />

  <Folder title="Shape" expanded={true}>
    <Color bind:value={props.marker.shape.strokeColor} label="Shape Stroke Color" />
    <Slider bind:value={props.marker.shape.strokeWidth} label="Shape Stroke Width" min={0} max={1} step={0.01} />
  </Folder>

  <Folder title="Text" expanded={true}>
    <Color bind:value={props.marker.text.color} label="Text Color" />
    <Slider bind:value={props.marker.text.size} label="Text Size" min={1} max={1000} step={1} />
    <Slider bind:value={props.marker.text.strokeWidth} label="Text Stroke Width" min={0} max={1} step={0.1} />
    <Color bind:value={props.marker.text.strokeColor} label="Text Stroke Color" />
  </Folder>

  <Folder title="Markers" expanded={true}>
    {#each props.marker.markers as marker}
      <Folder title={marker.text} expanded={false}>
        <Text bind:value={marker.id} label="Id" disabled={true} />
        <Text bind:value={marker.text} label="Text" />
        <List bind:value={marker.shape} label="Shape" options={shapeOptions} />
        <Slider bind:value={marker.position.x} label="X" min={0} max={1} step={0.01} />
        <Slider bind:value={marker.position.y} label="Y" min={0} max={1} step={0.01} />
        <Color bind:value={marker.shapeColor} label="Shape Color" />
        <List bind:value={marker.imageUrl} label="Image" options={imageOptions} />
        <Slider bind:value={marker.imageScale} label="Image Scale" min={0.1} max={10} />
      </Folder>
    {/each}
  </Folder>
</Folder>
