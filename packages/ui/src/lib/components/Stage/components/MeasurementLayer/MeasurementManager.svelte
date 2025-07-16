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

  interface Props {
    props: MeasurementLayerProps;
    visible: boolean;
    displayProps: DisplayProps;
    gridProps: any;
  }

  const { props, visible, displayProps, gridProps, ...meshProps }: Props = $props();

  let currentMeasurement: IMeasurement | null = null;
  let measurementGroup = $state(new THREE.Group());

  // Preview indicator
  let previewMesh = $state(new THREE.Mesh());
  let previewMaterial = $state(new THREE.MeshBasicMaterial());
  let previewGeometry = $state(new THREE.PlaneGeometry());
  let showPreview = $state(false);

  onMount(() => {
    initializePreview();
  });

  onDestroy(() => {
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
   * Initializes the preview indicator mesh with geometry, material, and default styling.
   * Sets up the preview mesh that shows where the next measurement point will be placed.
   * @returns {void}
   */
  function initializePreview() {
    previewGeometry = new THREE.PlaneGeometry(32, 32);
    previewMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: props.opacity,
      alphaTest: 0.01,
      depthWrite: false
    });
    previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
    updatePreviewMarker();
  }

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

    // Calculate marker size based on thickness (same as measurement points)
    const radius = props.thickness * 2;
    const size = Math.max(radius * 2 + props.outlineThickness * 4, 32);

    canvas.width = size;
    canvas.height = size;

    // Clear canvas to fully transparent
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw circle marker at center
    drawCircle(
      context,
      canvas.width / 2,
      canvas.height / 2,
      radius,
      props.color,
      props.outlineThickness > 0 ? props.outlineColor : undefined,
      props.outlineThickness > 0 ? props.outlineThickness : undefined
    );

    return canvas;
  }

  /**
   * Updates the preview indicator's styling and texture to match current measurement properties.
   * Recreates the canvas texture and updates material properties whenever measurement settings change.
   * Properly disposes of old textures to prevent memory leaks.
   * @returns {void}
   */
  function updatePreviewMarker() {
    if (!previewMaterial || !previewGeometry) return;

    // Create new canvas texture
    const canvas = createMarkerCanvas();
    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    texture.needsUpdate = true;

    // Dispose old texture if exists
    if (previewMaterial.map) {
      previewMaterial.map.dispose();
    }

    // Update material
    previewMaterial.map = texture;
    previewMaterial.transparent = true;
    previewMaterial.opacity = props.opacity;
    previewMaterial.alphaTest = 0.01;
    previewMaterial.depthWrite = false;
    previewMaterial.needsUpdate = true;

    // Update geometry size to match canvas
    previewGeometry.dispose();
    previewGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    previewMesh.geometry = previewGeometry;
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
<T.Group bind:ref={measurementGroup} {visible} {...meshProps}>
  <!-- Measurement objects will be added here dynamically -->
</T.Group>

<!-- Preview indicator -->
<T.Mesh bind:ref={previewMesh} visible={showPreview && visible} {...meshProps}>
  <T.MeshBasicMaterial bind:ref={previewMaterial} />
  <T.PlaneGeometry bind:ref={previewGeometry} />
</T.Mesh>
