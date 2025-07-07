<script lang="ts">
  import { Color, Folder, Text, List, Button, type ListOptions, Slider } from 'svelte-tweakpane-ui';
  import type { AnnotationLayerData, StageProps, StageExports } from '@tableslayer/ui';
  import { StageMode } from '@tableslayer/ui';

  let { props = $bindable(), stage } = $props<{
    props: StageProps;
    stage: StageExports;
  }>();

  const visibilityOptions: ListOptions<StageMode> = [
    { text: 'DM', value: StageMode.DM },
    { text: 'Player', value: StageMode.Player }
  ];

  function addLayer() {
    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    const newLayer: AnnotationLayerData = {
      id: `layer-${Date.now()}`,
      name: 'New Layer',
      color: randomColor,
      url: '',
      visibility: StageMode.DM,
      opacity: 1
    };
    props.annotations.layers = [...props.annotations.layers, newLayer];
    props.annotations.activeLayer = newLayer.id;
  }

  function setActiveLayer(layerId: string) {
    props.annotations.activeLayer = layerId;
  }

  function deleteLayer(layerId: string) {
    props.annotations.layers = props.annotations.layers.filter((layer: AnnotationLayerData) => layer.id !== layerId);
    // If the deleted layer was active, set active layer to the first layer
    if (props.annotations.activeLayer === layerId) {
      props.annotations.activeLayer = props.annotations.layers[0]?.id ?? null;
    }
  }

  function clearLayer(layerId: string) {
    stage.annotations.clear(layerId);
  }

  function viewLayer(layerId: string) {
    const layer = props.annotations.layers.find((layer: AnnotationLayerData) => layer.id === layerId);
    if (layer) {
      const url = layer.url;
      if (url) {
        window.open(url, '_blank');
      }
    }
  }
</script>

<Folder title="Annotations" expanded={false}>
  <Slider bind:value={props.annotations.lineWidth} label="Line Width" min={1} max={200} step={1} />
  <Folder title="Layers" expanded={true}>
    {#each props.annotations.layers as layer}
      <Folder title={layer.id + (layer.id === props.annotations.activeLayer ? ' (Active)' : '')} expanded={false}>
        <Text bind:value={layer.id} label="Id" disabled={true} />
        <Text bind:value={layer.name} label="Name" />
        <Slider bind:value={layer.opacity} label="Opacity" min={0} max={1} step={0.01} />
        <Color bind:value={layer.color} label="Color" />
        <Text bind:value={layer.url} label="URL" />
        <List bind:value={layer.visibility} label="Visibility" options={visibilityOptions} />
        <Button on:click={() => setActiveLayer(layer.id)} title="Set Active" />
        <Button on:click={() => viewLayer(layer.id)} title="View PNG" />
        <Button on:click={() => clearLayer(layer.id)} title="Clear" />
        <Button on:click={() => deleteLayer(layer.id)} title="Delete" />
      </Folder>
    {/each}
    <Button on:click={addLayer} title="Add Layer" />
  </Folder>
</Folder>
