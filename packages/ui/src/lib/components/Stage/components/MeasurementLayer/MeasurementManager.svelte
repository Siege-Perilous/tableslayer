<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { onDestroy, onMount } from 'svelte';
  import { MeasurementType, type MeasurementLayerProps } from './types';
  import type { IMeasurement } from './measurements/BaseMeasurement';
  import { LineMeasurement } from './measurements/LineMeasurement';
  import { CircleMeasurement } from './measurements/CircleMeasurement';
  import { RectangleMeasurement } from './measurements/RectangleMeasurement';
  import { BeamMeasurement } from './measurements/BeamMeasurement';
  import { ConeMeasurement } from './measurements/ConeMeasurement';
  import { drawCircle } from './utils/canvasDrawing';
  import type { DisplayProps } from '../Stage/types';
  import { SceneLayer, SceneLayerOrder } from '../Scene/types';

  interface Props {
    props: MeasurementLayerProps;
    visible: boolean;
    displayProps: DisplayProps;
    gridProps: any;
  }

  const { props, visible, displayProps, gridProps }: Props = $props();

  let currentMeasurement: IMeasurement | null = null;
  let measurementGroup = $state(new THREE.Group());

  // Preview indicator
  let previewMesh = $state(new THREE.Mesh());
  let previewMaterial = $state(new THREE.MeshBasicMaterial());
  let previewGeometry = $state(new THREE.PlaneGeometry());
  let previewSize = $derived(props.markerSize + props.outlineThickness * 2);
  let showPreview = $state(false);

  onDestroy(() => {
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

    // Add the measurement object to the group
    const measurementObject = measurement.render();
    measurementGroup.add(measurementObject);
  }

  /**
   * Updates the current measurement with a new end point, typically called during mouse movement.
   * Recalculates measurement geometry and updates the visual representation in real-time.
   *
   * @param {THREE.Vector2} endPoint - The world coordinates for the current end point of the measurement
   * @returns {void}
   */
  function updateMeasurement(endPoint: THREE.Vector2): void {
    if (currentMeasurement) {
      currentMeasurement.update(endPoint);

      // Update the rendered object in the scene
      updateMeasurementInScene();
    }
  }

  /**
   * Completes the current measurement and schedules its automatic removal.
   * The measurement is displayed for the duration specified by autoHideDelay before being cleared.
   * @returns {void}
   */
  function finishMeasurement(): void {
    if (!currentMeasurement) return;

    setTimeout(() => {
      clearMeasurement();
    }, props.autoHideDelay);
  }

  /**
   * Removes the current measurement from the scene and disposes of its resources.
   * Cleans up Three.js objects to prevent memory leaks and resets the measurement state.
   * @returns {void}
   */
  function clearMeasurement(): void {
    if (currentMeasurement) {
      measurementGroup.clear();
      currentMeasurement.dispose();
      currentMeasurement = null;
    }
  }

  /**
   * Updates the visual representation of the current measurement in the Three.js scene.
   * Removes the old measurement object and adds the updated version with current geometry.
   * Called internally when measurement properties change during creation.
   * @returns {void}
   */
  function updateMeasurementInScene(): void {
    if (!currentMeasurement) return;

    // Clear and re-add the measurement object
    measurementGroup.clear();
    const measurementObject = currentMeasurement.render();
    measurementGroup.add(measurementObject);
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
    alphaTest={0.01}
    depthWrite={false}
    color={props.color}
  />
  <T.PlaneGeometry bind:ref={previewGeometry} args={[previewSize, previewSize]} />
</T.Mesh>
