<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import type { StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import { type SceneExports, SceneLayerOrder } from '../Scene/types';
  import { setContext } from 'svelte';
  import { PerfMonitor } from '@threlte/extras';
  import type { Marker } from '../MarkerLayer/types';

  interface Props {
    props: StageProps;
    onFogUpdate: (blob: Promise<Blob>) => void;
    onMapUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onStageLoading: () => void;
    onSceneUpdate: (offset: { x: number; y: number }, zoom: number) => void;
    onStageInitialized: () => void;
    onMarkerAdded: (marker: Marker) => void;
    onMarkerMoved: (marker: Marker, position: { x: number; y: number }) => void;
    onMarkerSelected: (marker: Marker) => void;
    onMarkerContextMenu: (marker: Marker, event: MouseEvent | TouchEvent) => void;
  }

  let {
    props,
    onFogUpdate,
    onMapUpdate,
    onStageLoading,
    onStageInitialized,
    onSceneUpdate,
    onMarkerAdded,
    onMarkerMoved,
    onMarkerSelected,
    onMarkerContextMenu
  }: Props = $props();

  let sceneRef: SceneExports;

  // Store game mode as reactive state which can be referenced by other components
  let stageContext = $state({ mode: props.mode });
  setContext('stage', stageContext);

  $effect(() => {
    stageContext.mode = props.mode;
  });

  setContext('callbacks', {
    onFogUpdate,
    onMapUpdate,
    onStageLoading,
    onSceneUpdate,
    onMarkerAdded,
    onMarkerMoved,
    onMarkerSelected,
    onMarkerContextMenu,
    onStageInitialized
  });

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
