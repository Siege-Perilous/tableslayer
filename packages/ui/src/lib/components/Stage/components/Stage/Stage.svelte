<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import type { SceneExports } from '../Scene/types';

  interface Props {
    props: StageProps;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  }

  let { props, onMapUpdate }: Props = $props();
  let scene: SceneExports;

  export const map = {
    fill: () => scene.fillMapToScreen(),
    fit: () => scene.fitMapToScreen(),
    center: () => scene.centerMap()
  };

  export const fogOfWar = {
    clear: () => scene.clearFog(),
    reset: () => scene.resetFog(),
    toBase64: () => scene.exportFogToBase64()
  };
</script>

<Canvas>
  <Scene bind:this={scene} {props} {onMapUpdate} />
</Canvas>
