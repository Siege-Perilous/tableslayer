<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import type { Callbacks, StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import { type SceneExports, SceneLayerOrder } from '../Scene/types';
  import { setContext } from 'svelte';
  import { PerfMonitor } from '@threlte/extras';

  import type { CursorData } from './types';

  interface Props {
    props: StageProps;
    callbacks: Callbacks;
    receivedMeasurement?: {
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      type: number;
      beamWidth?: number;
      coneAngle?: number;
      // Visual properties
      color?: string;
      thickness?: number;
      outlineColor?: string;
      outlineThickness?: number;
      opacity?: number;
      markerSize?: number;
      // Timing properties
      autoHideDelay?: number;
      fadeoutTime?: number;
      // Distance properties
      showDistance?: boolean;
      snapToGrid?: boolean;
      enableDMG252?: boolean;
    } | null;
    cursors?: CursorData[];
    trackLocalCursor?: boolean;
  }

  let { props, callbacks, receivedMeasurement = null, cursors = [], trackLocalCursor = false }: Props = $props();

  let sceneRef: SceneExports;

  // Store game mode as reactive state which can be referenced by other components
  let stageContext = $state({ mode: props.mode });
  setContext('stage', stageContext);

  $effect(() => {
    stageContext.mode = props.mode;
  });

  setContext('callbacks', callbacks);

  export const annotations = {
    clear: (layerId: string) => sceneRef.annotations.clear(layerId),
    isDrawing: () => sceneRef?.annotations?.isDrawing() ?? false
  };

  export const map = {
    fill: () => sceneRef.map.fill(),
    fit: () => sceneRef.map.fit()
  };

  export const fogOfWar = {
    clear: () => sceneRef?.fogOfWar.clear(),
    reset: () => sceneRef?.fogOfWar.reset(),
    toPng: () => sceneRef?.fogOfWar.toPng(),
    isDrawing: () => sceneRef?.fogOfWar?.isDrawing() ?? false
  };

  export const scene = {
    fill: () => sceneRef?.fill(),
    fit: () => sceneRef?.fit(),
    generateThumbnail: () => sceneRef?.generateThumbnail()
  };

  // Export marker state getters
  export const markers = {
    get isHoveringMarker() {
      return sceneRef?.markers?.isHoveringMarker ?? false;
    },
    get isDraggingMarker() {
      return sceneRef?.markers?.isDraggingMarker ?? false;
    }
  };

  // Export measurement methods
  export const measurement = {
    getCurrentMeasurement: () => sceneRef?.measurement?.getCurrentMeasurement() ?? null,
    isDrawing: () => sceneRef?.measurement?.isDrawing() ?? false
  };
</script>

<div style="height: 100%; width: 100%;">
  <Canvas>
    <T.Mesh scale={[100000, 100000, 1]} layers={[SceneLayerOrder.Background]}>
      <T.PlaneGeometry />
      <T.MeshBasicMaterial color={props.backgroundColor} />
    </T.Mesh>

    <Scene bind:this={sceneRef} {props} {receivedMeasurement} {cursors} {trackLocalCursor} />
    {#if props.debug.enableStats}
      <PerfMonitor logsPerSecond={props.debug.loggingRate} anchorX={'right'} anchorY={'bottom'} />
    {/if}
  </Canvas>
</div>
