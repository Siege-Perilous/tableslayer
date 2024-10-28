<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from './Scene.svelte';
  import type { StageFunctions } from './types';

  export const functions: StageFunctions = $state({
    fogOfWar: {
      resetFog: () => {},
      revealAll: () => {},
      toBase64: () => {
        return '';
      }
    }
  });

  let { props }: { props: StageProps } = $props();

  export function save() {}

  export function load() {}
</script>

<Canvas>
  <Scene {props} {functions} />
</Canvas>
