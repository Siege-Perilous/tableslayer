<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import type { StageFunctions } from './types';

  interface Props {
    props: StageProps;
    onpan: (dx: number, dy: number) => void;
    onzoom: (dx: number) => void;
    onrotate: (dx: number) => void;
  }

  let { props, onpan, onzoom, onrotate }: Props = $props();

  export const functions: StageFunctions = $state({
    fogOfWar: {
      resetFog: () => {},
      revealAll: () => {},
      toBase64: () => {
        return '';
      }
    }
  });
</script>

<Canvas>
  <Scene {props} {functions} {onpan} {onrotate} {onzoom} />
</Canvas>
