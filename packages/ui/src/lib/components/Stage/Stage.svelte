<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from './Scene.svelte';

  let { props }: { props: StageProps } = $props();
  let scene;

  export function resetFog() {
    scene!.resetFog();
  }

  export function revealAll() {
    scene!.revealAll();
  }
</script>

<Canvas>
  <Scene bind:this={scene} {props} />
</Canvas>
