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
  import { SceneLayer } from '../Scene/types';
  import { MapLayerType } from '../MapLayer/types';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    grid: GridLayerProps;
    display: DisplayProps;
  }

  const { props, isActive, display, grid }: Props = $props();

  const stage = getContext<{ mode: StageMode }>('stage');
  const { onMarkerAdded, onMarkerMoved, onMarkerSelected, onMarkerContextMenu } = getContext<Callbacks>('callbacks');

  // Quad used for raycasting / mouse input detection
  let inputMesh = $state(new THREE.Mesh());

  // Track the currently selected marker and dragging state
  let selectedMarker: Marker | null = $state(null);
  let isDragging = $state(false);

  const ghostMarker: Marker = $state({
    id: crypto.randomUUID(),
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
    if (!coords) return;

    // Check if TouchEvent is defined in the browser before using it
    const isTouchEvent = typeof TouchEvent !== 'undefined' && e instanceof TouchEvent;
    const isMouseEvent = e instanceof MouseEvent;

    // Verify the primary mouse/touch was used
    if (isMouseEvent && e.button !== 0) return;
    if (isTouchEvent && (e as TouchEvent).touches.length !== 1) return;

    const gridCoords = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);

    const closestMarker = findClosestMarker(gridCoords);

    // Did we click on an existing marker?
    if (closestMarker !== undefined) {
      isDragging = true;
      selectedMarker = closestMarker;
      onMarkerSelected(selectedMarker);
    } else {
      if (props.activeLayer === MapLayerType.None) return; // Ignore clicks when no layer is active)
      const newMarker: Marker = {
        id: crypto.randomUUID(),
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
      console.log('Adding new marker in stage', newMarker);
      onMarkerAdded(newMarker);
    }
  }

  function onMouseMove(e: Event, coords: THREE.Vector2 | null) {
    if (!coords) return;

    let position = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);
    const snapPosition = props.marker.snapToGrid ? snapToGrid(position, grid, display) : position;

    ghostMarker.position = snapPosition;

    if (isDragging && selectedMarker) {
      onMarkerMoved(selectedMarker, snapPosition);
    }
  }

  function isTokenVisible(marker: Marker) {
    return (
      marker.visibility === MarkerVisibility.Always ||
      (marker.visibility === MarkerVisibility.DM && stage.mode === StageMode.DM) ||
      (marker.visibility === MarkerVisibility.Player && stage.mode === StageMode.Player)
    );
  }

  function onMouseUp() {
    if (isDragging && selectedMarker) {
      isDragging = false;
    }
  }

  function onContextMenu(e: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    if (!coords) return;

    const gridCoords = new THREE.Vector2(coords.x - display.resolution.x / 2, coords.y - display.resolution.y / 2);
    const closestMarker = findClosestMarker(gridCoords);

    if (closestMarker) {
      onMarkerContextMenu(closestMarker, e);
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
      />
    {/if}
  {/each}

  <!-- Only show the ghost marker when the marker layer is active -->
  {#if isActive && stage.mode === StageMode.DM}
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
    />
  {/if}
</T.Group>
