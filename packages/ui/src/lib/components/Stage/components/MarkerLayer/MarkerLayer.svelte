<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { MarkerShape, MarkerSize, MarkerVisibility, type Marker } from './types';
  import { getContext } from 'svelte';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';
  import { type StageProps, StageMode } from '../Stage/types';
  import MarkerToken from './MarkerToken.svelte';
  import { getGridCellSize, snapToGrid } from '../../helpers/grid';
  import type { GridLayerProps } from '../GridLayer/types';
  import type { DisplayProps } from '../Stage/types';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    grid: GridLayerProps;
    display: DisplayProps;
  }

  const { props, isActive, display, grid }: Props = $props();

  const stage = getContext<{ mode: StageMode }>('stage');
  const { onMarkerAdded, onMarkerMoved, onMarkerSelected } = getContext<Callbacks>('callbacks');

  // Quad used for raycasting / mouse input detection
  let inputMesh = $state(new THREE.Mesh());

  // Track the currently selected marker and dragging state
  let selectedMarker: Marker | null = $state(null);
  let isDragging = $state(false);

  function onMouseDown(e: Event, coords: THREE.Vector2 | null) {
    if (!coords) return;

    // Get coordinates in normalized 0-1 coordinates
    const gridCoords = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);

    // Find the marker that is closest to the mouse down point. The test point
    // must be within the outer radius of the marker for it to be considered
    let closestMarker: Marker | undefined;
    let minDistance = Infinity;
    props.marker.markers.forEach((marker) => {
      const distance = gridCoords.distanceTo(marker.position);
      const markerRadius = getGridCellSize(grid, display) * marker.size;
      if (distance < minDistance && distance <= markerRadius / 2) {
        minDistance = distance;
        closestMarker = marker;
      }
    });

    // Did we click on an existing marker?
    if (closestMarker !== undefined) {
      console.log('Selected Marker: ', closestMarker.name);
      selectedMarker = closestMarker;
      onMarkerSelected(selectedMarker);
      isDragging = true;
      return;
    }

    const newMarker: Marker = {
      id: crypto.randomUUID(),
      name: 'New Marker',
      position: props.marker.snapToGrid ? snapToGrid(gridCoords, grid, display) : gridCoords,
      size: MarkerSize.Small,
      shape: MarkerShape.Circle,
      shapeColor: '#ffffff',
      imageScale: 1.0,
      text: 'ABC',
      imageUrl: null,
      visibility: MarkerVisibility.Always
    };

    selectedMarker = newMarker;
    onMarkerAdded(newMarker);
  }

  function onMouseMove(e: Event, coords: THREE.Vector2 | null) {
    if (!isDragging || !selectedMarker || !coords) return;

    let position = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);
    const snapPosition = props.marker.snapToGrid ? snapToGrid(position, grid, display) : position;

    // Update the selected marker's position
    onMarkerMoved(selectedMarker, snapPosition);
  }

  function onMouseUp() {
    if (isDragging && selectedMarker) {
      isDragging = false;
    }
  }
</script>

<InputManager
  {isActive}
  target={inputMesh}
  layerSize={{ width: display.resolution.x, height: display.resolution.y }}
  {onMouseDown}
  {onMouseMove}
  {onMouseUp}
/>

<!-- This quad is user for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh} scale={[display.resolution.x, display.resolution.y, 1]}>
  <T.MeshBasicMaterial visible={true} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- This group contains all the markers -->
<T.Group name="markerLayer" position={[-0.5, -0.5, 0]}>
  {#each props.marker.markers as marker (marker.id)}
    {#if marker.visibility === MarkerVisibility.Always || (marker.visibility === MarkerVisibility.DM && stage.mode === StageMode.DM) || (marker.visibility === MarkerVisibility.Player && stage.mode === StageMode.Player)}
      <MarkerToken
        {marker}
        {grid}
        {display}
        textColor={props.marker.text.color}
        textStroke={props.marker.text.strokeWidth}
        textStrokeColor={props.marker.text.strokeColor}
        textSize={props.marker.text.size}
        strokeColor={props.marker.shape.strokeColor}
        strokeWidth={props.marker.shape.strokeWidth}
        isSelected={selectedMarker?.id === marker.id}
      />
    {/if}
  {/each}
</T.Group>
