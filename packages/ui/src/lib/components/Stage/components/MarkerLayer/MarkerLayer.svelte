<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { MarkerShape, MarkerSize, MarkerVisibility, type Marker } from './types';
  import { getContext } from 'svelte';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import type { Callbacks } from '../Stage/types';
  import { type StageProps, StageMode } from '../Stage/types';
  import MarkerToken from './MarkerToken.svelte';
  import { getGridCellSize, snapToGrid } from '../../helpers/grid';
  import type { GridLayerProps } from '../GridLayer/types';
  import type { DisplayProps } from '../Stage/types';
  import { SceneLayer } from '../Scene/types';
  import { MapLayerType } from '../MapLayer/types';
  import { v4 as uuidv4 } from 'uuid';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    grid: GridLayerProps;
    display: DisplayProps;
  }

  const { props, isActive, display, grid }: Props = $props();

  const stage = getContext<{ mode: StageMode; hoveredMarkerId: string | null; pinnedMarkerIds: string[] }>('stage');
  const { onMarkerAdded, onMarkerMoved, onMarkerSelected, onMarkerContextMenu, onMarkerHover } =
    getContext<Callbacks>('callbacks');

  // Quad used for raycasting / mouse input detection
  let inputMesh = $state(new THREE.Mesh());

  // Track the currently selected marker and dragging state
  let selectedMarker: Marker | null = $state(null);
  let isDragging = $state(false);
  let hoveredMarker: Marker | null = $state(null);
  let hoveredMarkerDelayed: Marker | null = $state(null); // Marker after hover delay
  let hoverTimer: ReturnType<typeof setTimeout> | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  const HOVER_DELAY_MS = 500; // Half second delay before showing tooltip
  const HIDE_DELAY_MS = 300; // Delay before hiding tooltip to allow moving to it

  const ghostMarker: Marker = $state({
    id: uuidv4(),
    title: '',
    position: new THREE.Vector2(0, 0),
    size: MarkerSize.Small,
    shape: MarkerShape.Circle,
    shapeColor: '#ffffff',
    imageScale: 1.0,
    label: '',
    imageUrl: null,
    visibility: MarkerVisibility.Always,
    note: null
  });

  function findClosestMarker(gridCoords: THREE.Vector2) {
    // Find the marker that is closest to the mouse down point. The test point
    // must be within the outer radius of the marker for it to be considered
    let closestMarker: Marker | undefined;
    let minDistance = Infinity;
    props.marker.markers.forEach((marker) => {
      if (!isTokenVisible(marker)) return;

      const distance = gridCoords.distanceTo(marker.position);
      const markerRadius = getGridCellSize(grid, display) * marker.size;
      if (distance < minDistance && distance <= markerRadius / 2) {
        minDistance = distance;
        closestMarker = marker;
      }
    });

    return closestMarker;
  }

  function onMouseDown(e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    console.log('[MarkerLayer] onMouseDown called', { coords, mode: stage.mode, isActive });
    if (!coords) return;

    // Check if TouchEvent is defined in the browser before using it
    const isTouchEvent = typeof TouchEvent !== 'undefined' && e instanceof TouchEvent;
    const isMouseEvent = e instanceof MouseEvent;

    // Verify the primary mouse/touch was used
    if (isMouseEvent && e.button !== 0) return;
    if (isTouchEvent && (e as TouchEvent).touches.length !== 1) return;

    const gridCoords = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);

    const closestMarker = findClosestMarker(gridCoords);
    console.log('[MarkerLayer] closestMarker:', closestMarker?.id, 'shape:', closestMarker?.shape);

    // Did we click on an existing marker?
    if (closestMarker !== undefined) {
      selectedMarker = closestMarker;
      // Allow dragging in both DM and Player mode, except for pin-shaped markers (locked)
      if (closestMarker.shape !== MarkerShape.Pin) {
        isDragging = true;
        console.log('[MarkerLayer] Starting drag for marker:', closestMarker.id);
        // Clear tooltip when drag starts
        hoveredMarkerDelayed = null;
        clearHoverTimer();
      }
      onMarkerSelected(selectedMarker);
    } else {
      // In player mode, clicking empty space clears selection
      if (stage.mode === StageMode.Player) {
        selectedMarker = null;
        return;
      }

      // In DM mode, clicking empty space also clears selection (unless we're creating a new marker)
      if (props.activeLayer === MapLayerType.None) {
        selectedMarker = null;
        onMarkerSelected(null); // Notify that selection is cleared
        return;
      }
      const newMarker: Marker = {
        id: uuidv4(),
        title: 'New Marker',
        position: props.marker.snapToGrid ? snapToGrid(gridCoords, grid, display) : gridCoords,
        size: MarkerSize.Small,
        shape: MarkerShape.Circle,
        shapeColor: '#ffffff',
        imageScale: 1.0,
        label: 'A1',
        imageUrl: null,
        visibility: MarkerVisibility.DM,
        note: null
      };
      selectedMarker = newMarker;
      onMarkerAdded(newMarker);
    }
  }

  function onMouseMove(e: Event, coords: THREE.Vector2 | null) {
    if (!coords) {
      hoveredMarker = null;
      clearHoverTimer();
      return;
    }

    let position = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);
    const snapPosition = props.marker.snapToGrid ? snapToGrid(position, grid, display) : position;

    ghostMarker.position = snapPosition;

    if (isDragging && selectedMarker) {
      console.log('[MarkerLayer] Dragging marker to:', snapPosition);
    }

    // Only check for hover when we're not dragging and when activeLayer is None or Marker
    // This prevents hover during fog/drawing/annotation/measurement modes
    if (!isDragging && (props.activeLayer === MapLayerType.None || props.activeLayer === MapLayerType.Marker)) {
      // Check if there are any visible markers
      const hasVisibleMarkers = props.marker.markers.some(isTokenVisible);
      if (hasVisibleMarkers) {
        const newHoveredMarker = findClosestMarker(position) ?? null;

        // If we're hovering over a different marker than before
        if (newHoveredMarker?.id !== hoveredMarker?.id) {
          hoveredMarker = newHoveredMarker;
          clearHoverTimer();

          // Start timer for new hover if we have a marker
          if (newHoveredMarker) {
            cancelHideTimer(); // Cancel any pending hide
            hoverTimer = setTimeout(() => {
              hoveredMarkerDelayed = newHoveredMarker;
            }, HOVER_DELAY_MS);
          }
        }
      } else {
        hoveredMarker = null;
        clearHoverTimer();
      }
    } else {
      hoveredMarker = null;
      clearHoverTimer();
    }

    if (isDragging && selectedMarker) {
      onMarkerMoved(selectedMarker, snapPosition);
    }
  }

  function clearHoverTimer() {
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      hoveredMarkerDelayed = null;
    }, HIDE_DELAY_MS);
  }

  function cancelHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function isTokenVisible(marker: Marker) {
    return (
      marker.visibility === MarkerVisibility.Always ||
      (marker.visibility === MarkerVisibility.DM && stage.mode === StageMode.DM) ||
      (marker.visibility === MarkerVisibility.Hover && stage.mode === StageMode.DM) ||
      (marker.visibility === MarkerVisibility.Hover &&
        stage.mode === StageMode.Player &&
        marker.id === stage.hoveredMarkerId) ||
      (marker.visibility === MarkerVisibility.Hover &&
        stage.mode === StageMode.Player &&
        stage.pinnedMarkerIds?.includes(marker.id)) ||
      (marker.visibility === MarkerVisibility.Player && stage.mode === StageMode.Player)
    );
  }

  function onMouseUp() {
    if (isDragging && selectedMarker) {
      isDragging = false;
    }
  }

  function onMouseLeave() {
    hoveredMarker = null;
    clearHoverTimer();
  }

  function onContextMenu(e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    if (!coords) return;

    const gridCoords = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);
    const closestMarker = findClosestMarker(gridCoords);

    if (closestMarker) {
      onMarkerContextMenu(closestMarker, e);
    }
  }

  // Track previous hovered marker to detect changes
  let previousHoveredMarkerDelayed: Marker | null = null;

  // Notify about hover changes when in DM mode (only after delay)
  $effect(() => {
    if (stage.mode === StageMode.DM && hoveredMarkerDelayed !== previousHoveredMarkerDelayed) {
      onMarkerHover?.(hoveredMarkerDelayed);
      previousHoveredMarkerDelayed = hoveredMarkerDelayed;
    }
  });

  export function maintainHover(maintain: boolean) {
    if (maintain && stage.mode === StageMode.DM) {
      cancelHideTimer();
    } else if (!maintain && stage.mode === StageMode.DM && !hoveredMarker) {
      clearHoverTimer();
    }
  }

  // Export reactive state for hover and drag
  export const markerState = {
    get isHovering() {
      if (stage.mode === StageMode.DM) {
        return hoveredMarkerDelayed !== null && hoveredMarkerDelayed !== undefined;
      }
      return stage.hoveredMarkerId !== null && stage.hoveredMarkerId !== undefined;
    },
    get isDragging() {
      return isDragging;
    },
    get hoveredMarker() {
      // In DM mode, use the delayed hover
      if (stage.mode === StageMode.DM) {
        return hoveredMarkerDelayed;
      }
      // In Player mode, find the marker that matches the DM's hoveredMarkerId or is pinned
      if (stage.hoveredMarkerId) {
        const hoveredMarker = props.marker.markers.find((m) => m.id === stage.hoveredMarkerId);
        return hoveredMarker || null;
      }
      // Check for pinned markers
      if (stage.pinnedMarkerIds && stage.pinnedMarkerIds.length > 0) {
        const pinnedMarker = props.marker.markers.find((m) => stage.pinnedMarkerIds.includes(m.id));
        return pinnedMarker || null;
      }
      return null;
    },
    get selectedMarker() {
      return selectedMarker;
    }
  };
</script>

<LayerInput
  id="marker"
  isActive={isActive || stage.mode === StageMode.Player}
  target={inputMesh}
  layerSize={{ width: display.resolution.x, height: display.resolution.y }}
  {onMouseDown}
  {onMouseMove}
  {onMouseUp}
  {onMouseLeave}
  {onContextMenu}
/>

<!-- This quad is user for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh} scale={[display.resolution.x, display.resolution.y, 1]} layers={[SceneLayer.Input]}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- This group contains all the markers -->
<T.Group name="markerLayer" position={[-0.5, -0.5, 0]}>
  {#each props.marker.markers as marker (marker.id)}
    {#if isTokenVisible(marker)}
      <MarkerToken
        {marker}
        {grid}
        {display}
        opacity={1.0}
        textColor={props.marker.text.color}
        textStroke={props.marker.text.strokeWidth}
        textStrokeColor={props.marker.text.strokeColor}
        textSize={props.marker.text.size}
        shadowColor={props.marker.shape.shadowColor}
        shadowBlur={props.marker.shape.shadowBlur}
        shadowOffset={props.marker.shape.shadowOffset}
        strokeColor={props.marker.shape.strokeColor}
        strokeWidth={props.marker.shape.strokeWidth}
        isSelected={selectedMarker?.id === marker.id}
        isHovered={hoveredMarker?.id === marker.id}
        sceneRotation={props.scene.rotation}
      />
    {/if}
  {/each}

  <!-- Only show the ghost marker when the marker layer is active -->
  {#if isActive && stage.mode === StageMode.DM && props.activeLayer === MapLayerType.Marker}
    <MarkerToken
      marker={ghostMarker}
      {grid}
      {display}
      opacity={0.3}
      textColor={props.marker.text.color}
      textStroke={props.marker.text.strokeWidth}
      textStrokeColor={props.marker.text.strokeColor}
      textSize={props.marker.text.size}
      shadowColor={props.marker.shape.shadowColor}
      shadowBlur={props.marker.shape.shadowBlur}
      shadowOffset={props.marker.shape.shadowOffset}
      strokeColor={props.marker.shape.strokeColor}
      strokeWidth={props.marker.shape.strokeWidth}
      isSelected={false}
      isHovered={false}
      sceneRotation={props.scene.rotation}
    />
  {/if}
</T.Group>
