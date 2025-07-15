<script lang="ts">
  import * as THREE from 'three';
  import { T } from '@threlte/core';
  import { MeasurementType, type MeasurementLayerProps } from './types';
  import type { IMeasurement } from './measurements/BaseMeasurement';
  import { LineMeasurement } from './measurements/LineMeasurement';
  import type { DisplayProps } from '../Stage/types';

  interface Props {
    props: MeasurementLayerProps;
    visible: boolean;
    displayProps: DisplayProps;
  }

  const { props, visible, displayProps }: Props = $props();

  let currentMeasurement: IMeasurement | null = null;
  let measurementGroup = $state(new THREE.Group());

  /**
   * Start a new measurement
   */
  function startMeasurement(startPoint: THREE.Vector2): void {
    clearMeasurement();

    console.log('startMeasurement');

    // Create new measurement based on type
    let measurement: IMeasurement;

    switch (props.type) {
      case MeasurementType.Line:
        measurement = new LineMeasurement(startPoint, props, displayProps);
        break;
      default:
        measurement = new LineMeasurement(startPoint, props, displayProps);
        break;
    }

    currentMeasurement = measurement;

    // Add the measurement object to the group
    const measurementObject = measurement.render();
    measurementGroup.add(measurementObject);
  }

  /**
   * Update the current measurement with a new end point
   */
  function updateMeasurement(endPoint: THREE.Vector2): void {
    if (currentMeasurement) {
      console.log('updateMeasurement');
      currentMeasurement.update(endPoint);

      // Update the rendered object in the scene
      updateMeasurementInScene();
    }
  }

  /**
   * Finish the current measurement
   */
  function finishMeasurement(): void {
    if (!currentMeasurement) return;

    console.log('finishMeasurement');

    setTimeout(() => {
      clearMeasurement();
    }, props.autoHideDelay);
  }

  /**
   * Clear the current measurement
   */
  function clearMeasurement(): void {
    if (currentMeasurement) {
      console.log('clearMeasurement');
      measurementGroup.clear();
      currentMeasurement.dispose();
      currentMeasurement = null;
    }
  }

  /**
   * Update the measurement object in the scene
   */
  function updateMeasurementInScene(): void {
    if (!currentMeasurement) return;

    // Clear and re-add the measurement object
    measurementGroup.clear();
    const measurementObject = currentMeasurement.render();
    measurementGroup.add(measurementObject);
  }

  // Export the methods for use by parent components
  export { startMeasurement, updateMeasurement, finishMeasurement, clearMeasurement };
</script>

<!-- Measurement Group -->
<T.Group bind:ref={measurementGroup} {visible}>
  <!-- Measurement objects will be added here dynamically -->
</T.Group>
