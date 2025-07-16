<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
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

  const { props, isActive, display, grid }: Props = $props();

  let snappedPosition = new THREE.Vector2();
  let inputMesh = $state(new THREE.Mesh());

  // Measurement state
  let isDrawing = false;
  let startPoint: THREE.Vector2 | null = null;
  let measurementManager: any; // Will be the component instance

  /**
   * Handles mouse down events to initiate measurement creation.
   * Converts screen coordinates to world coordinates, applies grid snapping if enabled,
   * and starts a new measurement at the clicked position.
   *
   * @param {MouseEvent | TouchEvent} event - The mouse or touch event that triggered this handler
   * @param {THREE.Vector2 | null} coords - The world coordinates of the mouse/touch position, or null if outside bounds
   * @returns {void}
   */
  function handleMouseDown(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null): void {
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

  /**
   * Handles mouse move events to update measurement preview and active measurements.
   * Converts coordinates to world space, applies grid snapping, and either updates
   * the current measurement being drawn or shows a preview indicator.
   *
   * @param {MouseEvent | TouchEvent} event - The mouse or touch event that triggered this handler
   * @param {THREE.Vector2 | null} coords - The world coordinates of the mouse/touch position, or null if outside bounds
   * @returns {void}
   */
  function handleMouseMove(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null): void {
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
      // Update the preview indicator position
      measurementManager.updatePreview(snappedPosition, isActive);
    }
  }

  /**
   * Handles mouse up events to complete measurement creation.
   * Finalizes the current measurement at the release position and resets the drawing state.
   * Applies grid snapping to the final position if enabled.
   *
   * @param {MouseEvent | TouchEvent} event - The mouse or touch event that triggered this handler
   * @param {THREE.Vector2 | null} coords - The world coordinates of the mouse/touch position, or null if outside bounds
   * @returns {void}
   */
  function handleMouseUp(event: MouseEvent | TouchEvent, coords: THREE.Vector2 | null): void {
    if (!isDrawing || !startPoint || !measurementManager || !coords) return;

    coords.sub(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));
    const snappedCoords = coords && props.snapToGrid ? snapToGrid(coords, grid, display) : coords;

    if (snappedCoords) {
      measurementManager.finishMeasurement();
    }

    isDrawing = false;
    startPoint = null;
  }

  /**
   * Handles mouse leave events when the cursor exits the measurement area.
   * Hides the preview indicator to provide clear visual feedback that measurements
   * cannot be placed outside the active area.
   * @returns {void}
   */
  function handleMouseLeave(): void {
    if (measurementManager) {
      measurementManager.hidePreview();
    }
  }

  /**
   * Handles mouse enter events when the cursor enters the measurement area.
   * Shows the preview indicator if the measurement layer is active, providing
   * visual feedback for where measurements can be placed.
   * @returns {void}
   */
  function handleMouseEnter(): void {
    if (measurementManager && isActive) {
      measurementManager.showPreviewIndicator();
    }
  }
</script>

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

<!-- This quad is user for raycasting / mouse input detection. It is invisible -->
<T.Mesh bind:ref={inputMesh} scale={[display.resolution.x, display.resolution.y, 1]} layers={[SceneLayer.Input]}>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- Measurement Manager Component -->
<MeasurementManager bind:this={measurementManager} {props} visible={isActive} displayProps={display} gridProps={grid} />
