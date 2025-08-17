<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { onDestroy } from 'svelte';
  import { MeasurementType, type MeasurementLayerProps } from './types';
  import type { IMeasurement } from './measurements/BaseMeasurement';
  import { LineMeasurement } from './measurements/LineMeasurement';
  import { CircleMeasurement } from './measurements/CircleMeasurement';
  import { RectangleMeasurement } from './measurements/RectangleMeasurement';
  import { BeamMeasurement } from './measurements/BeamMeasurement';
  import { ConeMeasurement } from './measurements/ConeMeasurement';
  import { drawCircle } from './utils/canvasDrawing';
  import type { DisplayProps } from '../Stage/types';
  import type { GridLayerProps } from '../GridLayer/types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';

  interface Props {
    props: MeasurementLayerProps;
    visible: boolean;
    displayProps: DisplayProps;
    gridProps: GridLayerProps;
  }

  const { props, visible, displayProps, gridProps }: Props = $props();

  let currentMeasurement: IMeasurement | null = null;
  let measurementGroup = $state(new THREE.Group());
  let autoHideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Fade animation state
  let isFading = $state(false);
  let fadeStartTime = $state(0);
  let fadeOpacity = $state(1.0);

  // Preview indicator
  let previewMesh = $state(new THREE.Mesh());
  let previewMaterial = $state(new THREE.MeshBasicMaterial());
  let previewGeometry = $state(new THREE.PlaneGeometry());
  let previewSize = $derived(props.markerSize + props.outlineThickness * 2);
  let showPreview = $state(false);

  // Task for fade animation
  useTask(() => {
    if (isFading) {
      const now = performance.now();
      const fadeElapsed = now - fadeStartTime;
      const progress = Math.min(fadeElapsed / props.fadeoutTime, 1);

      fadeOpacity = 1 - progress;

      // Update the opacity of all materials in the measurement group
      if (currentMeasurement) {
        if (currentMeasurement.shapeMesh.material instanceof THREE.MeshBasicMaterial) {
          currentMeasurement.shapeMesh.material.opacity = props.opacity * fadeOpacity;
        }
        if (currentMeasurement.textMesh.material instanceof THREE.MeshBasicMaterial) {
          currentMeasurement.textMesh.material.opacity = props.opacity * fadeOpacity;
        }
      }

      if (progress >= 1) {
        isFading = false;
        clearMeasurement();
      }
    }
  });

  onDestroy(() => {
    // Clear any pending auto-hide timeout
    if (autoHideTimeoutId !== null) {
      clearTimeout(autoHideTimeoutId);
      autoHideTimeoutId = null;
    }

    // Stop fade animation
    isFading = false;

    currentMeasurement?.dispose();
    if (previewGeometry) {
      previewGeometry.dispose();
    }
    if (previewMaterial) {
      if (previewMaterial.map) {
        previewMaterial.map.dispose();
      }
      previewMaterial.dispose();
    }
  });

  /**
   * Creates a canvas texture for the preview marker that matches the measurement point styling.
   * The marker uses the same visual properties (color, thickness, outline) as measurement start/end points.
   */
  $effect(() => {
    // Create the preview marker texture
    const markerCanvas = createMarkerCanvas();
    const markerTexture = new THREE.CanvasTexture(markerCanvas);
    markerTexture.needsUpdate = true;

    // Dispose the old texture before assigning new one to prevent memory leak
    if (previewMaterial.map) {
      previewMaterial.map.dispose();
    }

    // Assign the texture to the preview material
    previewMaterial.map = markerTexture;
    previewMaterial.needsUpdate = true;
  });

  /**
   * Updates the preview indicator position and visibility based on mouse position and measurement state.
   * The preview is automatically hidden when a measurement is currently being created.
   *
   * @param {THREE.Vector2 | null} position - The world position where the preview should be displayed, or null to hide
   * @param {boolean} [visible=true] - Whether the preview should be visible (defaults to true)
   * @returns {void}
   */
  function updatePreview(position: THREE.Vector2 | null, visible: boolean = true): void {
    if (!position || currentMeasurement) {
      showPreview = false;
      return;
    }

    showPreview = visible;
    if (previewMesh && showPreview) {
      previewMesh.position.set(position.x, position.y, 0);
    }
  }

  /**
   * Hides the preview indicator from view.
   * Used when measurements are active or when the cursor leaves the measurement area.
   * @returns {void}
   */
  function hidePreview(): void {
    showPreview = false;
  }

  /**
   * Shows the preview indicator if no measurement is currently active.
   * Provides visual feedback for where the next measurement point will be placed.
   * @returns {void}
   */
  function showPreviewIndicator(): void {
    if (!currentMeasurement) {
      showPreview = true;
    }
  }

  /**
   * Creates a canvas texture for the measurement marker that matches the measurement point styling.
   * The marker uses the same visual properties (color, thickness, outline) as measurement start/end points.
   *
   * @returns {HTMLCanvasElement} A canvas element with the rendered marker that can be used as a texture
   */
  function createMarkerCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const width = previewSize;
    const height = previewSize;

    canvas.width = width;
    canvas.height = height;

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawCircle(
      context,
      previewSize / 2,
      previewSize / 2,
      props.markerSize / 2,
      props.color,
      props.outlineColor,
      props.outlineThickness
    );

    return canvas;
  }

  /**
   * Starts a new measurement at the specified point based on the current measurement type.
   * Clears any existing measurement and creates the appropriate measurement class instance.
   *
   * @param {THREE.Vector2} startPoint - The world coordinates where the measurement should begin
   * @returns {void}
   */
  function startMeasurement(startPoint: THREE.Vector2): void {
    // Clear any existing auto-hide timeout
    if (autoHideTimeoutId !== null) {
      clearTimeout(autoHideTimeoutId);
      autoHideTimeoutId = null;
    }

    // Reset fade state
    isFading = false;
    fadeOpacity = 1.0;

    clearMeasurement();
    showPreview = false; // Hide preview when starting measurement

    // Create new measurement based on type
    let measurement: IMeasurement;

    switch (props.type) {
      case MeasurementType.Line:
        measurement = new LineMeasurement(startPoint, props, displayProps, gridProps);
        break;
      case MeasurementType.Beam:
        measurement = new BeamMeasurement(startPoint, props, displayProps, gridProps);
        break;
      case MeasurementType.Cone:
        measurement = new ConeMeasurement(startPoint, props, displayProps, gridProps);
        break;
      case MeasurementType.Circle:
        measurement = new CircleMeasurement(startPoint, props, displayProps, gridProps);
        break;
      case MeasurementType.Square:
        measurement = new RectangleMeasurement(startPoint, props, displayProps, gridProps);
        break;
      default:
        measurement = new LineMeasurement(startPoint, props, displayProps, gridProps);
        break;
    }

    currentMeasurement = measurement;
    measurementGroup.add(measurement.object);
  }

  /**
   * Updates the current measurement with a new end point, typically called during mouse movement.
   * Recalculates measurement geometry and updates the visual representation in real-time.
   *
   * @param {THREE.Vector2} endPoint - The world coordinates for the current end point of the measurement
   * @returns {void}
   */
  function updateMeasurement(endPoint: THREE.Vector2): void {
    currentMeasurement?.update(endPoint);
  }

  /**
   * Completes the current measurement and schedules its automatic removal.
   * The measurement is displayed for the duration specified by autoHideDelay, then fades out over fadeoutTime before being cleared.
   * @returns {void}
   */
  function finishMeasurement(): void {
    if (!currentMeasurement) return;

    // Don't finish measurements with zero distance (same start and end point)
    const distance = currentMeasurement.startPoint.distanceTo(currentMeasurement.endPoint);
    if (distance === 0) {
      clearMeasurement();
      return;
    }

    autoHideTimeoutId = setTimeout(() => {
      // Start the fade animation
      fadeStartTime = performance.now();
      isFading = true;
    }, props.autoHideDelay);
  }

  /**
   * Removes the current measurement from the scene and disposes of its resources.
   * Cleans up Three.js objects to prevent memory leaks and resets the measurement state.
   * @returns {void}
   */
  function clearMeasurement(): void {
    // Clear any existing auto-hide timeout
    if (autoHideTimeoutId !== null) {
      clearTimeout(autoHideTimeoutId);
      autoHideTimeoutId = null;
    }

    // Reset fade state
    isFading = false;
    fadeOpacity = 1.0;

    if (currentMeasurement) {
      currentMeasurement.dispose();
      currentMeasurement = null;
      measurementGroup.clear();
    }
  }

  // Export the methods for use by parent components
  export {
    startMeasurement,
    updateMeasurement,
    finishMeasurement,
    clearMeasurement,
    updatePreview,
    hidePreview,
    showPreviewIndicator
  };
</script>

<!-- Measurement Group -->
<T.Group bind:ref={measurementGroup} {visible} layers={[SceneLayer.Overlay]} renderOrder={SceneLayerOrder.Measurement}>
  <!-- Measurement objects will be added here dynamically -->
</T.Group>

<!-- Preview indicator -->
<T.Mesh
  bind:ref={previewMesh}
  visible={showPreview && visible}
  layers={[SceneLayer.Overlay]}
  renderOrder={SceneLayerOrder.Measurement}
>
  <T.MeshBasicMaterial
    bind:ref={previewMaterial}
    transparent={true}
    opacity={props.opacity}
    color={props.color}
    side={THREE.DoubleSide}
  />
  <T.PlaneGeometry bind:ref={previewGeometry} args={[previewSize, previewSize]} />
</T.Mesh>
