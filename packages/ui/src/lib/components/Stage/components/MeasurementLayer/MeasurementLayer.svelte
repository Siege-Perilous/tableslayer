<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { onDestroy, onMount } from 'svelte';
  import { type MeasurementLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';
  import { MapLayerType } from '../MapLayer/types';
  import { type GridLayerProps } from '../GridLayer/types';
  import { snapToGrid } from '../../helpers/grid';
  import LayerInput from '../LayerInput/LayerInput.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: MeasurementLayerProps;
    isActive: boolean;
    display: DisplayProps;
    grid: GridLayerProps;
  }

  const { props, isActive, display, grid, ...meshProps }: Props = $props();

  let snappedPosition = new THREE.Vector2();
  let inputMesh = $state(new THREE.Mesh());
  let measurementMesh = $state(new THREE.Mesh());
  let measurementMaterial = $state(new THREE.MeshBasicMaterial());
  let measurementGeometry = $state(new THREE.CircleGeometry());

  // Create the measurement indicator geometry and material
  onMount(() => {
    measurementGeometry = new THREE.CircleGeometry(5, 16);
    measurementMaterial = new THREE.MeshBasicMaterial({
      color: props.color,
      transparent: true,
      opacity: props.opacity
    });
  });

  onDestroy(() => {
    if (measurementGeometry) {
      measurementGeometry.dispose();
    }
    if (measurementMaterial) {
      measurementMaterial.dispose();
    }
  });

  $effect(() => {
    if (isActive) {
      console.log('isActive', isActive);
    } else {
      console.log('is not active', isActive);
    }
  });

  function handleMouseMove(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    if (!coords || !isActive) return;

    coords.sub(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));

    // Apply snapping if enabled
    if (props.snapToGrid) {
      snappedPosition = snapToGrid(coords, grid, display);
    } else {
      snappedPosition.copy(coords);
    }

    // Update the measurement indicator position
    if (measurementMesh) {
      measurementMesh.position.set(snappedPosition.x, snappedPosition.y, 0);
    }
  }

  function handleMouseLeave() {
    console.log('handleMouseLeave');
    // Hide the measurement indicator when mouse leaves
    if (measurementMesh) {
      measurementMesh.visible = false;
    }
  }

  function handleMouseEnter() {
    console.log('handleMouseEnter');
    // Show the measurement indicator when mouse enters
    if (measurementMesh && isActive) {
      measurementMesh.visible = true;
    }
  }
</script>

<!-- This quad is user for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh} scale={[display.resolution.x, display.resolution.y, 1]} layers={[SceneLayer.Input]}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- Input handling -->
<LayerInput
  {isActive}
  target={inputMesh}
  layerSize={{ width: display.resolution.x, height: display.resolution.y }}
  onMouseMove={handleMouseMove}
  onMouseLeave={handleMouseLeave}
  onMouseEnter={handleMouseEnter}
/>

<!-- Measurement Layer -->
<T.Mesh bind:ref={measurementMesh} name="measurementLayer" visible={isActive} {...meshProps}>
  <T.MeshBasicMaterial bind:ref={measurementMaterial} color={props.color} transparent={true} opacity={props.opacity} />
  <T.CircleGeometry args={[10, 16]} bind:ref={measurementGeometry} />
</T.Mesh>
