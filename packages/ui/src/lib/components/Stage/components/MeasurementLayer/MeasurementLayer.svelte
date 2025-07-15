<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { onDestroy, onMount } from 'svelte';
  import { type MeasurementLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import { SceneLayer } from '../Scene/types';
  import { type GridLayerProps } from '../GridLayer/types';
  import { snapToGrid } from '../../helpers/grid';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import MeasurementManager from './MeasurementManager.svelte';

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

  // Measurement state
  let isDrawing = false;
  let startPoint: THREE.Vector2 | null = null;
  let measurementManager: any; // Will be the component instance

  // Create the measurement indicator geometry and material
  onMount(() => {
    measurementGeometry = new THREE.CircleGeometry(10, 16);
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

  function handleMouseDown(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    if (!coords || !isActive || !measurementManager) return;

    coords.sub(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));

    const snappedCoords = props.snapToGrid ? snapToGrid(coords, grid, display) : coords;

    if (isDrawing) {
      // Reset current measurement
      measurementManager.clearMeasurement();
    }

    // Start new measurement
    isDrawing = true;
    startPoint = snappedCoords;
    measurementManager.startMeasurement(snappedCoords);
  }

  function handleMouseMove(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    if (!coords || !isActive || !measurementManager) return;

    coords.sub(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));

    // Apply snapping if enabled
    if (props.snapToGrid) {
      snappedPosition = snapToGrid(coords, grid, display);
    } else {
      snappedPosition.copy(coords);
    }

    if (isDrawing && startPoint && measurementManager) {
      // Update current measurement
      measurementManager.updateMeasurement(snappedPosition);
    } else {
      // Update the measurement indicator position
      if (measurementMesh) {
        measurementMesh.position.set(snappedPosition.x, snappedPosition.y, 0);
      }
    }
  }

  function handleMouseUp(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null) {
    if (!isDrawing || !startPoint || !measurementManager || !coords) return;

    coords.sub(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));
    const snappedCoords = coords && props.snapToGrid ? snapToGrid(coords, grid, display) : coords;

    if (snappedCoords) {
      measurementManager.finishMeasurement();
    }

    isDrawing = false;
    startPoint = null;
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
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseLeave}
  onMouseEnter={handleMouseEnter}
/>

<!-- Preview indicator (follows mouse when not drawing) -->
<T.Mesh bind:ref={measurementMesh} name="measurementLayer" visible={!isDrawing && isActive} {...meshProps}>
  <T.MeshBasicMaterial bind:ref={measurementMaterial} color={props.color} transparent={true} opacity={props.opacity} />
  <T.CircleGeometry args={[10, 16]} bind:ref={measurementGeometry} />
</T.Mesh>

<!-- Measurement Manager Component -->
<MeasurementManager bind:this={measurementManager} {props} visible={isActive} displayProps={display} />
