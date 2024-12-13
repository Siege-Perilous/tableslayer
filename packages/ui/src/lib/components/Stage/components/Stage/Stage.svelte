<script lang="ts">
  import { Canvas } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import type { SceneExports } from '../Scene/types';
  import { setContext } from 'svelte';

  interface Props {
    props: StageProps;
    onBrushSizeUpdated: (brushSize: number) => void;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onPingsUpdated: (updatedLocations: { x: number; y: number }[]) => void;
  }

  let { props, onBrushSizeUpdated, onMapUpdate, onSceneUpdate, onPingsUpdated }: Props = $props();

  let sceneRef: SceneExports;

  setContext('callbacks', { onBrushSizeUpdated, onMapUpdate, onSceneUpdate, onPingsUpdated });

  export const map = {
    fill: () => sceneRef.map.fill(),
    fit: () => sceneRef.map.fit()
  };

  export const fogOfWar = {
    clear: () => sceneRef?.fogOfWar.clear(),
    reset: () => sceneRef?.fogOfWar.reset(),
    toBase64: () => sceneRef.fogOfWar.toBase64()
  };

  export const scene = {
    fill: () => sceneRef?.fill(),
    fit: () => sceneRef?.fit()
  };
</script>

<div style="background-color: {props.backgroundColor}; height: 100%; width: 100%;">
  <Canvas>
    <Scene bind:this={sceneRef} {props} />
  </Canvas>
</div>
