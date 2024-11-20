<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask, useThrelte, type Size } from '@threlte/core';
  import { PingEditMode, type PingLayerProps } from './types';
  import { PingMaterial } from '../../materials/PingMaterial';
  import { onMount } from 'svelte';
  import LayerInput from '../LayerInput/LayerInput.svelte';

  interface Props {
    props: PingLayerProps;
    isActive: boolean;
    z: number;
    clippingPlanes: THREE.Plane[];
    mapSize: Size;
    // Note: Pings are passed in as a prop for initialization, but can also be added via
    // mouse input if `isActive` is set to true.
    onPingsUpdated: (updatedLocations: { x: number; y: number }[]) => void;
  }

  const { props, isActive, z, clippingPlanes, mapSize, onPingsUpdated }: Props = $props();

  let time = $state(0);

  // svelte-ignore non_reactive_update
  let pingMesh: THREE.Mesh;
  let inputMesh = $state(new THREE.Mesh());
  let material = new PingMaterial(props, clippingPlanes);

  onMount(() => {
    if (pingMesh) {
      pingMesh.material = material;
    }
  });

  useTask((dt) => {
    time += dt;
    material.uniforms.uTime.value = time;
  });

  $effect(() => {
    material.updateProps(props, clippingPlanes);
  });

  // Regenerate buffer geometry each time ping array is updated
  $effect(() => {
    if (!mapSize || mapSize.width === 0 || mapSize.height === 0) return;

    const vertices: number[] = [];
    const centers: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    let indexOffset = 0;

    props.locations.forEach((location) => {
      // Each quad has 4 vertices (a square)
      const halfSize = {
        x: props.markerSize / mapSize.width / 2,
        y: props.markerSize / mapSize.height / 2
      };
      const x = location.x;
      const y = 1.0 - location.y;

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

    pingMesh.geometry = geometry;
  });

  function onMouseDown(coords: THREE.Vector2 | null) {
    if (!coords) return;

    if (props.editMode === PingEditMode.Add) {
      const location = { x: coords.x / mapSize.width, y: coords.y / mapSize.height };
      console.log(location);
      onPingsUpdated([...props.locations, location]);
    } else {
      // Find the ping that is closest to the mouse down point. The test point
      // must be within the outer radius of the ping for it to be considered
      let closestPing: { x: number; y: number } | null = null;
      let minDistance = Infinity;
      props.locations.forEach((ping) => {
        const pingCoords = new THREE.Vector2(ping.x * mapSize.width, ping.y * mapSize.height);
        const distance = coords.distanceTo(pingCoords);
        if (distance < minDistance && distance <= props.markerSize / 2) {
          minDistance = distance;
          closestPing = ping;
        }
      });

      // If a ping was found, remove it and fire the callback
      if (closestPing) {
        onPingsUpdated(props.locations.filter((l) => l !== closestPing));
      }
    }
  }
</script>

<LayerInput {isActive} target={inputMesh} layerSize={mapSize} onmousedown={onMouseDown} />

<!-- This quad is user for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh} position={[0, 0, z]}>
  <T.MeshBasicMaterial opacity={0} transparent={true} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- This mesh is used to render the pings -->
<T.Mesh bind:ref={pingMesh} position={[-0.5, -0.5, z]} />
