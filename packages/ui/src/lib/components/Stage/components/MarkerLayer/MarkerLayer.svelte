<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { MarkerEditMode, type Marker } from './types';
  import MarkerMaterial from './MarkerMaterial.svelte';
  import { getContext } from 'svelte';
  import InputManager from '../InputManager/InputManager.svelte';
  import type { Callbacks } from '../Stage/types';
  import type { Size } from '../../types';
  import type { StageProps } from '../Stage/types';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    mapSize: Size | null;
  }

  const { props, isActive, mapSize, ...meshProps }: Props = $props();

  const { onMarkersUpdated } = getContext<Callbacks>('callbacks');
  // svelte-ignore non_reactive_update
  let markerMesh: THREE.Mesh;
  let inputMesh = $state(new THREE.Mesh());

  // Regenerate buffer geometry each time marker array is updated
  $effect(() => {
    if (!mapSize) return;

    const vertices: number[] = [];
    const centers: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let indexOffset = 0;

    props.marker.markers.forEach((marker) => {
      // Each quad has 4 vertices (a square)
      const halfSize = {
        x: props.marker.markerSize / mapSize.width / 2,
        y: props.marker.markerSize / mapSize.height / 2
      };
      const x = marker.position.x;
      const y = 1.0 - marker.position.y;

      // Define 4 vertices of the quad (in 3D space, z = 0)

      vertices.push(x - halfSize.x, y - halfSize.y, 0); // Bottom left
      vertices.push(x + halfSize.x, y - halfSize.y, 0); // Bottom right
      vertices.push(x + halfSize.x, y + halfSize.y, 0); // Top right
      vertices.push(x - halfSize.x, y + halfSize.y, 0); // Top left
      for (let i = 0; i < 4; i++) centers.push(x, y, 0);

      // UVs for each corner
      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

      // Define 2 triangles to form the quad (using indices)
      indices.push(indexOffset, indexOffset + 1, indexOffset + 2); // First triangle
      indices.push(indexOffset, indexOffset + 2, indexOffset + 3); // Second triangle

      // Update index offset for the next quad
      indexOffset += 4;
    });

    // Create a buffer geometry instance
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.setAttribute('center', new THREE.BufferAttribute(new Float32Array(centers), 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));

    // Set the indices to define the triangles that form the quads
    geometry.setIndex(indices);

    markerMesh.geometry = geometry;
  });

  function onMouseDown(e: MouseEvent, coords: THREE.Vector2 | null) {
    if (!coords || !mapSize) return;

    if (props.marker.editMode === MarkerEditMode.Add) {
      const location = { x: coords.x / mapSize.width, y: coords.y / mapSize.height };
      props.marker.markers.push({
        id: crypto.randomUUID(),
        name: 'New Marker',
        position: location
      });
    } else {
      // Find the marker that is closest to the mouse down point. The test point
      // must be within the outer radius of the marker for it to be considered
      let closestMarker: Marker | null = null;
      let minDistance = Infinity;
      props.marker.markers.forEach((marker) => {
        const markerCoords = new THREE.Vector2(marker.position.x * mapSize.width, marker.position.y * mapSize.height);
        const distance = coords.distanceTo(markerCoords);
        if (distance < minDistance && distance <= props.marker.markerSize / 2) {
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

<!-- This mesh is used to render the markers -->
<T.Mesh bind:ref={markerMesh} name="markerLayer" position={[-0.5, -0.5, 0]} {meshProps}>
  <MarkerMaterial props={props.marker} />
</T.Mesh>
