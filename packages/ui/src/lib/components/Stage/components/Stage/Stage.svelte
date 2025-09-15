<script lang="ts">
  import { Canvas, T, useThrelte } from '@threlte/core';
  import type { Callbacks, StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import { type SceneExports, SceneLayerOrder } from '../Scene/types';
  import { setContext } from 'svelte';
  import { PerfMonitor } from '@threlte/extras';
  import { MarkerTooltip } from '../../../MarkerTooltip';
  import * as THREE from 'three';

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
    hoveredMarkerId?: string | null;
  }

  let {
    props,
    callbacks,
    receivedMeasurement = null,
    cursors = [],
    trackLocalCursor = false,
    hoveredMarkerId = null
  }: Props = $props();

  let sceneRef: SceneExports;
  let containerElement = $state<HTMLDivElement>();
  let tooltipPosition = $state<{ x: number; y: number } | null>(null);
  let hoveredMarkerData = $state<any>(null);
  let markerSizeInPixels = $state<number>(40);

  // Store game mode and hovered marker as reactive state which can be referenced by other components
  let stageContext = $state({ mode: props.mode, hoveredMarkerId });
  setContext('stage', stageContext);

  $effect(() => {
    stageContext.mode = props.mode;
    stageContext.hoveredMarkerId = hoveredMarkerId;
  });

  setContext('callbacks', callbacks);

  export const annotations = {
    clear: (layerId: string) => sceneRef.annotations.clear(layerId),
    toRLE: () => sceneRef?.annotations?.toRLE(),
    fromRLE: (rleData: Uint8Array, width: number, height: number) =>
      sceneRef?.annotations?.fromRLE(rleData, width, height),
    loadMask: (layerId: string, rleData: Uint8Array) => sceneRef?.annotations?.loadMask(layerId, rleData),
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
    toRLE: () => sceneRef?.fogOfWar.toRLE(),
    fromRLE: (rleData: Uint8Array, width: number, height: number) => sceneRef?.fogOfWar.fromRLE(rleData, width, height),
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

  $effect(() => {
    const zoom = props.scene.zoom;
    const gridSpacing = props.grid.spacing;
    const displayRes = props.display.resolution;
    const displaySize = props.display.size;

    if (sceneRef?.getMarkerSizeInScreenSpace) {
      const markerSize = hoveredMarkerData?.size || 1;
      markerSizeInPixels = sceneRef.getMarkerSizeInScreenSpace(markerSize);
    }
  });

  $effect(() => {
    // In DM mode (mode 0): Show tooltip for hovered marker
    // In Player mode (mode 1): Show tooltip for DM's broadcast (from hoveredMarkerId) OR player's selected marker
    let markerForTooltip = null;

    if (props.mode === 0) {
      // DM mode: use hovered marker
      markerForTooltip = sceneRef?.markers?.hoveredMarker;
    } else if (props.mode === 1) {
      // Player mode: Check for DM's broadcast first (hoveredMarkerId from props)
      // This is set when DM hovers or selects a Hover visibility marker
      let dmBroadcastMarker = null;
      if (hoveredMarkerId) {
        // Find the marker that matches the DM's broadcast
        dmBroadcastMarker = props.marker.markers.find((m) => m.id === hoveredMarkerId);
        console.log('[Stage] Player mode - DM broadcast marker:', {
          hoveredMarkerId,
          foundMarker: dmBroadcastMarker?.id,
          markerTitle: dmBroadcastMarker?.title
        });
      }

      const selectedByPlayer = sceneRef?.markers?.selectedMarker;
      console.log('[Stage] Player mode tooltip check:', {
        dmBroadcast: dmBroadcastMarker?.id,
        selectedByPlayer: selectedByPlayer?.id,
        selectedTitle: selectedByPlayer?.title
      });

      // Prioritize DM's broadcast over player's selection
      markerForTooltip = dmBroadcastMarker || selectedByPlayer;
    }

    if (markerForTooltip && containerElement) {
      hoveredMarkerData = markerForTooltip;
      const screenPos = sceneRef?.getMarkerScreenPosition?.(markerForTooltip);
      if (screenPos) {
        tooltipPosition = screenPos;
      }
    } else {
      hoveredMarkerData = null;
      tooltipPosition = null;
    }
  });
</script>

<div bind:this={containerElement} style="height: 100%; width: 100%; position: relative;">
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

  <MarkerTooltip
    marker={hoveredMarkerData}
    position={tooltipPosition}
    {containerElement}
    markerDiameter={markerSizeInPixels}
    onTooltipHover={(isHovering) => {
      // When hovering tooltip in DM mode, maintain the hover state
      if (props.mode === 0 && sceneRef?.markers?.maintainHover) {
        sceneRef.markers.maintainHover(isHovering);
      }
    }}
  />
</div>
