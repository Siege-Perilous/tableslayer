<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import GridLayer from './layers/Grid/GridLayer.svelte';
  import Layers from './layers/Layers.svelte';
  import type { StageProps } from './types';
  import Scene from './Scene.svelte';

  let props: StageProps = $props();
</script>

<Canvas>
  <Scene />

  <T.PerspectiveCamera makeDefault position={[0, 1, 5]} />

  <Layers>
    <GridLayer {...props.grid} />
  </Layers>
</Canvas>
