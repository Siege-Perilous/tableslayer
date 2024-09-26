<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from './Scene.svelte';

  let props: StageProps = $props();
</script>

<Canvas>
  <Scene {...props} />
</Canvas>
