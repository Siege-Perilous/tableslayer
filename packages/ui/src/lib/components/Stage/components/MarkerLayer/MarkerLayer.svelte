<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { MarkerShape, type Marker } from './types';
  import { getContext } from 'svelte';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';
  import type { Size } from '../../types';
  import type { StageProps } from '../Stage/types';
  import MarkerToken from './MarkerToken.svelte';
  import { snapToGrid } from '../../helpers/snapToGrid';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    mapSize: Size | null;
  }

  const { props, isActive, mapSize }: Props = $props();

  const { onMarkerAdded, onMarkerMoved, onMarkerSelected } = getContext<Callbacks>('callbacks');
  let inputMesh = $state(new THREE.Mesh());

  // Track the currently selected marker and dragging state
  let selectedMarker: Marker | null = $state(null);
  let isDragging = $state(false);

  function onMouseDown(e: Event, coords: THREE.Vector2 | null) {
    if (!coords || !mapSize) return;

    // Find the marker that is closest to the mouse down point. The test point
    // must be within the outer radius of the marker for it to be considered
    let closestMarker: Marker | undefined;
    let minDistance = Infinity;
    props.marker.markers.forEach((marker) => {
      const markerCoords = new THREE.Vector2(marker.position.x * mapSize.width, marker.position.y * mapSize.height);
      const distance = coords.distanceTo(markerCoords);
      if (distance < minDistance && distance <= props.marker.size / 2) {
        minDistance = distance;
        closestMarker = marker;
      }
    });

    // Did we click on an existing marker?
    if (closestMarker !== undefined) {
      selectedMarker = closestMarker;
      onMarkerSelected(selectedMarker);
      isDragging = true;
      return;
    }

    // Otherwise add a new marker
    const location = { x: coords.x / mapSize.width, y: coords.y / mapSize.height };

    const newMarker: Marker = {
      id: crypto.randomUUID(),
      name: 'New Marker',
      position: location,
      shape: MarkerShape.Circle,
      shapeColor: '#ffffff',
      imageScale: 1.0,
      text: 'ABC',
      imageUrl: null,
      visible: true
    };

    selectedMarker = newMarker;
    onMarkerAdded(newMarker);
  }

  function onMouseMove(e: Event, coords: THREE.Vector2 | null) {
    if (!isDragging || !selectedMarker || !coords || !mapSize) return;

    // Create grid config based on your stage props
    const gridConfig = {
      gridType: props.grid.gridType,
      spacing: 100, // Adjust spacing based on zoom level
      gridSize: new THREE.Vector2(mapSize.width, mapSize.height),
      gridOrigin: new THREE.Vector2(
        (mapSize.width - props.grid.spacing * Math.floor(mapSize.width / props.grid.spacing)) / 2,
        (mapSize.height - props.grid.spacing * Math.floor(mapSize.height / props.grid.spacing)) / 2
      )
    };

    // Get normalized coordinates
    const normalizedPosition = new THREE.Vector2(coords.x / mapSize.width, coords.y / mapSize.height);
    const snappedPosition = snapToGrid(normalizedPosition, gridConfig);

    console.log(props.marker.snapToGrid, snappedPosition, normalizedPosition);

    // Snap to grid if grid snapping is enabled
    const markerPosition = props.marker.snapToGrid ? snappedPosition : normalizedPosition;

    // Update the selected marker's position
    onMarkerMoved(selectedMarker, markerPosition);
  }

  function onMouseUp() {
    if (isDragging && selectedMarker) {
      isDragging = false;
    }
  }
</script>

<InputManager {isActive} target={inputMesh} layerSize={mapSize} {onMouseDown} {onMouseMove} {onMouseUp} />

<!-- This quad is user for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- This group contains all the markers -->
<T.Group name="markerLayer" position={[-0.5, -0.5, 0]}>
  {#each props.marker.markers as marker (marker.id)}
    <MarkerToken
      {marker}
      size={props.marker.size}
      textColor={props.marker.text.color}
      textStroke={props.marker.text.strokeWidth}
      textStrokeColor={props.marker.text.strokeColor}
      textSize={props.marker.text.size}
      strokeColor={props.marker.shape.strokeColor}
      strokeWidth={props.marker.shape.strokeWidth}
      isSelected={selectedMarker?.id === marker.id}
    />
  {/each}
</T.Group>
