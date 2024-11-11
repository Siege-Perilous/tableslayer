<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import type { SceneExports } from '../Scene/types';

  interface Props {
    props: StageProps;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
  }

  let { props, onMapUpdate, onSceneUpdate }: Props = $props();

  let sceneRef: SceneExports;

  export const map = {
    center: () => sceneRef.map.center(),
    fill: () => sceneRef.map.fill(),
    fit: () => sceneRef.map.fit()
  };

  export const fogOfWar = {
    clear: () => sceneRef.fogOfWar.clear(),
    reset: () => sceneRef.fogOfWar.reset(),
    toBase64: () => sceneRef.fogOfWar.toBase64()
  };

  export const scene = {
    center: () => sceneRef.centerScene(),
    fill: () => sceneRef.fillSceneToCanvas(),
    fit: () => sceneRef.fitSceneToCanvas()
  };
</script>

<Canvas>
  <Scene bind:this={sceneRef} {props} {onMapUpdate} {onSceneUpdate} />
</Canvas>
