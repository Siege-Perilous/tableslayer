<script lang="ts">
  import { Color, Folder, Text, List, Button, type ListOptions } from 'svelte-tweakpane-ui';
  import type { AnnotationLayer, StageProps } from '@tableslayer/ui';
  import { StageMode } from '@tableslayer/ui';

  let { props = $bindable() } = $props<{
    props: StageProps;
  }>();

  const visibilityOptions: ListOptions<StageMode> = [
    { text: 'DM', value: StageMode.DM },
    { text: 'Player', value: StageMode.Player }
  ];

  let activeLayerOptions = $derived([
    { text: 'None', value: null },
    ...props.annotations.layers.map((layer: AnnotationLayer) => ({
      text: layer.id,
      value: layer.id
    }))
  ]);

  function addLayer() {
    const newLayer: AnnotationLayer = {
      id: `layer-${Date.now()}`,
      color: '#000000',
      url: '',
      visibility: StageMode.DM
    };
    props.annotations.layers = [...props.annotations.layers, newLayer];
  }

  function deleteLayer(layerId: string) {
    props.annotations.layers = props.annotations.layers.filter((layer: AnnotationLayer) => layer.id !== layerId);
    // If the deleted layer was active, set active layer to null
    if (props.annotations.activeLayer === layerId) {
      props.annotations.activeLayer = null;
    }
  }
</script>

<Folder title="Annotations" expanded={false}>
  <List
    bind:value={props.annotations.activeLayer}
    label="Active Layer"
    options={activeLayerOptions}
    disabled={props.annotations.layers.length === 0}
  />
  <Button on:click={addLayer} title="Add Layer" />

  <Folder title="Layers" expanded={true}>
    {#each props.annotations.layers as layer}
      <Folder title={layer.id} expanded={false}>
        <Text bind:value={layer.id} label="Id" disabled={true} />
        <Color bind:value={layer.color} label="Color" />
        <Text bind:value={layer.url} label="URL" />
        <List bind:value={layer.visibility} label="Visibility" options={visibilityOptions} />
        <Button on:click={() => deleteLayer(layer.id)} title="Delete Layer" />
      </Folder>
    {/each}
  </Folder>
</Folder>
