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
    pinnedMarkerIds?: string[];
    onPinToggle?: (markerId: string, pinned: boolean) => void;
  }

  let {
    props,
    callbacks,
    receivedMeasurement = null,
    cursors = [],
    trackLocalCursor = false,
    hoveredMarkerId = null,
    pinnedMarkerIds = [],
    onPinToggle
  }: Props = $props();

  let sceneRef: SceneExports;
  let containerElement = $state<HTMLDivElement>();
  let tooltipPosition = $state<{ x: number; y: number } | null>(null);
  let hoveredMarkerData = $state<any>(null);
  let markerSizeInPixels = $state<number>(40);

  // For multiple pinned tooltips
  let pinnedTooltips = $state<Array<{ marker: any; position: { x: number; y: number } }>>([]);

  // Store game mode, hovered marker, and pinned markers as reactive state which can be referenced by other components
  let stageContext = $state({ mode: props.mode, hoveredMarkerId, pinnedMarkerIds });
  setContext('stage', stageContext);

  $effect(() => {
    stageContext.mode = props.mode;
    stageContext.hoveredMarkerId = hoveredMarkerId;
    stageContext.pinnedMarkerIds = pinnedMarkerIds;
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
    // Update pinned tooltips
    if (pinnedMarkerIds && pinnedMarkerIds.length > 0 && containerElement && sceneRef?.getMarkerScreenPosition) {
      const newPinnedTooltips = [];
      for (const markerId of pinnedMarkerIds) {
        const marker = props.marker.markers.find((m) => m.id === markerId);
        if (marker) {
          const screenPos = sceneRef.getMarkerScreenPosition(marker);
          if (screenPos) {
            newPinnedTooltips.push({ marker, position: screenPos });
          }
        }
      }
      pinnedTooltips = newPinnedTooltips;
    } else {
      pinnedTooltips = [];
    }
  });

  $effect(() => {
    // Show tooltip for current hover/selection (non-pinned)
    let markerForTooltip = null;

    if (props.mode === 0) {
      // DM mode: check if hovered marker is already pinned
      const hoveredMarker = sceneRef?.markers?.hoveredMarker;
      if (hoveredMarker && !pinnedMarkerIds.includes(hoveredMarker.id)) {
        markerForTooltip = hoveredMarker;
      }
    } else if (props.mode === 1) {
      // Player mode: Check for DM's broadcast or player's selection (pinned are handled separately)

      // Check for DM's broadcast (hoveredMarkerId from props)
      let dmBroadcastMarker = null;
      if (hoveredMarkerId) {
        // Only show if not already pinned
        if (!pinnedMarkerIds.includes(hoveredMarkerId)) {
          dmBroadcastMarker = props.marker.markers.find((m) => m.id === hoveredMarkerId);
        }
      }

      const selectedByPlayer = sceneRef?.markers?.selectedMarker;
      // Only show selected if not already pinned
      const selectedNotPinned =
        selectedByPlayer && !pinnedMarkerIds.includes(selectedByPlayer.id) ? selectedByPlayer : null;

      // Prioritize: DM's broadcast > player's selection
      markerForTooltip = dmBroadcastMarker || selectedNotPinned;
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

  <!-- Render pinned tooltips -->
  {#each pinnedTooltips as { marker, position }}
    <MarkerTooltip
      {marker}
      {position}
      {containerElement}
      markerDiameter={markerSizeInPixels}
      isDM={props.mode === 0}
      isPinned={true}
      {onPinToggle}
    />
  {/each}

  <!-- Render hover/selected tooltip (if not pinned) -->
  {#if hoveredMarkerData}
    <MarkerTooltip
      marker={hoveredMarkerData}
      position={tooltipPosition}
      {containerElement}
      markerDiameter={markerSizeInPixels}
      isDM={props.mode === 0}
      isPinned={false}
      {onPinToggle}
      onTooltipHover={(isHovering) => {
        // When hovering tooltip in DM mode, maintain the hover state
        if (props.mode === 0 && sceneRef?.markers?.maintainHover) {
          sceneRef.markers.maintainHover(isHovering);
        }
      }}
    />
  {/if}
</div>
