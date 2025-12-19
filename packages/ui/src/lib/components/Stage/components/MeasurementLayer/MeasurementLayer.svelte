<script lang="ts">
  import * as THREE from 'three';
  import { T, type Props as ThrelteProps } from '@threlte/core';
  import { type MeasurementLayerProps } from './types';
  import { type DisplayProps } from '../Stage/types';
  import { SceneLayer } from '../Scene/types';
  import { type GridLayerProps, GridType } from '../GridLayer/types';
  import { snapToGrid } from '../../helpers/grid';
  import LayerInput from '../LayerInput/LayerInput.svelte';
  import MeasurementManager from './MeasurementManager.svelte';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: MeasurementLayerProps;
    isActive: boolean;
    display: DisplayProps;
    grid: GridLayerProps;
    sceneRotation?: number;
    onMeasurementStart?: (startPoint: THREE.Vector2, type: number) => void;
    onMeasurementUpdate?: (startPoint: THREE.Vector2, endPoint: THREE.Vector2, type: number) => void;
    onMeasurementEnd?: () => void;
    receivedMeasurement?: {
      startPoint: { x: number; y: number };
      endPoint: { x: number; y: number };
      type: number;
      beamWidth?: number;
      coneAngle?: number;
      // Visual properties
      color?: string;
      thickness?: number;
      outlineColor?: string;
      outlineThickness?: number;
      opacity?: number;
      markerSize?: number;
      // Timing properties
      autoHideDelay?: number;
      fadeoutTime?: number;
      // Distance properties
      showDistance?: boolean;
      snapToGrid?: boolean;
      enableDMG252?: boolean;
    } | null;
  }

  const {
    props,
    isActive,
    display,
    grid,
    sceneRotation = 0,
    onMeasurementStart,
    onMeasurementUpdate,
    onMeasurementEnd,
    receivedMeasurement
  }: Props = $props();

  let centerOffset = $derived(new THREE.Vector2(display.resolution.x / 2, display.resolution.y / 2));
  let snappedPosition = new THREE.Vector2();
  let inputMesh = $state(new THREE.Mesh());

  // Measurement state
  let isDrawing = false;
  let startPoint: THREE.Vector2 | null = null;
  let measurementManager: MeasurementManager | null = null;

  // Track previous display resolution to detect scene changes
  let prevResX = display.resolution.x;
  let prevResY = display.resolution.y;

  // Reset measurement state when layer becomes inactive or display changes (scene switch)
  $effect(() => {
    const resChanged = display.resolution.x !== prevResX || display.resolution.y !== prevResY;

    // Reset any lingering measurement state when layer deactivates or scene changes
    if (!isActive || resChanged) {
      isDrawing = false;
      startPoint = null;
      if (measurementManager) {
        measurementManager.clearMeasurement();
        measurementManager.hidePreview();
      }
    }

    // Update tracked resolution
    prevResX = display.resolution.x;
    prevResY = display.resolution.y;
  });

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
    if (!coords || !isActive || !measurementManager || !props) return;

    coords.sub(centerOffset);

    // For measurements on hex grids, snap to centers only
    const isHexGrid = grid.gridType === GridType.Hex;
    const snappedCoords = props.snapToGrid ? snapToGrid(coords, grid, display, isHexGrid) : coords;

    // Always clear any existing measurement state before starting new one
    // This handles edge cases where isDrawing might be unexpectedly true
    if (isDrawing) {
      measurementManager.clearMeasurement();
    }

    // Start new measurement
    isDrawing = true;
    startPoint = snappedCoords.clone(); // Clone to avoid reference issues
    measurementManager.startMeasurement(snappedCoords);

    // Notify parent component
    if (onMeasurementStart) {
      onMeasurementStart(snappedCoords, props.type);
    }
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
    if (!coords || !isActive || !measurementManager || !props) return;

    coords.sub(centerOffset);

    // Apply snapping if enabled
    // For measurements on hex grids, snap to centers only
    const isHexGrid = grid.gridType === GridType.Hex;
    if (props.snapToGrid) {
      snappedPosition = snapToGrid(coords, grid, display, isHexGrid);
    } else {
      snappedPosition.copy(coords);
    }

    if (isDrawing && startPoint && measurementManager) {
      // Update current measurement
      measurementManager.updateMeasurement(snappedPosition);

      // Notify parent component
      if (onMeasurementUpdate) {
        onMeasurementUpdate(startPoint, snappedPosition, props.type);
      }
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
    // Always reset drawing state when mouseUp is called, even if coords is null
    // This prevents isDrawing from staying true after touch gestures or edge cases
    const wasDrawing = isDrawing;
    isDrawing = false;

    if (!wasDrawing || !startPoint || !measurementManager) {
      startPoint = null;
      return;
    }

    if (coords) {
      coords.sub(centerOffset);
      // For measurements on hex grids, snap to centers only
      const isHexGrid = grid.gridType === GridType.Hex;
      const snappedCoords = props.snapToGrid ? snapToGrid(coords, grid, display, isHexGrid) : coords;

      if (snappedCoords) {
        measurementManager.finishMeasurement();
      }
    } else {
      // Coords is null (released outside canvas) - clear the incomplete measurement
      measurementManager.clearMeasurement();
    }

    startPoint = null;

    // Notify parent component
    if (onMeasurementEnd) {
      onMeasurementEnd();
    }
  }

  /**
   * Handles mouse leave events when the cursor exits the measurement area.
   * Hides the preview indicator to provide clear visual feedback that measurements
   * cannot be placed outside the active area.
   * Also resets any in-progress measurement to prevent stuck state.
   * @returns {void}
   */
  function handleMouseLeave(): void {
    // Reset drawing state if user leaves canvas while drawing
    if (isDrawing && measurementManager) {
      measurementManager.clearMeasurement();
      isDrawing = false;
      startPoint = null;
      if (onMeasurementEnd) {
        onMeasurementEnd();
      }
    }

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

  // Export methods for parent components to get measurement state
  export function getCurrentMeasurement(): {
    startPoint: THREE.Vector2 | null;
    endPoint: THREE.Vector2 | null;
    type: number;
  } | null {
    if (!measurementManager || !isDrawing || !startPoint) return null;

    return {
      startPoint: startPoint.clone(),
      endPoint: snappedPosition.clone(),
      type: props.type
    };
  }

  export function isCurrentlyDrawing(): boolean {
    return isDrawing;
  }

  // Track the last displayed measurement to avoid redundant updates
  let lastDisplayedMeasurement: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    type: number;
  } | null = null;

  // Track if a measurement is currently fading (so we don't clear it prematurely)
  let measurementIsFading = false;

  // Effect to handle received measurements from other users
  $effect(() => {
    if (receivedMeasurement) {
      console.log(
        '[MeasurementLayer] Received measurement prop:',
        receivedMeasurement,
        'isActive:',
        isActive,
        'has manager:',
        !!measurementManager
      );
    }
    if (receivedMeasurement && measurementManager && !isActive) {
      // Check if this is a new measurement (not the same as last displayed)
      const isNewMeasurement =
        !lastDisplayedMeasurement ||
        lastDisplayedMeasurement.startX !== receivedMeasurement.startPoint.x ||
        lastDisplayedMeasurement.startY !== receivedMeasurement.startPoint.y ||
        lastDisplayedMeasurement.endX !== receivedMeasurement.endPoint.x ||
        lastDisplayedMeasurement.endY !== receivedMeasurement.endPoint.y ||
        lastDisplayedMeasurement.type !== receivedMeasurement.type;

      if (isNewMeasurement) {
        // Convert to Vector2 with center offset adjustment
        const startPoint = new THREE.Vector2(receivedMeasurement.startPoint.x, receivedMeasurement.startPoint.y);
        const endPoint = new THREE.Vector2(receivedMeasurement.endPoint.x, receivedMeasurement.endPoint.y);

        console.log('[MeasurementLayer] Displaying NEW received measurement:', {
          startPoint,
          endPoint,
          type: receivedMeasurement.type
        });

        // Display the received measurement with all properties if available
        measurementManager.displayReceivedMeasurement(
          startPoint,
          endPoint,
          receivedMeasurement.type,
          receivedMeasurement.beamWidth,
          receivedMeasurement.coneAngle,
          receivedMeasurement.color,
          receivedMeasurement.thickness,
          receivedMeasurement.outlineColor,
          receivedMeasurement.outlineThickness,
          receivedMeasurement.opacity,
          receivedMeasurement.markerSize,
          receivedMeasurement.autoHideDelay,
          receivedMeasurement.fadeoutTime,
          receivedMeasurement.showDistance,
          receivedMeasurement.snapToGrid,
          receivedMeasurement.enableDMG252
        );

        // Mark that a measurement is now fading
        measurementIsFading = true;

        // Update last displayed measurement
        lastDisplayedMeasurement = {
          startX: receivedMeasurement.startPoint.x,
          startY: receivedMeasurement.startPoint.y,
          endX: receivedMeasurement.endPoint.x,
          endY: receivedMeasurement.endPoint.y,
          type: receivedMeasurement.type
        };
      }
    } else if (!receivedMeasurement && lastDisplayedMeasurement && !measurementIsFading) {
      // Only clear if no measurement is fading
      // The measurement will clear itself after fade completes
      console.log('[MeasurementLayer] No measurement received, but one is fading - letting it complete');
      lastDisplayedMeasurement = null;
    }
  });
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
<T.Mesh
  bind:ref={inputMesh}
  scale={[display.resolution.x, display.resolution.y, 1]}
  layers={isActive ? [SceneLayer.Input] : undefined}
>
  <T.MeshBasicMaterial visible={false} />
  <T.PlaneGeometry />
</T.Mesh>

<!-- Measurement Manager Component -->
<MeasurementManager
  bind:this={measurementManager}
  {props}
  visible={isActive}
  displayProps={display}
  gridProps={grid}
  {sceneRotation}
  onFadeComplete={() => {
    measurementIsFading = false;
    console.log('[MeasurementLayer] Fade complete, measurement can be cleared');
  }}
/>
