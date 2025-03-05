<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { MarkerEditMode, MarkerShape, type Marker } from './types';
  import { getContext, onDestroy } from 'svelte';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';
  import type { Size } from '../../types';
  import type { StageProps } from '../Stage/types';
  import MarkerToken from './MarkerToken.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    mapSize: Size | null;
  }

  const { props, isActive, mapSize }: Props = $props();

  const { onMarkersUpdated } = getContext<Callbacks>('callbacks');
  let inputMesh = $state(new THREE.Mesh());

  function onMouseDown(e: MouseEvent, coords: THREE.Vector2 | null) {
    if (!coords || !mapSize) return;

    if (props.marker.editMode === MarkerEditMode.Add) {
      const location = { x: coords.x / mapSize.width, y: coords.y / mapSize.height };
      props.marker.markers.push({
        id: crypto.randomUUID(),
        position: location,
        shape: MarkerShape.Circle,
        shapeColor: '#000000',
        visible: true
      });
      onMarkersUpdated(props.marker.markers);
    } else {
      // Find the marker that is closest to the mouse down point. The test point
      // must be within the outer radius of the marker for it to be considered
      let closestMarker: Marker | null = null;
      let minDistance = Infinity;
      props.marker.markers.forEach((marker) => {
        const markerCoords = new THREE.Vector2(marker.position.x * mapSize.width, marker.position.y * mapSize.height);
        const distance = coords.distanceTo(markerCoords);
        if (distance < minDistance && distance <= props.marker.size / 2) {
          minDistance = distance;
          closestMarker = marker;
        }
      });

      // If a marker was found, remove it and fire the callback
      if (closestMarker) {
        props.marker.markers = props.marker.markers.filter((m) => m.id !== closestMarker?.id);
        onMarkersUpdated(props.marker.markers);
      }
    }
  }
</script>

<InputManager {isActive} target={inputMesh} layerSize={mapSize} {onMouseDown} />

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
      opacity={props.marker.opacity}
      textColor={props.marker.text.color}
      textStroke={props.marker.text.strokeWidth}
      textStrokeColor={props.marker.text.strokeColor}
      textSize={props.marker.text.size}
      strokeColor={props.marker.shape.strokeColor}
      strokeWidth={props.marker.shape.strokeWidth}
    />
  {/each}
</T.Group>
