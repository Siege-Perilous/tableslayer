<script lang="ts">
  import { Color, Folder, Text, List, Button, type ListOptions } from 'svelte-tweakpane-ui';
  import type { AnnotationLayer, StageProps, StageExports } from '@tableslayer/ui';
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
    const newLayer: AnnotationLayer = {
      id: `layer-${Date.now()}`,
      color: randomColor,
      url: '',
      visibility: StageMode.DM
    };
    props.annotations.layers = [...props.annotations.layers, newLayer];
    props.annotations.activeLayer = newLayer.id;
  }

  function setActiveLayer(layerId: string) {
    props.annotations.activeLayer = layerId;
  }

  function deleteLayer(layerId: string) {
    props.annotations.layers = props.annotations.layers.filter((layer: AnnotationLayer) => layer.id !== layerId);
    // If the deleted layer was active, set active layer to the first layer
    if (props.annotations.activeLayer === layerId) {
      props.annotations.activeLayer = props.annotations.layers[0]?.id ?? null;
    }
  }

  function clearLayer(layerId: string) {
    stage.annotations.clear(layerId);
  }

  function viewLayer(layerId: string) {
    const layer = props.annotations.layers.find((layer: AnnotationLayer) => layer.id === layerId);
    if (layer) {
      const url = layer.url;
      if (url) {
        window.open(url, '_blank');
      }
    }
  }
</script>

<Folder title="Annotations" expanded={false}>
  <Folder title="Layers" expanded={true}>
    {#each props.annotations.layers as layer}
      <Folder title={layer.id + (layer.id === props.annotations.activeLayer ? ' (Active)' : '')} expanded={false}>
        <Text bind:value={layer.id} label="Id" disabled={true} />
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
