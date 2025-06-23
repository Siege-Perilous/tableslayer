<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import type { Callbacks, StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import { type SceneExports, SceneLayerOrder } from '../Scene/types';
  import { setContext } from 'svelte';
  import { PerfMonitor } from '@threlte/extras';

  interface Props {
    props: StageProps;
    callbacks: Callbacks;
  }

  let { props, callbacks }: Props = $props();

  let sceneRef: SceneExports;

  // Store game mode as reactive state which can be referenced by other components
  let stageContext = $state({ mode: props.mode });
  setContext('stage', stageContext);

  $effect(() => {
    stageContext.mode = props.mode;
  });

  setContext('callbacks', callbacks);

  export const annotations = {
    clear: (layerId: string) => sceneRef.annotations.clear(layerId)
  };

  export const map = {
    fill: () => sceneRef.map.fill(),
    fit: () => sceneRef.map.fit()
  };

  export const fogOfWar = {
    clear: () => sceneRef?.fogOfWar.clear(),
    reset: () => sceneRef?.fogOfWar.reset(),
    toPng: () => sceneRef?.fogOfWar.toPng()
  };

  export const scene = {
    fill: () => sceneRef?.fill(),
    fit: () => sceneRef?.fit(),
    generateThumbnail: () => sceneRef?.generateThumbnail()
  };
</script>

<div style="height: 100%; width: 100%;">
  <Canvas>
    <T.Mesh scale={[100000, 100000, 1]} layers={[SceneLayerOrder.Background]}>
      <T.PlaneGeometry />
      <T.MeshBasicMaterial color={props.backgroundColor} />
    </T.Mesh>

    <Scene bind:this={sceneRef} {props} />
    {#if props.debug.enableStats}
      <PerfMonitor logsPerSecond={props.debug.loggingRate} anchorX={'right'} anchorY={'bottom'} />
    {/if}
  </Canvas>
</div>
