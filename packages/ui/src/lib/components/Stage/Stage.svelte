<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from './Scene.svelte';
  import type { StageFunctions } from './types';

  export const functions: StageFunctions = $state({
    fogOfWar: {
      resetFog: () => {},
      revealAll: () => {}
    }
  });

  let { props }: { props: StageProps } = $props();
</script>

<Canvas>
  <Scene {props} {functions} />
</Canvas>
