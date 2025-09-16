<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import type { Callbacks, StageProps } from './types';
  import Scene from '../Scene/Scene.svelte';
  import { type SceneExports, SceneLayerOrder } from '../Scene/types';
  import { setContext } from 'svelte';
  import { PerfMonitor } from '@threlte/extras';
  import { MarkerTooltip } from '../../../MarkerTooltip';

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
  interface MarkerData {
    id: string;
    title?: string;
    note?: unknown;
    visibility?: number;
    size?: number;
    tooltip?: {
      title?: string;
      content?: unknown;
    };
  }

  let hoveredMarkerData = $state<MarkerData | null>(null);
  let markerSizeInPixels = $state<number>(40);

  let pinnedTooltips = $state<
    Array<{
      marker: MarkerData;
      position: { x: number; y: number };
      preferredPlacement: 'top' | 'bottom' | 'left' | 'right';
    }>
  >([]);

  const renderedTooltips = new Map<string, { element: HTMLElement; bounds: DOMRect }>();

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

  export const markers = {
    get isHoveringMarker() {
      return sceneRef?.markers?.isHoveringMarker ?? false;
    },
    get isDraggingMarker() {
      return sceneRef?.markers?.isDraggingMarker ?? false;
    }
  };

  export const measurement = {
    getCurrentMeasurement: () => sceneRef?.measurement?.getCurrentMeasurement() ?? null,
    isDrawing: () => sceneRef?.measurement?.isDrawing() ?? false
  };

  $effect(() => {
    // Update marker size when zoom changes or marker data changes
    const zoom = props.scene.zoom;
    if (sceneRef?.getMarkerSizeInScreenSpace) {
      const markerSize = hoveredMarkerData?.size || 1;
      markerSizeInPixels = sceneRef.getMarkerSizeInScreenSpace(markerSize);
    }
  });

  $effect(() => {
    if (pinnedMarkerIds && pinnedMarkerIds.length > 0 && containerElement && sceneRef?.getMarkerScreenPosition) {
      const newPinnedTooltips = [];

      const placementPatterns = [
        ['top', 'bottom', 'left', 'right'],
        ['bottom', 'top', 'right', 'left'],
        ['left', 'right', 'top', 'bottom'],
        ['right', 'left', 'bottom', 'top']
      ];

      for (let i = 0; i < pinnedMarkerIds.length; i++) {
        const markerId = pinnedMarkerIds[i];
        const marker = props.marker.markers.find((m) => m.id === markerId);
        if (marker) {
          const screenPos = sceneRef.getMarkerScreenPosition(marker);
          if (screenPos) {
            const pattern = placementPatterns[i % placementPatterns.length];
            const preferredPlacement = pattern[0] as 'top' | 'bottom' | 'left' | 'right';

            newPinnedTooltips.push({ marker, position: screenPos, preferredPlacement });
          }
        }
      }
      pinnedTooltips = newPinnedTooltips;
    } else {
      pinnedTooltips = [];
    }
  });

  $effect(() => {
    let markerForTooltip = null;

    if (props.mode === 0) {
      const hoveredMarker = sceneRef?.markers?.hoveredMarker;
      if (hoveredMarker && !pinnedMarkerIds.includes(hoveredMarker.id)) {
        markerForTooltip = hoveredMarker;
      }
    } else if (props.mode === 1) {
      let dmBroadcastMarker = null;
      if (hoveredMarkerId) {
        if (!pinnedMarkerIds.includes(hoveredMarkerId)) {
          dmBroadcastMarker = props.marker.markers.find((m) => m.id === hoveredMarkerId);
        }
      }

      const selectedByPlayer = sceneRef?.markers?.selectedMarker;
      const selectedNotPinned =
        selectedByPlayer && !pinnedMarkerIds.includes(selectedByPlayer.id) ? selectedByPlayer : null;

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

  {#each pinnedTooltips as { marker, position, preferredPlacement }, index}
    <MarkerTooltip
      {marker}
      {position}
      {containerElement}
      markerDiameter={markerSizeInPixels}
      isDM={props.mode === 0}
      isPinned={true}
      {onPinToggle}
      {preferredPlacement}
      existingTooltips={Array.from(renderedTooltips.values()).filter((t, i) => i < index)}
      onTooltipMount={(element, bounds) => {
        renderedTooltips.set(marker.id, { element, bounds });
      }}
      onTooltipUnmount={() => {
        renderedTooltips.delete(marker.id);
      }}
    />
  {/each}

  {#if hoveredMarkerData}
    <MarkerTooltip
      marker={hoveredMarkerData}
      position={tooltipPosition}
      {containerElement}
      markerDiameter={markerSizeInPixels}
      isDM={props.mode === 0}
      isPinned={false}
      {onPinToggle}
      existingTooltips={Array.from(renderedTooltips.values())}
      onTooltipHover={(isHovering) => {
        if (props.mode === 0 && sceneRef?.markers?.maintainHover) {
          sceneRef.markers.maintainHover(isHovering);
        }
      }}
    />
  {/if}
</div>
